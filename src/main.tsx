import './shims/envShims';
import './utils/preloadBrand'; // Auto-preload uploaded brand logos
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootEl = document.getElementById('root')!;

function showFatal(message: string) {
  // Simple visible overlay instead of a silent blank screen
  const style = `position:fixed;inset:0;background:#fff;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif;padding:16px;text-align:center;z-index:99999;`;
  rootEl.innerHTML = `<div style="${style}"><div><div style="font-weight:700;margin-bottom:8px;">App failed to start</div><div style="max-width:720px;white-space:pre-wrap;">${message}</div></div></div>`;
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
  } catch (err: any) {
    console.error('Fatal startup error:', err);
    showFatal(err?.message || 'Unknown startup error. Check console logs.');
  }
})();
