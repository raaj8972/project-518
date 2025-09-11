import React, { useEffect, useRef, useState } from 'react';

interface AutoCarouselProps {
  children: React.ReactNode[] | React.ReactNode;
  intervalMs?: number;
  pauseOnHover?: boolean;
  showArrows?: boolean;
  className?: string;
}

export const AutoCarousel: React.FC<AutoCarouselProps> = ({
  children,
  intervalMs = 4000,
  pauseOnHover = true,
  showArrows = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    const tick = () => {
      if (!el) return;
      const atEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: Math.max(200, Math.floor(el.clientWidth * 0.9)), behavior: 'smooth' });
      }
    };

    const id = setInterval(() => {
      if (!isPaused) tick();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, isPaused]);

  const onPrev = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: -Math.max(200, Math.floor(el.clientWidth * 0.9)), behavior: 'smooth' });
  };

  const onNext = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.max(200, Math.floor(el.clientWidth * 0.9)), behavior: 'smooth' });
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="flex space-x-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-1"
      >
        {React.Children.map(children, (child, idx) => (
          <div key={idx} className="snap-start shrink-0">
            {child}
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

export default AutoCarousel;
