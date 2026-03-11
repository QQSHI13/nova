const CACHE_NAME = 'nova-site-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).catch((error) => {
      console.error('Cache activation failed:', error);
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request)
          .catch((error) => {
            console.error('Fetch failed for:', event.request.url, error);
            // Return a fallback response for failed requests
            if (event.request.destination === 'document') {
              return new Response(
                '<h1>Offline</h1><p>Unable to load this page. Please check your connection.</p>',
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
            // Re-throw for non-document requests
            throw error;
          });
      })
      .catch((error) => {
        console.error('Cache match or fetch failed:', error);
        throw error;
      })
  );
});
