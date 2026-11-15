import { useEffect, useRef, type RefObject } from 'react';
import { smoothRange } from './cinematicMotion';

type Props = {
  video: RefObject<HTMLVideoElement>;
  progress: { current: number };
  mobile: boolean;
  onReady: () => void;
  onFailure: () => void;
  registerDraw: (draw: (() => void) | null) => void;
};

/** Billowing fog sampled from the actual film's upper cloud banks, not a sliding image. */
export default function VideoCloudTransition({ video, progress, mobile, onReady, onFailure, registerDraw }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current, film = video.current;
    const ctx = (() => { try { return surface?.getContext('2d', { alpha: true }); } catch { return null; } })();
    if (!surface || !ctx || !film) { onFailure(); return; }
    let tiles: { canvas: HTMLCanvasElement; aspect: number }[] = [], frame = 0, last = 0, clock = 0, disposed = false;
    let width = 1, height = 1, ready = false;
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      surface.width = Math.round(width * dpr); surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const draw = () => {
      if (disposed) return;
      const p = progress.current;
      ctx.clearRect(0, 0, width, height);
      if (!tiles.length || p <= .475 || p >= .655) return;
      const arrival = smoothRange(.48, .55, p), departure = smoothRange(.59, .65, p);
      const density = arrival * (1 - departure);
      // Opaque only at the covered midpoint; the original video/3D remains visible through wisps.
      ctx.globalAlpha = smoothRange(.5, .55, p) * (1 - smoothRange(.59, .645, p));
      ctx.fillStyle = '#0a211b'; ctx.fillRect(0, 0, width, height);
      const cols = width > height ? 6 : 4, rows = 5;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const i = row * cols + col, depth = .75 + (i % 4) * .18, tile = tiles[i % tiles.length];
        const h = height * .65 * depth, w = h * tile.aspect;
        const spread = 1 + arrival * (.24 + depth * .16) + departure * depth * .5;
        // Cloud banks expand away from a vanishing point at different depths.
        // This avoids the old vertical sliding-sheet motion and stretched crops.
        const x = width * .52 + (col / (cols - 1) * width - width * .52) * spread + Math.sin(clock * .13 + i * 1.7) * width * .028;
        const y = height * .28 + (row / (rows - 1) * height - height * .28) * spread + Math.cos(clock * .11 + i) * height * .02;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(clock * .07 + i * .6) * .035);
        ctx.globalAlpha = density * (.68 + (i % 4) * .08);
        ctx.drawImage(tile.canvas, -w * spread / 2, -h * spread / 2, w * spread, h * spread);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };
    const tick = (time: number) => {
      frame = 0;
      if (disposed || document.hidden || progress.current <= .475 || progress.current >= .655) return;
      if (time - last >= 40) { clock += Math.min(.08, (time - last) / 1000); last = time; draw(); }
      frame = requestAnimationFrame(tick);
    };
    const render = () => {
      draw();
      if (!frame && tiles.length && progress.current > .475 && progress.current < .655 && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); }
    };
    const sample = () => {
      if (disposed || ready || progress.current < .475 || !film.videoWidth || film.readyState < 2 || film.seeking) return;
      const terminal = mobile ? Math.min(17.75, film.duration - 1 / 24) : film.duration - 1 / 24;
      if (!Number.isFinite(terminal) || film.currentTime < terminal - .12) return;
      const next: { canvas: HTMLCanvasElement; aspect: number }[] = [];
      for (let i = 0; i < 8; i++) {
        // Keep larger areas of the original sky; tiny enlarged crops lose all cloud detail.
        const x = i % 2 ? .58 : .015, y = .004 + Math.floor(i / 2) * .008;
        const cropW = film.videoWidth * .4, cropH = film.videoHeight * (mobile ? .24 : .3), aspect = cropW / cropH;
        const tile = document.createElement('canvas'); tile.width = 512; tile.height = Math.round(512 / aspect);
        const paint = tile.getContext('2d'); if (!paint) continue;
        try { paint.drawImage(film, film.videoWidth * x, film.videoHeight * y, cropW, cropH, 0, 0, tile.width, tile.height); }
        catch { onFailure(); return; }
        paint.globalCompositeOperation = 'destination-in';
        paint.save(); paint.translate(tile.width / 2, tile.height / 2); paint.scale(tile.width / 2, tile.height / 2);
        const mask = paint.createRadialGradient(0, 0, .06, 0, 0, 1);
        mask.addColorStop(0, '#fff'); mask.addColorStop(.5, '#fff'); mask.addColorStop(.78, '#ffffffaa'); mask.addColorStop(1, '#ffffff00');
        paint.fillStyle = mask; paint.fillRect(-1, -1, 2, 2); paint.restore(); next.push({ canvas: tile, aspect });
      }
      if (!next.length) { onFailure(); return; }
      tiles = next; render();
      if (!ready) { ready = true; onReady(); }
    };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else render(); };
    registerDraw(render);
    film.addEventListener('seeked', sample); film.addEventListener('loadeddata', sample);
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    resize(); sample();
    return () => {
      disposed = true; cancelAnimationFrame(frame); tiles = []; registerDraw(null);
      film.removeEventListener('seeked', sample); film.removeEventListener('loadeddata', sample);
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility);
      surface.width = surface.height = 1;
    };
  }, [video, progress, mobile, onReady, onFailure, registerDraw]);
  return <canvas ref={canvas} className="cinematic-video-clouds" data-video-clouds aria-hidden="true" />;
}
