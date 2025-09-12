import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type SliderItem = { id?: string | number; src: string; title?: string };

interface GalleryArcSliderProps {
  items: SliderItem[];
  arcRadius?: number; // curvature radius in px
  arcDegrees?: number; // total degrees from left to right
  gapRem?: number; // horizontal gap between cards in rem
  visible?: number; // number of cards visible
  cardWidthRem?: number;
  autoplay?: boolean;
  autoplaySpeed?: number; // px per second equivalent
  pauseOnHover?: boolean;
  onItemClick?: (index: number) => void;
}

export default function GalleryArcSlider({
  items,
  arcRadius = 80,
  arcDegrees = 260,
  gapRem = 2.5,
  visible = 8,
  cardWidthRem = 18,
  autoplay = true,
  autoplaySpeed = 80,
  pauseOnHover = true,
  onItemClick,
}: GalleryArcSliderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0..1 normalized across items
  const hovering = useRef(false);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);

  // Layout helper: position cards along a circular arc using rotateY and translateZ
  const layout = () => {
    const track = trackRef.current; if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const n = items.length;
    const centerIndex = progress * n;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gapPx = gapRem * rem;
    const cardW = cardWidthRem * rem;

    cards.forEach((card, i) => {
      const offset = i - centerIndex; // relative to center
      const t = Math.max(-1, Math.min(1, offset / visible)); // -1..1 within visible range
      const thetaDeg = t * (arcDegrees / 2);
      const theta = (thetaDeg * Math.PI) / 180;
      const R = arcRadius + (cardW / 2); // radius considers half card width for nicer arc
      const x = R * Math.sin(theta);
      const z = -R * (1 - Math.cos(theta)); // push back as it moves to sides
      const translateX = x + t * (gapPx * 0.6); // slight spacing along arc
      const scale = 1 - Math.min(0.6, Math.abs(t) * 0.2); // stronger center emphasis
      const opacity = 1 - Math.min(0.85, Math.abs(t) * 0.3);
      const rotY = thetaDeg; // cards follow the arc
      card.style.transform = `translateX(${translateX}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(1000 - Math.floor(Math.abs(t) * 100));
    });
  };

  useLayoutEffect(() => { layout(); }, [items.length]);
  useEffect(() => { layout(); }, [progress]);

  // Hover pause
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    if (!pauseOnHover) return;
    const enter = () => { hovering.current = true; };
    const leave = () => { hovering.current = false; };
    root.addEventListener('mouseenter', enter);
    root.addEventListener('mouseleave', leave);
    return () => {
      root.removeEventListener('mouseenter', enter);
      root.removeEventListener('mouseleave', leave);
    };
  }, [pauseOnHover]);

  // Drag to scroll
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      dragging.current = true;
      dragStartX.current = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      dragStartProgress.current = progress;
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const dx = x - dragStartX.current;
      const sens = 1 / (items.length * 120); // drag sensitivity
      let np = dragStartProgress.current - dx * sens;
      np = (np % 1 + 1) % 1; // wrap 0..1
      setProgress(np);
    };
    const onUp = () => { dragging.current = false; };

    root.addEventListener('mousedown', onDown);
    root.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    root.addEventListener('touchstart', onDown, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      root.removeEventListener('mousedown', onDown);
      root.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      root.removeEventListener('touchstart', onDown);
      root.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [items.length, progress]);

  // Autoplay with GSAP ticker for smoothness
  useEffect(() => {
    if (!autoplay) return;
    const tick = () => {
      if (hovering.current || dragging.current) return;
      const dt = gsap.ticker.deltaRatio(); // frames scaling
      const perSec = autoplaySpeed / 10000; // normalize speed
      setProgress(p => ((p + perSec * dt) % 1));
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); };
  }, [autoplay, autoplaySpeed]);

  return (
    <div ref={rootRef} className="relative w-full py-12 select-none">
      <div className="relative mx-auto" style={{ perspective: '1200px', width: 'min(90vw, 1400px)', height: '520px' }}>
        <div ref={trackRef} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
          {items.map((it, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150"
              onClick={() => onItemClick?.(i)}
            >
              <div className="card rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/30 backdrop-blur-sm">
                <img src={it.src} alt={it.title || ''} className="block w-[18rem] h-[24rem] object-cover" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
