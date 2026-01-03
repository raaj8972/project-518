// Service Worker Registration Utility

// Global error handler for dynamic import failures (Chunk Failure Recovery)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const isChunkError = 
      msg.includes('Failed to fetch dynamically imported module') || 
      msg.includes('Importing a module script failed') ||
      msg.toLowerCase().includes('network');

    if (isChunkError) {
      console.error('[SW Recovery] Critical asset failure detected, clearing cache...');
      
      // Attempt cache recovery
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        
        // Listen once for confirmation
        const handleMessage = (msgEvent: MessageEvent) => {
          if (msgEvent.data && msgEvent.data.type === 'CACHE_CLEARED') {
            console.log('[SW Recovery] Cache cleared, forcing clean reload...');
            window.location.reload();
            navigator.serviceWorker.removeEventListener('message', handleMessage);
          }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        
        // Fallback reload if SW doesn't respond
        setTimeout(() => window.location.reload(), 1500);
      } else {
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
