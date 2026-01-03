// Service Worker for RICORRENZA
// Provides comprehensive offline support with progressive caching

const CACHE_NAME = 'ricorrenza-v2';
const OFFLINE_URL = '/offline.html';

// CRITICAL pages to preload immediately (don't slow down installation)
const CRITICAL_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/rickshaw.svg',
  '/ambulance-animated.svg',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Pages to cache progressively (on first visit)
const PROGRESSIVE_CACHE_ROUTES = [
  '/login',
  '/security-login',
  '/security-dashboard',
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

// Fetch event - serve with smart strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase API requests (always fetch from network)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  const { request } = event;
  const isNavigation = request.mode === 'navigate';
  const isHtml = request.headers.get('accept')?.includes('text/html');

  /**
   * STRATEGY 1: Network-First for HTML & Navigation
   * Prevents loading a stale index.html that points to old JS chunks.
   * If offline, falls back to the cached index.html immediately.
   */
  if (isNavigation || isHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }
          return caches.match(request).then(cached => cached || caches.match(OFFLINE_URL));
        })
        .catch(() => {
          return caches.match(request).then(cached => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  /**
   * STRATEGY 2: Cache-First for Hashed Assets (JS, CSS, Images)
   * This is HIGHLY PERFORMANT. Since Vite uses unique hashes in filenames,
   * we never risk serving a "wrong" version of a specific chunk.
   */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Even with a cache hit, we refresh the cache in the background (stale-while-revalidate)
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Fallback for image failures
          if (request.destination === 'image') {
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#333" font-family="sans-serif">Offline</text></svg>', {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          }
          return new Response('Offline resource not found', { status: 404 });
        });
    })
  );
});

// Background Sync event - sync pending scans automatically
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync event:', event.tag);
  
  if (event.tag === 'sync-scans') {
    event.waitUntil(syncPendingScans());
  }
});

/**
 * Sync pending scans from IndexedDB to server
 */
async function syncPendingScans() {
  try {
    console.log('[SW] Starting background sync of pending scans...');
    
    // Open IndexedDB
    const db = await openDatabase();
    const scans = await getPendingScans(db);
    
    if (scans.length === 0) {
      console.log('[SW] No pending scans to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${scans.length} pending scans...`);
    
    let synced = 0;
    let failed = 0;
    
    for (const scan of scans) {
      try {
        // Upload scan to server
        const response = await fetch('https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/pass_scans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': self.SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${self.SUPABASE_ANON_KEY || ''}`
          },
          body: JSON.stringify({
            pass_token: scan.pass_token,
            participant_name: scan.participant_name,
            scan_result: scan.result,
            security_username: scan.security_username,
            pass_type: scan.pass_type,
            scanned_at: scan.timestamp
          })
        });
        
        if (response.ok || response.status === 409) {
          // Success or duplicate - mark as synced
          await markScanAsSynced(db, scan.id);
          synced++;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to sync scan ${scan.id}:`, error);
        await incrementSyncAttempts(db, scan.id);
        failed++;
      }
    }
    
    console.log(`[SW] Background sync complete: ${synced} synced, ${failed} failed`);
    
    // Notify clients of sync results
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        synced,
        failed
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Re-throw to retry
  }
}

/**
 * Open IndexedDB from Service Worker
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SecurityScanner', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending scans from IndexedDB
 */
function getPendingScans(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_scans'], 'readonly');
    const store = transaction.objectStore('pending_scans');
    const index = store.index('synced');
    const request = index.getAll(0); // 0 = false
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark scan as synced
 */
function markScanAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_scans'], 'readwrite');
    const store = transaction.objectStore('pending_scans');
    const request = store.get(id);
    
    request.onsuccess = () => {
      const scan = request.result;
      if (scan) {
        scan.synced = true;
        store.put(scan);
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Increment sync attempts
 */
function incrementSyncAttempts(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_scans'], 'readwrite');
    const store = transaction.objectStore('pending_scans');
    const request = store.get(id);
    
    request.onsuccess = () => {
      const scan = request.result;
      if (scan) {
        scan.sync_attempts = (scan.sync_attempts || 0) + 1;
        store.put(scan);
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

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
