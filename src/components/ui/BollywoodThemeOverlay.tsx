import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Film, Camera, Clapperboard, Ticket, Star, Video, Play, Music } from 'lucide-react';

export const BollywoodThemeOverlay: React.FC = React.memo(() => {
  const { theme } = useTheme();
  
  // Only apply for bollywood theme
  if (theme !== 'bollywood') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-overlay" aria-hidden="true">
      {/* Cinematic Floating Icons Background */}
      <div className="absolute inset-0 opacity-[0.04]">
         <div className="absolute top-[15%] left-[10%] animate-float-slow"><Film color="#fbbf24" size={100} /></div>
         <div className="absolute bottom-[25%] right-[15%] animate-float-slow" style={{ animationDuration: '6s', animationDelay: '-1s' }}><Camera color="#ef4444" size={90} /></div>
         <div className="absolute top-[35%] right-[5%] animate-float-slow" style={{ animationDuration: '8s', animationDelay: '-2s' }}><Clapperboard color="#fbbf24" size={110} /></div>
         <div className="absolute bottom-[15%] left-[20%] animate-float-slow" style={{ animationDuration: '7s', animationDelay: '-3s' }}><Ticket color="#ef4444" size={80} /></div>
         <div className="absolute top-[55%] left-[40%] animate-float-slow" style={{ animationDuration: '9s', animationDelay: '-4s' }}><Star color="#fbbf24" size={70} /></div>
         <div className="absolute top-[75%] right-[35%] animate-float-slow" style={{ animationDuration: '10s', animationDelay: '-5s' }}><Video color="#ef4444" size={85} /></div>
         <div className="absolute top-[20%] left-[60%] animate-float-slow" style={{ animationDuration: '11s', animationDelay: '-6s' }}><Play color="#fbbf24" size={60} /></div>
         <div className="absolute bottom-[40%] left-[5%] animate-float-slow" style={{ animationDuration: '12s', animationDelay: '-7s' }}><Music color="#ef4444" size={75} /></div>
      </div>
      
      {/* Decorative Sidebars (Film Strip look) */}
      <div className="absolute left-0 top-0 bottom-0 w-[3vw] max-w-[30px] flex flex-col justify-around py-10 opacity-[0.15] bg-black/40 border-r border-amber-500/20 z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`left-sprocket-${i}`} className="w-4 h-6 border-2 border-amber-500/30 rounded-sm mx-auto shadow-[0_0_5px_rgba(251,191,36,0.3)] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-[3vw] max-w-[30px] flex flex-col justify-around py-10 opacity-[0.15] bg-black/40 border-l border-amber-500/20 z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`right-sprocket-${i}`} className="w-4 h-6 border-2 border-amber-500/30 rounded-sm mx-auto shadow-[0_0_5px_rgba(251,191,36,0.3)] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      {/* Cinematic Light Leaks / Gradients */}
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-red-600/5 to-transparent pointer-events-none" />

      {/* Vignette Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-20" />

      {/* Animation Styles */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export default BollywoodThemeOverlay;
