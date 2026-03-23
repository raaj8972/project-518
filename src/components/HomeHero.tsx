import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import ScrollHint from './ScrollHint';
import { FluidBackground } from './ui/FluidBackground';
import { heroMediaService, HeroMediaV2 } from '../services/heroMediaService';
import { useData } from '../context/DataContext';
import GlitchBrandName from './ui/GlitchBrandName';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Canvas3D = React.lazy(() => import('./ui/Canvas3D').then(m => ({ default: m.Canvas3D })));

export const HomeHero: React.FC = () => {
  const { homepageSettings } = useData();
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef<HTMLElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

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
      console.log('HomeHero received media data:', data);
      setMedia(data);
      setVideoError(false); // Reset error on new media
    });
    return () => unsubscribe();
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Safari iOS Workaround: force video load to enable GSAP scrubbing
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // A tiny play/pause triggers Safari to fetch the frames
    const forceLoad = async () => {
      try {
        await vid.play();
        vid.pause();
      } catch {
        // Fallback if play is completely blocked
        vid.load();
      }
    };
    
    forceLoad();
  }, [media, isMobile]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const ctx = gsap.context(() => {
      const hero = containerRef.current;
      const content = textContainerRef.current;
      if (!hero || !content) return;

      // PINNING STRATEGY: We pin the inner contents or a wrapper, NOT the root section.
      // This prevents GSAP from moving the root 'section' (which React owns) into a .pin-spacer.
      // If we pin the root, React's unmount logic fails because it can't find the section in its parent.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=150%",
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1, // Helps avoid layout jump on start
          onUpdate: (self) => {
            const vid = videoRef.current;
            if (vid && vid.readyState >= 1 && isFinite(vid.duration)) {
              // Ensure video is paused during scrubbing to prevent fighting with autoPlay/loop
              if (!vid.paused) vid.pause();
              
              // Clamp to slightly before duration to avoid loop resets on mobile
              const targetTime = vid.duration * self.progress;
              vid.currentTime = Math.min(targetTime, vid.duration - 0.1);
            }
          }
        }
      });
      
      // Text appears (scrubbed with scroll)
      tl.to(textContainerRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        ease: "power2.out",
        duration: 1
      }, 0);

      // ScrollHint fades out
      if (scrollHintRef.current) {
        tl.to(scrollHintRef.current, {
          opacity: 0,
          y: 20,
          duration: 0.5
        }, 0);
      }
    });

    return () => {
      ctx.revert();
      // Force refresh and kill all associated triggers to ensure no DOM mess is left
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === containerRef.current || st.vars.id?.includes('hero')) {
          st.kill();
        }
      });
      ScrollTrigger.refresh();
      // Ensure navbar is visible when unmounting (e.g., navigating to another page)
      gsap.set('.stranger-navbar', { clearProps: 'all' });
    };
  }, [media, isMobile]);

  const renderBackground = () => {
    if (!media || !media.enabled) {
      return (
        <div className="absolute inset-0 bg-[#000000] z-0">
          <FluidBackground />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-[#050505] to-[#000000]" />
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

    let mediaElement = null;

    const activeVideo = isMobile && mobile_video_url ? mobile_video_url : video_url;
    const activeImage = isMobile && mobile_image_url ? mobile_image_url : image_url;
    const activePoster = isMobile && mobile_poster_url ? mobile_poster_url : poster_url;
    

    const videoToRender = (background_type === 'video' || background_type === 'auto') && activeVideo && !videoError;
    const imageToRender = !videoToRender && activeImage;

    if (videoToRender) {
      mediaElement = (
        <video 
          key={activeVideo}
          ref={videoRef}
          src={activeVideo} /* Set src directly for better compatibility */
          muted 
          playsInline
          preload="auto"
          poster={activePoster || undefined}
          onLoadedData={() => {
            console.log('Hero video loaded data successfully');
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
          onError={(e) => {
            console.error('Hero video failed to load on home page:', activeVideo, e);
            setVideoError(true);
          }}
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
        >
          {/* Fallback sources */}
          <source src={activeVideo} type={activeVideo.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'} />
          <source src={activeVideo} />
        </video>
      );
    } else if (imageToRender) {
      mediaElement = (
        <img 
          src={activeImage} 
          alt="Hero background" 
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
          onError={() => console.warn('Hero image failed to load:', activeImage)}
        />
      );
    } else {
      // If neither video nor image is available, we show a premium gradient fallback 
      // or the Canvas3D will take over if enabled
      mediaElement = (
        <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#111827] to-[#030712]">
          <FluidBackground />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#000000]">
        {mediaElement}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: overlay_color, opacity: overlay_opacity }} />
        {/* Adds a slight bottom gradient to blend into the rest of the page */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent opacity-90" />
      </div>
    );
  };

  return (
    <div className="hero-root-container w-full">
      <section ref={containerRef} className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden bg-[#000000]">
        {renderBackground()}

        {/* Interactive 3D WebGL Shape overlay for extra flair when no media is playing, or as a subtle overlay */}
        {(!media || !media.enabled) && (
          <React.Suspense fallback={null}>
            <Canvas3D />
          </React.Suspense>
        )}


        {/* Hero Content */}
        <div 
          ref={textContainerRef}
          className="relative z-10 text-center text-white max-w-6xl mx-auto px-4 mt-16 md:mt-0 opacity-0 translate-y-12 scale-95"
        >
          <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 w-full">
            <div className="inline-flex items-center justify-center bg-red-950/20 backdrop-blur-xl border border-red-900/30 px-6 py-3 md:py-3 rounded-full text-[3.5vw] sm:text-sm font-black uppercase tracking-[0.25em] text-red-500/90 shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:bg-red-900/20 transition-colors duration-300">
              <Sparkles className="w-5 h-5 mr-3 text-red-600 animate-pulse" />
              ANNUAL FESTIVAL
            </div>
            
            <div className="relative overflow-visible">
              <div className="text-[10vw] leading-[1.8] sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,0.5)] overflow-visible">
                <GlitchBrandName />
              </div>
            </div>
            
            <p className="text-[6vw] sm:text-4xl md:text-5xl font-bold max-w-4xl mx-auto leading-tight text-transparent bg-clip-text bg-gradient-to-r from-red-50 to-red-600 drop-shadow-md">
              {homepageSettings?.hero_subtitle || 'Welcome to the Experience'}
            </p>
            
            <p className="text-[4.5vw] sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium px-4">
              {homepageSettings?.hero_description || 'Where Healthcare meets Technology and Creativity'}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pt-8">
                <a
                  href="/events"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-700 to-black hover:from-red-600 hover:to-zinc-900 text-white font-bold tracking-widest uppercase text-sm transition-all duration-300 shadow-[0_8px_32px_rgba(220,38,38,0.4)] hover:shadow-[0_16px_48px_rgba(220,38,38,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3 border border-red-900/30"
                >
                  <Calendar className="w-5 h-5" />
                  Explore The Gate
                </a>
              

            </div>
          </div>
        </div>

        <div ref={scrollHintRef} className="absolute bottom-12 left-0 right-0 z-20 flex justify-center pointer-events-none drop-shadow-2xl">
          <ScrollHint />
        </div>

      </section>
    </div>
  );
};

export default HomeHero;
