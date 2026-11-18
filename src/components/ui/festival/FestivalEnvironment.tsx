import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { EnvironmentController } from './environmentRenderer';
import './FestivalEnvironment.css';
import { useCinematicIntroActive, useStaticExperience } from '../../../hooks/useStaticExperience';
import { useFestivalSceneReadiness } from './FestivalSceneReadiness';
import { visibleTimeout } from '../../cinematic/introCapability';

/** The real-time world is isolated from the site's text, routing and forms. */
export const FestivalEnvironment = memo(function FestivalEnvironment({ logoUrl, onSettled }: { logoUrl?: string; onSettled?: (settled: boolean) => void }) {
  const staticExperience = useStaticExperience();
  const introActive = useCinematicIntroActive();
  const { preparing } = useFestivalSceneReadiness();
  const canPrepare = !introActive || preparing;
  const covered = useRef(introActive);
  covered.current = introActive;
  const inView = useRef(true);
  const host = useRef<HTMLDivElement>(null);
  const islandControl = useRef<HTMLDivElement>(null);
  const controller = useRef<EnvironmentController | null>(null);
  const [plateLoaded, setPlateLoaded] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const unavailable = staticExperience || state === 'fallback';
  // A wallpaper decode is not readiness: the handoff waits for the real island,
  // flags, textures and their first rendered frame (or an actual fallback).
  useEffect(() => { onSettled?.(unavailable || state === 'ready'); }, [state, unavailable, onSettled]);
  useEffect(() => {
    if (state !== 'loading' || staticExperience || !canPrepare) return;
    // A stalled image/module must not leave the opening blocking navigation forever.
    return visibleTimeout(() => setState('fallback'), 10000);
  }, [state, staticExperience, canPrepare]);
  useEffect(() => { controller.current?.setVisible(!introActive && inView.current); }, [introActive]);
  const [paused, setPaused] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
  });
  const pausedRef = useRef(paused);
  const drag = useRef<{ pointerId: number; x: number } | null>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPaused(preference.matches);
    update(); preference.addEventListener?.('change', update);
    return () => preference.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { pausedRef.current = paused; controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => {
    const element = host.current; const control = islandControl.current;
    const section = element?.closest('section');
    if (!plateLoaded || !element || !section || !control || unavailable || !canPrepare || (!preparing && document.documentElement.dataset.cinematicIntro === 'active')) return;
    setState('loading');
    let disposed = false;
    let cleanup = () => {};
    // Give the decoded backdrop a frame to paint before GPU/geometry setup.
    const start = setTimeout(() => { void import('./environmentRenderer').then(({ createFestivalEnvironment }) => {
      if (disposed) return;
      const world = createFestivalEnvironment(element, () => { if (!disposed) setState('fallback'); }, { logoUrl, islandControl: control });
      if (!world) return;
      controller.current = world;
      world.setVisible(!covered.current && inView.current);
      let sectionBounds = { width: 0, height: 0, left: 0, top: 0 };
      let contentBottom = 0;
      const resize = () => {
        const rect = section.getBoundingClientRect();
        const actions = section.querySelector('.spider-hero-actions')?.getBoundingClientRect();
        const nextBottom = actions ? actions.bottom - rect.top : 0;
        const changed = rect.width !== sectionBounds.width || rect.height !== sectionBounds.height || nextBottom !== contentBottom;
        contentBottom = nextBottom;
        sectionBounds = { width: rect.width, height: rect.height, left: rect.left + window.scrollX, top: rect.top + window.scrollY };
        if (changed) world.resize(rect.width, rect.height);
      };
      resize(); world.setPaused(pausedRef.current);
      void world.ready.then(() => { if (!disposed) setState(previous => previous === 'fallback' ? previous : 'ready'); }).catch(() => { if (!disposed) setState('fallback'); });
      let resizeObserver: ResizeObserver | undefined;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize); resizeObserver.observe(section);
        section.querySelectorAll('.spider-hero-copy').forEach(item => resizeObserver!.observe(item));
      }
      else window.addEventListener('resize', resize);
      let intersection: IntersectionObserver | undefined;
      if (typeof IntersectionObserver !== 'undefined') { intersection = new IntersectionObserver(([entry]) => {
        inView.current = entry.isIntersecting && (entry.intersectionRatio ?? 1) >= .08;
        world.setVisible(!covered.current && inView.current);
      }, { threshold: [0, .08] }); intersection.observe(section); }
      let lastPointer = -Infinity;
      const react = (event: globalThis.PointerEvent) => {
        const now = performance.now();
        if (event.type === 'pointermove' && now - lastPointer < 40) return;
        lastPointer = now;
        world.react((event.clientX + window.scrollX - sectionBounds.left) / Math.max(1, sectionBounds.width), (event.clientY + window.scrollY - sectionBounds.top) / Math.max(1, sectionBounds.height), event.type === 'pointerdown');
      };
      section.addEventListener('pointermove', react, { passive: true }); section.addEventListener('pointerdown', react, { passive: true });
      const release = () => world.release(); section.addEventListener('pointerleave', release, { passive: true });
      cleanup = () => { resizeObserver?.disconnect(); intersection?.disconnect(); window.removeEventListener('resize', resize); section.removeEventListener('pointermove', react); section.removeEventListener('pointerdown', react); section.removeEventListener('pointerleave', release); world.dispose(); controller.current = null; };
    }).catch(() => { if (!disposed) setState('fallback'); }); }, 120);
    return () => { disposed = true; clearTimeout(start); cleanup(); };
  }, [plateLoaded, logoUrl, unavailable, canPrepare, preparing]);
  const setAngle = (angle: number | undefined) => { if (angle !== undefined) islandControl.current?.setAttribute('aria-valuenow', String(Math.round(angle))); };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (paused || !controller.current || event.button > 0) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX }; event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const difference = event.clientX - drag.current.x; drag.current.x = event.clientX;
    setAngle(controller.current?.rotateBy(difference * .012));
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null; delete event.currentTarget.dataset.dragging;
  };
  const rotateKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (paused) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); setAngle(controller.current?.rotateBy((event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12)); }
    else if (event.key === 'Home') { event.preventDefault(); setAngle(controller.current?.resetRotation()); }
  };
  return <>
    <div ref={host} className={`festival-environment${paused ? ' is-paused' : ''}`} data-festival-environment data-state={unavailable ? 'fallback' : state} aria-hidden="true">
      <img className="festival-environment-plate" src="/images/ricorrenza-emerald-environment.webp" alt="" fetchPriority="high" onLoad={() => setPlateLoaded(true)} onError={() => setState('fallback')} />
      <div className="festival-mobile-architecture festival-mobile-architecture-left"><img src="/images/ricorrenza-emerald-environment.webp" alt="" /></div>
      <div className="festival-mobile-architecture festival-mobile-architecture-right"><img src="/images/ricorrenza-emerald-environment.webp" alt="" /></div>
      <img className="festival-environment-fallback spider-hero-city" src="/images/ricorrenza-emerald-city.webp" alt="" fetchPriority="high" />
    </div>
    <div ref={islandControl} className="festival-island-control" role="slider" tabIndex={unavailable || paused ? -1 : 0} aria-label="Rotate floating island" aria-valuemin={0} aria-valuemax={360} aria-valuenow={0} aria-disabled={paused || unavailable} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={rotateKey} />
  </>;
});
