// Service Worker for RICORRENZA
// Provides comprehensive offline support with progressive caching

const CACHE_NAME = 'ricorrenza-v2';
const OFFLINE_URL = '/offline.html';

// CRITICAL pages to preload immediately (don't slow down installation)
const CRITICAL_CACHE = [
  '/',
  '/offline.html',
  '/rickshaw.svg',
  '/ambulance-animated.svg'
];

// Pages to cache progressively (on first visit)
const PROGRESSIVE_CACHE_ROUTES = [
  '/login',
  '/security-login',
  '/coordinator',
  '/council',
  '/events',
  '/gallery',
  '/sponsors',
  '/schedule',
  '/rico-family',
  '/homebound',
  '/pass-registration',
  '/pass-download',
  '/health',
  '/coming-soon'
];

// Optional static assets (cached on demand)
const OPTIONAL_ASSETS = [
  '/noise.png',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - preload ONLY critical assets (fast!)
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Only cache critical assets during install (non-blocking, fast)
      console.log(`[SW] Caching ${CRITICAL_CACHE.length} critical assets...`);
      try {
        await cache.addAll(CRITICAL_CACHE);
        console.log('[SW] ✓ Critical assets cached');
      } catch (error) {
        console.error('[SW] Failed to cache critical assets:', error);
      }
    })
  );
  self.skipWaiting();
});

// After activation, warm up the cache progressively in background (doesn't block anything)
function warmUpCache() {
  caches.open(CACHE_NAME).then((cache) => {
    console.log('[SW] Starting background cache warm-up...');
    
    // Cache pages one at a time with delays to avoid performance impact
    let delay = 0;
    PROGRESSIVE_CACHE_ROUTES.forEach((route, index) => {
      setTimeout(() => {
        fetch(route)
          .then((response) => {
            if (response.ok) {
              cache.put(route, response);
              console.log(`[SW] Background cached: ${route}`);
            }
          })
          .catch(() => {
            // Silently fail - will cache on first visit instead
          });
      }, delay);
      delay += 100; // 100ms between each request to avoid overwhelming the browser
    });
  });
}

// Activate event - clean up old caches and start warm-up
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      // Start warming up cache in background (non-blocking)
      warmUpCache();
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with smart strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API requests (always fetch from network)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);
  
  // For ALL assets, use cache-first with stale-while-revalidate
  // This is SAFE because Vite uses hash-based filenames (e.g., main-abc123.js)
  // When there's a new build, the filename changes, so no risk of stale modules
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Always fetch in background to keep cache fresh
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached version if available
          return cachedResponse;
        });

      // If we have a cached response, return it immediately
      // while updating cache in background
      if (cachedResponse) {
        return cachedResponse;
      }

      // No cache, wait for network
      return fetchPromise
        .catch(() => {
          // Network failed and no cache - show offline page for HTML
          if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
          
          // For other requests, return error
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
    })
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache clear requests (useful when dynamic imports fail)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared, reloading...');
        // Notify all clients to reload
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
  
  // Force update check
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});
