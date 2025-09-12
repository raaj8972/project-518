import { useState } from 'react';

type WaveItem = { id?: string | number; src: string; title?: string };

interface GalleryWaveProps {
  items: WaveItem[];
  className?: string;
  onItemClick?: (index: number) => void;
  revealDurationMs?: number; // eye-opening reveal duration before callback
  revealEnabled?: boolean; // enable/disable the reveal overlay
  revealOrientation?: 'horizontal' | 'vertical'; // direction of opening
}

// CSS-only 3D wave gallery using sibling selectors and :has()
export default function GalleryWave({ items, className = '', onItemClick, revealDurationMs = 550, revealEnabled = true, revealOrientation = 'horizontal' }: GalleryWaveProps) {
  const [revealIdx, setRevealIdx] = useState<number | null>(null);
  const revealSrc = revealIdx != null ? items[revealIdx]?.src : undefined;

  const handleClick = (i: number) => {
    if (!revealEnabled) {
      onItemClick?.(i);
      return;
    }
    setRevealIdx(i);
    // open after reveal animation completes
    window.setTimeout(() => {
      onItemClick?.(i);
      // give lightbox time to mount before removing overlay for a seamless transition
      window.setTimeout(() => setRevealIdx(null), 80);
    }, revealDurationMs);
  };

  return (
    <div className={`gw-root ${className}`} style={{ ['--gw-reveal-dur' as any]: `${revealDurationMs}ms` }}>
      <div className="gw-wrapper">
        <div className="gw-items">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className="gw-item"
              style={{ backgroundImage: `url(${it.src})` }}
              aria-label={it.title || 'Gallery image'}
              onClick={() => handleClick(i)}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen eye-opening reveal */}
      {revealEnabled && revealSrc && (
        <div className={`gw-reveal ${revealOrientation === 'horizontal' ? 'gw-reveal-h' : 'gw-reveal-v'}`} style={{ backgroundImage: `url(${revealSrc})` }} />
      )}

      <style>{`
        .gw-root { --gw-index: calc(1vw + 1vh); --gw-transition: cubic-bezier(.1, .7, 0, 1); --gw-reveal-dur: 550ms; }
  .gw-wrapper { display:flex; align-items:center; justify-content:center; padding: 2rem 1rem; }
  .gw-items { display:flex; gap: calc(var(--gw-index) * 0.6); perspective: calc(var(--gw-index) * 40); transform-style: preserve-3d; }
  .gw-item { width: calc(var(--gw-index) * 6.2); height: calc(var(--gw-index) * 16.8); background-color:#222; background-size:cover; background-position:center; cursor:pointer; filter: grayscale(1) brightness(.5); transition: transform 1.25s var(--gw-transition), filter 3s var(--gw-transition), width 1.25s var(--gw-transition); will-change: transform, filter, rotateY, width; border-radius: 16px; position:relative; border: 1px solid rgba(255,255,255,0.12); }
        .gw-item::before, .gw-item::after { content:''; position:absolute; height:100%; width: 24px; top:0; pointer-events:none; }
        .gw-item::before { right: 0; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.35)); }
        .gw-item::after { left: 0; background: linear-gradient(270deg, transparent, rgba(0,0,0,0.35)); }

  /* Center focus */
  .gw-items .gw-item:hover, .gw-items .gw-item:focus-visible, .gw-items .gw-item:active { filter: none; transform: translateZ(calc(var(--gw-index) * 10)); z-index: 100; outline: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 25px rgba(255, 0, 255, 0.15), 0 0 25px rgba(0,255,255,0.12); }

        /* Right side siblings (wave to the right) */
        .gw-items .gw-item:hover + .gw-item { filter: inherit; transform: translateZ(calc(var(--gw-index) * 8.5)) rotateY(35deg); z-index: -1; }
        .gw-items .gw-item:hover + .gw-item + .gw-item { filter: inherit; transform: translateZ(calc(var(--gw-index) * 5.6)) rotateY(40deg); z-index: -2; }
        .gw-items .gw-item:hover + .gw-item + .gw-item + .gw-item { filter: inherit; transform: translateZ(calc(var(--gw-index) * 2.5)) rotateY(30deg); z-index: -3; }
        .gw-items .gw-item:hover + .gw-item + .gw-item + .gw-item + .gw-item { filter: inherit; transform: translateZ(calc(var(--gw-index) * .6)) rotateY(15deg); z-index: -4; }

        /* Left side using :has to target previous siblings */
        .gw-items .gw-item:has(+ .gw-item:hover) { filter: inherit; transform: translateZ(calc(var(--gw-index) * 8.5)) rotateY(-35deg); z-index: -1; }
        .gw-items .gw-item:has(+ .gw-item + .gw-item:hover) { filter: inherit; transform: translateZ(calc(var(--gw-index) * 5.6)) rotateY(-40deg); z-index: -2; }
        .gw-items .gw-item:has(+ .gw-item + .gw-item + .gw-item:hover) { filter: inherit; transform: translateZ(calc(var(--gw-index) * 2.5)) rotateY(-30deg); z-index: -3; }
        .gw-items .gw-item:has(+ .gw-item + .gw-item + .gw-item + .gw-item:hover) { filter: inherit; transform: translateZ(calc(var(--gw-index) * .6)) rotateY(-15deg); z-index: -4; }

        /* Responsive tuning */
        @media (max-width: 1024px) {
          .gw-item { width: calc(var(--gw-index) * 5.6); height: calc(var(--gw-index) * 14.8); border-radius: 14px; }
        }
        @media (max-width: 640px) {
          .gw-item { width: calc(var(--gw-index) * 5.0); height: calc(var(--gw-index) * 13.4); border-radius: 12px; }
          .gw-items { gap: calc(var(--gw-index) * 0.5); }
        }

        /* Fullscreen reveal with soft glow and slight scale-up */
        .gw-reveal { position: fixed; inset: 0; z-index: 9999; background-size: cover; background-position: center; filter: brightness(.98); box-shadow: 0 0 0 9999px rgba(0,0,0,0.6) inset, 0 0 40px rgba(255, 0, 255, 0.12), 0 0 60px rgba(0, 255, 255, 0.12); }
        .gw-reveal-h { clip-path: inset(0 49% 0 49% round 12px); animation: gwOpenH var(--gw-reveal-dur) cubic-bezier(.2,.8,.2,1) forwards; }
        .gw-reveal-v { clip-path: inset(49% 0 49% 0 round 12px); animation: gwOpenV var(--gw-reveal-dur) cubic-bezier(.2,.8,.2,1) forwards; }
        @keyframes gwOpenH { from { clip-path: inset(0 49% 0 49% round 12px); transform: scale(0.98); } to { clip-path: inset(0 0 0 0); transform: scale(1.02); } }
        @keyframes gwOpenV { from { clip-path: inset(49% 0 49% 0 round 12px); transform: scale(0.98); } to { clip-path: inset(0 0 0 0); transform: scale(1.02); } }
      `}</style>
    </div>
  );
}
