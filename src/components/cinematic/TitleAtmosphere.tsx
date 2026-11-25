import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createTitleAtmosphereRenderer } from './titleAtmosphereRenderer';

const FRAME_INTERVAL = 1000 / 30;
const RAYS = [
  { from: -26, to: -17, strength: .24, width: 12 },
  { from: -18, to: -10, strength: .34, width: 7 },
  { from: -10, to: -3, strength: .46, width: 9 },
  { from: -3, to: 3, strength: .65, width: 5 },
  { from: 3, to: 11, strength: .44, width: 8 },
  { from: 10, to: 19, strength: .32, width: 6 },
  { from: 18, to: 28, strength: .22, width: 12 },
];

/** Photo-based cloud flow and light scattering, isolated from React's render loop. */
export default function TitleAtmosphere({ backdrop, running, paused }: { backdrop: string; running: boolean; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const syncPlayback = useRef<() => void>(() => {});
  const playback = useRef({ running, paused });
  playback.current = { running, paused };

  useEffect(() => {
    const element = canvas.current, container = host.current;
    if (!element || !container) return;
    let disposed = false, failed = false;
    let renderer: ReturnType<typeof createTitleAtmosphereRenderer> = null;
    let frame: number | undefined, previous: number | undefined, lastPaint = -Infinity, elapsed = 0;
    const image = new Image();
    setLive(false);

    const stop = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined; previous = undefined;
    };
    const fail = () => {
      failed = true; stop(); renderer?.dispose(); renderer = null;
      if (!disposed) setLive(false);
    };
    const size = () => {
      if (!renderer || disposed) return;
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(800_000 / (width * height)));
      try { renderer.resize(width, height, pixelRatio); renderer.draw(elapsed / 1000); }
      catch { fail(); }
    };
    const tick = (now: number) => {
      frame = undefined;
      if (disposed || failed || !renderer || !playback.current.running || playback.current.paused || document.hidden) {
        previous = undefined;
        return;
      }
      // Reset the timestamp on resume; hidden time never jumps the smoke ahead.
      if (previous !== undefined) elapsed += Math.min(now - previous, 100);
      previous = now;
      if (now - lastPaint >= FRAME_INTERVAL) {
        try { renderer.draw(elapsed / 1000); lastPaint = now; }
        catch { fail(); return; }
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (disposed || failed || !renderer || !playback.current.running || playback.current.paused || document.hidden) stop();
      else if (frame === undefined) { previous = undefined; lastPaint = -Infinity; frame = requestAnimationFrame(tick); }
    };
    syncPlayback.current = sync;
    const ready = () => {
      if (disposed || failed || renderer || !image.naturalWidth) return;
      try {
        renderer = createTitleAtmosphereRenderer(element, image);
        if (!renderer) return;
        size();
        if (!renderer || failed) return;
        // Reveal only after a complete frame; the reference photo stays underneath.
        renderer.draw(elapsed / 1000); setLive(true); sync();
      } catch { fail(); }
    };
    image.onload = ready;
    image.onerror = fail;
    image.src = backdrop;
    if (image.complete && image.naturalWidth) ready();
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    element.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', sync);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(size); observer.observe(container); }
    else window.addEventListener('resize', size);
    return () => {
      disposed = true; stop(); image.onload = null; image.onerror = null;
      observer?.disconnect(); window.removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', sync);
      element.removeEventListener('webglcontextlost', contextLost);
      renderer?.dispose(); renderer = null; syncPlayback.current = () => {};
    };
  }, [backdrop]);

  useEffect(() => { syncPlayback.current(); }, [running, paused]);

  return <div ref={host} className="rico-title-atmosphere" data-title-atmosphere data-live={live} aria-hidden="true">
    <img src={backdrop} alt="" decoding="async" />
    <canvas ref={canvas} className="rico-title-live-atmosphere" aria-hidden="true" />
    <div className="rico-title-cloud-flow" data-title-cloud-motion>
      <div className="rico-title-cloud-bank rico-title-cloud-bank-left"><img src={backdrop} alt="" decoding="async" /></div>
      <div className="rico-title-cloud-bank rico-title-cloud-bank-right"><img src={backdrop} alt="" decoding="async" /></div>
    </div>
    <div className="rico-title-rays">
      {RAYS.map((ray, index) => <i key={index} style={{
        '--ray-from': `${ray.from}deg`, '--ray-to': `${ray.to}deg`,
        '--ray-strength': ray.strength, '--ray-width': `${ray.width}%`,
      } as CSSProperties}><b /></i>)}
      <span className="rico-title-light-source" />
      <span className="rico-title-light-flare" />
    </div>
  </div>;
}
