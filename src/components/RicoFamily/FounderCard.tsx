import React from 'react';
import { Crown, Instagram, Youtube, Facebook, Shield, AlignJustify as Spotify } from 'lucide-react';
import { KineticText } from '../ui/KineticText';

interface FounderCardProps {
  founder: any;
  compact: boolean;
  isActive: boolean;
}

export const FounderCard: React.FC<FounderCardProps> = ({ founder, compact, isActive }) => {
  const isRaaj = founder.name.toLowerCase().includes('raaj');
  
  return (
    <div 
      className={`w-full ${compact ? 'max-w-[420px]' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center transition-all duration-700 ${!isActive ? 'opacity-40 grayscale blur-[2px] scale-90' : 'opacity-100 grayscale-0 blur-0 scale-100'}`}
    >
      {/* Portrait Frame */}
      <div className="lg:col-span-5 flex justify-center lg:justify-end order-1">
        <div className="relative group w-full max-w-[320px] md:max-w-[380px]">
          <div className="absolute -inset-4 border border-red-500/10 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="relative overflow-hidden rounded-[2rem] bg-black/40 border-2 border-white/10 shadow-[0_0_40px_-10px_rgba(220,38,38,0.2)] group-hover:border-red-500/30 transition-all duration-700">
            <div className="hologram-scanline opacity-20"></div>
            <img 
              loading="lazy" 
              src={founder.image} 
              alt={founder.name} 
              className="w-full aspect-[4/5] object-cover object-top transition-transform duration-[2s] group-hover:scale-110 grayscale-[0.1] group-hover:grayscale-0" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent opacity-50"></div>
            
            <div className="absolute top-4 right-4 hidden md:flex items-center justify-center">
               <div className="w-10 h-10 rounded-xl bg-black/60 border border-red-500/40 backdrop-blur-2xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <Crown className="w-5 h-5 text-red-400" />
               </div>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 md:-right-6 px-4 py-2.5 rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 backdrop-blur-3xl shadow-xl z-20 hidden md:block">
             <p className="text-xs font-bold text-white flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
               Lead Architect
             </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left order-2">
         <div className="mb-0 overflow-hidden">
            {isRaaj ? (
              <KineticText as="h3" className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter mb-1">
                RAAJ
              </KineticText>
            ) : (
              <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-1">
                {founder.name}
              </h3>
            )}
         </div>
         
         <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 mb-6">
           <div className="inline-flex items-center gap-2 text-red-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] py-1 border-b border-red-500/20">
              Founder of Website
           </div>
           <div className="text-white/40 text-[9px] md:text-[10px] font-mono uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
              <Shield className="w-3 h-3 text-white/20" />
              System Sovereign
           </div>
         </div>

         <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed font-light mb-8 italic">
           "Building the digital infrastructure for excellence. The architect behind the platform, ensuring every byte serves the vision."
         </p>

         <div className="flex flex-wrap justify-center lg:justify-start gap-3">
            {founder.social_links?.instagram && (
               <a href={founder.social_links.instagram} target="_blank" rel="noopener noreferrer" className="group/social relative flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 overflow-hidden">
                 <Instagram className="w-4 h-4 text-pink-400" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-pink-50/80">Instagram</span>
               </a>
            )}
            {founder.social_links?.youtube && (
               <a href={founder.social_links.youtube} target="_blank" rel="noopener noreferrer" className="group/social relative flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 overflow-hidden">
                 <Youtube className="w-4 h-4 text-red-100" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-red-50/80">YouTube</span>
               </a>
            )}
            <div className="flex gap-2">
               {founder.social_links?.facebook && (
                  <a href={founder.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/5 border border-blue-500/20 text-blue-400 hover:border-blue-500/40 transition-all duration-300"><Facebook size={16} /></a>
               )}
               {founder.social_links?.spotify && (
                  <a href={founder.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/5 border border-green-500/20 text-green-400 hover:border-green-500/40 transition-all duration-300"><Spotify size={16} /></a>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
