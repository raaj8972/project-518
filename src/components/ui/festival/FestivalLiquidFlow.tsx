'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import { createLiquidDrops, stepLiquidDrops, type LiquidBounds, type LiquidPointer } from './liquidMotion';
import './FestivalLiquidFlow.css';

interface Ripple { x: number; y: number; born: number; strength: number }
interface Splash { x: number; y: number; vx: number; vy: number; born: number }

/** A viewport-sized canvas follows document-space water, including the footer. */
export const FestivalLiquidFlow = memo(function FestivalLiquidFlow() {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const refresh = useRef<() => void>(() => {});
  useEffect(() => { pausedRef.current = paused; refresh.current(); }, [paused]);

  useEffect(() => {
    const element = canvas.current;
    const host = layer.current;
    if (!element || !host) return;
    const context = element.getContext('2d', { alpha: true });
    if (!context) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let bounds: LiquidBounds = { width: 1, top: 0, bottom: 0 };
    let drops = createLiquidDrops(bounds);
    const pointer: LiquidPointer = { x: 0, y: 0, active: false, pressed: false };
    const ripples: Ripple[] = [];
    const splashes: Splash[] = [];
    let viewHeight = 1;
    let frame = 0;
    let scrollFrame = 0;
    let inView = false;
    let frameInterval = 1000 / 30;
    let lastTime = 0;
    let lastPaint = 0;
    let time = 0;
    let pointerAt = 0;
    let lastRipple = 0;
    let layoutDirty = true;
    let disposed = false;

    // Render the refractive rim and specular highlight once, then reuse the sprite.
    const sprite = document.createElement('canvas');
    sprite.width = 40; sprite.height = 80;
    const ink = sprite.getContext('2d');
    if (!ink) return;
    ink.translate(20, 49);
    // Bake a soft emerald halo into the tiny sprite once; no live blur/filter.
    const halo = ink.createRadialGradient(0, -1, 1, 0, -1, 20);
    halo.addColorStop(0, '#88ff5270'); halo.addColorStop(.45, '#77ed3c24'); halo.addColorStop(1, '#68ed3100');
    ink.fillStyle = halo; ink.fillRect(-20, -30, 40, 60);
    ink.beginPath();
    ink.moveTo(0, -31);
    ink.bezierCurveTo(-1, -18, -10, -10, -10, 0);
    ink.bezierCurveTo(-10, 14, 10, 14, 10, 0);
    ink.bezierCurveTo(10, -10, 1, -18, 0, -31);
    const glass = ink.createLinearGradient(-12, 0, 12, 4);
    glass.addColorStop(0, '#ddffc7d9'); glass.addColorStop(.18, '#96e66b99');
    glass.addColorStop(.5, '#24493730'); glass.addColorStop(.78, '#85e84a99'); glass.addColorStop(1, '#cfff94e6');
    ink.fillStyle = glass; ink.fill();
    ink.strokeStyle = '#b3d5a340'; ink.lineWidth = .65; ink.stroke();
    ink.beginPath(); ink.ellipse(-4, -2, 1.2, 4.2, .3, 0, Math.PI * 2);
    ink.fillStyle = '#efffe3eb'; ink.fill();
    ink.beginPath(); ink.ellipse(3, 7, 4, 1.5, -.2, 0, Math.PI * 2);
    ink.fillStyle = '#b8dc8f77'; ink.fill();

    const measure = () => {
      const hero = document.querySelector('.spider-hero');
      if (!hero) { bounds.bottom = 0; return; }
      const width = document.documentElement.clientWidth;
      viewHeight = window.innerHeight;
      const top = hero.getBoundingClientRect().bottom + window.scrollY - 32;
      const bottom = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - 6;
      const ratio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.25);
      frameInterval = 1000 / (width < 768 ? 24 : 30);
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(viewHeight * ratio)) {
        element.width = Math.round(width * ratio); element.height = Math.round(viewHeight * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      const next = { width, top, bottom };
      // Lazy sections can change the document height without resetting an existing fall.
      if (width !== bounds.width || Math.abs(top - bounds.top) > 80) drops = createLiquidDrops(next);
      else {
        const desired = createLiquidDrops(next);
        if (desired.length > drops.length) drops.push(...desired.slice(drops.length));
        else if (desired.length < drops.length) drops.length = desired.length;
      }
      bounds = next; layoutDirty = false;
    };

    const paint = (delta: number) => {
      if (layoutDirty) measure();
      const scroll = window.scrollY;
      const active = bounds.bottom > bounds.top && scroll + viewHeight > bounds.top;
      inView = active;
      if (host.dataset.active !== String(active)) host.dataset.active = String(active);
      context.clearRect(0, 0, bounds.width, viewHeight);
      if (!active || preference.matches) return;
      if (performance.now() - pointerAt > 650) pointer.active = false;
      stepLiquidDrops(drops, delta, time, bounds, pointer);
      context.save();
      context.beginPath(); context.rect(0, Math.max(0, bounds.top - scroll), bounds.width, Math.min(viewHeight, bounds.bottom - scroll) - Math.max(0, bounds.top - scroll)); context.clip();

      for (const drop of drops) {
        const y = drop.y - scroll;
        if (y < -40 || y > viewHeight + 40) continue;
        const size = drop.radius;
        const fade = Math.min(1, Math.max(0, (drop.y - bounds.top) / 60));
        context.globalAlpha = fade * (.65 + size * .08);
        context.save(); context.translate(drop.x, y);
        context.rotate(-Math.atan2(drop.vx, Math.max(70, drop.vy)) * .65);
        const stretch = Math.min(1.6, Math.max(.7, Math.abs(drop.vy) / 250));
        context.drawImage(sprite, -size * 1.6, -size * 5.2 * stretch, size * 3.2, size * 6.4 * stretch);
        context.restore();
      }
      context.globalAlpha = 1;

      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const age = time - ripple.born;
        if (age > .8) { ripples.splice(i, 1); continue; }
        for (let ring = 0; ring < 2; ring++) {
          const size = Math.max(1, age * (48 + ripple.strength * 18) - ring * 10);
          context.beginPath(); context.ellipse(ripple.x, ripple.y - scroll, size, size * .43, -.15, 0, Math.PI * 2);
          context.strokeStyle = `rgba(188,255,146,${(1 - age / .8) * (ring ? .18 : .35)})`;
          context.lineWidth = ring ? .7 : 1.1; context.stroke();
        }
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const splash = splashes[i];
        const age = time - splash.born;
        if (age > .85) { splashes.splice(i, 1); continue; }
        splash.x += splash.vx * delta; splash.y += splash.vy * delta; splash.vy += 390 * delta;
        context.globalAlpha = (1 - age / .85) * .85;
        context.drawImage(sprite, splash.x - 2, splash.y - scroll - 6, 4, 9);
      }
      context.globalAlpha = 1;
      // Broken, fading surface ripples catch the last drops at the document floor.
      const floor = bounds.bottom - scroll;
      if (floor < viewHeight + 35) {
        for (let i = 0; i < 4; i++) {
          context.beginPath();
          const phase = (time * .5 + i * .27) % 1;
          context.ellipse(bounds.width * (.16 + i * .23), floor, 8 + phase * 36, 1 + phase * 3, 0, .15, Math.PI * .95);
          context.strokeStyle = `rgba(170,211,139,${(1 - phase) * .2})`; context.lineWidth = .65; context.stroke();
        }
      }
      context.restore();
    };

    const running = () => inView && !disposed && !pausedRef.current && !preference.matches && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (!running()) return;
      frame = requestAnimationFrame(tick);
      const elapsed = now - lastPaint;
      if (elapsed < frameInterval) return;
      const delta = Math.min(.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now; lastPaint = now - elapsed % frameInterval; time += delta; paint(delta);
    };
    const wake = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      paint(0);
      if (running()) { lastTime = performance.now(); lastPaint = 0; frame = requestAnimationFrame(tick); }
    };
    refresh.current = wake;
    const scrollPaused = () => {
      if (!frame && !scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; wake(); });
    };
    const markLayout = () => { layoutDirty = true; scrollPaused(); };
    const react = (event: globalThis.PointerEvent) => {
      if (!running() || event.target instanceof Element && event.target.closest('button, a, input, textarea, select, [role="dialog"]')) return;
      const y = event.clientY + window.scrollY;
      if (y < bounds.top || y > bounds.bottom) return;
      pointer.x = event.clientX; pointer.y = y; pointer.active = true;
      pointer.pressed = event.type === 'pointerdown' || event.buttons > 0;
      pointerAt = performance.now();
      // Hover displaces existing drops; only a deliberate press creates rings.
      if (event.type === 'pointerdown' || pointer.pressed && time - lastRipple > .22) {
        if (ripples.length >= 5) ripples.shift();
        ripples.push({ x: pointer.x, y, born: time, strength: pointer.pressed ? 1 : .25 }); lastRipple = time;
        if (event.type === 'pointerdown') {
          for (let i = 0; i < 6; i++) {
            const angle = i * 2.39996;
            splashes.push({ x: pointer.x, y, vx: Math.cos(angle) * (50 + i * 9), vy: -80 - Math.sin(angle) * 85, born: time });
          }
          if (splashes.length > 24) splashes.splice(0, splashes.length - 24);
        }
      }
    };
    const release = () => { pointer.active = false; pointer.pressed = false; };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(markLayout);
    observer?.observe(document.body);
    const hero = document.querySelector('.spider-hero'); if (hero) observer?.observe(hero);
    window.addEventListener('resize', markLayout, { passive: true });
    document.addEventListener('scroll', scrollPaused, { passive: true });
    document.addEventListener('visibilitychange', wake);
    document.addEventListener('pointermove', react, { passive: true });
    document.addEventListener('pointerdown', react, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    document.documentElement.addEventListener('pointerleave', release, { passive: true });
    preference.addEventListener('change', wake);
    wake();
    return () => {
      disposed = true; refresh.current = () => {}; cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); observer?.disconnect();
      window.removeEventListener('resize', markLayout); document.removeEventListener('scroll', scrollPaused); document.removeEventListener('visibilitychange', wake);
      document.removeEventListener('pointermove', react); document.removeEventListener('pointerdown', react);
      document.removeEventListener('pointerup', release); document.removeEventListener('pointercancel', release);
      document.documentElement.removeEventListener('pointerleave', release); preference.removeEventListener('change', wake);
    };
  }, []);

  return createPortal(<div ref={layer} className="festival-liquid-flow" data-festival-liquid data-active="false">
    <canvas ref={canvas} aria-hidden="true" />
    <button type="button" className="festival-liquid-toggle" aria-label={paused ? 'Resume liquid droplets' : 'Pause liquid droplets'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
      {paused ? <PlayIcon /> : <PauseIcon />}<span>{paused ? 'Resume drops' : 'Pause drops'}</span>
    </button>
  </div>, document.body);
});
