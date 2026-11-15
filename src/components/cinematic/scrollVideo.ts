import { clamp01 } from './cinematicMotion';
import { INTRO_LIMITS } from './introCapability';

export const VIDEO_SCROLL_END = .48;
export const CLOUD_HOLD_MS = 240;
export const HOME_FADE_MS = 320;

export function videoTimeForProgress(progress: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  // Seek the last displayed frame, never duration (which can produce a black end frame).
  return clamp01(progress / VIDEO_SCROLL_END) * Math.max(0, duration - 1 / 24);
}

/** Latest-request-wins seeking: never queue many decoder seeks during a fast swipe. */
export function createScrollVideoController(video: HTMLVideoElement, callbacks: {
  onReady: () => void; onBuffer: (percent: number) => void; onFailure: () => void; cutoff?: number;
}) {
  let progress = 0, disposed = false, frame = 0, ready = false, failed = false;
  let seekTimer: ReturnType<typeof setTimeout> | undefined, seekStarted = 0, pendingSeek = false, slowSeeks = 0;
  const failure = () => { if (!disposed && !failed) { failed = true; clearTimeout(seekTimer); callbacks.onFailure(); } };
  const armSeekTimeout = () => {
    clearTimeout(seekTimer);
    if (pendingSeek && !document.hidden) seekTimer = setTimeout(failure, INTRO_LIMITS.seek);
  };
  const beginSeek = () => {
    if (pendingSeek) return;
    pendingSeek = true; seekStarted = performance.now(); armSeekTimeout();
  };
  const flush = () => {
    frame = 0;
    if (disposed || failed || document.hidden || video.readyState < 1 || video.seeking) return;
    const duration = callbacks.cutoff ? Math.min(video.duration, callbacks.cutoff + 1 / 24) : video.duration;
    const target = videoTimeForProgress(progress, duration);
    if (Math.abs(video.currentTime - target) < 1 / 48) return;
    beginSeek();
    try { video.currentTime = target; } catch { /* The seek deadline also covers unavailable ranges. */ }
  };
  const schedule = () => { if (!disposed && !failed && !frame && !document.hidden) frame = requestAnimationFrame(flush); };
  const decoded = () => {
    if (pendingSeek && !document.hidden) slowSeeks = performance.now() - seekStarted > 550 ? slowSeeks + 1 : 0;
    pendingSeek = false; clearTimeout(seekTimer);
    if (slowSeeks >= 5) { failure(); return; }
    schedule();
  };
  const buffer = () => {
    if (disposed || failed) return;
    if (video.readyState >= 2 && !ready) { ready = true; callbacks.onReady(); }
    const duration = video.duration;
    if (Number.isFinite(duration) && duration > 0 && video.buffered.length) {
      callbacks.onBuffer(Math.round(clamp01(video.buffered.end(video.buffered.length - 1) / duration) * 100));
    }
    schedule();
  };
  const pause = () => { if (!video.paused) video.pause(); };
  const visibility = () => {
    pause();
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; clearTimeout(seekTimer); slowSeeks = 0; }
    else { seekStarted = performance.now(); armSeekTimeout(); schedule(); }
  };
  const events: [string, EventListener][] = [
    ['loadedmetadata', buffer], ['loadeddata', buffer], ['canplay', buffer], ['progress', buffer],
    ['seeking', beginSeek], ['seeked', decoded], ['play', pause], ['error', failure],
  ];
  events.forEach(([event, listener]) => video.addEventListener(event, listener));
  document.addEventListener('visibilitychange', visibility);
  video.muted = true; video.loop = false; video.playsInline = true;
  pause(); buffer();
  return {
    seek(value: number) { progress = clamp01(value); schedule(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(seekTimer); frame = 0; pause();
      events.forEach(([event, listener]) => video.removeEventListener(event, listener));
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
