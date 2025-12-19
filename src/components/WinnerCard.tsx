import React from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';

interface WinnerCardProps {
  name: string;
  position: number;
  eventName: string;
  category?: string;
  year?: string;
  photoUrl?: string; // Optional, if we have winner's photo
  className?: string;
  members?: string[];
}

const WinnerCard: React.FC<WinnerCardProps> = ({
  name,
  position,
  eventName,
  category,
  year,
  photoUrl,
  className = '',
  members
}) => {
  // Determine rank styling
  const getRankStyles = (pos: number) => {
    switch (pos) {
      case 1:
        return {
          icon: <Crown className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" />,
          borderColor: 'border-yellow-400/60',
          gradient: 'from-yellow-900/40 via-yellow-500/10 to-transparent',
          textColor: 'text-yellow-300',
          label: '1ST PLACE'
        };
      case 2:
        return {
          icon: <Medal className="w-5 h-5 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]" />,
          borderColor: 'border-gray-400/60',
          gradient: 'from-gray-800/40 via-gray-500/10 to-transparent',
          textColor: 'text-gray-200',
          label: '2ND PLACE'
        };
      case 3:
        return {
          icon: <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]" />,
          borderColor: 'border-amber-600/60',
          gradient: 'from-amber-900/40 via-amber-600/10 to-transparent',
          textColor: 'text-amber-500',
          label: '3RD PLACE'
        };
      default:
        return {
          icon: <Trophy className="w-4 h-4 text-blue-400" />,
          borderColor: 'border-blue-500/30',
          gradient: 'from-blue-900/30 via-blue-500/5 to-transparent',
          textColor: 'text-blue-300',
          label: 'WINNER'
        };
    }
  };

  const styles = getRankStyles(position);

  return (
    <div className={`relative group w-56 h-80 sm:w-64 sm:h-80 md:w-72 md:h-96 flex-shrink-0 cursor-pointer ${className}`}>
      {/* Glitch Effect - Base Layer */}
      <div className="absolute inset-0 bg-black border border-gray-800 rounded-xl transform transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] overflow-hidden">
        
        {/* Background Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-50`}></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
        
        {/* Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)50%,rgba(0,0,0,0.25)50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none"></div>

        {/* Content Container */}
        <div className="relative h-full flex flex-col p-5 z-10">
          
          {/* Header: Rank */}
          <div className="flex justify-between items-start mb-2 md:mb-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${styles.borderColor} bg-black/40 backdrop-blur-md`}>
                {styles.icon}
                <span className={`text-[10px] font-black tracking-widest ${styles.textColor}`}>{styles.label}</span>
             </div>
             {year && (
                <div className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] text-gray-400 font-mono">
                  {year}
                </div>
             )}
          </div>

          {/* Photo or Placeholder */}
          <div className="flex-shrink-0 flex items-center justify-center my-2">
             <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
               {/* Glowing ring behind image */}
               <div className={`absolute inset-0 rounded-full border-2 ${styles.borderColor} opacity-60 animate-pulse`}></div>
               <div className={`absolute -inset-1 rounded-full bg-gradient-to-r ${styles.gradient} opacity-20 blur-md`}></div>
               
               {photoUrl ? (
                 <img 
                   src={photoUrl} 
                   alt={name} 
                   className="w-full h-full object-cover rounded-full border-2 border-white/10 shadow-lg relative z-10"
                 />
               ) : (
                 <div className="w-full h-full rounded-full bg-slate-900 border border-white/10 flex items-center justify-center relative z-10">
                   <span className="text-3xl font-black text-white/20">{name.charAt(0)}</span>
                 </div>
               )}
             </div>
          </div>

          {/* Text Details */}
          <div className="text-center space-y-1 relative z-20 mt-1 sm:mt-2">
             <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wider line-clamp-2 leading-tight drop-shadow-md group-hover:text-pink-400 transition-colors">
               {name}
             </h3>
             
             {members && members.length > 0 && (
                <div className="flex flex-col items-center justify-center mt-1">
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Team Members</span>
                  <div className="text-xs text-cyan-300 font-mono leading-tight px-1 break-words">
                    {members.map(m => typeof m === 'object' ? (m as any).name : m).join(', ')}
                  </div>
                </div>
             )}
             
             <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2"></div>
             
             <p className="text-xs sm:text-sm md:text-base font-semibold text-cyan-300 uppercase tracking-wide line-clamp-1">
               {eventName}
             </p>
             {category && (
               <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-mono truncate">
                 {category}
               </p>
             )}
          </div>

        </div>

        {/* Hover overlay effects */}
        <div className="absolute inset-0 border-2 border-white/0 group-hover:border-pink-500/50 rounded-xl transition-colors duration-300 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default WinnerCard;
