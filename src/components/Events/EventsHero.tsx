import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Zap } from 'lucide-react';
import { HeroBackground } from '../HeroBackground';

// Preload Component for Hero Carousel Media (Performance Optimization)
const HeroMediaPreloader: React.FC<{ events: any[] }> = React.memo(({ events }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      {events.slice(0, 4).map((event) => (
        <React.Fragment key={`preload-${event.id}`}>
          {event.poster_url && (
            <link rel="preload" as="image" href={event.poster_url} />
          )}
          {event.motion_poster_url && (
            <link rel="preload" as="video" href={event.motion_poster_url} />
          )}
        </React.Fragment>
      ))}
    </>,
    document.head
  );
});

interface EventsHeroProps {
  events: any[];
  registrationModalOpen: boolean;
  rulesModalOpen: boolean;
}

export const EventsHero: React.FC<EventsHeroProps> = ({ 
  events, 
  registrationModalOpen, 
  rulesModalOpen 
}) => {
  const [glitchActive] = useState(false);
  
  // Motion poster carousel for Hero Section (True 3D Vertical Ring)
  const motionPosterEvents = useMemo(() => {
    let base = (events as any[]).filter((e: any) => e.motion_poster_url && e.visible !== false);
    if (base.length === 0) return [];
    // Ensure we have enough items for a nice cylinder shape (min 6 faces)
    // If fewer, duplicate them
    while (base.length < 6) {
      base = [...base, ...base];
    }
    // Cap at a reasonable number to prevent performance issues if many events exist
    return base.slice(0, 12);
  }, [events]);
  
  const [rotationIndex, setRotationIndex] = useState(0); 
  const [isZoomed, setIsZoomed] = useState(false); // State for "Fit to Screen" mode
  const [transitionDuration, setTransitionDuration] = useState(3000); // Dynamic duration

  useEffect(() => {
    if (motionPosterEvents.length === 0) return;
    
    const cycleDuration = 10000;
    
    const rotateInterval = setInterval(() => {
      // 1. Prepare for Spin (Zoom Out ensured, Slow Duration)
      setIsZoomed(false);
      setTransitionDuration(3000);
      
      // Randomly rotate 2 or 3 items to give a "spinning drum" feel
      const randomSteps = 2 + Math.floor(Math.random() * 2); 
      setRotationIndex(prev => prev + randomSteps);

      // 2. Schedule Zoom In after rotation finishes
      setTimeout(() => {
        setTransitionDuration(1500); // Faster for the "punch" in
        setIsZoomed(true);
      }, 3200); 

    }, cycleDuration);

    // Initial Zoom trigger on mount
    const initialZoomTimeout = setTimeout(() => {
        setTransitionDuration(1500);
        setIsZoomed(true);
    }, 1000);

    return () => {
      clearInterval(rotateInterval);
      clearTimeout(initialZoomTimeout);
    };
  }, [motionPosterEvents.length]);

  // Effect to manage Hero Video Playback: Only play the ACTIVE face, pause others
  useEffect(() => {
    if (motionPosterEvents.length === 0) return;
    const activeIdx = rotationIndex % motionPosterEvents.length;
    
    motionPosterEvents.forEach((ev: any, idx: number) => {
       const vid = document.getElementById(`hero-video-${ev.id}-${idx}`) as HTMLVideoElement;
       if (!vid) return;
       
       if (idx === activeIdx) {
          vid.play().catch(() => {});
       } else {
          vid.pause();
       }
    });

  }, [rotationIndex, motionPosterEvents]);

  // Cylinder Math
  const faceCount = motionPosterEvents.length;
  const faceHeight = 58; // vh
  const faceTitle = 360 / faceCount;
  const radius = Math.round(((faceHeight / 2) / Math.tan(Math.PI / faceCount)) * 1.5); 

  return (
    <div ref={(el) => {
      // Pausal Observer for Hero Animation
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(([entry]) => {
         const isVisible = entry.isIntersecting;
         if (isVisible) {
           el.classList.remove('paused-animations');
           el.querySelectorAll('video').forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
         } else {
           el.classList.add('paused-animations');
           el.querySelectorAll('video').forEach(v => { try { v.pause() } catch {} });
         }
      }, { threshold: 0.1 }); 
      observer.observe(el);
    }} className="hero-section-wrapper">
      <HeroMediaPreloader events={motionPosterEvents} />
      
      <section className="hero-section relative h-[80vh] md:min-h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
          <div className="absolute inset-0 z-0 bg-black">
          
          <div className={`absolute inset-0 transition-opacity duration-1000 ${motionPosterEvents.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
             <HeroBackground pageKey="events" />
          </div>

          {motionPosterEvents.length > 0 && !registrationModalOpen && !rulesModalOpen && (
            <div 
              className="absolute top-1/2 left-1/2 w-[80vw] -ml-[40vw] md:w-[360px] md:-ml-[180px] h-[58vh] -mt-[29vh] ease-in-out hero-3d-drum" 
              style={{
                transformStyle: 'preserve-3d',
                transitionProperty: 'transform',
                transitionDuration: `${transitionDuration}ms`,
                transform: `rotateX(${-rotationIndex * faceTitle}deg)`
              }}
            >
              {motionPosterEvents.map((ev: any, idx: number) => {
                const angle = faceTitle * idx;
                const isActive = idx === rotationIndex % faceCount;
                const isItemZoomed = isActive && isZoomed;

                const getGlowStyle = (id: string | number) => {
                  const colors = [
                    'from-red-600/60 to-orange-600/60',
                    'from-orange-500/60 to-red-600/60',
                    'from-red-800/60 to-red-950/60',
                    'from-orange-600/60 to-yellow-600/60',
                    'from-red-600/60 to-rose-700/60',
                    'from-black to-red-900/60',
                    'from-orange-400/60 to-red-500/60',
                  ];
                  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  return colors[hash % colors.length];
                };

                const glowGradient = getGlowStyle(ev.id || idx);

                return (
                  <div 
                    key={`hero-video-${ev.id}-${idx}`}
                    className="absolute inset-0 w-full h-full backface-hidden will-change-transform ease-in-out"
                    style={{
                      willChange: 'transform',
                      transitionProperty: 'transform',
                      transitionDuration: `${transitionDuration}ms`,
                      transform: isItemZoomed 
                        ? `rotateX(${angle}deg) translateZ(${radius + 50}vh) scale(1.45)` 
                        : `rotateX(${angle}deg) translateZ(${radius}vh)`,
                      height: '58vh',
                      zIndex: isItemZoomed ? 100 : 0
                    }}
                  > 
                    <div className={`w-full h-full relative transition-all duration-1000 ${isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-90 brightness-90' } ${isItemZoomed ? 'p-0' : 'p-2'}`}>
                      {isActive && !isItemZoomed && (
                        <div className={`absolute -inset-16 md:-inset-32 bg-gradient-to-r ${glowGradient} blur-[40px] md:blur-[80px] opacity-100 rounded-full animate-pulse z-[-1]`} />
                      )}
                      
                      <div className="relative w-full h-full overflow-hidden rounded-xl">
                        <video
                          id={`hero-video-${ev.id}-${idx}`}
                          className={`w-full h-full object-cover shadow-2xl transition-all duration-1000 ${isItemZoomed ? 'rounded-none border-0' : 'rounded-xl border-2 border-white/40'}`}
                          src={ev.motion_poster_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          {...({ fetchpriority: "high" } as any)}
                          poster={ev.image} 
                        />
                        
                        {isActive && !isItemZoomed && (
                          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl">
                            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] animate-shine" />
                          </div>
                        )}
                      </div>

                      {!isItemZoomed && (
                         <div className="absolute top-full left-0 w-full h-[60%] bg-gradient-to-b from-white/30 to-transparent transform scale-y-[-1] opacity-50 mask-image-gradient" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`} />
          <div className="absolute inset-0 bg-black/60 z-5 pointer-events-none transition-opacity duration-1000" />
        </div>
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-red-950/20 border border-red-600/30 text-red-500 px-6 py-3 rounded-full text-sm font-black tracking-widest mb-8 backdrop-blur-sm stranger-pulse-glow">
              <Zap className="w-4 h-4 mr-2 animate-pulse text-red-600" /> OFFICIAL EVENTS
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 nebula-title-text ${glitchActive ? 'glitch-active' : ''}`}>
              <span className="text-red-600">EVENTS</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Experience the <span className="text-red-400 upside-down-glow">Grandeur</span> through our
              <span className="text-red-600 upside-down-glow"> immersive events</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
