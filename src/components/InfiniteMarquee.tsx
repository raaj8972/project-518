import React, { useEffect, useRef, useState } from 'react';

type Direction = 'left' | 'right';

interface InfiniteMarqueeProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  speedPxPerSec?: number; // pixels per second
  pauseOnHover?: boolean;
  pauseOnTouch?: boolean;
  paused?: boolean; // external control to pause the marquee
  className?: string;
  direction?: Direction;
  itemWrapperClassName?: string; // spacing classes for each item
  // Optional fixed gutter on both sides so content doesn't touch/fade under screen edges
  sideGutterPx?: number;
  // Minimum width for each item wrapper (in pixels). Defaults to 192px (12rem) for backward compatibility
  minItemWidthPx?: number;
  // Optional: show a soft glow overlay while paused (hover/touch/external)
  glowOnPause?: boolean;
  // Color used for the glow overlay; should include alpha for subtlety
  glowColor?: string;
  // If true, compute and use a per-item glow color based on the item's image when paused+hovered
  adaptiveGlowOnPause?: boolean;
  // Maximum opacity for adaptive glow (0..1)
  adaptiveGlowOpacity?: number;
  // Optional: function to get glow color per item
  getGlowColor?: (item: T, index: number) => string;
  // Optional: intensity multiplier for the glow overlay
  glowIntensity?: number;
  // If true, a tap on touch devices toggles pause state. Default false to avoid conflicts with item clicks.
  tapToTogglePause?: boolean;
}

function InfiniteMarquee<T>(props: InfiniteMarqueeProps<T>) {
  const {
    items,
    renderItem,
    speedPxPerSec = 120,
    pauseOnHover = true,
    pauseOnTouch = true,
    paused = false,
    className = '',
    direction = 'left',
    itemWrapperClassName = 'px-4',
    sideGutterPx = 0,
    minItemWidthPx = 192,
    glowOnPause = false,
    glowColor = 'rgba(255,255,255,0.14)',
    adaptiveGlowOnPause = false,
    adaptiveGlowOpacity = 0.22,
    getGlowColor,
    glowIntensity = 1,
    tapToTogglePause = false
  } = props;
  // React hooks and refs
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [runDistancePx, setRunDistancePx] = useState<number>(0);
  const [isHovering, setIsHovering] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const colorCacheByUrl = useRef<Map<string, string>>(new Map());
  const colorByIndex = useRef<Map<number, string>>(new Map());
    const containerRef = useRef<HTMLDivElement | null>(null);
  const isCoarsePointer = useRef<boolean>(false);
  // Track if we imperatively forced a pause due to a touch (for snappier mobile UX)
  const touchForcedPauseRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const coarse = (typeof window !== 'undefined' && (navigator as any)?.maxTouchPoints > 0) ||
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      isCoarsePointer.current = !!coarse;
    } catch {}
  }, []);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const fullWidth = track.scrollWidth; // both copies
      const singleWidth = Math.max(1, Math.floor(fullWidth / 2));
      // Respect provided speed across full range; avoid artificial floors that hide admin changes
      const effectiveSpeed = Math.max(1, Number.isFinite(speedPxPerSec) ? speedPxPerSec : 120); // px/sec
      const sec = singleWidth / effectiveSpeed;
      // Round to 2 decimals to reduce re-renders yet reflect changes
      setDurationSec(Math.max(0.1, Number(sec.toFixed(2))));
      setRunDistancePx(singleWidth);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    if (trackRef.current) ro.observe(trackRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { try { ro.disconnect(); } catch {} };
  }, [items, speedPxPerSec]);

  if (!items || items.length === 0) return null;

  const isPaused = paused || isHovering || manualPaused;

  // Removed stray lines
    const computeDominantColor = async (url: string) => {
      try {
        // Cache first
        const cached = colorCacheByUrl.current.get(url);
        if (cached) return cached;

        // Load image offscreen
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const load = new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
        });
        img.src = url;
        await load;
        const w = Math.max(1, Math.min(64, img.naturalWidth));
        const h = Math.max(1, Math.min(64, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, count = 0;
        // Sample every 4th pixel for speed
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3];
          if (a < 20) continue; // skip near-transparent
          r += data[i + 0];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) return null;
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        const color = `rgba(${r}, ${g}, ${b}, ${adaptiveGlowOpacity})`;
        colorCacheByUrl.current.set(url, color);
        return color;
      } catch {
        return null;
      }
    };

  const ensureIndexColor = async (idx: number) => {
    if (colorByIndex.current.has(idx)) return;
    const el = itemRefs.current[idx];
    if (!el) return;
    const img = el.querySelector('img');
    const src = (img as HTMLImageElement | null)?.currentSrc || (img as HTMLImageElement | null)?.src;
    if (!src) return;
    const color = await computeDominantColor(src);
    if (color) {
      colorByIndex.current.set(idx, color);
      // Force a micro rerender by toggling hover index
      setHoveredIndex((h) => (h === idx ? idx : idx));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        // Keep items off the very edges and away from safe areas. Apply to non-animated container to avoid seam jitter.
        paddingLeft: sideGutterPx ? `calc(env(safe-area-inset-left) + ${sideGutterPx}px)` : undefined,
        paddingRight: sideGutterPx ? `calc(env(safe-area-inset-right) + ${sideGutterPx}px)` : undefined,
        WebkitMaskImage: undefined, // placeholder to prevent style merging issues
        // Improve mobile touch behavior: allow vertical scroll and pinch-zoom while enabling press-to-pause
        touchAction: 'pan-y pinch-zoom',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
      onTouchStart={(e) => {
        if (!pauseOnTouch) return;
        setIsHovering(true);
        // Imperatively pause immediately for responsiveness before React state flush
        if (trackRef.current) {
          try {
            trackRef.current.style.animationPlayState = 'paused';
            touchForcedPauseRef.current = true;
          } catch {}
        }
        // Ensure we always resume even if pointer events get cancelled due to scrolling / navigation
        const clear = () => {
          setIsHovering(false);
          if (trackRef.current && touchForcedPauseRef.current) {
            // Only resume if not otherwise paused by external props or manual toggle
            const stillShouldPause = paused || manualPaused;
            if (!stillShouldPause) {
              try { trackRef.current.style.animationPlayState = 'running'; } catch {}
              touchForcedPauseRef.current = false;
            }
          }
        };
        window.addEventListener('touchend', clear, { once: true, passive: true, capture: true } as any);
        window.addEventListener('touchcancel', clear, { once: true, passive: true, capture: true } as any);
      }}
      onTouchEnd={() => {
        if (!pauseOnTouch) return;
        setIsHovering(false);
        if (trackRef.current && touchForcedPauseRef.current) {
          const stillShouldPause = paused || manualPaused;
          if (!stillShouldPause) {
            try { trackRef.current.style.animationPlayState = 'running'; } catch {}
            touchForcedPauseRef.current = false;
          }
        }
      }}
      onPointerDown={() => setIsHovering(true)}
      onPointerUp={() => setIsHovering(false)}
      onPointerCancel={() => setIsHovering(false)}
      tabIndex={0}
      onFocus={() => setIsHovering(true)}
      onBlur={() => setIsHovering(false)}
      onClick={(e) => {
        // Optional: only toggle when explicitly enabled and not clicking an item card/button/link
        if (!tapToTogglePause) return;
        const target = e.target as HTMLElement | null;
        if (target && (target.closest('[data-im-item]') || target.closest('a,button,[role="button"]'))) return;
        if (pauseOnTouch && isCoarsePointer.current) setManualPaused((p) => !p);
      }}
    >
      {/* Soft overlay glow shown only when paused */}
      {glowOnPause && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-250 ease-out"
          style={{
            opacity: isPaused ? 1 : 0,
            background: getGlowColor && items.length > 0
              ? `radial-gradient(ellipse at center, ${getGlowColor(items[0], 0)} 0%, rgba(0,0,0,0) 60%)`
              : `radial-gradient(ellipse at center, ${glowColor} 0%, rgba(0,0,0,0) 60%)`,
            filter: `blur(2px) brightness(${glowIntensity})`
          }}
        />
      )}
      {/* Adaptive per-item glow when paused and item hovered/touched */}
      {adaptiveGlowOnPause && isPaused && hoveredIndex !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            // We'll render a gradient anchored near the hovered item by reading its bounding box
          }}
        >
          {(() => {
            const idx = hoveredIndex!;
            const el = itemRefs.current[idx];
            if (el) {
              // Compute position and size relative to container for gradient center
              const container = containerRef.current;
              if (container) {
                const cr = container.getBoundingClientRect();
                const r = el.getBoundingClientRect();
                const cx = ((r.left + r.width / 2) - cr.left) / Math.max(1, cr.width) * 100; // percent
                const cy = ((r.top + r.height / 2) - cr.top) / Math.max(1, cr.height) * 100; // percent
                const color = colorByIndex.current.get(idx) || glowColor;
                // Inline element with positioned radial gradient
                return (
                  <div
                    className="absolute inset-0 transition-opacity duration-150 ease-out"
                    style={{
                      background: `radial-gradient(ellipse at ${cx}% ${cy}%, ${color} 0%, rgba(0,0,0,0) 55%)`,
                      filter: 'blur(6px)',
                      opacity: 1
                    }}
                  />
                );
              }
            }
            // Fallback center glow if metrics unavailable
            const color = colorByIndex.current.get(hoveredIndex!) || glowColor;
            return (
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${color} 0%, rgba(0,0,0,0) 55%)`, filter: 'blur(6px)' }} />
            );
          })()}
        </div>
      )}
      <div
        ref={trackRef}
        className="flex items-stretch whitespace-nowrap"
        style={{
          // Animate by the exact measured width of the first group to avoid 50% rounding seams
          // Use longhand animation properties to avoid conflicting with animationDirection/animationPlayState
          animationName: 'im-scroll-var',
          animationDuration: `${durationSec}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationPlayState: isPaused ? ('paused' as const) : ('running' as const),
          animationDirection: direction === 'right' ? ('reverse' as const) : ('normal' as const),
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          // CSS var consumed by keyframes to translate exact pixel distance
          ['--im-d' as any]: `${runDistancePx}px`
        }}
      >
        <div className="flex items-stretch">
          {items.map((item: T, idx: number) => (
            <div
              key={`a-${idx}`}
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={`relative inline-flex ${itemWrapperClassName}`}
              data-im-item
              style={{ minWidth: `${minItemWidthPx}px` }}
              onMouseEnter={() => { setHoveredIndex(idx); if (adaptiveGlowOnPause) { ensureIndexColor(idx); } }}
              onMouseLeave={() => setHoveredIndex((h) => (h === idx ? null : h))}
              onTouchStart={() => { setHoveredIndex(idx); if (adaptiveGlowOnPause) { ensureIndexColor(idx); } }}
              onTouchEnd={() => setHoveredIndex((h) => (h === idx ? null : h))}
            >
      {/* Optional inner per-item halo (very subtle) */}
              {adaptiveGlowOnPause && isPaused && hoveredIndex === idx && (
                <div aria-hidden className="pointer-events-none absolute -inset-1 rounded-xl" style={{ boxShadow: `0 0 36px 12px ${getGlowColor ? getGlowColor(item, idx) : (colorByIndex.current.get(idx) || glowColor)}`, filter: `brightness(${glowIntensity})` }} />
              )}
              {renderItem(item, idx)}
            </div>
          ))}
        </div>
        <div className="flex items-stretch" aria-hidden>
          {items.map((item: T, idx: number) => (
            <div
              key={`b-${idx}`}
              className={`inline-flex ${itemWrapperClassName}`}
              data-im-item
              style={{ minWidth: `${minItemWidthPx}px` }}
            >
              {renderItem(item, idx)}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes im-scroll-var {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(calc(-1 * var(--im-d)), 0, 0); }
        }
      `}</style>
    </div>
  );
}

export default InfiniteMarquee;

                  // Removed orphaned block referencing out-of-scope variables
