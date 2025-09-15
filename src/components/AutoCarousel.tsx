import React, { useEffect, useRef, useState } from 'react';

interface AutoCarouselProps {
  children: React.ReactNode[] | React.ReactNode;
  intervalMs?: number;
  pauseOnHover?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  showPause?: boolean;
}

export const AutoCarousel: React.FC<AutoCarouselProps> = ({
  children,
  intervalMs = 4000,
  pauseOnHover = true,
  showArrows = true,
  showDots = true,
  className = '',
  showPause = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Separate manual pause from hover pause so the pause button is respected
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const isPaused = isManualPaused || (pauseOnHover && isHovering);


  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computePages = () => {
      const pages = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
      setPageCount(pages);
      // Update current page according to scroll position
      const page = Math.round(el.scrollLeft / el.clientWidth);
      setCurrentPage(Math.min(pages - 1, Math.max(0, page)));
    };

    computePages();

    const resizeObs = new ResizeObserver(() => computePages());
    resizeObs.observe(el);

    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth);
      setCurrentPage(page);
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      try { resizeObs.disconnect(); } catch {}
      el.removeEventListener('scroll', onScroll);
    };
  }, [children]);

  // Pause when not visible in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIsVisible(entry?.isIntersecting ?? true);
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-advance
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const tick = () => {
      const next = currentPage + 1;
      if (next >= pageCount) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollTo({ left: el.clientWidth * next, behavior: 'smooth' });
      }
    };

    const id = setInterval(() => {
      if (!isPaused && isVisible && pageCount > 1) tick();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, isPaused, isVisible, pageCount, currentPage]);

  const onPrev = () => {
    const el = containerRef.current;
    if (!el) return;
    const prev = Math.max(0, currentPage - 1);
    el.scrollTo({ left: el.clientWidth * prev, behavior: 'smooth' });
  };

  const onNext = () => {
    const el = containerRef.current;
    if (!el) return;
    const next = Math.min(pageCount - 1, currentPage + 1);
    el.scrollTo({ left: el.clientWidth * next, behavior: 'smooth' });
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onPrev();
        if (e.key === 'ArrowRight') onNext();
        if (e.key === ' ') { e.preventDefault(); setIsManualPaused(p => !p); }
      }}
    >
      <div
        ref={containerRef}
        className={`flex space-x-4 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth snap-x snap-mandatory ${showArrows ? 'px-1 md:px-10' : 'px-1'}`}
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 hidden md:flex items-center justify-center hover:bg-black/70"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 hidden md:flex items-center justify-center hover:bg-black/70"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      {showDots && pageCount > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const el = containerRef.current; if (!el) return; el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentPage ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}

      {showPause && (
        <button
          type="button"
          onClick={() => setIsManualPaused(p => !p)}
          aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
          title={isPaused ? 'Play' : 'Pause'}
          className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/80"
        >
          <span className="text-sm select-none">{isPaused ? '▶' : '❚❚'}</span>
        </button>
      )}
    </div>
  );
};

export default AutoCarousel;
