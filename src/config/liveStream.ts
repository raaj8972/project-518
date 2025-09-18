// Centralized live stream/watch live configuration
// Environment variable overrides can be provided via import.meta.env (Vite) using VITE_ prefixes.

const num = (v: string | undefined, fallback: number): number => {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const LIVE_LEAD_MINUTES = num((import.meta as any).env?.VITE_LIVE_LEAD_MINUTES, 60); // minutes before start to surface button (disabled)
export const INLINE_COUNTDOWN_THRESHOLD_MIN = num((import.meta as any).env?.VITE_INLINE_COUNTDOWN_THRESHOLD_MIN, 15); // minutes before start to switch to inline mm:ss
export const COUNTDOWN_TICK_MS = 1000; // update interval for fine-grained countdown

export interface LiveAnalyticsHandler {
  (payload: { url: string; startTime: string; clickedAt: string; isLive: boolean; isForcedLive?: boolean }): void;
}

// Pluggable analytics callback (can be replaced at runtime if needed)
let handler: LiveAnalyticsHandler | null = null;
export const setLiveAnalyticsHandler = (h: LiveAnalyticsHandler | null) => { handler = h; };
export const fireLiveClick = (payload: { url: string; startTime: string; isLive: boolean; isForcedLive?: boolean }) => {
  if (handler) {
    try { handler({ ...payload, clickedAt: new Date().toISOString() }); } catch {}
  } else {
    // Fallback simple console log (can be removed if noisy)
    // eslint-disable-next-line no-console
    console.log('[live-analytics] click', payload);
  }
};
