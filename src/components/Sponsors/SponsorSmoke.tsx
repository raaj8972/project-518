'use client';

import { memo, useEffect, useRef } from 'react';

interface SmokePuff {
  x: number; y: number; radius: number; age: number; life: number;
  direction: number; phase: number; rotation: number; sprite: number;
}

function noise(x: number, y: number, seed: number): number {
  const hash = (a: number, b: number) => {
    const value = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
    + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
}

/** Soft circular density fields have zero alpha around every edge. */
function smokeSprite(seed: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = 96; sprite.height = 96;
  const context = sprite.getContext('2d')!;
  const pixels = context.createImageData(96, 96);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const nx = (x - 47.5) / 47.5, ny = (y - 47.5) / 47.5;
    const feather = Math.pow(Math.max(0, 1 - nx * nx - ny * ny), 2.2);
    const warp = noise(nx * 2.1 + 3, ny * 2.1 + 3, seed);
    let density = 0, amplitude = .58, frequency = 3.2;
    for (let octave = 0; octave < 4; octave++) {
      density += noise(nx * frequency + warp * 2, ny * frequency - warp * 2, seed + octave) * amplitude;
      amplitude *= .48; frequency *= 2.1;
    }
    const alpha = feather * Math.pow(Math.max(0, density - .2), 1.2);
    const index = (y * 96 + x) * 4;
    pixels.data[index] = 192; pixels.data[index + 1] = 202; pixels.data[index + 2] = 174;
    pixels.data[index + 3] = Math.min(255, alpha * 330);
  }
  context.putImageData(pixels, 0, 0);
  return sprite;
}

/** Small independently curling puffs flow from offscreen emitters, then dissolve. */
const SponsorSmoke = memo(function SponsorSmoke() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sprites = [smokeSprite(3), smokeSprite(17), smokeSprite(41)];
    const puffs: SmokePuff[] = [];
    let width = 1, height = 1, frame = 0, lastTime = 0, lastPaint = 0, time = 5;
    let visible = false;
    let emitLeft = 0, emitRight = 0;

    const emit = (direction: number, age = 0) => {
      const radius = 26 + Math.random() * 24;
      puffs.push({ x: direction === 1 ? -radius : width + radius, y: height * (.65 + Math.random() * .2), radius, age, life: 7 + Math.random() * 3, direction, phase: Math.random() * Math.PI * 2, rotation: Math.random() * Math.PI, sprite: Math.floor(Math.random() * sprites.length) });
    };
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      const ratio = Math.min(1, 1280 / width);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      puffs.length = 0;
      // A few differently aged puffs make the side sources visible immediately.
      for (let i = 0; i < 8; i++) {
        emit(i % 2 ? 1 : -1, i * .35);
        const puff = puffs[puffs.length - 1];
        puff.x += puff.direction * puff.age * 38; puff.y -= puff.age * 11; puff.radius += puff.age * 11;
      }
    };

    const paint = (delta: number) => {
      context.clearRect(0, 0, width, height);
      emitLeft += delta; emitRight += delta;
      if (emitLeft > .3 && Math.sin(time * .7) > -.4 && puffs.length < 52) { emit(1); emitLeft = 0; }
      if (emitRight > .34 && Math.sin(time * .62 + 2.1) > -.4 && puffs.length < 52) { emit(-1); emitRight = 0; }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i];
        puff.age += delta;
        if (puff.age >= puff.life) { puffs.splice(i, 1); continue; }
        puff.x += (puff.direction * 38 + Math.sin(time * .8 + puff.phase) * 10) * delta;
        puff.y += (-12 + Math.sin(time * 1.1 + puff.phase) * 11) * delta;
        puff.radius += 11 * delta; puff.rotation += puff.direction * .09 * delta;
        const fadeIn = Math.min(1, puff.age / .8);
        const fadeOut = Math.pow(Math.max(0, 1 - puff.age / puff.life), .8);
        const edge = Math.min(1, Math.abs(puff.x - width / 2) / (width * .32));
        context.globalAlpha = fadeIn * fadeOut * edge * .48;
        context.save(); context.translate(puff.x, puff.y); context.rotate(puff.rotation);
        context.scale(1.55 + Math.sin(time * .5 + puff.phase) * .2, .85 + Math.cos(time * .7 + puff.phase) * .18);
        context.drawImage(sprites[puff.sprite], -puff.radius, -puff.radius, puff.radius * 2, puff.radius * 2);
        context.restore();
      }
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (!lastPaint || now - lastPaint >= 1000 / 24) {
        const delta = lastTime ? Math.min(.08, (now - lastTime) / 1000) : 0;
        lastTime = now; lastPaint = now; time += delta; paint(delta);
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0; lastPaint = 0;
      const active = visible && !document.hidden && !preference?.matches;
      canvas.dataset.active = String(active);
      if (active) frame = requestAnimationFrame(tick);
      else if (preference?.matches) paint(0);
    };
    measure();
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { rootMargin: '80px' });
    intersection?.observe(canvas);
    if (!intersection) { visible = true; sync(); }
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(canvas);
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', sync);
    preference?.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(frame); intersection?.disconnect(); resize?.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', sync);
      preference?.removeEventListener('change', sync);
      for (const sprite of sprites) { sprite.width = 0; sprite.height = 0; }
    };
  }, []);

  return <canvas ref={canvasRef} className="festival-partner-smoke" data-active="false" aria-hidden="true" />;
});

export default SponsorSmoke;
