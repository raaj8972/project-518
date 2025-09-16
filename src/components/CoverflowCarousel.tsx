import React, { useEffect, useMemo, useRef, useState } from 'react';

type Direction = 'next' | 'prev';

interface CoverflowCarouselProps<T> {
  items: T[];
  // Render an individual item card (should be a fixed-width card)
  renderItem: (item: T, index: number) => React.ReactNode;
  // Autoplay interval; set 0 to disable autoplay
  intervalMs?: number;
  // How many siblings to show on each side of the active card
  visibleRange?: number; // default 2
  // Pixel distance between adjacent cards
  stepPx?: number; // default 260
  // Rotation applied to side cards
  rotateYDeg?: number; // default 35
  // Scale reduction per offset step
  scaleStep?: number; // default 0.12
  // Extra z-translation per offset to emphasize depth
  translateZStep?: number; // default -60 (negative pulls away from the camera)
  pauseOnHover?: boolean; // default true
  pauseOnTouch?: boolean; // default false
  showArrows?: boolean; // default true
  showDots?: boolean; // default false
  className?: string;
  // Visual boosters
  blurPerStep?: number; // default 2 (px per step)
  edgeFades?: boolean; // default true - gradient fades at edges
  centerGlow?: boolean; // default true - subtle radial glow behind active card
  arrowSize?: number; // default 44
  // Interactions
  paused?: boolean; // externally pause autoplay
  onItemClick?: (item: T, index: number) => void;
  // Container height for the 3D stage; can be number (px) or any CSS size (e.g., '60vh')
  stageHeight?: number | string; // default 460
}

// A lightweight, dependency-free 3D "coverflow" carousel with autoplay and infinite loop
export default function CoverflowCarousel<T>({
  items,
  renderItem,
  intervalMs = 2800,
  visibleRange = 2,
  stepPx = 260,
  rotateYDeg = 35,
  scaleStep = 0.12,
  translateZStep = -60,
  pauseOnHover = true,
  pauseOnTouch = false,
  showArrows = true,
  showDots = false,
  className = '',
  blurPerStep = 2,
  edgeFades = true,
  centerGlow = true,
  arrowSize = 44,
  paused = false,
  onItemClick,
  stageHeight = 460
}: CoverflowCarouselProps<T>) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [touching, setTouching] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const count = items.length;
  const canPlay = count > 1 && intervalMs > 0;

  // Pause when not visible (reduces CPU and avoids jumps)
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Detect touch-capable devices and reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqTouch = window.matchMedia('(hover: none), (pointer: coarse)');
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setIsTouch(mqTouch.matches);
      setIsReducedMotion(mqReduced.matches);
    };
    update();
    mqTouch.addEventListener?.('change', update);
    mqReduced.addEventListener?.('change', update);
    return () => {
      mqTouch.removeEventListener?.('change', update);
      mqReduced.removeEventListener?.('change', update);
    };
  }, []);

  // Autoplay tick (slightly slower on touch or reduced-motion to feel calmer)
  useEffect(() => {
    if (!canPlay) return;
    const autoInterval = (isTouch || isReducedMotion) ? Math.max(intervalMs, 3200) : intervalMs;
    const id = setInterval(() => {
      if (paused) return;
      if (pauseOnHover && hovering) return;
      if (pauseOnTouch && touching) return;
      if (!visible) return;
      setActive(a => (a + 1) % count);
    }, autoInterval);
    return () => clearInterval(id);
  }, [canPlay, intervalMs, hovering, touching, visible, count, pauseOnHover, pauseOnTouch, paused, isTouch, isReducedMotion]);

  const go = (dir: Direction) => {
    setActive(a => {
      if (dir === 'next') return (a + 1) % count;
      return (a - 1 + count) % count;
    });
  };

  // Compute per-item offsets in circular space
  const computed = useMemo(() => {
    const arr: Array<{ idx: number; item: T; offset: number }> = [];
    for (let i = 0; i < count; i++) {
      // shortest signed distance from active to i in circular list
      let raw = i - active;
      if (raw > count / 2) raw -= count;
      if (raw < -count / 2) raw += count;
      arr.push({ idx: i, item: items[i], offset: raw });
    }
    return arr.filter(x => Math.abs(x.offset) <= visibleRange).sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
  }, [items, count, active, visibleRange]);

  return (
    <div
      ref={rootRef}
      className={`relative w-full select-none ${className}`}
      onMouseEnter={() => pauseOnHover && !isTouch && setHovering(true)}
      onMouseLeave={() => pauseOnHover && !isTouch && setHovering(false)}
      onTouchStart={() => pauseOnTouch && setTouching(true)}
      onTouchEnd={() => pauseOnTouch && setTouching(false)}
      onTouchCancel={() => pauseOnTouch && setTouching(false)}
    >
      {/* Perspective stage */}
      <div
        className="relative mx-auto"
        style={{
          height: (() => {
            const h = typeof stageHeight === 'number' ? `${stageHeight}px` : stageHeight;
            if (!isTouch) return h;
            // Slightly shorter stage on touch for tighter layout
            if (typeof stageHeight === 'number') return `${Math.max(320, Math.min(520, stageHeight - 60))}px`;
            return h;
          })(),
          perspective: isTouch || isReducedMotion ? 900 : 1200,
        }}
        aria-roledescription="carousel"
      >
        {/* center glow */}
        {centerGlow && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            aria-hidden
          >
            <div
              className="rounded-full"
              style={{
                width: '56%',
                height: '56%',
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.0) 70%)',
                filter: 'blur(8px)',
              }}
            />
          </div>
        )}
        {/* Center rail for absolute-positioned cards */}
        <div className="absolute inset-0 [transform-style:preserve-3d] flex items-center justify-center">
          {computed.map(({ idx, item, offset }) => {
            const abs = Math.abs(offset);
            const sign = Math.sign(offset) || 0;
            // Soften motion and spacing on touch and reduced-motion
            const effStepPx = (isTouch || isReducedMotion) ? Math.min(stepPx, 220) : stepPx;
            const effRotateY = (isTouch || isReducedMotion) ? Math.min(rotateYDeg, 18) : rotateYDeg;
            const effScaleStep = (isTouch || isReducedMotion) ? Math.min(scaleStep, 0.08) : scaleStep;
            const effTranslateZ = (isTouch || isReducedMotion) ? Math.max(translateZStep, -36) : translateZStep;
            const effBlurPerStep = (isTouch || isReducedMotion) ? Math.min(blurPerStep, 1) : blurPerStep;

            const translateX = offset * effStepPx;
            const rotateY = -sign * effRotateY; // negative so left tilts to the left
            let scale = Math.max(0.6, 1 - abs * effScaleStep);
            if (!isTouch && hoveredIndex === idx) scale *= 1.04; // subtle hover pop only on hover-capable
            const translateZ = abs * effTranslateZ; // pulls away with depth
            const zIndex = (hoveredIndex === idx ? 200 : 100) - abs; // hovered above
            const opacity = Math.max(0.25, 1 - abs * 0.25);
            const blur = abs > 0 ? Math.min(12, abs * effBlurPerStep) : 0;

            return (
              <div
                key={idx}
                className={`absolute will-change-transform drop-shadow-xl ${onItemClick ? 'cursor-pointer' : ''}`}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  filter: `blur(${blur}px)`,
                  transition: (isTouch || isReducedMotion)
                    ? 'transform 480ms ease, opacity 360ms ease, filter 360ms ease'
                    : 'transform 600ms ease, opacity 400ms ease, filter 400ms ease',
                }}
                onMouseEnter={() => { if (!isTouch) setHoveredIndex(idx); }}
                onMouseLeave={() => { if (!isTouch) setHoveredIndex((h) => (h === idx ? null : h)); }}
                onClick={() => { setActive(idx); onItemClick?.(item, idx); }}
                aria-hidden={abs !== 0}
              >
                {renderItem(item, idx)}
              </div>
            );
          })}
        </div>
        {/* Edge gradient fades for nicer framing */}
        {edgeFades && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 inset-y-0 w-[100svw] hide-edge-fades-xs"
            style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
            aria-hidden
          >
            <div className="absolute inset-y-0 left-0 w-2 sm:w-5 md:w-12 lg:w-20" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.25), rgba(0,0,0,0.05), rgba(0,0,0,0))' }} />
            <div className="absolute inset-y-0 right-0 w-2 sm:w-5 md:w-12 lg:w-20" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.25), rgba(0,0,0,0.05), rgba(0,0,0,0))' }} />
          </div>
        )}
      </div>

      {showArrows && count > 1 && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen flex items-center justify-between pointer-events-none px-1 sm:px-2" aria-hidden>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go('prev')}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 ml-1 sm:ml-2 shadow-md"
            style={{ width: Math.max(32, Math.min(arrowSize, 56)), height: Math.max(32, Math.min(arrowSize, 56)) }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go('next')}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 mr-1 sm:mr-2 shadow-md"
            style={{ width: Math.max(32, Math.min(arrowSize, 56)), height: Math.max(32, Math.min(arrowSize, 56)) }}
          >
            ›
          </button>
        </div>
      )}

      {showDots && count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full ${i === active ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
