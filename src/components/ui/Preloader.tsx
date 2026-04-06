import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PRELOADER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export interface PreloaderProps {
  /** True while the app data is still loading — holds progress at 98% until false */
  loading: boolean;
  /** Orchestrated loading stage (0-3) */
  stage?: number;
  /** Called when the exit animation is complete */
  onComplete: () => void;
  /** Brand logo URL — pulled from localStorage cache for instant display */
  logoUrl?: string;
}

const STAGE_MESSAGES: Record<number, string> = {
  0: 'Initializing Core Systems...',
  1: 'Loading Events & Personnel...',
  2: 'Synchronizing Management Data...',
  3: 'Finalizing Experience...',
};

const getTargetProgress = (stage: number) => {
  switch (stage) {
    case 0: return 25;
    case 1: return 50;
    case 2: return 75;
    case 3: return 100;
    default: return 98;
  }
};

export const Preloader: React.FC<PreloaderProps> = ({ 
  loading, 
  stage = 0,
  onComplete, 
}) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'run' | 'hold' | 'fadeout'>('run');

  // Stable refs — avoids stale-closure issues in callbacks
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const progressRef  = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);

  // ── Progress animation ────────────────────────────────────────────────────
  useEffect(() => {
    const animate = (_now: number) => {
      const target = loading ? getTargetProgress(stage) : 100;
      
      const current = progressRef.current;
      const diff = target - current;
      
      const increment = diff > 0 ? Math.max(0.15, diff * 0.08) : 0;
      const nextFloat = Math.min(current + increment, target);
      const nextDisplay = Math.floor(nextFloat);

      if (nextDisplay !== progress) {
        setProgress(nextDisplay);
      }
      progressRef.current = nextFloat;

      const isStillAnimating = loading || nextFloat < 100;

      if (isStillAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(100);
        setTimeout(() => setPhase('hold'), 300);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [loading, stage]);

  // ── Phase transitions ─────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progressRef.current < 100) {
        console.warn('[Preloader] Failsafe triggered');
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'hold') {
      const id = setTimeout(() => setPhase('fadeout'), 250); 
      return () => clearTimeout(id);
    }
    if (phase === 'fadeout') {
      const id = setTimeout(() => onCompleteRef.current(), 500); 
      return () => clearTimeout(id);
    }
  }, [phase]);

  // ── Global cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ── Derived render values ─────────────────────────────────────────────────
  const isFading = phase === 'fadeout';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        height: '100dvh',
        opacity: isFading ? 0 : 1,
        transition: isFading ? 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)' : 'none',
        willChange: isFading ? 'opacity' : 'auto',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      {/* ── Spotlight Beams from Top ── */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-40">
        {/* Left beam — Cyan */}
        <motion.div 
          className="absolute -top-20 left-[15%] w-32 h-[150%] bg-gradient-to-b from-cyan-400/40 via-cyan-400/10 to-transparent blur-2xl origin-top"
          animate={{ rotate: [-15, 10, -15], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Right beam — Indigo */}
        <motion.div 
          className="absolute -top-20 right-[15%] w-32 h-[150%] bg-gradient-to-b from-indigo-500/40 via-indigo-500/10 to-transparent blur-2xl origin-top"
          animate={{ rotate: [15, -10, 15], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Center wash */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent blur-3xl opacity-30" />
      </div>


      {/* ── Main Content ── */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 text-center" style={{ gap: 'clamp(8px, 2vh, 20px)' }}>
        
        {/* ── Lottie Animation ── */}
        <motion.div
          className="relative z-20"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Lottie player */}
          <div className="
            w-[85vw] h-[42vw]
            sm:w-[70vw] sm:h-[35vw]
            md:w-[500px] md:h-[250px]
            lg:w-[580px] lg:h-[290px]
            xl:w-[640px] xl:h-[320px]
            relative
          ">
            <DotLottieReact
              src="/animations/preloader.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </motion.div>

        {/* ── Stage Message ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-center font-serif tracking-[0.25em] uppercase"
            style={{
              fontSize: 'clamp(0.55rem, 1.4vw, 0.75rem)',
              color: '#a5b4fc',
              textShadow: '0 0 12px rgba(165, 180, 252, 0.3)',
            }}
          >
            {STAGE_MESSAGES[stage] || 'PREPARING YOUR EXPERIENCE...'}
          </motion.div>
        </AnimatePresence>

        {/* ── Progress Bar ── */}
        <div className="w-full max-w-xs mx-auto" style={{ width: 'clamp(200px, 60vw, 320px)' }}>
          {/* Bar track */}
          <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {/* Fill */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #0ea5e9, #14b8a6)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.5), 0 0 24px rgba(14, 165, 233, 0.3)',
                transition: 'width 0.15s linear',
              }}
            />
            {/* Shimmer scan */}
            {progress > 2 && progress < 99 && (
              <motion.div
                className="absolute inset-y-0 w-16 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  left: `${progress - 8}%`,
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Percentage counter */}
          <div className="mt-3 flex items-baseline justify-center gap-0.5">
            <span
              className="font-mono font-black tabular-nums tracking-widest"
              style={{
                fontSize: 'clamp(0.85rem, 2.5vw, 1.4rem)',
                background: 'linear-gradient(135deg, #818cf8, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))',
              }}
            >
              {String(progress).padStart(3, '0')}
            </span>
            <span
              style={{
                color: '#818cf8',
                opacity: 0.5,
                fontSize: 'clamp(0.55rem, 1.5vw, 0.85rem)',
                fontFamily: 'monospace',
              }}
            >
              %
            </span>
          </div>
        </div>

      </div>


    </div>
  );
};
