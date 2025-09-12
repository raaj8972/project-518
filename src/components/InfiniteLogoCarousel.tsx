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
  className?: string;
  heightClass?: string; // e.g., 'h-16'
  itemPaddingClass?: string; // e.g., 'px-4 sm:px-6 md:px-8'
}

const InfiniteLogoCarousel: React.FC<InfiniteLogoCarouselProps> = ({
  items,
  speedPxPerSec = 120,
  pauseOnHover = true,
  className = '',
  heightClass = 'h-16',
  itemPaddingClass = 'px-8'
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

  const renderLogo = (item: LogoItem) => (
    <div key={item.id} className={`flex items-center justify-center ${itemPaddingClass} ${heightClass}`}>
      {item.website ? (
        <a href={item.website} target="_blank" rel="noopener noreferrer" title={item.name} className="block">
          <img src={item.logo} alt={item.name} loading="lazy" decoding="async" className={`${heightClass} object-contain max-w-full opacity-90 transition hover:opacity-100`} />
        </a>
      ) : (
  <img src={item.logo} alt={item.name} title={item.name} loading="lazy" decoding="async" className={`${heightClass} object-contain max-w-full opacity-90`} />
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
    >
      <div
        ref={trackRef}
        className="flex items-center whitespace-nowrap"
        style={{
          animation: `ilc-scroll ${durationSec}s linear infinite`,
          animationPlayState: isHovering ? 'paused' as const : 'running' as const,
        }}
      >
        {/* Render two copies for seamless loop */}
        <div className="flex items-center">
          {items.map(renderLogo)}
        </div>
        <div className="flex items-center" aria-hidden>
          {items.map(renderLogo)}
        </div>
      </div>

      {/* Component-scoped styles */}
      <style>{`
        @keyframes ilc-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default InfiniteLogoCarousel;
