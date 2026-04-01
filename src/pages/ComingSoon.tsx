import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { SEO } from '../components/SEO';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Camera, Clapperboard, Film, Sparkles, Star, Music, Award } from 'lucide-react';
import { CinemaMaintenanceScene } from '../components/CinemaMaintenanceScene';
import '../components/CinemaMaintenanceScene.css';

interface ComingSoonProps {
  previewSettings?: {
    site_closed?: boolean;
    coming_soon_enabled?: boolean;
    coming_soon_until?: string | null;
    coming_soon_title?: string | null;
    coming_soon_message?: string | null;
    coming_soon_ended_text?: string | null;
  };
  isMaintenance?: boolean;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ previewSettings, isMaintenance }) => {
  const { siteSettings: globalSettings } = useData();
  const [isWrap, setIsWrap] = useState(false);
  
  // Use preview settings if provided, otherwise fall back to global settings
  const settings = previewSettings || globalSettings;
  
  const until = settings?.coming_soon_until ? new Date(settings.coming_soon_until) : null;
  const enabled = !!settings?.coming_soon_enabled;
  const hardClosed = !!settings?.site_closed;
  const endedText = (settings as any)?.coming_soon_ended_text || "We'll be back soon";
  const csTitle = (settings as any)?.coming_soon_title || null;
  const csMessage = (settings as any)?.coming_soon_message || null;
  const showTimer = enabled && !!until;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Create smooth springs for the 3D tilt
  const springX = useSpring(mouseX, { stiffness: 60, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 25 });

  // Map mouse positions to 3D rotation
  const rotateX = useTransform(springY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-12, 12]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5);
      mouseY.set((e.clientY / window.innerHeight) - 0.5);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Check for Wrap state — poll every second
  useEffect(() => {
    const check = () => {
      if (until && Date.now() >= until.getTime()) {
        setIsWrap(true);
      } else {
        setIsWrap(false);
      }
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center relative overflow-hidden font-serif select-none" style={{ perspective: '1200px' }}>
        <SEO 
          title={isWrap ? "It's a Wrap! | Success" : "Bollywood Film Set | Maintenance"} 
          description={csMessage || "Lights, Camera, Action! System stabilization in progress on the Ricorrenza film set."}
        />
        
        <AnimatePresence mode="wait">
          {!isWrap ? (
            <motion.div 
              key="shooting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {/* New Cinema Production Maintenance Scene */}
              <CinemaMaintenanceScene
                title={csTitle || 'Production in Progress'}
                message={csMessage || 'Our crew is setting up the stage — the show will begin shortly!'}
              />
              
              {/* Countdown Timer Overlay */}
              {showTimer && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-black/70 backdrop-blur-xl border border-[#d4af37]/30 rounded-2xl px-6 py-3 flex flex-col items-center gap-2 shadow-2xl">
                    <span className="text-[9px] uppercase tracking-[0.5em] text-[#d4af37] font-bold">Release In</span>
                    <CountdownTimer 
                      target={until as Date} 
                      size="lg" 
                      className="text-white font-black italic" 
                      endedText={endedText} 
                      showEnded 
                      onDone={() => setIsWrap(true)} 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="wrap"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 50 }}
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Celebratory Purple & Gold Backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#2d004d_0%,#000_100%)]" />
              
              {/* Confetti Star Spray */}
              {[...Array(40)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  initial={{ 
                    x: Math.random() * window.innerWidth - window.innerWidth/2, 
                    y: window.innerHeight,
                    opacity: 1
                  }}
                  animate={{ 
                    y: [null, -1000],
                    x: [null, Math.random() * 400 - 200],
                    rotate: [0, 720]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 4, 
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                  className="absolute pointer-events-none"
                >
                  <Star fill="#d4af37" color="#d4af37" size={10 + Math.random() * 15} />
                </motion.div>
              ))}

              <div className="relative z-10 space-y-12 text-center" style={{ transformStyle: 'preserve-3d' }}>
                {/* Snap Clapperboard Animation */}
                <motion.div 
                  initial={{ rotateX: -60 }}
                  animate={{ rotateX: 0 }}
                  className="flex justify-center mb-8"
                >
                  <div className="flex flex-col items-center gap-4">
                    <motion.div 
                      animate={{ rotateX: [-20, 0] }}
                      transition={{ duration: 0.2, delay: 0.5 }}
                      className="w-32 md:w-48 h-8 bg-black border-2 border-white/20 rounded-t-lg origin-bottom flex items-center justify-around"
                    >
                      {[...Array(6)].map((_, i) => <div key={i} className="w-4 h-full bg-white/10 -skew-x-12" />)}
                    </motion.div>
                    <div className="w-40 md:w-60 h-24 bg-black border-2 border-white/20 rounded-sm flex flex-col items-center justify-center font-black">
                       <span className="text-[#d4af37] text-2xl md:text-3xl">IT'S A WRAP!</span>
                       <span className="text-white/40 text-[10px] tracking-widest mt-2 uppercase">Take 01 • Scene 01 • OK</span>
                    </div>
                  </div>
                </motion.div>

                <div className="space-y-6">
                  <motion.h3 
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-white/40 text-xs md:text-sm uppercase tracking-[1em] font-bold"
                  >
                    Shooting Completed Successfully
                  </motion.h3>
                  <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                    Ricorrenza
                  </h1>
                  <div className="flex justify-center gap-8 text-[#d4af37]">
                     <motion.div animate={{ y: [-10, 10] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2 }}><Camera size={32} /></motion.div>
                     <motion.div animate={{ y: [10, -10] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2.2 }}><Film size={32} /></motion.div>
                     <motion.div animate={{ y: [-10, 10] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.8 }}><Music size={32} /></motion.div>
                     <motion.div animate={{ y: [10, -10] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2.5 }}><Award size={32} /></motion.div>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="pt-12"
                >
                  <a href="/" className="inline-flex items-center gap-4 bg-white text-black px-12 py-4 rounded-full font-black text-xl hover:scale-110 transition-all group">
                    ENTER PREMIERE <Sparkles className="group-hover:rotate-12 transition-transform" />
                  </a>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style dangerouslySetInnerHTML={{ __html: `
          body { background-color: #0a0a0a !important; cursor: crosshair; }
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;900&display=swap');
          h1 { font-family: 'Cinzel', serif !important; }
        ` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      <SEO 
        title="Coming Soon" 
        description={csMessage || "Something big is coming. Stay tuned for updates."}
      />
      {/* Cyber grid + glow backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative z-10 px-6 text-center max-w-4xl">

        {/* Big Ricorrenza neon with 3D-ish layers */}
        <div className="relative inline-block select-none">
          <div className="absolute inset-0 blur-md opacity-60" style={{textShadow: '0 0 30px rgba(236,72,153,0.45), 0 0 60px rgba(34,211,238,0.35)'}}>
            <span className="text-[clamp(40px,12vw,140px)] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-white to-cyan-300">Ricorrenza</span>
          </div>
          <h1
            className="relative text-[clamp(40px,12vw,140px)] font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-white to-cyan-200 drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.15)',
              textShadow: '0 0 12px rgba(236,72,153,0.35), 0 0 22px rgba(34,211,238,0.25)'
            }}
          >
            Ricorrenza
          </h1>
          {/* Subtle animated scanline sheen */}
          <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_40%,black_60%,transparent)] overflow-hidden">
            <div className="w-full h-[140%] -translate-y-[20%] bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[sheen_2.5s_linear_infinite]" />
          </div>
        </div>

        {/* Optional owner-configured title/message */}
        {(csTitle || csMessage) && (
          <div className="mt-6">
            {csTitle && <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">{csTitle}</h2>}
            {csMessage && <p className="mt-3 text-lg text-white/80 max-w-3xl mx-auto">{csMessage}</p>}
          </div>
        )}

        {/* Owner-configured timer (when an end time is set) */}
        {showTimer && (
          <div className="mt-8 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <CountdownTimer
              target={until as Date}
              neon
              size="xl"
              className="scale-110"
              endedText={hardClosed ? endedText : 'We\'re live!'}
              showEnded
            />
          </div>
        )}

        {/* If there's no timer but the site is gated (enabled) or hard-closed, show the configured message/ended text */}
        {!showTimer && (enabled || hardClosed) && (
          <div className="mt-8 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <div className="text-lg md:text-2xl font-medium text-white/90">
              {csMessage || endedText}
            </div>
          </div>
        )}

        {/* Helper */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="text-sm text-white/80">Admin can still access the dashboard and login.</div>
          <a href="/login" className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded shadow hover:shadow-lg hover:translate-y-[-1px] transition-all">
            Go to Admin Login
          </a>
        </div>
      </div>

      {/* Keyframes for sheen */}
      <style>{`
        @keyframes sheen { 0% { transform: translateY(-60%); } 100% { transform: translateY(60%); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}
      </style>
    </div>
  );
};

export default ComingSoon;
