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
