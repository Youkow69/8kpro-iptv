// 8K Pro Ultimate - Service Worker v5
// Force update: new version = clear all caches
const CACHE_NAME = '8kpro-v5-20260327b';

self.addEventListener('install', () => {
  // Skip waiting = activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL caches on activate
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache: API, streams, proxy
  if (url.pathname.startsWith('/api/') ||
      url.pathname.includes('.ts') ||
      url.pathname.includes('.m3u')) {
    return;
  }

  // ALWAYS network-first for everything (JS, CSS, HTML)
  // Only use cache as offline fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((c) => c || new Response('Offline', { status: 503 })))
  );
});
