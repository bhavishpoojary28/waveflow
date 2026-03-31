const CACHE_NAME = 'waveflow-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// Install Event - cache core assets and skip waiting to force update immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - auto-clear old caches to ensure latest version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https traffic (ignore chrome-extension:// etc)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If fetch is successful, clone and put it in cache.
        // We ensure we only cache valid responses and strictly same-origin (basic) assets if desired.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Avoid caching large cross-origin audio files to prevent cache bloat
            if (networkResponse.type === 'basic' || event.request.url.includes('manifest') || event.request.url.includes('icon')) {
               cache.put(event.request, responseToCache);
            }
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fetch fails (user is offline), fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse;
        });
      })
  );
});
