const CACHE_NAME = 'nova-site-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
      .catch((error) => {
        console.error('Cache activation failed:', error);
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'HARD_RELOAD') {
    // Clear cache on hard reload to ensure fresh content
    caches.delete(CACHE_NAME).then(() => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      });
    });
  }
});

self.addEventListener('fetch', (event) => {
  // Detect hard reload via cache-control header (per-request, no shared state)
  const isHardRefresh = event.request.headers.get('cache-control') === 'no-cache' ||
                        event.request.headers.get('pragma') === 'no-cache';

  if (isHardRefresh) {
    // Bypass cache on hard reload
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with fresh response
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.error('Fetch failed for:', event.request.url, error);
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
          throw error;
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache new responses for future
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('Fetch failed for:', event.request.url, error);
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
            throw error;
          });
      })
      .catch((error) => {
        console.error('Cache match or fetch failed:', error);
        throw error;
      })
  );
});
