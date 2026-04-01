import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Film, Camera, Clapperboard, Video, Award, Star } from 'lucide-react';

export const BollywoodThemeOverlay: React.FC = () => {
  const { theme } = useTheme();
  
  if (theme !== 'bollywood') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen" aria-hidden="true">
      {/* Bollywood Floating Cinema Icons Background */}
      <div className="absolute inset-0 opacity-[0.05]">
         <div className="absolute top-[10%] left-[5%] animate-pulse"><Film color="#fbbf24" size={120} /></div>
         <div className="absolute bottom-[20%] right-[10%] animate-bounce" style={{ animationDuration: '4s' }}><Camera color="#fbbf24" size={80} /></div>
         <div className="absolute top-[30%] right-[15%] animate-pulse" style={{ animationDuration: '3s' }}><Clapperboard color="#fbbf24" size={100} /></div>
         <div className="absolute bottom-[10%] left-[15%] animate-pulse" style={{ animationDuration: '5s' }}><Video color="#fbbf24" size={90} /></div>
         <div className="absolute top-[50%] left-[30%] animate-bounce" style={{ animationDuration: '6s' }}><Star color="#fbbf24" size={60} /></div>
         <div className="absolute top-[70%] right-[30%] animate-bounce" style={{ animationDuration: '7s' }}><Award color="#fbbf24" size={70} /></div>
      </div>
      
      {/* Film Strip Borders */}
      <div className="absolute left-0 top-0 bottom-0 w-[4vw] max-w-[40px] flex flex-col justify-between py-4 opacity-[0.15] bg-[#0f0904]/40 border-r border-[#fbbf24]/20 backdrop-blur-sm z-10">
        {Array.from({ length: Math.ceil(window.innerHeight / 60) }).map((_, i) => (
          <div key={`left-${i}`} className="w-1/2 min-w-[12px] h-[3vh] min-h-[16px] bg-[#fbbf24]/20 rounded-sm mx-auto mb-2 border border-[#fbbf24]/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
        ))}
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-[4vw] max-w-[40px] flex flex-col justify-between py-4 opacity-[0.15] bg-[#0f0904]/40 border-l border-[#fbbf24]/20 backdrop-blur-sm z-10">
        {Array.from({ length: Math.ceil(window.innerHeight / 60) }).map((_, i) => (
          <div key={`right-${i}`} className="w-1/2 min-w-[12px] h-[3vh] min-h-[16px] bg-[#fbbf24]/20 rounded-sm mx-auto mb-2 border border-[#fbbf24]/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
        ))}
      </div>

       {/* Cinema Top/Bottom Black Bars (Letterbox) */}
       <div className="absolute top-0 left-0 w-full h-[2vh] bg-gradient-to-b from-black/50 to-transparent z-10"></div>
       <div className="absolute bottom-0 left-0 w-full h-[2vh] bg-gradient-to-t from-black/50 to-transparent z-10"></div>
    </div>
  );
};
