/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

// Injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// -- Cache offline fallback page on install ----------------------------------
const OFFLINE_PAGE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('mindshift-offline-v1').then(cache => cache.add(OFFLINE_PAGE))
  )
})

// -- Navigation requests — serve app shell or offline page -------------------
const navigationHandler = new NetworkFirst({
  cacheName: 'navigation-cache',
  networkTimeoutSeconds: 5,
})

registerRoute(
  new NavigationRoute(navigationHandler, {
    // Don't handle API routes or static assets as navigation
    denylist: [/\/api\//, /\.(js|css|png|jpg|svg|webp|ico|woff2?)$/],
  })
)

// -- Supabase API — network-only (sensitive data, no caching) ----------------
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkOnly()
)

// -- Anthropic API — network-only --------------------------------------------
registerRoute(
  ({ url }) => url.hostname.includes('anthropic.com'),
  new NetworkOnly()
)

// -- Static assets — cache first (immutable hashes in filenames) -------------
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images-cache' })
)

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({ cacheName: 'fonts-cache' })
)

// -- Catch handler — show offline page for failed navigation -----------------
setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request?.mode === 'navigate') {
    const cache = await caches.open('mindshift-offline-v1')
    const cached = await cache.match(OFFLINE_PAGE)
    if (cached) return cached
  }
  return Response.error()
})

// -- Push notification handler ------------------------------------------------
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; tag?: string; url?: string } | undefined
  const title = data?.title ?? 'MindShift'
  const body  = data?.body  ?? "Time to check in 🌊"

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   data?.tag ?? 'mindshift-reminder',
      data:  { url: data?.url ?? '/' },
    })
  )
})

// -- Notification click — open the app at the right URL ----------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = (event.notification.data as { url?: string })?.url ?? '/'
  // Validate URL is same-origin or relative (prevent open redirect via push payload)
  const isSafe = (raw.startsWith('/') && !raw.startsWith('//')) || raw.startsWith(self.location.origin)
  const url = isSafe ? raw : '/'
  event.waitUntil(
    (self.clients as Clients).openWindow(url)
  )
})
