/**
 * Video Optimization Utility
 *
 * Provides a best-effort client-side video re-encoding pipeline using
 * MediaSource/MediaRecorder where available. This is intentionally
 * conservative: when browser APIs are unavailable or the operation fails,
 * the original file is returned unchanged.
 */

export interface VideoOptimizationOptions {
  maxWidth?: number; // target width (preserve aspect ratio)
  maxHeight?: number; // target height
  bitrate?: number; // target bitrate in bits/sec (approx)
  mimeType?: string; // desired output mimeType, e.g., 'video/webm;codecs=vp8'
  force?: boolean; // if true, optimize even if input file is small
}

const DEFAULT_VIDEO_OPTIONS: VideoOptimizationOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  bitrate: 800_000, // ~800kbps
  mimeType: 'video/webm;codecs=vp8,opus',
};

export const optimizeVideo = async (file: File, options: VideoOptimizationOptions = {}): Promise<File> => {
  const opts = { ...DEFAULT_VIDEO_OPTIONS, ...options };

  // Only attempt for recognized video types
  if (!file.type.startsWith('video/')) return file;

  // If MediaRecorder is not available, abort and return original
  if (typeof MediaRecorder === 'undefined') return file;

  try {
    // Create a blob URL and video element to play the source
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Video load failed')); };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError as any);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError as any);
    });

    // Compute scale to fit within limits while preserving aspect
    const { videoWidth: w, videoHeight: h } = video;
    let targetW = w;
    let targetH = h;
    if (opts.maxWidth && targetW > opts.maxWidth) {
      targetH = Math.round((targetH * opts.maxWidth) / targetW);
      targetW = opts.maxWidth as number;
    }
    if (opts.maxHeight && targetH > opts.maxHeight) {
      targetW = Math.round((targetW * opts.maxHeight) / targetH);
      targetH = opts.maxHeight as number;
    }

    // Draw the video to a canvas and capture stream for MediaRecorder
    // If captureStream is not supported, fallback to original file
    const stream = (video as any).captureStream ? (video as any).captureStream() : null;
    if (!stream) {
      URL.revokeObjectURL(url);
      return file;
    }

    // Optionally, resize the visual output by drawing onto an OffscreenCanvas
    // and capturing that as a stream if supported.
    let outputStream = stream;
    if (typeof OffscreenCanvas !== 'undefined' && targetW && targetH && (targetW !== w || targetH !== h)) {
      try {
        const off = new OffscreenCanvas(targetW, targetH);
        const ctx = off.getContext('2d');
        if (ctx) {
          const drawLoop = () => {
            try { ctx.drawImage(video, 0, 0, targetW, targetH); } catch {}
            raf = requestAnimationFrame(drawLoop);
          };
          let raf = 0 as any;
          drawLoop();
          const canvasStream = (off as any).captureStream ? (off as any).captureStream(30) : null;
          if (canvasStream) {
            outputStream = canvasStream;
          } else {
            cancelAnimationFrame(raf);
          }
        }
      } catch (e) {
        // ignore and fall back to direct captureStream
      }
    }

      const mime = (opts.mimeType || DEFAULT_VIDEO_OPTIONS.mimeType) as string;
    const recorder = new MediaRecorder(outputStream, { mimeType: mime, bitsPerSecond: opts.bitrate });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    const startPromise = new Promise<void>((resolve, reject) => {
      recorder.onstart = () => resolve();
      recorder.onerror = (e) => reject(e);
    });

    recorder.start(250);
    await startPromise;

  // Play through the video once while recording; limit duration to avoid long re-encodes
  try { await video.play(); } catch { /* ignore play errors (autoplay restrictions) */ }
    // Wait until playback finishes or 30s timeout
    await Promise.race([
      new Promise<void>((res) => video.addEventListener('ended', () => res())),
      new Promise<void>((res) => setTimeout(res, Math.min(30_000, Math.max(5000, file.size / 10000))))
    ]);

    // Stop recorder
    recorder.stop();

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      // Fallback: ensure onstop is called
      setTimeout(() => resolve(new Blob(chunks, { type: mime })), 2000);
    });

    URL.revokeObjectURL(url);

    if (!blob || !blob.size) return file;

    // If optimized is larger than original, prefer original
    if (blob.size >= file.size) {
      return file;
    }

    const ext = mime.includes('webm') ? 'webm' : mime.includes('mp4') ? 'mp4' : 'webm';
    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.' + ext, { type: mime });
    return newFile;
  } catch (e) {
    console.warn('Video optimization failed, returning original file', e);
    return file;
  }
};
