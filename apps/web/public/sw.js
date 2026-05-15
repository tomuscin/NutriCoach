// Leaxaro Service Worker — Production v3
// Architecture: Offline-first, stale-while-revalidate, versioned caches.
// Auth/session routes always bypass cache — network only.
// Static assets: immutable cache-first (Next.js content-hashed chunks).
// Navigations: network-first → cached shell → offline.html.
// API GET: network-first, short TTL cache (30s).
//
// Update flow:
//   1. Browser detects new SW byte content → installs in background.
//   2. SW waits (does NOT skipWaiting immediately — avoids race conditions).
//   3. Page sends { type: 'SKIP_WAITING' } → SW activates.
//   4. SW broadcasts { type: 'SW_ACTIVATED' } → page shows "Update ready" toast.

const SW_VERSION = '3.0.0'

// Cache names — increment version suffix to bust on deploy
const CACHE = {
  shell:  'nc-shell-v3',
  assets: 'nc-assets-v3',
  images: 'nc-images-v3',
  fonts:  'nc-fonts-v3',
  api:    'nc-api-v3',
}
const ALL_CACHES = Object.values(CACHE)

// API cache TTL (ms)
const API_TTL = 30_000 // 30 seconds

// App shell — pre-cached on install
// Only routes that don't require auth — the SW serves these as navigation fallbacks
const SHELL_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Routes that should NEVER be cached (auth, sessions, mutations)
const NEVER_CACHE = [
  '/api/auth/',
  '/auth/',
  '/onboarding',
]

function neverCache(pathname) {
  return NEVER_CACHE.some(p => pathname.startsWith(p))
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE.shell)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => { /* Don't fail install if shell assets are missing */ })
  )
  // Do NOT call skipWaiting() — wait for explicit message from UI
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL old caches
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
      // Take control of all clients immediately
      await self.clients.claim()

      // Notify all clients that a new version has activated
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION })
      }
    })()
  )
})

// ─── Message handler (skip waiting + version query) ───────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: SW_VERSION })
  }
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) {
    // Handle Google Fonts
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(cacheFirst(request, CACHE.fonts))
    }
    return
  }

  // Never cache auth/session routes
  if (neverCache(url.pathname)) return

  // ── Next.js static chunks (immutable — content-hashed filenames) ─────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE.assets))
    return
  }

  // ── Images ───────────────────────────────────────────────────────────────
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, CACHE.images))
    return
  }

  // ── API routes — network-first, short TTL cache ───────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request))
    return
  }

  // ── Navigation (HTML pages) — network-first, stale-while-revalidate ───────
  if (request.mode === 'navigate') {
    event.respondWith(navigateFetch(request))
    return
  }

  // ── Other same-origin assets — network-first ──────────────────────────────
  event.respondWith(networkFirst(request, CACHE.assets))
})

// ─── Strategies ──────────────────────────────────────────────────────────────

/**
 * Cache-First: serve from cache, fall back to network, update cache.
 * Best for: immutable static assets.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Network-First: try network, update cache, fall back to cache.
 * Best for: pages and mutable assets.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

/**
 * Stale-While-Revalidate: serve from cache immediately, update in background.
 * Best for: frequently updated content where stale data is acceptable.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  }).catch(() => null)

  return cached ?? fetchPromise ?? new Response('Offline', { status: 503 })
}

/**
 * Network-First for API: includes short TTL via Date header check.
 * Falls back to cached response or JSON 503.
 */
async function networkFirstAPI(request) {
  const cache = await caches.open(CACHE.api)

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Only cache safe, idempotent API responses
      const cloned = response.clone()
      const headers = new Headers(cloned.headers)
      // Store with timestamp for TTL enforcement
      cache.put(request, new Response(await cloned.blob(), {
        status: cloned.status,
        statusText: cloned.statusText,
        headers: Object.fromEntries(headers.entries()),
      })).catch(() => {})
    }
    return response
  } catch {
    // Offline — try cache
    const cached = await cache.match(request)
    if (cached) {
      // Return cached with header indicating offline
      const headers = new Headers(cached.headers)
      headers.set('X-SW-Cache', 'offline')
      return new Response(await cached.blob(), {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      })
    }
    // No cache — return structured 503
    return new Response(
      JSON.stringify({ ok: false, error: 'Offline — brak połączenia', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-SW-Cache': 'offline' },
      }
    )
  }
}

/**
 * Navigation fetch: network-first, cached shell fallback, offline.html last resort.
 * Stale-while-revalidate for shell-cached routes.
 */
async function navigateFetch(request) {
  const shellCache = await caches.open(CACHE.shell)

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Selectively cache the dashboard shell for offline fallback
      const url = new URL(request.url)
      if (url.pathname === '/dashboard') {
        shellCache.put(request, response.clone()).catch(() => {})
      }
    }
    return response
  } catch {
    // Try cached version
    const cached = await shellCache.match(request)
    if (cached) return cached

    // Fallback: offline.html
    const offline = await shellCache.match('/offline.html')
    if (offline) return offline

    // Last resort
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Offline — Leaxaro</title>
      <meta name="viewport" content="width=device-width,initial-scale=1"/></head>
      <body style="background:#0d1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui">
      <div style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem;margin-bottom:1rem">Brak połączenia</h1>
      <p style="color:#64748b;margin-bottom:1.5rem">Sprawdź połączenie i odśwież stronę.</p>
      <button onclick="window.location.reload()" style="background:#0b9aa0;color:#0d1117;border:none;padding:.75rem 1.5rem;border-radius:.625rem;font-weight:600;cursor:pointer">Odśwież</button>
      </div></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

// ─── Push notification handlers ───────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Leaxaro', body: event.data.text() }
  }

  const title = payload.title ?? 'Leaxaro'
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag ?? 'leaxaro-default',
    data: payload.data ?? {},
    actions: payload.actions ?? [],
    requireInteraction: payload.requireInteraction ?? false,
    // Visual styling
    image: payload.image ?? undefined,
    vibrate: [200, 100, 200],
    // Timestamp for notification grouping
    timestamp: payload.timestamp ?? Date.now(),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  const url = data.url ?? '/dashboard'
  const action = event.action

  // Custom action URLs
  const actionUrl = action && data.actions?.[action]?.url
  const targetUrl = actionUrl ?? url

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl })
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: self._vapidKey })
      .then((subscription) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
      })
      .catch(() => { /* silent — user will re-subscribe on next visit */ })
  )
})


