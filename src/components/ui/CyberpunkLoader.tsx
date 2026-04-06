import React, { useEffect, useState, useRef } from 'react';
import { Cpu, Zap, Database, Activity, ShieldCheck, Terminal } from 'lucide-react';

export const CyberpunkLoader: React.FC<{ loading: boolean; stage?: number; onComplete: () => void }> = ({ loading, stage = 0, onComplete }) => {
  const [phase, setPhase] = useState<'run' | 'fadeout'>('run');
  const [glitchText, setGlitchText] = useState('INITIALIZING...');
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!loading) {
      setGlitchText('SYSTEM READY');
      setTimeout(() => setPhase('fadeout'), 800);
    }
  }, [loading]);

  useEffect(() => {
    if (phase === 'fadeout') {
      setTimeout(() => onCompleteRef.current(), 800);
    }
  }, [phase]);

  // Random glitch text effect
  useEffect(() => {
    if (!loading) return;
    const texts = [
      'BYPASSING FIREWALLS...',
      'DECRYPTING ASSETS...',
      'UPLOADING CONSCIOUSNESS...',
      'STABILIZING MATRIX...',
      'SYNCING NEURAL INTERFACE...',
      'CONNECTING TO GRID...'
    ];
    const interval = setInterval(() => {
      setGlitchText(texts[Math.floor(Math.random() * texts.length)]);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center overflow-hidden font-mono"
      style={{
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      {/* Tech background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 animate-float-slow">
          <Cpu size={120} className="text-cyan-500" />
        </div>
        <div className="absolute bottom-10 right-10 animate-float-slow" style={{ animationDelay: '-2s' }}>
          <Database size={160} className="text-fuchsia-500" />
        </div>
        <div className="absolute top-1/2 right-20 animate-pulse" style={{ animationDuration: '4s' }}>
          <Activity size={100} className="text-cyan-400" />
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-float-slow" style={{ animationDelay: '-5s' }}>
          <Zap size={140} className="text-yellow-400" />
        </div>
      </div>

      {/* Geometric grid background */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} 
      />

      <div className="relative z-10 flex flex-col items-center gap-12 text-center">
        {/* Central HUD Element */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 border-4 border-dashed border-cyan-500/30 rounded-full animate-spin-slow" />
          
          {/* Inner pulsing ring */}
          <div className="absolute inset-4 border-2 border-fuchsia-500/50 rounded-full animate-pulse" />
          
          {/* Core Icon */}
          <div className="relative z-20 flex flex-col items-center gap-4">
            {loading ? (
              <Terminal size={64} className="text-cyan-400 animate-bounce" />
            ) : (
              <ShieldCheck size={64} className="text-green-400 animate-pulse" />
            )}
            
            {/* Percentage/Stage Counter */}
            <div className="text-4xl font-black text-white tracking-widest">
              {loading ? `${Math.min(99, Math.floor(Math.random() * 20) + stage * 20)}%` : '100%'}
            </div>
          </div>
        </div>

        {/* Status Text with Glitch Animation */}
        <div className="flex flex-col gap-2">
          <div className="hologram-text-reveal text-cyan-400 text-xl tracking-[0.4em] font-bold uppercase shadow-cyan-900">
            {glitchText}
          </div>
          <div className="text-white/40 text-xs tracking-widest uppercase mt-2">
            Node: RCR-518-VX | Uplink Active
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, -15px) rotate(5deg); }
          50% { transform: translate(-5px, 20px) rotate(-3deg); }
          75% { transform: translate(-15px, -10px) rotate(2deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .hologram-text-reveal {
          text-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
          animation: flicker 0.2s infinite alternate;
        }
        @keyframes flicker {
          0% { opacity: 0.95; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CyberpunkLoader;
