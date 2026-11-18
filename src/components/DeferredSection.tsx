import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mount once near the viewport, so lower-page chunks and effects don't compete with the hero. */
export default function DeferredSection({ children, minHeight, eager = false }: { children: ReactNode; minHeight: number | string; eager?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (ready || eager) return;
    const node = root.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: '700px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready, eager]);
  return <div ref={root} data-deferred-section={ready || eager ? 'ready' : 'pending'} style={ready || eager ? undefined : { minHeight }}>
    {ready || eager ? children : null}
  </div>;
}
