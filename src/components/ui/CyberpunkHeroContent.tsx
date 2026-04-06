import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import lottie from 'lottie-web';
import groovyWalkAnimation from '../../assets/animations/groovy-walk.json';

// Loop phases: walk+textIn → hold → fadeOut → restart
type LoopPhase = 'enter' | 'hold' | 'exit';

export const CyberpunkHeroContent: React.FC<{ pageKey?: string }> = ({ pageKey = 'home' }) => {
  const { homepageSettings, heroMedia, fetchHeroMedia } = useData();
  
  useEffect(() => {
    if (typeof fetchHeroMedia === 'function') {
      fetchHeroMedia(pageKey);
    }
  }, [fetchHeroMedia, pageKey]);

  const siteHeroMedia = heroMedia?.[pageKey as keyof typeof heroMedia];
  const videoUrl = siteHeroMedia?.video_url || "/login_page_video.mp4";


  const [phase, setPhase] = useState<LoopPhase>('enter');
  const [loopKey, setLoopKey] = useState(0); // forces re-mount for each loop
  const [walkProgress, setWalkProgress] = useState(0);
  const lottieContainerRef = useRef<HTMLDivElement>(null);
  const lottieInstanceRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(
    window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
  );

  useEffect(() => {
    let raf = 0 as number | null;
    const handleResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        if (w < 768) setDeviceType('mobile');
        else if (w < 1024) setDeviceType('tablet');
        else setDeviceType('desktop');
        raf = 0;
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (raf) cancelAnimationFrame(raf as number);
    };
  }, []);

  // Translations pre-split to preserve correct multi-byte syllables (matras/conjuncts)
  const multilingualTexts = [
    { letters: ["R", "I", "C", "O", "R", "R", "E", "N", "Z", "A"], font: 'font-black' },
    { letters: ["রি", "কো", "রে", "ন", "জা"], font: 'font-bengali' },
    { letters: ["रि", "को", "रें", "ज़ा"], font: 'font-hindi' },
  ];
  
  // Pick language based on loop key sequence
  const currentLang = multilingualTexts[loopKey % multilingualTexts.length];
  const currentLetters = currentLang.letters;

  // ==========================================
  // 🎛️ ANIMATION CONTROLS (Final Responsive Values)
  // ==========================================
  const CHAR_TOP = deviceType === 'mobile' ? 44 : deviceType === 'tablet' ? 46 : 48;          // Character height % (Deeper ground)
  
  // 🔥 Better Visual Balance: Lowering the scene to the center
  const TEXT_TOP = deviceType === 'mobile' ? -20 : deviceType === 'tablet' ? -15 : -15;         // Text vertical offset in px
  const CHAR_SCALE = deviceType === 'mobile' ? 1.65 : deviceType === 'tablet' ? 1.55 : 1.85;    // Character larger for visibility
  const TEXT_SCALE = deviceType === 'mobile' ? 1.15 : deviceType === 'tablet' ? 1.15 : 1.15;    // Text scaled back for elegance
  const SCENE_TOP = deviceType === 'mobile' ? -110 : deviceType === 'tablet' ? -100 : -100;     // Scene tag Y offset
  const SCENE_SCALE = deviceType === 'mobile' ? 0.70 : deviceType === 'tablet' ? 0.85 : 1.0;   // Scene tag Scale
  
  const PULL_OFFSET = deviceType === 'mobile' ? 95 : deviceType === 'tablet' ? 85 : 85;          
  const WALK_START_X = -50;        
  const WALK_END_X = 135;          
  const WALK_DURATION = 11500;  // walk across duration
  // ==========================================

  const HOLD_DURATION = 3000;  // 3s text stays visible
  const EXIT_DURATION = 1200;  // 1.2s fade out
  const RESTART_DELAY = 800;   // 0.8s pause before next loop

  // Initialize lottie-web into the container
  useEffect(() => {
    if (!lottieContainerRef.current) return;

    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.destroy();
    }

    lottieInstanceRef.current = lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: groovyWalkAnimation,
    });

    return () => {
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
    };
  }, [loopKey]); // re-init on each loop

  // Walk progress animation (drives the character position)
  useEffect(() => {
    if (phase !== 'enter') return;

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / WALK_DURATION, 1);
      setWalkProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Walk done → hold phase
        setPhase('hold');
      }
    };

    // Small delay before starting walk
    const timer = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, loopKey]);

  // Hold phase timer → exit
  useEffect(() => {
    if (phase !== 'hold') return;
    const timer = setTimeout(() => setPhase('exit'), HOLD_DURATION);
    return () => clearTimeout(timer);
  }, [phase]);

  // Exit phase timer → restart loop
  useEffect(() => {
    if (phase !== 'exit') return;
    const timer = setTimeout(() => {
      setWalkProgress(0);
      setPhase('enter');
      setLoopKey(k => k + 1);
    }, EXIT_DURATION + RESTART_DELAY);
    return () => clearTimeout(timer);
  }, [phase]);

  // Character walk position spanning across the whole screen based on controls
  const walkDistance = WALK_END_X - WALK_START_X;
  const walkX = WALK_START_X + walkProgress * walkDistance;

  // Dragging illusion: text stays at a fixed distance behind the walker until it hits center (0)
  const textX = Math.min(0, walkX - PULL_OFFSET);
  const isPulling = textX < 0 && phase === 'enter';

  // Fade in the text ONLY when the character is visibly on screen dragging it.
  // We keep it at 0 opacity if it's too far left.
  const textOpacity = Math.min(1, Math.max(0, (walkX + 10) / 20));

  const isTextVisible = phase === 'enter' || phase === 'hold';
  const isExiting = phase === 'exit';

  return (
    <div
      className="relative z-10 w-full mx-auto flex flex-col items-center justify-center overflow-hidden"
      style={{ height: 'calc(100vh - 80px)', minHeight: '600px' }}
    >
      {/* Background Video */}
      <video
        key={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Dark cinematic overlay for readability */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/90 via-black/60 to-black/90"
      />

      {/* ═══ WALKING CHARACTER — positioned upper area ═══ */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">

        {/* Subtle physical "drag line" between character and text to sell the illusion */}
        {isPulling && textOpacity > 0.1 && (
          <div
            className="absolute z-10 hidden sm:block pointer-events-none"
            style={{
              left: `${walkX - 2}%`,
              top: '32%',
              width: '20vw',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.7), transparent)',
              transformOrigin: 'right center',
              transform: 'translateX(-100%) rotate(-15deg)',
              filter: 'blur(1px)',
              boxShadow: '0 0 10px rgba(34,211,238,0.5)',
            }}
          />
        )}

        {/* Walking character */}
        <div
          key={`walker-${loopKey}`}
          style={{
            position: 'absolute',
            left: `${walkX}%`,
            top: `${CHAR_TOP}%`,
            transform: `translateX(-50%) scale(${CHAR_SCALE})`,
            transformOrigin: 'bottom center', // scale from the feet to prevent floating artificially
            width: 'clamp(120px, 22vw, 260px)',
            height: 'clamp(120px, 22vw, 260px)',
            filter: 'drop-shadow(0 6px 20px rgba(217,70,239,0.5)) drop-shadow(0 0 40px rgba(34,211,238,0.3))',
            zIndex: 20,
            opacity: isExiting ? 0 : 1,
            transition: isExiting ? 'opacity 0.8s ease-out' : 'none',
          }}
        >
          <div
            ref={lottieContainerRef}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Spotlight following walker */}
        <div
          style={{
            position: 'absolute',
            left: `${walkX}%`,
            top: '10%',
            transform: 'translateX(-50%)',
            width: '30vw',
            height: '40vh',
            background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.15) 0%, transparent 60%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            opacity: isExiting ? 0 : 0.8,
            transition: isExiting ? 'opacity 0.8s ease-out' : 'none',
          }}
        />
      </div>

      {/* ═══ RICORRENZA TEXT — slides in perfectly synced with walk ═══ */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full px-4">

        {/* Paparazzi flash effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {isTextVisible && [...Array(4)].map((_, i) => (
            <motion.div
              key={`flash-${i}-${loopKey}`}
              animate={{ opacity: [0, 0.5, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, times: [0, 0.04, 0.1, 1] }}
              className="absolute w-28 h-28 bg-white rounded-full blur-3xl mix-blend-screen"
              style={{ top: `${15 + i * 18}%`, left: `${10 + i * 22}%` }}
            />
          ))}
        </div>

        {/* Scene tag (Static) */}
        <div
          className="inline-flex items-center justify-center bg-black/80 backdrop-blur-xl border border-cyan-500/50 px-6 py-3 rounded-full text-[3.5vw] sm:text-xs font-black uppercase tracking-[0.3em] text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] relative z-10 mb-6"
          style={{ 
            transform: `translateY(${SCENE_TOP}px) scale(${SCENE_SCALE})`,
            transformOrigin: 'center'
          }}
        >
          <Sparkles className="w-5 h-5 mr-3 text-fuchsia-500" />
          ANNUAL FESTIVAL
        </div>

        {/* RICORRENZA letters — pulled from the left */}
        <div 
          className="relative flex justify-center w-full z-10 overflow-visible"
          style={{ transform: `translateY(${TEXT_TOP}px) scale(${TEXT_SCALE})` }}
        >
          <div 
            className="flex justify-center items-end py-4 sm:py-8 relative overflow-visible w-full max-w-7xl mx-auto"
            style={{
              transform: `translateX(${isExiting ? '120%' : `${textX}%`})`,
              opacity: isExiting ? 0 : textOpacity,
              // Smooth transition only when exiting, otherwise strictly tied to walkX for drag illusion
              transition: isExiting ? 'transform 1s ease-in, opacity 0.8s ease-out' : 'none',
            }}
          >
            {currentLetters.map((letter: string, index: number) => {
              // Dynamic tension effect: letters tilt forward while being dragged
              const letterSkew = isPulling ? -12 : 0;
              // Add a slight stagger to the spring-back when they stop and 'isPulling' becomes false
              const staggeredTransitionDelay = isPulling ? 0 : index * 0.03;

              return (
                <span
                  key={`${loopKey}-${index}`}
                  className={`text-[13vw] sm:text-7xl md:text-[7.5rem] lg:text-[10rem] font-black tracking-tighter inline-block ${currentLang.font}`}
                  style={{
                    textShadow: '0 0 40px rgba(34,211,238,0.6), 0 0 80px rgba(217,70,239,0.3)',
                    transform: `skewX(${letterSkew}deg)`,
                    transition: `transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${staggeredTransitionDelay}s`, // bouncy stop
                  }}
                >
                  {index === 0 ? (
                    <span className="relative inline-block text-cyan-400">
                      {letter}
                      {!isPulling && !isExiting && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5 }}
                          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-8 h-8 sm:w-10 sm:h-10 bg-fuchsia-500 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(217,70,239,0.8)] border-2 border-[#111]"
                        >
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </motion.div>
                      )}
                    </span>
                  ) : (
                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-fuchsia-400">
                      {letter}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Subtitle + CTA - completely static */}
        <div className="flex flex-col items-center gap-6 relative z-20 mt-8 sm:mt-12 md:mt-16 lg:mt-20">
          <p className="text-[7.5vw] sm:text-4xl md:text-6xl lg:text-7xl font-black max-w-5xl mx-auto leading-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 drop-shadow-[0_0_25px_rgba(217,70,239,0.5)] font-sans tracking-wide">
            {homepageSettings?.hero_subtitle || 'Welcome to the Experience'}
          </p>
          <p className="text-[5vw] sm:text-2xl md:text-3xl text-cyan-100 max-w-4xl mx-auto leading-relaxed font-semibold px-4 tracking-wider drop-shadow-md">
            {homepageSettings?.hero_description || 'Experience the future of music and creativity'}
          </p>

          {/* Button removed */}
        </div>
      </div>

      <style>{`
        .font-bengali {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
          letter-spacing: -0.02em;
        }
        .font-hindi {
          font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
          letter-spacing: -0.02em;
        }
      `}</style>
    </div>
  );
};



export default CyberpunkHeroContent;
