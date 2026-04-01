import React, { useEffect, useState, useRef } from 'react';
import { Film } from 'lucide-react';

export const BollywoodLoader: React.FC<{ loading: boolean; stage?: number; onComplete: () => void }> = ({ loading, stage = 0, onComplete }) => {
  const [phase, setPhase] = useState<'run' | 'fadeout'>('run');
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setPhase('fadeout'), 600);
    }
  }, [loading]);

  useEffect(() => {
    if (phase === 'fadeout') {
      setTimeout(() => onCompleteRef.current(), 800);
    }
  }, [phase]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#1a0f14] flex flex-col items-center justify-center overflow-hidden"
      style={{
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      {/* Film reel background items */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 animate-spin-slow">
          <Film size={120} color="#eab308" />
        </div>
        <div className="absolute bottom-10 right-10 animate-spin-slow" style={{ animationDirection: 'reverse' }}>
          <Film size={160} color="#eab308" />
        </div>
        <div className="absolute top-1/2 right-20 animate-spin-slow" style={{ animationDuration: '8s' }}>
          <Film size={100} color="#eab308" />
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-spin-slow" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
          <Film size={140} color="#eab308" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated Clapperboard */}
        <div className="relative w-48 h-40">
          {/* Top Stick (Hinged at bottom left) */}
          <div
            className="absolute top-0 left-0 w-full h-8 bg-black border-2 border-white origin-bottom-left z-20 overflow-hidden"
            style={{ 
               transform: loading ? 'rotate(-25deg)' : 'rotate(0deg)',
               transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
          >
            {/* Diagonal Stripes */}
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)' }} />
          </div>

          {/* Bottom Board */}
          <div className="absolute top-8 left-0 w-full h-32 bg-black border-2 border-white rounded-b-md flex items-center justify-center overflow-hidden z-10">
             <div className="absolute top-0 w-full h-4" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)' }} />
             <div className="text-yellow-500 font-serif text-2xl tracking-widest uppercase mt-4">
                ACTION!
             </div>
          </div>
        </div>

        <div className="text-yellow-500 font-serif text-xl tracking-[0.3em] uppercase">
          {loading ? 'Rolling...' : 'Cut!'}
        </div>
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};
