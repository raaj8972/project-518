import React, { useEffect, useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS  (computed once, never recreated)
// ─────────────────────────────────────────────────────────────────────────────

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
  logoUrl 
}) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'run' | 'hold' | 'fadeout'>('run');
  const [pulse, setPulse] = useState(0);

  // Stable refs — avoids stale-closure issues in callbacks
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const progressRef  = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const pulseFrameRef = useRef<number | undefined>(undefined);

  // Fixed Red hue for Stranger Things / RICO brand consistency
  const baseHue = useRef(0); 

  // ── Progress animation ────────────────────────────────────────────────────
  useEffect(() => {
    // Duration extended to 3.5s to align with CombinedDataProvider's ~3.6s orchestrated load
    const DURATION = 3500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const target = loading ? getTargetProgress(stage) : 100;
      
      const current = progressRef.current;
      const diff = target - current;
      
      // Internal progress uses high-precision floats to avoid Math.floor deadlocks
      const increment = diff > 0 ? Math.max(0.15, diff * 0.08) : 0;
      const nextFloat = Math.min(current + increment, target);
      const nextDisplay = Math.floor(nextFloat);

      if (nextDisplay !== progress) {
        setProgress(nextDisplay);
      }
      progressRef.current = nextFloat;

      // Keep animating if:
      // 1. Mandatory minimum duration not met (now 800ms for visual weight)
      // 2. Data is still hard-loading
      // 3. Precision progress hasn't hit 100
      const MIN_DUR = loading ? 3500 : 800;
      const isStillAnimating = elapsed < MIN_DUR || loading || nextFloat < 100;

      if (isStillAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(100);
        // Hold at 100% for a brief "ready" beat before transition
        setTimeout(() => setPhase('hold'), 300);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [loading, stage]);

  // ── Phase transitions ─────────────────────────────────────────────────────
  useEffect(() => {
    // Failsafe timer: if loading gets stuck for > 15s, allow continuing
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

  // ── Ambient glow pulse (low frequency update) ─────────────────────────────
  useEffect(() => {
    const origin = performance.now();
    let lastUpdate = 0;
    const tick = (now: number) => {
      // Throttle pulse update to ~30fps to save CPU/GPU
      if (now - lastUpdate > 32) {
        const t = ((now - origin) % 3000) / 3000; // Slower, calmer pulse
        setPulse(Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
        lastUpdate = now;
      }
      pulseFrameRef.current = requestAnimationFrame(tick);
    };
    pulseFrameRef.current = requestAnimationFrame(tick);
    return () => { if (pulseFrameRef.current) cancelAnimationFrame(pulseFrameRef.current); };
  }, []);

  // ── Global cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationRef.current)   cancelAnimationFrame(animationRef.current);
      if (pulseFrameRef.current)  cancelAnimationFrame(pulseFrameRef.current);
    };
  }, []);

  // ── Derived render values ─────────────────────────────────────────────────
  const isFading       = phase === 'fadeout';
  const glowIntensity  = (progress / 100) + (phase === 'hold' ? pulse * 0.4 : 0);
  const hue            = Math.round(baseHue.current + progress * 0.6);
  const glowColor      = `hsl(${hue}, 100%, 65%)`;
  const glowAlpha      = (o: number) => `hsla(${hue}, 100%, 65%, ${o})`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading"
      className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center overflow-hidden"
      style={{
        height: '100dvh',  /* dynamic viewport — accounts for mobile address bar */
        opacity: isFading ? 0 : 1,
        transition: isFading ? 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)' : 'none',
        willChange: isFading ? 'opacity' : 'auto',
      }}
    >
      {/* CRT scanline texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.015) 2px,rgba(255,255,255,0.015) 4px)',
          zIndex: 1,
        }}
      />

      {/* Ambient glow bloom behind logo */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'clamp(300px,60vw,600px)',
          height: 'clamp(300px,60vw,600px)',
          background: `radial-gradient(circle, ${glowAlpha(0.12 * glowIntensity)} 0%, transparent 70%)`,
          transition: 'background 0.3s ease',
          zIndex: 1,
        }}
      />

      {/* ── Content ── */}
      {/* Content column — constrained so it never overflows on small/landscape phones */}
      <div
        className="relative flex flex-col items-center w-full px-4"
        style={{
          zIndex: 3,
          gap: 'clamp(12px, 3vh, 32px)',
          maxHeight: '90dvh',
          justifyContent: 'center',
        }}
      >

        {/* Holographic logo fill */}
        {/* Logo — smaller on phones, grows with viewport, capped on desktop */}
        <div className="relative" style={{ width: 'clamp(120px, min(45vw, 38vh), 480px)' }}>
          {logoUrl ? (
            <>
              {/* Ghost (dim full outline) */}
              <img
                src={logoUrl}
                alt=""
                aria-hidden
                draggable={false}
                className="block w-full h-auto object-contain select-none"
                style={{ filter: 'grayscale(1) brightness(0.18)', pointerEvents: 'none' }}
              />

              {/* Glowing fill — clips from bottom upward with progress */}
              <img
                src={logoUrl}
                alt="Logo"
                draggable={false}
                className="absolute inset-0 block w-full h-auto object-contain select-none"
                style={{
                  clipPath: `inset(${100 - progress}% 0 0 0)`,
                  filter: [
                    `drop-shadow(0 0 ${12 + glowIntensity * 24}px ${glowColor})`,
                    `drop-shadow(0 0 ${24 + glowIntensity * 48}px ${glowAlpha(0.7)})`,
                    `brightness(${1 + glowIntensity * 0.5})`,
                  ].join(' '),
                  transition: 'clip-path 0.12s linear, filter 0.3s ease',
                  pointerEvents: 'none',
                }}
              />

              {/* Horizontal scan-line at the fill boundary */}
              <div
                aria-hidden
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${100 - progress}%`,
                  height: '2px',
                  background: `linear-gradient(to right,transparent,${glowColor} 30%,white 50%,${glowColor} 70%,transparent)`,
                  boxShadow: `0 0 12px 3px ${glowAlpha(0.8)}`,
                  opacity: progress > 2 && progress < 99 ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
              />
            </>
          ) : (
            /* No logo yet — show the 'RICORRENZA' title in high-fidelity Stranger Things style */
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'clamp(160px,35vw,320px)' }}>
              <span
                className="font-black tracking-widest"
                style={{
                  fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                  color: 'white',
                  textTransform: 'uppercase',
                  fontFamily: 'serif',
                  textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowAlpha(0.6)}`,
                  animation: 'sk-glow-pulse 2s ease-in-out infinite',
                  transition: 'text-shadow 0.3s ease',
                }}
              >
                RICORRENZA
              </span>
            </div>
          )}
        </div>

        {/* % counter */}
        {/* % — matches logo width for visual cohesion */}
        <div className="flex flex-col items-center gap-1" style={{ width: 'clamp(180px, min(80vw, 55vh), 520px)' }}>
          <div className="flex items-baseline gap-0.5">
            <span
              className="font-mono font-black tabular-nums tracking-widest"
              style={{
                fontSize: 'clamp(0.9rem, min(3.5vw, 3vh), 2rem)',
                color: glowColor,
                textShadow: `0 0 14px ${glowColor}, 0 0 28px ${glowAlpha(0.4)}`,
                transition: 'color 0.3s ease, text-shadow 0.3s ease',
              }}
            >
              {String(progress).padStart(3, '0')}
            </span>
            <span
              style={{
                color: glowColor,
                opacity: 0.45,
                fontSize: 'clamp(0.65rem,1.8vw,0.95rem)',
                fontFamily: 'monospace',
              }}
            >
              %
            </span>
          </div>

          {/* Stage Message */}
          <div 
            className="mt-4 text-center font-serif tracking-[0.2em] uppercase transition-all duration-700 h-6"
            style={{
              fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)',
              color: glowColor,
              opacity: progress > 5 ? 0.6 : 0,
              textShadow: `0 0 8px ${glowAlpha(0.3)}`,
            }}
          >
            {STAGE_MESSAGES[stage] || 'STRANGER THINGS AWAIT...'}
          </div>
        </div>
      </div>

    </div>
  );
};
