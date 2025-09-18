import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Detect touch capability early and mark the document for CSS overrides.
// Some mobile browsers may still report (hover: hover) incorrectly; this is a more reliable runtime signal.
(() => {
  try {
    const isTouch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0);
    if (isTouch) {
      document.documentElement.classList.add('touch-enabled');
      // Persistent tap glow handler: adds .tap-glow for ~850ms after touch
      let lastTapEl: HTMLElement | null = null;
      window.addEventListener('touchstart', (e) => {
        const target = (e.target as HTMLElement).closest('.home-sponsor-glow, .sponsor-interactive') as HTMLElement | null;
        if (!target) return;
        if (lastTapEl && lastTapEl !== target) {
          lastTapEl.classList.remove('tap-glow');
        }
        target.classList.add('tap-glow');
        lastTapEl = target;
        const persistFor = 850; // ms (adjust if needed)
        setTimeout(() => {
          // Only remove if it hasn't been tapped again meantime
            if (target === lastTapEl) {
              target.classList.remove('tap-glow');
              if (lastTapEl === target) lastTapEl = null;
            }
        }, persistFor);
      }, { passive: true });
    }
  } catch { /* no-op */ }
})();

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
