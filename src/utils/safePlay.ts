// Lightweight helper to call media.play() and handle promise rejections
// Ensures AbortError and other rejections don't cause unhandled promise rejections
export default async function safePlay(media: HTMLMediaElement | null | undefined): Promise<void> {
  if (!media) return;
  try {
    const p = media.play();
    if (p && typeof (p as any).catch === 'function') {
      await p.catch((err: any) => {
        try {
          // AbortError often indicates autoplay was blocked or a new load interrupted a prior play.
          if (err && err.name === 'AbortError') {
            // Swallow AbortError silently in production; log in dev.
            if (process.env.NODE_ENV !== 'production') console.warn('safePlay: playback aborted', err);
            return;
          }
        } catch {}
        // For other errors, log at debug level but don't throw.
        if (process.env.NODE_ENV !== 'production') console.error('safePlay: error playing media', err);
      });
    }
  } catch (err) {
    // Guard against browsers that throw synchronously (rare)
    if (process.env.NODE_ENV !== 'production') console.error('safePlay: synchronous play() error', err);
  }
}
