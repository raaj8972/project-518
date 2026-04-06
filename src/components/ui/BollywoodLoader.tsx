import React, { useEffect, useState, useRef } from 'react';
import { Film, Clapperboard, Star, Camera, Video, Play, Music } from 'lucide-react';

export const BollywoodLoader: React.FC<{ loading: boolean; stage?: number; onComplete: () => void; logoUrl?: string }> = ({ loading, stage = 0, onComplete, logoUrl }) => {
  const [phase, setPhase] = useState<'run' | 'fadeout'>('run');
  const [statusText, setStatusText] = useState('GETTING THE LIGHTS READY...');
  const onCompleteRef = useRef(onComplete);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      setStatusText('CURTAINS RISING...');
      setTimeout(() => setPhase('fadeout'), 1000);
    }
  }, [loading]);

  useEffect(() => {
    if (phase === 'fadeout') {
      setTimeout(() => onCompleteRef.current(), 800);
    }
  }, [phase]);

  // Bollywood themed status messages
  useEffect(() => {
    if (!loading) return;
    const texts = [
      'ADJUSTING THE LENSES...',
      'SETTING UP THE STAGE...',
      'REHEARSING DIALOGUES...',
      'CHOREOGRAPHING SEQUENCES...',
      'CALIBRATING SOUND EFFECTS...',
      'PREPARING THE CLAPPERBOARD...',
      'WAITING FOR ACTION...',
      'DREAMING IN CINEMASCOPE...'
    ];
    const interval = setInterval(() => {
      setStatusText(texts[Math.floor(Math.random() * texts.length)]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  // Smooth progress calculation based on stage
  useEffect(() => {
    if (loading && progress < 95) {
      const target = Math.min(95, stage * 20 + Math.floor(Math.random() * 10));
      if (target > progress) {
        const diff = target - progress;
        const step = diff / 10;
        let current = progress;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            setProgress(target);
            clearInterval(timer);
          } else {
            setProgress(current);
          }
        }, 50);
        return () => clearInterval(timer);
      }
    }
  }, [stage, loading, progress]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#0d0202] flex flex-col items-center justify-center overflow-hidden"
      style={{
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]">
        <div className="absolute top-10 left-10 animate-float-slow"><Film size={120} color="#6366f1" /></div>
        <div className="absolute bottom-10 right-10 animate-float-slow" style={{ animationDelay: '-2s' }}><Camera size={160} color="#8b5cf6" /></div>
        <div className="absolute top-1/2 right-20 animate-pulse" style={{ animationDuration: '4s' }}><Star size={100} color="#6366f1" /></div>
        <div className="absolute bottom-1/3 left-1/4 animate-float-slow" style={{ animationDelay: '-5s' }}><Music size={140} color="#8b5cf6" /></div>
      </div>

      {/* Film Grain Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bollywood-grain z-0" />

      <div className="relative z-10 flex flex-col items-center gap-12 text-center max-w-lg px-8">
        {/* Brand Logo or Cinematic Icon */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {logoUrl ? (
            <div className="relative group">
              <img src={logoUrl} alt="Logo" className="w-40 h-40 object-contain animate-pulse-gentle" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 opacity-20 -z-10 animate-pulse" />
            </div>
          ) : (
            <div className="relative">
              <Clapperboard size={80} className="text-indigo-500 animate-bounce" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-150 opacity-30 -z-10 animate-pulse" />
            </div>
          )}
          
          {/* Decorative Rings */}
          <div className="absolute inset-0 border-2 border-dashed border-indigo-500/10 rounded-full animate-spin-slow" />
          <div className="absolute inset-4 border border-violet-500/20 rounded-full animate-reverse-spin" />
        </div>

        {/* Status Section */}
        <div className="flex flex-col gap-6 w-full">
          <div className="h-10">
            <h2 className="text-indigo-500 text-lg tracking-[0.3em] font-medium uppercase drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
              {statusText}
            </h2>
          </div>
          
          {/* Progress Bar Container */}
          <div className="relative w-full max-w-sm mx-auto h-1.5 bg-indigo-950/30 rounded-full overflow-hidden border border-indigo-900/20">
            {/* Glossy Progress Fill */}
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-500 ease-out rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"
              style={{ width: `${progress}%` }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
            </div>
          </div>
          
          <div className="text-white/30 text-[10px] tracking-widest uppercase mt-2 font-light">
             Ricorrenza Production House | RICO-518-STG
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-5px, 15px) rotate(3deg); }
        }
        @keyframes pulse-gentle {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-reverse-spin {
          animation: reverse-spin 12s linear infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-shine {
          animation: shine 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .bollywood-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  );
};

export default BollywoodLoader;
