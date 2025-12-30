// Service Worker Registration Utility

// Global error handler for dynamic import failures
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Detect "Failed to fetch dynamically imported module" errors
    if (event.message && event.message.includes('Failed to fetch dynamically imported module')) {
      console.error('[SW Recovery] Dynamic import failed, clearing cache...');
      
      // Clear service worker cache and reload
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        
        // Listen for cache cleared confirmation
        navigator.serviceWorker.addEventListener('message', (msgEvent) => {
          if (msgEvent.data && msgEvent.data.type === 'CACHE_CLEARED') {
            console.log('[SW Recovery] Cache cleared, reloading...');
            window.location.reload();
          }
        });
        
        // Fallback: reload after 1 second if no response
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // No service worker, just reload
        window.location.reload();
      }
      
      event.preventDefault();
    }
  });
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  if (confirm('New version available! Refresh to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('[SW] Service Worker unregistration failed:', error);
      });
  }
}
