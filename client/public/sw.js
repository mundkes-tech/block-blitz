const CACHE_NAME = 'block-blitz-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith('http')) return

  const requestUrl = new URL(event.request.url)
  const isAudioRequest =
    requestUrl.pathname.startsWith('/sounds/') ||
    /\.(?:wav|mp3|ogg|m4a|aac)$/i.test(requestUrl.pathname)
  const isApiRequest = requestUrl.pathname.startsWith('/api/')

  // Let Vercel/browser streaming handle media and API responses directly.
  // Audio elements may use range requests that should not pass through CacheStorage.
  if (isAudioRequest || isApiRequest) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).catch(() => new Response('', { status: 503 }))
    }),
  )
})
