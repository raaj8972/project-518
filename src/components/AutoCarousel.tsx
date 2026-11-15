import React, { useEffect, useRef, useState } from 'react';

interface AutoCarouselProps {
  children: React.ReactNode[] | React.ReactNode;
  intervalMs?: number;
  pauseOnHover?: boolean;
  // externally pause autoplay (e.g., when a modal opens)
  paused?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  showPause?: boolean;
  // Stop auto-advance permanently after user interaction (arrows/dots)
  stopOnInteraction?: boolean;
  itemNavigation?: boolean;
  ariaLabel?: string;
}

export function getItemScrollStops(element: HTMLElement) {
  const max = Math.max(0, element.scrollWidth - element.clientWidth);
  const children = Array.from(element.children) as HTMLElement[];
  const first = children[0]?.offsetLeft || 0;
  return [0, ...children.map(child => Math.min(max, Math.max(0, child.offsetLeft - first)))]
    .filter((position, index, positions) => index === 0 || Math.abs(position - positions[index - 1]) > 1);
}

export const AutoCarousel: React.FC<AutoCarouselProps> = ({
  children,
  intervalMs = 4000,
  pauseOnHover = true,
  paused = false,
  showArrows = true,
  showDots = true,
  className = '',
  showPause = false,
  stopOnInteraction = false,
  itemNavigation = false,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Separate manual pause from hover pause so the pause button is respected
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollStops = useRef<number[]>([0]);
  const scrollBehavior: ScrollBehavior = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const isPaused = isManualPaused || (pauseOnHover && isHovering) || !!paused || (stopOnInteraction && hasInteracted);


  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computePages = () => {
      // Responsive/hidden sections can briefly have no layout width. Dividing
      // by zero would make the dot count infinite and crash the whole page.
      const viewportWidth = el.clientWidth;
      scrollStops.current = itemNavigation && viewportWidth > 0 ? getItemScrollStops(el) : [0];
      const pages = itemNavigation ? scrollStops.current.length : viewportWidth > 0 ? Math.max(1, Math.ceil(el.scrollWidth / viewportWidth)) : 1;
      setPageCount(pages);
      // Update current page according to scroll position
      const page = itemNavigation ? scrollStops.current.reduce((closest, position, index, positions) => Math.abs(position - el.scrollLeft) < Math.abs(positions[closest] - el.scrollLeft) ? index : closest, 0) : viewportWidth > 0 ? Math.round(el.scrollLeft / viewportWidth) : 0;
      setCurrentPage(Math.min(pages - 1, Math.max(0, page)));
    };

    computePages();

    const resizeObs = new ResizeObserver(() => computePages());
    resizeObs.observe(el);

    const onScroll = computePages;
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      try { resizeObs.disconnect(); } catch {}
      el.removeEventListener('scroll', onScroll);
    };
  }, [children, itemNavigation]);

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
        el.scrollTo({ left: 0, behavior: scrollBehavior });
      } else {
        el.scrollTo({ left: itemNavigation ? scrollStops.current[next] : el.clientWidth * next, behavior: scrollBehavior });
      }
    };

    const id = setInterval(() => {
      if (!isPaused && isVisible && pageCount > 1) tick();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, isPaused, isVisible, pageCount, currentPage, itemNavigation, scrollBehavior]);

  const onPrev = () => {
    if (stopOnInteraction) setHasInteracted(true);
    const el = containerRef.current;
    if (!el) return;
    const prev = Math.max(0, currentPage - 1);
    el.scrollTo({ left: itemNavigation ? scrollStops.current[prev] : el.clientWidth * prev, behavior: scrollBehavior });
  };

  const onNext = () => {
    if (stopOnInteraction) setHasInteracted(true);
    const el = containerRef.current;
    if (!el) return;
    const next = Math.min(pageCount - 1, currentPage + 1);
    el.scrollTo({ left: itemNavigation ? scrollStops.current[next] : el.clientWidth * next, behavior: scrollBehavior });
  };

  return (
    <div
      className={`relative ${className}`}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      data-item-count={React.Children.count(children)}
      data-page-count={pageCount}
      onMouseEnter={() => pauseOnHover && setIsHovering(true)}
      onMouseLeave={() => pauseOnHover && setIsHovering(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
        if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); setIsManualPaused(p => !p); }
      }}
      onTouchStart={() => stopOnInteraction && setHasInteracted(true)}
      onMouseDown={() => stopOnInteraction && setHasInteracted(true)}
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

      {showArrows && (!itemNavigation || pageCount > 1) && (
        <>
          <button
            type="button"
            onClick={onPrev}
            className="auto-carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 hidden md:flex items-center justify-center hover:bg-black/70"
            aria-label="Previous"
            disabled={itemNavigation && currentPage === 0}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="auto-carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 hidden md:flex items-center justify-center hover:bg-black/70"
            aria-label="Next"
            disabled={itemNavigation && currentPage >= pageCount - 1}
          >
            ›
          </button>
        </>
      )}

      {showDots && pageCount > 1 && (
        <div className="auto-carousel-dots absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (stopOnInteraction) setHasInteracted(true);
                const el = containerRef.current; if (!el) return; el.scrollTo({ left: itemNavigation ? scrollStops.current[i] : el.clientWidth * i, behavior: scrollBehavior });
              }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === currentPage ? 'true' : undefined}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentPage ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}

      {showPause && (!itemNavigation || pageCount > 1) && (
        <button
          type="button"
          onClick={() => setIsManualPaused(p => !p)}
          aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
          title={isPaused ? 'Play' : 'Pause'}
          className="auto-carousel-pause absolute bottom-2 right-2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/80"
        >
          <span className="text-sm select-none">{isPaused ? '▶' : '❚❚'}</span>
        </button>
      )}
    </div>
  );
};

export default AutoCarousel;
