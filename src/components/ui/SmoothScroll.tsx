import React, { useEffect } from 'react';
import Lenis from 'lenis';

export const SmoothScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    let frame: number | null = null;
    let disposed = false;
    // Initialize Lenis with optimized settings
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    const immediateScroll = (event: Event) => {
      const top = (event as CustomEvent<{ top: number }>).detail?.top;
      if (typeof top === 'number' && Number.isFinite(top)) lenis.scrollTo(top, { immediate: true, force: true });
    };
    window.addEventListener('rico:scroll-to', immediateScroll);

    function raf(time: number) {
      frame = null;
      if (disposed || document.hidden) return;
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }

    const syncVisibility = () => {
      if (document.hidden) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      } else if (!disposed && frame === null) {
        frame = requestAnimationFrame(raf);
      }
    };
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();

    // Cleanup on unmount
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', syncVisibility);
      lenis.destroy();
      window.removeEventListener('rico:scroll-to', immediateScroll);
    };
  }, []);

  return <>{children}</>;
};
