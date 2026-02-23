import './shims/envShims';
import './utils/preloadBrand'; // Auto-preload uploaded brand logos
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';

declare global {
  interface Window {
    __APP_READY__?: boolean;
    deferredPrompt?: any;
  }
}

const rootEl = document.getElementById('root')!;

function removeSkeleton() {
  const skeleton = document.getElementById('app-skeleton');
  if (skeleton) {
    skeleton.style.opacity = '0';
    skeleton.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => skeleton.remove(), 500);
  }
}

function showFatal(message: string) {
  // Simple visible overlay instead of a silent blank screen
  const style = `position:fixed;inset:0;background:#0a0a0a;color:#ff4444;display:flex;align-items:center;justify-content:center;font-family:Orbitron, sans-serif;padding:16px;text-align:center;z-index:99999;`;
  rootEl.innerHTML = `<div style="${style}"><div><div style="font-weight:700;margin-bottom:8px;font-size:1.5rem;">FATAL STARTUP ERROR</div><div style="max-width:720px;white-space:pre-wrap;margin-bottom:16px;color:#ccc;">${message}</div><button onclick="window.location.reload()" style="background:#00ffff;color:#000;border:none;padding:12px 24px;border-radius:4px;cursor:pointer;font-weight:900;font-family:inherit;">RETRY LOAD</button></div></div>`;
  removeSkeleton();
}

// Retry helper for dynamic imports
async function retryImport<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn(`Import failed, retrying in ${delay}ms...`, err);
    await new Promise(r => setTimeout(r, delay));
    return retryImport(fn, retries - 1, delay * 2);
  }
}

(async () => {
  try {
    console.log('[Main] Starting application bootstrap...');
    
    // Attempt to load the main App module with retries
    const AppModule = await retryImport(() => import('./App.tsx'));
    const App = AppModule.default;
    
    console.log('[Main] App module loaded, rendering root...');
    
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    // Signal readiness and clean up UI
    window.__APP_READY__ = true;
    removeSkeleton();
    
    // Register service worker for offline support
    registerServiceWorker();

    // Handle PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Installation prompt deferred');
      window.deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Application installed successfully');
      window.deferredPrompt = null;
    });
    
    console.log('[Main] Bootstrap sequence complete');
  } catch (err: any) {
    console.error('Fatal startup error:', err);
    showFatal(err?.message || 'Unknown startup error. Check console logs.');
  }
})();
