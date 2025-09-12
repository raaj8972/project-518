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
}

function InfiniteMarquee<T>({
  items,
  renderItem,
  speedPxPerSec = 120,
  pauseOnHover = true,
  pauseOnTouch = true,
  paused = false,
  className = '',
  direction = 'left',
  itemWrapperClassName = 'px-4'
}: InfiniteMarqueeProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const fullWidth = track.scrollWidth; // both copies
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

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
      onTouchStart={() => pauseOnTouch && setIsHovering(true)}
      onTouchEnd={() => pauseOnTouch && setIsHovering(false)}
    >
      <div
        ref={trackRef}
        className="flex items-stretch whitespace-nowrap"
        style={{
          animation: `im-scroll ${durationSec}s linear infinite`,
          animationPlayState: (paused || isHovering) ? ('paused' as const) : ('running' as const),
          animationDirection: direction === 'right' ? ('reverse' as const) : ('normal' as const),
          willChange: 'transform'
        }}
      >
        <div className="flex items-stretch">
          {items.map((item, idx) => (
            <div key={`a-${idx}`} className={`inline-flex min-w-[12rem] ${itemWrapperClassName}`}>
              {renderItem(item, idx)}
            </div>
          ))}
        </div>
        <div className="flex items-stretch" aria-hidden>
          {items.map((item, idx) => (
            <div key={`b-${idx}`} className={`inline-flex min-w-[12rem] ${itemWrapperClassName}`}>
              {renderItem(item, idx)}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes im-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export default InfiniteMarquee;
