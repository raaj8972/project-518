import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

type ImgItem = { id?: string | number; src: string; title?: string; subtitle?: string };

interface StackedScrollGalleryProps {
  items: ImgItem[];
  scrollPerItem?: number; // px of scroll to bring next card to front
  distance?: number; // z-distance between cards
  showBackground?: boolean; // blurred background crossfade
  backgroundBlurPx?: number; // blur intensity for bg crossfade
  cardBlurMax?: number; // max blur for far cards
  onItemClick?: (idx: number) => void;
  className?: string;
}

// Utility
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const map = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

export default function StackedScrollGallery({
  items,
  scrollPerItem = 500,
  distance = 1500,
  showBackground = true,
  backgroundBlurPx = 80,
  cardBlurMax = 6,
  onItemClick,
  className = ''
}: StackedScrollGalleryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const bgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const [vh, setVh] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);

  const initialZ = useMemo(() => items.map((_, i) => -i * distance), [items, distance]);
  const visibleRange = 5000; // for opacity mapping

  // set container height so sticky inner has room to scroll
  const setHeights = () => {
    setVh(window.innerHeight || 800);
    const el = containerRef.current; if (!el) return;
    el.style.height = `${(window.innerHeight || 800) + items.length * scrollPerItem}px`;
  };

  useLayoutEffect(() => {
    setHeights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, scrollPerItem]);

  useEffect(() => {
    const onResize = () => setHeights();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scroll-driven transforms
  useEffect(() => {
    if (!containerRef.current) return;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();
      const totalScrollable = container.offsetHeight - (window.innerHeight || vh);
      const scrolledIn = clamp((window.scrollY - container.offsetTop), 0, Math.max(1, totalScrollable));
      const progress = totalScrollable > 0 ? scrolledIn / totalScrollable : 0;

      const zIncrement = progress * distance * (items.length - 1);

      for (let i = 0; i < items.length; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const curZ = initialZ[i] + zIncrement;
        const opacity = clamp(map(curZ, -visibleRange, 0, 0, 1), 0, 1);
        // keep them centered in viewport
        card.style.transform = `translate3d(-50%, -50%, ${curZ}px)`;
        card.style.opacity = `${opacity}`;
        card.style.zIndex = String(items.length - i);

        // blur the card image more when it's further back
        const img = imgRefs.current[i];
        if (img) {
          const blur = clamp(map(curZ, -visibleRange, 0, cardBlurMax, 0), 0, cardBlurMax);
          img.style.filter = `blur(${blur}px)`;
        }

        if (showBackground) {
          const bg = bgRefs.current[i];
          if (bg) {
            bg.style.opacity = curZ < 100 ? '1' : '0';
          }
        }
      }

      // sticky logic (pure CSS sticky works, but ensure end behavior)
      const inner = innerRef.current;
      if (inner) {
        if (rect.top <= 0 && rect.bottom > (window.innerHeight || vh)) {
          inner.style.position = 'fixed';
          inner.style.top = '0';
        } else if (rect.bottom <= (window.innerHeight || vh)) {
          inner.style.position = 'absolute';
          inner.style.top = 'auto';
          inner.style.bottom = '0';
        } else {
          inner.style.position = 'absolute';
          inner.style.top = '0';
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items.length, distance, visibleRange, initialZ, showBackground, vh]);

  // Reduced-motion fallback: just list cards
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div ref={containerRef} className={`outer-container relative overflow-hidden ${className}`}>
      {/* background layer */}
      {showBackground && !prefersReducedMotion && (
        <div className="bgimages pointer-events-none">
          {items.map((it, i) => (
            <img
              key={i}
              ref={(el) => (bgRefs.current[i] = el)}
              src={it.src}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${backgroundBlurPx}px)`, transform: 'scale(1.125)', opacity: 0 }}
            />
          ))}
        </div>
      )}

      {/* sticky 3D stage */}
      <div ref={innerRef} className="inner-container" style={{ left: 0, right: 0, margin: '0 auto', width: '100%', height: '100vh', transformStyle: 'preserve-3d', perspective: '750px' }}>
        {!prefersReducedMotion && (
          <>
            {items.map((it, i) => (
              <div
                key={i}
                ref={(el) => (cardRefs.current[i] = el)}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ opacity: 0, transform: `translate3d(-50%, -50%, ${initialZ[i]}px)` }}
                onClick={() => onItemClick?.(i)}
              >
                <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
                  <img ref={(el) => (imgRefs.current[i] = el)} src={it.src} alt={it.title || ''} loading="lazy" decoding="async" className="w-[68vw] max-w-[860px] h-[68vh] max-h-[720px] object-cover" />
                  {(it.title || it.subtitle) && (
                    <div className="p-4 text-white">
                      {it.title && <h3 className="text-xl font-semibold mb-1">{it.title}</h3>}
                      {it.subtitle && <p className="text-sm text-white/80">{it.subtitle}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* reduced motion fallback grid inside the same area */}
        {prefersReducedMotion && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
                <img src={it.src} alt={it.title || ''} loading="lazy" decoding="async" className="w-full h-64 object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* component styles to mimic the reference */}
      <style>{`
        .outer-container .bgimages { position: absolute; inset: 0; opacity: 0.6; }
      `}</style>
    </div>
  );
}
