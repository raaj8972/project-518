import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const wipeRef = useRef<HTMLDivElement>(null);
  const wipeContentRef = useRef<HTMLDivElement>(null);

  // Skip transition for admin/security routes to keep them snappy/functional
  const isExcluded = location.pathname.startsWith('/admin') || 
                     location.pathname.startsWith('/security-') ||
                     location.pathname.startsWith('/coordinator');

  useEffect(() => {
    if (isExcluded) {
      setDisplayLocation(location);
      return;
    }

    if (location.pathname !== displayLocation.pathname) {
      const wipe = wipeRef.current;
      const wipeContent = wipeContentRef.current;
      if (!wipe || !wipeContent) {
        setDisplayLocation(location);
        return;
      }

      // 1. Wipe In (Covering the screen)
      gsap.fromTo(wipe, 
        { scaleY: 0, transformOrigin: 'top' }, 
        { 
          scaleY: 1, 
          duration: 0.4, 
          ease: 'power3.inOut',
          onComplete: () => {
            // Swap the actual component tree while covered
            setDisplayLocation(location);

            // 2. Wipe Out (Revealing new screen)
            gsap.fromTo(wipe,
              { scaleY: 1, transformOrigin: 'bottom' },
              { scaleY: 0, duration: 0.4, ease: 'power3.inOut', delay: 0.1 } // Slight delay to ensure React render
            );
          }
        }
      );
      
      // Secondary wipe content (like a tech-glitch text)
      gsap.fromTo(wipeContent,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, delay: 0.2, 
          onComplete: () => {
             gsap.to(wipeContent, { opacity: 0, y: -20, duration: 0.2, delay: 0.1 });
          }
        }
      );

    }
  }, [location, displayLocation, isExcluded]);

  // If excluded, just render normally without the wrapper wrapper animations
  if (isExcluded) return <>{children}</>;

  return (
    <>
      <div 
        ref={wipeRef}
        className="fixed inset-0 z-[80000] pointer-events-none bg-[#030712] flex items-center justify-center border-y-2 border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.3)] origin-top scale-y-0"
      >
        <div ref={wipeContentRef} className="text-white font-mono text-xl tracking-[0.5em] opacity-0 text-glow-strong">
          ACCESSING
        </div>
      </div>
      {/* We key children by the display path so React unmounts/remounts completely, preventing scroll state bleed */}
      <div key={displayLocation.pathname}>
        {children}
      </div>
    </>
  );
};
