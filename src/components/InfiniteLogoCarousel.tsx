import React, { useEffect, useRef, useState } from 'react';

export interface LogoItem {
  id: string | number;
  name: string;
  logo: string;
  website?: string | null;
}

interface InfiniteLogoCarouselProps {
  items: LogoItem[];
  speedPxPerSec?: number; // how many pixels per second to move
  pauseOnHover?: boolean;
  /**
   * Fade the content at the left/right edges using a CSS mask, similar to the reference snippet.
   * Disabled by default to keep a clean, full-bleed look on mobile.
   */
  edgeFade?: boolean;
  /** Width of the edge fade (in px). Only used when edgeFade=true. */
  edgeFadePx?: number;
  /**
   * Attempt to treat black backgrounds in provided logo images as transparent
   * using CSS blend modes. This is a best-effort visual trick and works best
   * on dark card backgrounds.
   */
  treatBlackAsTransparent?: boolean;
  /** Optionally draw a dark inner panel (stage) behind logos; off by default */
  stageEnabled?: boolean;
  stageBgClass?: string;
  stagePaddingClass?: string;
  stageRoundedClass?: string;
  className?: string;
  heightClass?: string; // e.g., 'h-16'
  itemPaddingClass?: string; // e.g., 'px-4 sm:px-6 md:px-8'
  itemMinWidthClass?: string; // e.g., 'min-w-[10rem]'
}

const InfiniteLogoCarousel: React.FC<InfiniteLogoCarouselProps> = ({
  items,
  speedPxPerSec = 120,
  pauseOnHover = true,
  edgeFade = false,
  edgeFadePx = 120,
  treatBlackAsTransparent = true,
  stageEnabled = false,
  stageBgClass = 'bg-black/85',
  stagePaddingClass = 'p-2 sm:p-3',
  stageRoundedClass = 'rounded-lg md:rounded-xl',
  className = '',
  heightClass = 'h-16',
  itemPaddingClass = 'px-8',
  itemMinWidthClass = 'min-w-[9rem] sm:min-w-[11rem] md:min-w-[12rem]'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [isHovering, setIsHovering] = useState(false);

  // Recompute duration based on content width
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const fullWidth = track.scrollWidth; // includes both copies since we render twice
      const singleWidth = Math.max(1, Math.floor(fullWidth / 2));
      const sec = Math.max(10, Math.round(singleWidth / Math.max(30, speedPxPerSec)));
      setDurationSec(sec);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    if (trackRef.current) ro.observe(trackRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { try { ro.disconnect(); } catch {} };
  }, [items, speedPxPerSec]);

  if (!items || items.length === 0) return null;

  // Optional edge fade mask (left/right) similar to the provided CSS reference.
  const containerMaskStyle: React.CSSProperties | undefined = edgeFade
    ? ({
        WebkitMaskImage: `linear-gradient(to right, rgba(0,0,0,0) 0, rgba(255,255,255,1) ${edgeFadePx}px, rgba(255,255,255,1) calc(100% - ${edgeFadePx}px), rgba(0,0,0,0) 100%)`,
        maskImage: `linear-gradient(to right, rgba(0,0,0,0) 0, rgba(255,255,255,1) ${edgeFadePx}px, rgba(255,255,255,1) calc(100% - ${edgeFadePx}px), rgba(0,0,0,0) 100%)`
      } as React.CSSProperties)
    : undefined;

  const renderLogo = (item: LogoItem) => (
    <div
      key={item.id}
      className={`flex items-center justify-center overflow-hidden shrink-0 flex-none ${itemPaddingClass} ${heightClass} ${itemMinWidthClass} mx-1 sm:mx-2 md:mx-3 lg:mx-4`}
    >
      <div className="relative w-full h-full group">
        {/* Neon glow backdrop (kept inside card to avoid overlap) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 via-cyan-400/15 to-purple-500/20 blur-md opacity-40 group-hover:opacity-70 transition-opacity"
          style={{ animation: 'ilc-glow 6s ease-in-out infinite alternate' }}
        />
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-slate-800/70 via-slate-900/75 to-slate-950/80 ring-1 ring-white/10 shadow-xl shadow-black/50 overflow-hidden isolate">
          {/* 3D inner highlights */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="w-full h-full p-2 sm:p-3 md:p-4 flex items-center justify-center">
            {(() => {
              const shouldBlend = treatBlackAsTransparent && !stageEnabled;
              const imgClass = `max-h-full max-w-full w-auto h-full object-contain object-center opacity-95 transition hover:opacity-100` + (shouldBlend ? ' mix-blend-screen' : '');
              const imgStyle = shouldBlend ? ({ mixBlendMode: 'screen' } as React.CSSProperties) : undefined;
              const imgEl = item.website ? (
                <a
                  href={item.website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                  className="flex items-center justify-center w-full h-full"
                >
                  <img src={item.logo} alt={item.name} loading="lazy" decoding="async" className={imgClass} style={imgStyle} />
                </a>
              ) : (
                <img src={item.logo} alt={item.name} title={item.name} loading="lazy" decoding="async" className={imgClass} style={imgStyle} />
              );

              if (stageEnabled) {
                return (
                  <div className={`w-full h-full ${stageRoundedClass} ${stageBgClass} ring-1 ring-white/5 shadow-inner shadow-black/50 flex items-center justify-center ${stagePaddingClass}`}>
                    {imgEl}
                  </div>
                );
              }
              return imgEl;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={containerMaskStyle}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
    >
      <div
        className="relative z-10 flex items-center whitespace-nowrap will-change-transform"
        style={{
          animation: `ilc-scroll ${durationSec}s linear infinite`,
          animationPlayState: isHovering ? 'paused' as const : 'running' as const,
        }}
      >
        {/* Render two copies for seamless loop */}
        <div className="flex items-center shrink-0 gap-x-0">
          {items.map(renderLogo)}
        </div>
        <div className="flex items-center shrink-0 gap-x-0" aria-hidden>
          {items.map(renderLogo)}
        </div>
      </div>

      {/* Component-scoped styles */}
      <style>{`
        @keyframes ilc-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ilc-glow {
          0% { filter: blur(8px) brightness(0.9); opacity: 0.35; }
          50% { filter: blur(12px) brightness(1.05); opacity: 0.5; }
          100% { filter: blur(8px) brightness(0.95); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default InfiniteLogoCarousel;
