import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Clapperboard, Calendar, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const BollywoodHeroContent: React.FC<{ scrollReady?: boolean }> = ({ scrollReady = true }) => {
  const { homepageSettings } = useData();
  const [clapped, setClapped] = useState(false);
  const [showLights, setShowLights] = useState(false);

  // Trigger the clap after a moment
  useEffect(() => {
    if (!scrollReady) return;
    const clapTimer = setTimeout(() => setClapped(true), 800);
    const lightsTimer = setTimeout(() => setShowLights(true), 1200);
    return () => { clearTimeout(clapTimer); clearTimeout(lightsTimer); };
  }, [scrollReady]);

  const brandText = "RICORRENZA";
  const letters = brandText.split("");

  return (
    <div className="relative z-10 text-center w-full max-w-7xl mx-auto px-4 mt-8 md:mt-0 py-20 flex flex-col items-center">
      
      {/* Background paparazzi flashes */}
      <AnimatePresence>
        {showLights && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 pointer-events-none overflow-visible"
          >
            {/* Spotlight Sweeps using pure CSS / Framer */}
            <motion.div 
              animate={{ 
                rotate: [ -15, 15, -15 ],
                opacity: [ 0.4, 0.7, 0.4 ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-40 -left-40 w-[200vw] h-[20vw] bg-white/5 blur-3xl rounded-full origin-left mix-blend-screen"
            />
            <motion.div 
              animate={{ 
                rotate: [ 15, -15, 15 ],
                opacity: [ 0.5, 0.8, 0.5 ]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-40 -right-40 w-[200vw] h-[20vw] bg-amber-500/10 blur-[100px] rounded-full origin-right mix-blend-screen"
            />
            
            {/* Simple Flash effects */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0, 1, 0, 0] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.4,
                  times: [0, 0.05, 0.1, 1],
                  ease: "easeOut" 
                }}
                className="absolute w-40 h-40 bg-white rounded-full blur-3xl mix-blend-screen"
                style={{
                  top: `${Math.random() * 80 + 10}%`,
                  left: `${Math.random() * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 w-full relative z-20">
        
        {/* Top Feature Tag */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center justify-center bg-black/60 backdrop-blur-xl border border-amber-500/50 px-6 py-3 rounded-full text-[3.5vw] sm:text-xs font-black uppercase tracking-[0.3em] text-amber-500/90 shadow-[0_8px_32px_rgba(245,158,11,0.3)]"
        >
          <Clapperboard className="w-5 h-5 mr-3 text-amber-400" />
          SCENE 1: THE GRAND FESTIVAL
        </motion.div>

        {/* 3D Clapperboard Reveal */}
        <div className="relative flex justify-center w-full my-4">
          <AnimatePresence>
            {!clapped && (
              <motion.div
                exit={{ scale: 3, opacity: 0, filter: "blur(20px)" }}
                transition={{ duration: 0.5, ease: "easeIn" }}
                className="absolute z-30 flex items-center justify-center"
              >
                <div className="relative">
                  {/* Clapper stick */}
                  <motion.div 
                    animate={{ rotate: 0 }}
                    initial={{ rotate: -35 }}
                    transition={{ duration: 0.3, ease: "easeIn", delay: 0.5 }}
                    className="w-48 h-8 bg-gradient-to-r from-black via-zinc-800 to-black border border-white/20 origin-bottom-left -ml-2 rounded-t-md flex items-center justify-around px-2"
                  >
                    {[1,2,3,4,5].map(x => <div key={x} className="w-4 h-full bg-white/90 skew-x-12" />)}
                  </motion.div>
                  {/* Clapper body */}
                  <div className="w-48 h-32 bg-black border border-white/20 rounded-b-md p-2 flex flex-col justify-between shadow-2xl">
                    <div className="flex items-center justify-around w-full h-6 border-b border-dashed border-white/30">
                       <span className="text-white text-xs font-bold font-mono">RICORRENZA</span>
                    </div>
                    <div className="flex justify-between px-2 text-[10px] text-white/70 font-mono">
                      <span>ROLL: 518</span>
                      <span>TAKE: 1</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kinetic Text Reveal (The "Trailer" flying letters) */}
          <div className="flex justify-center items-end py-10 relative overflow-visible">
            {clapped && letters.map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: index % 2 === 0 ? -100 : 100, rotateX: 90, scale: 2 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 10,
                  stiffness: 50,
                  delay: clapped ? index * 0.1 : 0, 
                }}
                className={`text-[12vw] sm:text-7xl md:text-[8rem] lg:text-[11rem] font-black tracking-tighter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] 
                  ${index === 0 ? 'stranger-title-gradient text-amber-500 relative' : 'text-zinc-100'}`}
              >
                {/* Custom styling for the first letter "R" to look like a director star */}
                {index === 0 ? (
                  <span className="relative inline-block">
                    {letter}
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                      transition={{ delay: 1, duration: 0.5 }}
                      className="absolute -top-4 -right-4 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_#f59e0b] border-2 border-[#111]"
                    >
                      <Camera className="w-6 h-6 text-black" />
                    </motion.div>
                  </span>
                ) : (
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-amber-200">
                    {letter}
                  </span>
                )}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Subtitles fading in after title text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: clapped ? 1 : 0, y: clapped ? 0 : 30 }}
          transition={{ delay: clapped ? letters.length * 0.1 + 0.3 : 0, duration: 0.8 }}
          className="flex flex-col items-center gap-4 relative z-20"
        >
          <p className="text-[6vw] sm:text-4xl md:text-6xl font-bold max-w-5xl mx-auto leading-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 drop-shadow-lg font-serif italic">
            A Blockbuster Event
          </p>
          
          <p className="text-[4.5vw] sm:text-2xl text-amber-200/80 max-w-3xl mx-auto leading-relaxed font-medium px-4 tracking-wide font-light">
            {homepageSettings?.hero_description || 'Step into the Spotlight. The greatest medical and technical show on earth.'}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pt-12">
            <a
              href="/events"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-600 to-black hover:from-amber-500 hover:to-zinc-900 border border-amber-600/40 text-amber-100 font-black tracking-[0.2em] uppercase text-sm transition-all duration-300 shadow-[0_8px_32px_rgba(245,158,11,0.3)] hover:shadow-[0_16px_48px_rgba(245,158,11,0.5)] hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_2s_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
              <FilmReelIcon className="w-5 h-5 animate-spin-slow" />
              Reserve Your Tickets
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

const FilmReelIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="17" cy="7" r="1" />
    <circle cx="7" cy="17" r="1" />
    <circle cx="17" cy="17" r="1" />
    <circle cx="7" cy="7" r="1" />
  </svg>
);

export default BollywoodHeroContent;
