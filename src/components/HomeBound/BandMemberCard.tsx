import React, { useRef, useState } from 'react';
import { Instagram, Youtube, AlignJustify as Spotify, Volume2, Star } from 'lucide-react';
import FlipCard, { FlipCardHandle } from '../FlipCard';
import PreserveNewlines from '../PreserveNewlines';

interface BandMemberProps {
  member: {
    id: string;
    name: string;
    role: string;
    category: string;
    specialty: string;
    description: string;
    image: string;
    is_featured: boolean;
    social_links?: {
      instagram?: string;
      youtube?: string;
      spotify?: string;
    };
  };
  className?: string;
}

export const BandMemberCard: React.FC<BandMemberProps> = ({ member, className = '' }) => {
  const cardRef = useRef<FlipCardHandle>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic border color based on category/feature
  const getBorderColor = () => {
    if (member.is_featured) return 'border-pink-500/50';
    if (member.category === 'Vocalist') return 'border-purple-500/40';
    if (member.category === 'Instrumentalist') return 'border-blue-500/40';
    return 'border-white/20';
  };

  const getGlowColor = () => {
    if (member.is_featured) return 'from-pink-500/20 via-purple-500/10';
    if (member.category === 'Vocalist') return 'from-purple-500/20 via-indigo-500/10';
    return 'from-blue-500/20 via-cyan-500/10';
  };

  return (
    <div 
      className={`relative group perspective-1000 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FlipCard
        ref={cardRef}
        className={`w-full h-[26rem] sm:h-[30rem] md:h-[33rem] lg:h-[38rem] transition-all duration-500 ${isHovered ? 'scale-[1.02]' : ''}`}
        disableWrapperTap={false}
        enableClickToggleOnDesktop
        front={
          <div className={`relative w-full h-full rounded-[2rem] overflow-hidden border ${getBorderColor()} bg-black/40 backdrop-blur-md shadow-2xl`}>
            {/* Background Effects */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getGlowColor()} to-transparent opacity-50`}></div>
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            
            {/* Image Container with geometric mask */}
            <div className="relative h-[80%] w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
              <img 
                src={member.image} 
                alt={member.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Floating Badges */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                 {member.is_featured && (
                   <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 text-pink-300 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                     Featured Artist
                   </span>
                 )}
                 <span className="px-3 py-1 bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                   {member.category}
                 </span>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="absolute bottom-0 inset-x-0 h-[35%] bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col justify-end p-6 z-20">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-lg">
                {member.name}
              </h3>
              <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                {member.role}
                {member.category === 'Vocalist' && <Volume2 size={12} className="text-purple-400" />}
                {member.is_featured && <Star size={12} className="text-pink-400" />}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono border border-white/10 px-2 py-1 rounded">
                  ID: {String(member.id || '').slice(0, 4)}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); cardRef.current?.toggle(); }}
                  className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Neon Border Glow */}
            <div className={`absolute inset-0 border border-white/0 group-hover:border-white/20 rounded-[2rem] transition-all duration-500 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]`}></div>
          </div>
        }
        back={
          <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-black/90 border border-white/10 p-8 flex flex-col">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
            
            <div className="relative z-10 flex flex-col h-full">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tight">{member.name}</h3>
                   <p className="text-xs font-bold text-white/50 uppercase tracking-widest">{member.specialty}</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    {member.category === 'Vocalist' ? <Volume2 size={16} className="text-purple-400" /> : <Star size={16} className="text-blue-400" />}
                 </div>
               </div>

               <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-6">
                 <PreserveNewlines text={member.description} className="text-sm text-gray-400 leading-relaxed font-light" />
               </div>

               {/* Social Links */}
               {member.social_links && Object.keys(member.social_links).length > 0 && (
                 <div className="pt-6 border-t border-white/10">
                   <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Connect</p>
                   <div className="flex gap-3">
                     {member.social_links.instagram && (
                       <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-500/10 hover:bg-pink-500/20 rounded-xl text-pink-400 transition-colors border border-pink-500/20">
                         <Instagram size={18} />
                       </a>
                     )}
                     {member.social_links.youtube && (
                       <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors border border-red-500/20">
                         <Youtube size={18} />
                       </a>
                     )}
                     {member.social_links.spotify && (
                       <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-xl text-green-400 transition-colors border border-green-500/20">
                         <Spotify size={18} />
                       </a>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        }
      />
    </div>
  );
};
