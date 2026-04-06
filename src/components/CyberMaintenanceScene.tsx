import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Shield, Zap, Activity, Terminal, Database } from 'lucide-react';

interface CyberMaintenanceSceneProps {
  title?: string;
  message?: string;
}

// ─── Phase Configuration ────────────────────────────────────────────────
const PHASES = [
  {
    id: 'decryption',
    label: 'Bypassing Firewalls',
    icon: <Shield className="w-12 h-12" />,
    color: '#22d3ee',
    gradient: 'linear-gradient(135deg, #083344 0%, #000000 50%, #0e1e2d 100%)',
    description: 'System security is being reconfigured. Neural encryption in progress.',
  },
  {
    id: 'uplink',
    label: 'Establishing Uplink',
    icon: <Zap className="w-12 h-12" />,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #000000 50%, #2e1065 100%)',
    description: 'Satellite connection stable. Syncing local nodes with the central data core.',
  },
  {
    id: 'processing',
    label: 'Neural Syncing',
    icon: <Cpu className="w-12 h-12" />,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #000000 50%, #1e1b4b 100%)',
    description: 'Memory buffers optimized. Loading advanced creative algorithms into the matrix.',
  },
  {
    id: 'database',
    label: 'Indexing Data',
    icon: <Database className="w-12 h-12" />,
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #083344 0%, #000000 50%, #1e1b4b 100%)',
    description: 'Populating the grand archive. Every byte of creativity is being secured.',
  }
];

const PHASE_DURATION = 5000;

// Optimized MatrixRain component
const MatrixRain = React.memo(({ color }: { color: string }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-[10px] font-mono leading-none"
          style={{
            left: `${i * 12 + 5}%`,
            color: color,
            writingMode: 'vertical-rl',
            textShadow: `0 0 8px ${color}`
          }}
          initial={{ y: -500 }}
          animate={{ y: 1000 }}
          transition={{
            duration: 8 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5
          }}
        >
          {Array.from({ length: 12 }).map(() => 
            String.fromCharCode(0x30A0 + Math.random() * 96)
          ).join('')}
        </motion.div>
      ))}
    </div>
  );
});

export const CyberMaintenanceScene: React.FC<CyberMaintenanceSceneProps> = React.memo(({
  title = 'System Initialization',
  message
}) => {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase(prev => (prev + 1) % PHASES.length);
    }, PHASE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const phase = PHASES[currentPhase];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden font-mono bg-black">
      {/* Dynamic Background */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ background: phase.gradient }}
        transition={{ duration: 1.5 }}
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
           style={{ 
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
             backgroundSize: '30px 30px'
           }} 
      />

      <MatrixRain color={phase.color} />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl px-6 text-center">
        
        {/* Animated HUD Icon */}
        <div className="relative">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute -inset-8 border border-dashed rounded-full"
               style={{ borderColor: `${phase.color}40` }}
             />
             <div className="p-8 rounded-full border-2 bg-black/60 backdrop-blur-xl relative"
                  style={{ borderColor: phase.color, color: phase.color, boxShadow: `0 0 30px ${phase.color}40` }}>
               <AnimatePresence mode="wait">
                 <motion.div
                   key={phase.id}
                   initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                   animate={{ scale: 1, opacity: 1, rotate: 0 }}
                   exit={{ scale: 1.5, opacity: 0, rotate: 20 }}
                   transition={{ duration: 0.5 }}
                 >
                   {phase.icon}
                 </motion.div>
               </AnimatePresence>
             </div>
        </div>

        {/* Text Area */}
        <div className="space-y-4">
           <motion.h1 
             className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
           >
             {title}
           </motion.h1>
           <div className="flex flex-col gap-2">
              <motion.div 
                key={`label-${phase.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs uppercase tracking-[0.6em] font-bold"
                style={{ color: phase.color }}
              >
                [{phase.label}]
              </motion.div>
              <p className="text-white/60 text-lg leading-relaxed">
                {message || phase.description}
              </p>
           </div>
        </div>

        {/* System Bar */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
           <motion.div 
             className="absolute inset-0 bg-white"
             animate={{ x: ['-100%', '100%'] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             style={{ background: `linear-gradient(90deg, transparent, ${phase.color}, transparent)` }}
           />
        </div>
      </div>

      {/* Side Decorative HUD Elements */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 opacity-10">
         {[...Array(3)].map((_, i) => (
           <div key={i} className="w-8 h-[1px] bg-white" />
         ))}
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 opacity-10">
         <Terminal className="text-white" size={20} />
         <Activity className="text-white" size={20} />
      </div>
    </div>
  );
});

export default CyberMaintenanceScene;
