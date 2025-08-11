const CACHE_NAME = 'healthcare-pwa-v1';
const urlsToCache = [
  '/',
 
  '/manifest.json',
  '/assets/icons/icon-192x192.png',  
  '/assets/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install Se   rvice Wor ker
self.addEventListener('install', event => {
  console.log(' Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error(' Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log(' Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fixed fetch handler - only caches GET requests
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache GET requests with successful responses
        if (response && 
            response.status === 200 && 
            response.type === 'basic' && 
            event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - we're offline
        console.log(' Offline - checking cache for:', event.request.url);
        
        // First try to get from cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log(' Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
          // For API requests
            if (event.request.url.includes('/api/')) {
              return new Response(
                JSON.stringify({
                  success: false,
                  message: 'You are currently offline. This action requires an internet connection.',
                  offline: true
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
            
            // For other requests, return a generic offline response
            return new Response(
              'This resource is not available offline.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              }
            );
          });
      })
  );
});

// // Listen for messages from the main thread
// self.addEventListener('message', event => {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });
