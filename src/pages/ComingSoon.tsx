import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Activity, Zap, Terminal, Database, ShieldCheck, Github, UserCircle } from 'lucide-react';
import { ConcertMaintenanceScene } from '../components/ui/ConcertMaintenanceScene';

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

export const ComingSoon: React.FC<ComingSoonProps> = React.memo(({ previewSettings, isMaintenance }) => {
  const { siteSettings: globalSettings, isAdmin } = useData();
  const [isWrap, setIsWrap] = useState(false);
  
  // Use preview settings if provided, otherwise fall back to global settings
  const settings = previewSettings || globalSettings;
  
  const until = settings?.coming_soon_until ? new Date(settings.coming_soon_until) : null;
  const enabled = !!settings?.coming_soon_enabled;
  const hardClosed = !!settings?.site_closed;
  const endedText = (settings as any)?.coming_soon_ended_text || "System Restoration Complete";
  const csTitle = (settings as any)?.coming_soon_title || null;
  const csMessage = (settings as any)?.coming_soon_message || null;
  const showTimer = enabled && !!until;

  // Check for Link state — poll every second
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
      <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center relative overflow-hidden font-mono select-none" style={{ perspective: '1200px' }}>
        <SEO 
          title={isWrap ? "Neural Link Established | Ricorrenza" : "System Patching | Maintenance Mode"} 
          description={csMessage || "Ricorrenza neural interface is currently under construction. Please wait for the uplink."}
        />
        
        <AnimatePresence mode="wait">
          {!isWrap ? (
            <motion.div 
              key="maintenance-active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <ConcertMaintenanceScene
                title={csTitle || undefined}
                message={csMessage || undefined}
                timerTarget={showTimer ? (until as Date) : undefined}
                onTimerDone={() => setIsWrap(true)}
              />
              
              {/* Admin Portal Gateway */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center gap-4"
              >
                 {!isAdmin() ? (
                   <div className="flex flex-col sm:flex-row gap-4 items-center">
                     <a href="/student/login" className="px-8 py-3 bg-indigo-600/20 border border-indigo-500/30 rounded-full hover:bg-indigo-600/40 hover:border-indigo-400 transition-all text-[11px] tracking-[0.2em] uppercase font-black flex items-center gap-2 group backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.2)] text-white">
                       <UserCircle size={16} className="group-hover:scale-110 transition-transform text-indigo-400" /> Student Portal Access
                     </a>
                     <a href="/login" className="px-6 py-2.5 bg-[#0a0a0a]/40 border border-white/10 rounded-full hover:bg-white/10 hover:border-cyan-500/50 transition-all text-[10px] tracking-widest uppercase font-bold flex items-center gap-2 group backdrop-blur-xl opacity-60 hover:opacity-100">
                       <ShieldCheck size={14} className="group-hover:rotate-12 transition-transform text-cyan-400" /> Admin/Coordinator
                     </a>
                   </div>
                 ) : (
                   <button 
                    onClick={() => setIsWrap(true)} 
                    className="px-6 py-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500/20 transition-all text-[10px] tracking-widest uppercase font-bold flex items-center gap-2 group backdrop-blur-xl text-cyan-400 shadow-2xl shadow-cyan-500/10"
                   >
                     <Zap size={14} className="group-hover:scale-125 transition-transform" /> Skip Maintenance Timer (Admin Override)
                   </button>
                 )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="maintenance-complete"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 50 }}
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            >
              {/* High-Tech Celebratory Backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#082f49_0%,#000_100%)]" />
              
              {/* Digital Data Rain fragments (Optimized count) */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`data-${i}`}
                  initial={{ 
                    x: Math.random() * window.innerWidth - window.innerWidth/2, 
                    y: window.innerHeight,
                    opacity: 0
                  }}
                  animate={{ 
                    y: [null, -1000],
                    x: [null, Math.random() * 400 - 200],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 1.5 + Math.random() * 3, 
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                  className="absolute pointer-events-none text-[8px] font-mono whitespace-nowrap overflow-hidden text-cyan-500/40"
                >
                  {Math.random().toString(16).slice(2, 10).toUpperCase()}
                </motion.div>
              ))}

              <div className="relative z-10 space-y-12 text-center">
                {/* Massive Animated Success Icon */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex justify-center mb-8"
                >
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <motion.div 
                      className="absolute inset-0 border-2 border-dynamic/30 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div 
                      className="absolute inset-4 border border-dynamic/20 rounded-full"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    />
                    <ShieldCheck size={100} className="text-dynamic drop-shadow-[0_0_25px_rgba(var(--dynamic-accent-rgb),0.6)]" />
                  </div>
                </motion.div>

                <div className="space-y-6">
                  <motion.h3 
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-dynamic text-xs md:text-sm uppercase tracking-[0.8em] font-bold"
                  >
                    Neural Link Established Successfully
                  </motion.h3>
                  <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                    RICORRENZA
                  </h1>
                  <div className="flex justify-center gap-12 text-cyan-400/60">
                     <motion.div animate={{ y: [-5, 5] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2 }}><Cpu size={32} /></motion.div>
                     <motion.div animate={{ y: [5, -5] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2.2 }}><Activity size={32} /></motion.div>
                     <motion.div animate={{ y: [-5, 5] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.8 }}><Database size={32} /></motion.div>
                     <motion.div animate={{ y: [5, -5] }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 2.5 }}><Terminal size={32} /></motion.div>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="pt-12"
                >
                  <a href="/" className="inline-flex items-center gap-4 bg-cyan-500 text-black px-12 py-4 rounded-full font-black text-xl hover:scale-105 transition-all group shadow-[0_0_40px_rgba(34,211,238,0.4)]">
                    INITIALIZE INTERFACE <Zap className="group-hover:scale-125 transition-transform" />
                  </a>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style dangerouslySetInnerHTML={{ __html: `
          body { background-color: #030303 !important; cursor: crosshair; }
        ` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-mono">
      <SEO 
        title="Access Denied | Ricorrenza" 
        description={csMessage || "Neural link offline. Re-establishing connection."}
      />
      {/* Cyber grid + glow backdrop */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(closest-side,rgba(34,211,238,0.1),transparent_60%)]" />
      <div className="absolute -top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-500/10 blur-3xl opacity-30" />
      <div className="absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-cyan-400/10 blur-3xl opacity-30" />

      {/* Subtle Scanlines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
           style={{ 
             backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(18, 16, 16, 0.25) 50%), linear-gradient(90deg, rgba(99, 102, 241, 0.05), rgba(6, 182, 212, 0.02), rgba(139, 92, 246, 0.05))',
             backgroundSize: '100% 4px, 3px 100%'
           }} 
      />

      <div className="relative z-10 px-6 text-center max-w-4xl">

        {/* Big Ricorrenza neon HUD titles */}
        <div className="relative inline-block select-none group">
          <div className="absolute inset-0 blur-xl opacity-40 group-hover:opacity-70 transition-opacity" style={{textShadow: '0 0 40px rgba(var(--dynamic-accent-rgb),0.6)'}}>
            <span className="text-[clamp(40px,12vw,160px)] font-black tracking-tight bg-clip-text text-transparent transition-all duration-700" style={{ backgroundImage: 'linear-gradient(to right, var(--dynamic-accent), #fff, var(--dynamic-accent))' }}>RICORRENZA</span>
          </div>
          <h1
            className="relative text-[clamp(40px,12vw,160px)] font-black tracking-tighter leading-none bg-clip-text text-transparent transition-all duration-700"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--dynamic-accent), #fff, #fff)',
              textShadow: '0 0 20px rgba(var(--dynamic-accent-rgb),0.4)'
            }}
          >
            RICORRENZA
          </h1>
          {/* Subtle animated scanline sheen */}
          <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_40%,black_60%,transparent)] overflow-hidden">
            <div className="w-full h-[140%] -translate-y-[20%] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-[sheen_2.5s_linear_infinite]" />
          </div>
        </div>

        {/* Neural Link Status HUD */}
        {(csTitle || csMessage) && (
          <div className="mt-8 space-y-4">
            {csTitle && <h2 className="text-2xl md:text-4xl font-bold tracking-widest text-[#a0a0a0] uppercase">{csTitle}</h2>}
            {csMessage && <p className="mt-4 text-lg text-white/50 max-w-3xl mx-auto leading-relaxed border-l-2 border-cyan-500/40 pl-6">{csMessage}</p>}
          </div>
        )}

        {/* System Uplink Timer */}
        {showTimer && (
          <div className="mt-12 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <div className="inline-block p-1 bg-dynamic/20 rounded-2xl">
              <div className="bg-[#050505] rounded-[14px] px-10 py-6">
                <CountdownTimer
                  target={until as Date}
                  neon
                  size="xl"
                  className="scale-110"
                  endedText={hardClosed ? endedText : 'UPLINK STABLE'}
                  showEnded
                />
              </div>
            </div>
          </div>
        )}

        {!showTimer && (enabled || hardClosed) && (
          <div className="mt-12 animate-[fadeInUp_600ms_ease-out_100ms_both]">
            <div className="text-xl md:text-3xl font-black text-cyan-400 tracking-[0.4em] uppercase">
              {csMessage || endedText}
            </div>
          </div>
        )}

        {/* System Access Portal */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="text-[10px] text-white/30 tracking-[0.5em] uppercase">Manual Override Available for Authorized Personnel</div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a href="/student/login" className="px-10 py-4 bg-cyan-500 text-black border border-cyan-400 rounded-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all text-sm tracking-[0.2em] uppercase font-black flex items-center gap-3 group">
              <UserCircle size={18} className="group-hover:scale-110 transition-transform" /> Student Dashboard
            </a>
            <a href="/login" className="px-8 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-cyan-500/50 transition-all text-xs tracking-widest uppercase font-bold flex items-center gap-3 group opacity-50 hover:opacity-100">
              <Github size={16} className="group-hover:rotate-12 transition-transform" /> Staff Access
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sheen { 0% { transform: translateY(-60%); } 100% { transform: translateY(60%); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}
      </style>
    </div>
  );
});

export default ComingSoon;
