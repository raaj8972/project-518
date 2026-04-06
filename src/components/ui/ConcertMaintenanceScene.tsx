import React from 'react';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { CountdownTimer } from '../CountdownTimer';

interface ConcertMaintenanceSceneProps {
  title?: string;
  message?: string;
  timerTarget?: Date | null;
  endedText?: string;
  onTimerDone?: () => void;
}

export const ConcertMaintenanceScene: React.FC<ConcertMaintenanceSceneProps> = ({
  title = "THIS PAGE IS UNDER MAINTENANCE",
  message = "We're tuning our instruments and setting up the stage. The show will go on shortly!",
  timerTarget,
  endedText = "System Restored",
  onTimerDone,
}) => {
  return (
    <div className="relative w-full h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#0f0c29] font-sans selection:bg-fuchsia-500/30">
      
      {/* Background Animated Neon Gradients */}
      <motion.div 
        className="absolute inset-0 opacity-40 blur-[100px] mix-blend-screen pointer-events-none"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, #ff00cc 0%, transparent 50%)",
            "radial-gradient(circle at 80% 70%, #333399 0%, transparent 50%)",
            "radial-gradient(circle at 50% 50%, #00f2fe 0%, transparent 50%)",
            "radial-gradient(circle at 20% 80%, #ff00cc 0%, transparent 50%)",
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
      />
      
      {/* Concert Stage Light Beams */}
      <div className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden pointer-events-none opacity-60">
        <motion.div 
          className="absolute -top-10 left-[20%] w-32 h-[150%] bg-gradient-to-b from-cyan-400 via-cyan-400/20 to-transparent blur-md origin-top"
          animate={{ rotate: [-15, 15, -15], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -top-10 right-[20%] w-32 h-[150%] bg-gradient-to-b from-fuchsia-400 via-fuchsia-400/20 to-transparent blur-md origin-top"
          animate={{ rotate: [15, -15, 15], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div 
          className="absolute -top-10 left-[50%] -translate-x-1/2 w-48 h-[150%] bg-gradient-to-b from-yellow-300 via-yellow-300/10 to-transparent blur-xl origin-top mix-blend-overlay"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-4 text-center">
        
        {/* Lottie Animation + Glassmorphic Timer Overlay */}
        <motion.div
          className="relative z-20 group"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Glowing stage aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 rounded-full blur-2xl opacity-30 pointer-events-none" />
          
          {/* Animation container */}
          <div className="
            w-[90vw] h-[45vw]
            sm:w-[80vw] sm:h-[40vw]
            md:w-[600px] md:h-[300px]
            lg:w-[700px] lg:h-[350px]
            xl:w-[800px] xl:h-[400px]
          ">
            <DotLottieReact
              src="/animations/maintenance.lottie"
              loop
              autoplay
            />
          </div>

          {/* ── Glassmorphic Timer Overlay — floats on top of the animation ── */}
          {timerTarget && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring' }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 w-max"
            >
              {/* Glass card */}
              <div
                className="flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(18px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 40px rgba(0,242,254,0.12)',
                }}
              >
                {/* Label */}
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-cyan-300 font-bold opacity-90 whitespace-nowrap">
                  Uplink Scheduled In
                </span>

                {/* Timer */}
                <CountdownTimer
                  target={timerTarget}
                  size="lg"
                  neon
                  className="text-white font-black"
                  endedText={endedText}
                  showEnded
                  onDone={onTimerDone}
                />
              </div>

              {/* Glow beneath the glass */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-cyan-400/20 blur-lg rounded-full" />
            </motion.div>
          )}

          {/* Shadow below animation */}
          <motion.div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1/2 h-6 bg-cyan-500/30 blur-xl rounded-[100%]"
            animate={{ scale: [1, 0.8, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Text Area */}
        <motion.h1 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
          className="mt-4 text-3xl sm:text-5xl md:text-7xl font-black tracking-tight uppercase text-transparent bg-clip-text pb-2 px-2"
          style={{ 
            backgroundImage: 'linear-gradient(to right bottom, #ffffff, #f0abfc, #22d3ee)',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))'
          }}
        >
          {title}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-white/70 font-medium max-w-xl px-4 leading-relaxed tracking-wide"
        >
          {message}
        </motion.p>

      </div>
      
      {/* Decorative Stage Floor Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-[20vh] bg-gradient-to-t from-fuchsia-900/60 via-fuchsia-900/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-[50vw] left-1/2 -translate-x-1/2 w-[150vw] h-[100vw] rounded-[100%] bg-gradient-to-t from-cyan-600/20 to-transparent opacity-50 blur-2xl pointer-events-none" style={{ perspective: '500px', transform: 'rotateX(60deg) translateX(-50%)' }} />
    </div>
  );
};
