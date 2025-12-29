import './shims/envShims';
import './utils/preloadBrand'; // Auto-preload uploaded brand logos
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';

const rootEl = document.getElementById('root')!;

function showFatal(message: string) {
  // Simple visible overlay instead of a silent blank screen
  const style = `position:fixed;inset:0;background:#fff;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif;padding:16px;text-align:center;z-index:99999;`;
  rootEl.innerHTML = `<div style="${style}"><div><div style="font-weight:700;margin-bottom:8px;">App failed to start</div><div style="max-width:720px;white-space:pre-wrap;margin-bottom:16px;">${message}</div><button onclick="window.location.reload()" style="background:#b91c1c;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600;">Try Reloading</button></div></div>`;
}

(async () => {
  try {
    const AppModule = await import('./App.tsx');
    const App = AppModule.default;
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    // Register service worker for offline support
    if (import.meta.env.PROD) {
      registerServiceWorker();
    }
  } catch (err: any) {
    console.error('Fatal startup error:', err);
    showFatal(err?.message || 'Unknown startup error. Check console logs.');
  }
})();
