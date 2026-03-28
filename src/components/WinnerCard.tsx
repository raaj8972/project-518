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
          icon: <Trophy className="w-4 h-4 text-red-500" />,
          borderColor: 'border-red-500/30',
          gradient: 'from-red-900/40 via-red-500/10 to-transparent',
          textColor: 'text-red-400',
          label: 'WINNER'
        };
    }
  };

  const styles = getRankStyles(position);

  return (
    <div className={`relative group w-64 h-[26rem] sm:w-72 sm:h-[28rem] md:w-80 md:h-[30rem] flex-shrink-0 cursor-pointer tilt-3d ${className}`}>
      {/* RICO Glass Container */}
      <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-[2rem] transform transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-2 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Background Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-20`}></div>
        
        {/* Content Container */}
        <div className="relative h-full flex flex-col p-6 z-10">
          
          {/* Header: Rank */}
          <div className="flex justify-between items-start mb-4">
             <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl`}>
                {styles.icon}
                <span className={`text-[9px] font-black tracking-[0.2em] ${styles.textColor}`}>{styles.label}</span>
             </div>
             {year && (
                <div className="px-3 py-1 rounded-lg border border-white/5 bg-white/[0.02] text-[9px] text-white/40 font-black tracking-widest">
                  {year}
                </div>
             )}
          </div>

          {/* Photo or Placeholder */}
          <div className="flex-shrink-0 flex items-center justify-center my-6">
             <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40">
               {/* Premium Glow ring behind image */}
               <div className={`absolute -inset-2 rounded-full border border-white/5 opacity-50`}></div>
               <div className={`absolute -inset-4 rounded-full bg-gradient-to-r ${styles.gradient} opacity-20 blur-2xl`}></div>
               
               {photoUrl ? (
                 <img 
                   src={photoUrl} 
                   alt={name} 
                   className="w-full h-full object-cover rounded-full border border-white/10 shadow-2xl relative z-10"
                 />
               ) : (
                 <div className="w-full h-full rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-xl">
                   <span className="text-4xl font-black text-white/20">{name.charAt(0)}</span>
                 </div>
               )}
             </div>
          </div>

          {/* Text Details */}
          <div className="text-center space-y-3 relative z-20 mt-4">
             <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tighter line-clamp-2 leading-tight font-serif">
               {name}
             </h3>
             
             {members && members.length > 0 && (
                <div className="flex flex-col items-center justify-center mt-1">
                  <span className="text-[8px] uppercase tracking-[0.3em] text-white/30 font-black mb-1">TEAM CREW</span>
                  <div className="text-[10px] text-white/60 font-medium leading-tight px-1 italic">
                    {members.map(m => typeof m === 'object' ? (m as any).name : m).join(', ')}
                  </div>
                </div>
             )}
             
             <div className="w-16 h-0.5 bg-white/10 mx-auto my-6 rounded-full"></div>
             
             <p className="text-xs sm:text-sm font-black text-red-500 uppercase tracking-[0.2em] leading-snug">
               {eventName}
             </p>
             {category && (
               <p className="text-[10px] sm:text-xs text-white/30 font-bold uppercase tracking-widest mt-1">
                 {category}
               </p>
             )}
          </div>

        </div>

        {/* Hover overlay border */}
        <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 rounded-[2rem] transition-colors duration-500 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default WinnerCard;
