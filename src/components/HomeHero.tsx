import { resolveHomepageMedia } from '../utils/homepageMedia';
import React, { useEffect, useState, useRef } from 'react';
import { heroMediaService, HeroMediaV2 } from '../services/heroMediaService';
import { useTheme } from '../context/ThemeContext';
import { SpiderHeroContent } from './ui/SpiderHeroContent';
const CyberpunkHeroContent = React.lazy(() => import('./ui/CyberpunkHeroContent').then(module => ({ default: module.CyberpunkHeroContent })));




export const HomeHero = React.memo(({ previewMobile }: { previewMobile?: boolean } = {}) => {
  const { theme } = useTheme();
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
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
  }, [theme]);

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

  if (theme === 'spiderman') return <SpiderHeroContent media={media} mobile={previewMobile ?? isMobile} />;

  const renderBackground = () => {
    if (!media || !media.enabled) return null;

    const {
      image_url,
      mobile_image_url,
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

    const background = resolveHomepageMedia(media, isMobile);
    const activeVideo = background.kind === 'video' ? background.src : '';
    const activeImage = background.kind === 'image' ? background.src : (isMobile ? mobile_image_url || image_url : image_url);
    const activePoster = background.poster;
    
    const videoToRender = !!activeVideo && !videoError;
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



        <div ref={textContainerRef} className="relative z-10 w-full flex justify-center items-center h-full">
          <React.Suspense fallback={null}><CyberpunkHeroContent showBackground={!media} /></React.Suspense>
        </div>
      </section>
    </div>
  );
});

export default HomeHero;
