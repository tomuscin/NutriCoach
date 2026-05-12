// NutriCoach Service Worker — ETAP 6 PWA
// Provides offline shell + asset caching.
// Strategy: Network-first for API, Cache-first for static assets.

const CACHE_NAME = 'nutricoach-v1'
const OFFLINE_URL = '/offline'

// Assets to pre-cache on install (app shell)
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch(() => {
        // Ignore cache failures (assets may not exist yet in dev)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and non-same-origin
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API routes: network-first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ ok: false, error: 'Offline — brak połączenia' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )
      })
    )
    return
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached ?? fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Navigation: network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL).then((offline) => {
          return offline ?? new Response('<h1>Offline</h1>', {
            headers: { 'Content-Type': 'text/html' },
          })
        })
      })
    )
  }
})

// ─── Push notification handlers ───────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'NutriCoach', body: event.data.text() }
  }

  const title = payload.title ?? 'NutriCoach'
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.tag ?? 'nutricoach-default',
    data: payload.data ?? {},
    actions: payload.actions ?? [],
    requireInteraction: payload.requireInteraction ?? false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  const url = data.url ?? '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'NOTIFICATION_CLICK', url })
          return
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe on key rotation
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
      .catch(() => {/* silent — user will re-subscribe on next visit */})
  )
})

