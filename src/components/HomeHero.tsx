import React, { useEffect, useState, useRef } from 'react';
import { heroMediaService, HeroMediaV2 } from '../services/heroMediaService';
import { useTheme } from '../context/ThemeContext';
import { CyberpunkHeroContent } from './ui/CyberpunkHeroContent';
import { FluidBackground } from './ui/FluidBackground';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Canvas3D = React.lazy(() => import('./ui/Canvas3D').then(m => ({ default: m.Canvas3D })));

export const HomeHero: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef<HTMLElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = heroMediaService.subscribeHeroMedia('home', (data) => {
      setMedia(data);
      setVideoError(false);
    });
    return () => unsubscribe();
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Video Autoplay logic
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.readyState >= 3) {
      vid.play().catch(() => vid.load());
    } else {
      vid.load();
      vid.play().catch(() => {});
    }
  }, [media, isMobile]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    // All themes now use standard scrolling (no pinning)
    // We just ensure the content is visible immediately without scroll interaction.
    if (textContainerRef.current) {
      gsap.set(textContainerRef.current, { clearProps: 'all', opacity: 1, y: 0, scale: 1 });
    }

    // Still use ScrollTrigger for a simple fade-in effect if desired, but NO pinning.
    // However, for this request, we'll keep it as a totally static, non-scroll-animated hero
    // that scrolls naturally with the page.
    
    return () => {
      // Cleanup any active ScrollTriggers for this section
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === containerRef.current) {
          st.kill();
        }
      });
      ScrollTrigger.refresh();
    };
  }, [media, isMobile, theme]);

  const renderBackground = () => {
    if (!media || !media.enabled) {
      if (theme === 'bollywood') {
        return (
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.00) 70%)' }}>
            <div className="absolute inset-0 bg-black z-0"></div>
          </div>
        );
      }
      return (
        <div className="absolute inset-0 bg-[#000000] z-0">
          <FluidBackground />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-[#050505] to-[#000000]" />
        </div>
      );
    }

    const {
      background_type,
      video_url,
      mobile_video_url,
      image_url,
      mobile_image_url,
      poster_url,
      mobile_poster_url,
      overlay_color,
      overlay_opacity,
      desktop_zoom,
      desktop_offset_x,
      desktop_offset_y,
      mobile_zoom,
      mobile_offset_x,
      mobile_offset_y
    } = media;

    const zoom = isMobile ? mobile_zoom : desktop_zoom;
    const offsetX = isMobile ? mobile_offset_x : desktop_offset_x;
    const offsetY = isMobile ? mobile_offset_y : desktop_offset_y;

    const transformStyle = {
      transform: `translate3d(${offsetX * 100}%, ${offsetY * 100}%, 0) scale(${zoom})`,
      transformOrigin: 'center center',
      transition: 'transform 0.5s ease-out',
      willChange: 'transform'
    };

    const activeVideo = isMobile && mobile_video_url ? mobile_video_url : video_url;
    const activeImage = isMobile && mobile_image_url ? mobile_image_url : image_url;
    const activePoster = isMobile && mobile_poster_url ? mobile_poster_url : poster_url;
    
    const videoToRender = (background_type === 'video' || background_type === 'auto') && activeVideo && !videoError;
    const imageToRender = !videoToRender && activeImage;

    let mediaElement = null;
    if (videoToRender) {
      mediaElement = (
        <video 
          key={activeVideo}
          ref={videoRef}
          src={activeVideo}
          muted 
          loop
          autoPlay
          playsInline
          preload="auto"
          poster={activePoster || undefined}
          onLoadedData={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.warn('Autoplay failed:', e));
            }
          }}
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
        />
      );
    } else if (imageToRender) {
      mediaElement = (
        <img 
          src={activeImage} 
          alt="Hero background" 
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
        />
      );
    } else {
      mediaElement = (
        <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#111827] to-[#030712]">
          <FluidBackground />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#000000] bg-black">
        {mediaElement}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: theme === 'bollywood' ? '#000000' : overlay_color,
            opacity: theme === 'bollywood' ? 0.06 : overlay_opacity
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" style={{ opacity: theme === 'bollywood' ? 0.06 : 0.9 }} />
      </div>
    );
  };

  return (
    <div className="hero-root-container w-full">
      <section ref={containerRef} className="hero-section relative h-screen flex items-center justify-center overflow-hidden bg-[#000000]">
        {renderBackground()}

        {(!media || !media.enabled) && (
          <React.Suspense fallback={null}>
            <Canvas3D />
          </React.Suspense>
        )}

        <div ref={textContainerRef} className="relative z-10 w-full flex justify-center items-center h-full">
          <CyberpunkHeroContent />
        </div>
      </section>
    </div>
  );
});

export default HomeHero;
