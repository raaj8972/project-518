import React, { useEffect, useState, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS  (computed once, never recreated)
// ─────────────────────────────────────────────────────────────────────────────

/** One ECG beat: P-wave → QRS complex → T-wave (viewBox 0 0 400 60, baseline y=30) */
const ECG_ONE_BEAT: [number, number][] = [
  [0, 30], [18, 30], [22, 26], [26, 30],          // P-wave
  [34, 30], [36, 34], [38, 8], [40, 52], [42, 30], // QRS complex
  [60, 30], [68, 28], [76, 22], [84, 28], [92, 30], // T-wave
  [100, 30],
];

/** 4 beats tiled across the 400-unit viewBox */
const ECG_POINTS: [number, number][] = [];
for (let i = 0; i < 4; i++) {
  ECG_ONE_BEAT.forEach(([x, y]) => ECG_POINTS.push([x + i * 100, y]));
}

const ECG_D = 'M ' + ECG_POINTS.map(([x, y]) => `${x},${y}`).join(' L ');
const ECG_PATH_LEN = 820; // approximate stroke length of the full ECG path

/**
 * Progress % thresholds that correspond to QRS (R-peak) spikes.
 * Derived from ECG_ONE_BEAT index 6 (the [38,8] R-peak) out of 16 pts per beat:
 *   beat 0 → idx 6/64  ≈ 9.4% → rounded to 11
 *   beat 1 → idx 22/64 ≈ 34%  → rounded to 36
 *   beat 2 → idx 38/64 ≈ 59%  → rounded to 61
 *   beat 3 → idx 54/64 ≈ 84%  → rounded to 86
 */
const QRS_THRESHOLDS = [11, 36, 61, 86] as const;

// ─────────────────────────────────────────────────────────────────────────────
// ECG LINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface EcgLineProps {
  progress: number;
  glowColor: string;
}

const EcgLine = React.memo<EcgLineProps>(({ progress, glowColor }) => {
  if (ECG_POINTS.length < 2) return null;

  const t = Math.max(0, Math.min(1, progress / 100));
  const dashoffset = ECG_PATH_LEN * (1 - t);

  // Interpolate the pulse-head dot position along the ECG path
  const lastIdx = ECG_POINTS.length - 1;
  const ptIdx = t * lastIdx;
  const lo = Math.max(0, Math.min(lastIdx - 1, Math.floor(ptIdx)));
  const hi = Math.min(lastIdx, lo + 1);
  const frac = ptIdx - lo;
  const pLo = ECG_POINTS[lo]!;
  const pHi = ECG_POINTS[hi]!;
  const headX = pLo[0] + (pHi[0] - pLo[0]) * frac;
  const headY = pLo[1] + (pHi[1] - pLo[1]) * frac;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        width="100%"
        height="48"
        aria-hidden
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Simplified glow filter — less blur area for better fill performance */}
          <filter id="ecg-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ghost baseline (dim, full strip) */}
        <path
          d={ECG_D}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Glowing drawn portion — revealed left-to-right via dashoffset */}
        <path
          d={ECG_D}
          fill="none"
          stroke={glowColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ECG_PATH_LEN}
          strokeDashoffset={dashoffset}
          filter="url(#ecg-glow)"
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s ease' }}
        />

        {/* Pulse-head dot sweeping at the draw boundary */}
        {progress > 0 && progress < 100 && (
          <circle
            cx={headX}
            cy={headY}
            r="3.5"
            fill="white"
            filter="url(#ecg-glow)"
            style={{ transition: 'cx 0.12s linear, cy 0.12s linear' }}
          />
        )}
      </svg>
    </div>
  );
});
EcgLine.displayName = 'EcgLine';

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
  const [beatFlash, setBeatFlash] = useState(false);
  const [pulse, setPulse] = useState(0);

  // Stable refs — avoids stale-closure issues in callbacks
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const progressRef  = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const pulseFrameRef = useRef<number | undefined>(undefined);
  const lastBeatRef  = useRef(-1);
  const beatFlashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  // Random hue — initialised once on mount, stable for the session
  const baseHue = useRef(Math.floor(Math.random() * 360));

  // ── Audio (Web Audio API — no files, no network) ─────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (
          window.AudioContext ?? (window as any).webkitAudioContext
        )();
      } catch { /* browser doesn't support Web Audio */ }
    }
    // Resume if suspended (browser auto-suspends until user interaction)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // lub: 880 Hz quick burst · dub: 660 Hz softer follow-up
      ([
        [880, 0,    0.08, 0.12],
        [660, 0.14, 0.06, 0.10],
      ] as [number, number, number, number][]).forEach(([freq, delay, dur, peak]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(peak, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });
    } catch { /* autoplay policy or other browser restriction */ }
  }, [getAudioCtx]);

  // ── Progress animation ────────────────────────────────────────────────────
  useEffect(() => {
    const DURATION = 2000;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const target = loading ? getTargetProgress(stage) : 100;
      
      const current = progressRef.current;
      const diff = target - current;
      
      // Smooth increment logic
      const increment = diff > 0 ? Math.max(0.1, diff * 0.05) : 0;
      const next = Math.min(Math.floor(current + increment), target);

      if (next !== current) {
        progressRef.current = next;
        setProgress(next);
      }

      const isStillAnimating = elapsed < DURATION || loading || next < 100;

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


  // ── Heartbeat detection — fires on each QRS crossing ─────────────────────
  useEffect(() => {
    for (const threshold of QRS_THRESHOLDS) {
      if (progress >= threshold && lastBeatRef.current < threshold) {
        lastBeatRef.current = threshold;
        playBeep();
        setBeatFlash(true);
        // Clear any previous timer before setting a new one
        if (beatFlashTimerRef.current) clearTimeout(beatFlashTimerRef.current);
        beatFlashTimerRef.current = setTimeout(() => setBeatFlash(false), 180);
        break;
      }
    }
  }, [progress, playBeep]);

  // ── Global cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationRef.current)   cancelAnimationFrame(animationRef.current);
      if (pulseFrameRef.current)  cancelAnimationFrame(pulseFrameRef.current);
      if (beatFlashTimerRef.current) clearTimeout(beatFlashTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
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

      {/* Heartbeat flash radial burst */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${glowAlpha(beatFlash ? 0.18 : 0)} 0%, transparent 70%)`,
          transition: beatFlash ? 'none' : 'background 0.25s ease',
          zIndex: 2,
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
            /* No logo yet — show a pulsing % monogram */
            <div className="flex items-center justify-center" style={{ minHeight: 'clamp(160px,35vw,320px)' }}>
              <span
                className="font-black tracking-widest font-mono"
                style={{
                  fontSize: 'clamp(3rem,10vw,6rem)',
                  color: glowColor,
                  textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowAlpha(0.5)}`,
                  transition: 'color 0.3s, text-shadow 0.3s',
                }}
              >
                {String(progress).padStart(3, '0')}
              </span>
            </div>
          )}
        </div>

        {/* ECG strip + % counter */}
        {/* ECG + % — matches logo width for visual cohesion */}
        <div className="flex flex-col items-center gap-1" style={{ width: 'clamp(180px, min(80vw, 55vh), 520px)' }}>
          <EcgLine progress={progress} glowColor={glowColor} />

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
