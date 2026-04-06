import React from 'react';
import { Instagram, Youtube, Facebook, AlignJustify as Spotify, Cpu, Activity, Target, Phone } from 'lucide-react';
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
      {/* Portrait Frame (Stark HUD Style) */}
      <div className="lg:col-span-5 flex justify-center lg:justify-end order-1">
        <div className="relative group w-full max-w-[320px] md:max-w-[380px] dossier-frame" style={{"--frame-color": "#00f0ff"} as React.CSSProperties}>
          
          <div className="relative overflow-hidden clip-angular-br bg-black/80 border border-cyan-500/40 shadow-[0_0_40px_-5px_rgba(0,240,255,0.2)] group-hover:border-cyan-400 transition-all duration-700">
            <div className="animate-scanline"></div>
            <img src={founder.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
                    <img loading="lazy" decoding="async" src={founder.image} alt={founder.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10  aspect-[4/5] transition-transform duration-[2s] group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0 opacity-90" />
            {/* Tech Mesh Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.25] mix-blend-overlay"></div>
            
            {/* Corner Targeting UI */}
            <div className="absolute top-4 right-4 hidden md:flex items-center justify-center">
               <div className="w-10 h-10 clip-angular-sm bg-black/60 border border-cyan-500/60 backdrop-blur-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 box-glow-cyan">
                  <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
               </div>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 md:-right-6 px-4 py-2.5 clip-angular-sm bg-[#0a0f1d]/90 border border-cyan-500/50 backdrop-blur-3xl shadow-[0_0_15px_rgba(0,240,255,0.3)] z-20 hidden md:block">
             <p className="text-xs font-bold text-cyan-50 flex items-center gap-2 hud-monospace">
               <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
               DIRECTOR LEVEL
             </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="lg:col-span-7 flex flex-col items-center text-center order-2">
         <div className="mb-0 overflow-hidden">
            {isRaaj ? (
              <KineticText as="h3" className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter mb-1 mcu-title-text mcu-title-glow">
                RAAJ
              </KineticText>
            ) : (
              <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-1 mcu-title-text mcu-title-glow">
                {founder.name}
              </h3>
            )}
         </div>
         
         <div className="flex flex-col items-center gap-3 mb-6">
           <div className="inline-flex items-center gap-2 text-cyan-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] py-1 border-b-2 border-cyan-500/40 hud-monospace">
              <Cpu className="w-4 h-4" /> INITIATIVE CREATOR
           </div>
           <div className="text-cyan-100/50 text-[9px] md:text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-2 hud-monospace">
              <Activity className="w-3 h-3 text-cyan-500/50" />
              SYSTEM SOVEREIGN . STATUS A-1
           </div>
         </div>


         <div className="flex flex-wrap justify-center gap-3">
             {founder.social_links?.instagram && (
               <a href={founder.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:text-[#E1306C] hover:border-[#E1306C] shadow-[0_0_15px_rgba(225,48,108,0.3)] hover:shadow-[0_0_20px_rgba(225,48,108,0.5)] transition-all"><Instagram size={16} /></a>
             )}
             {Boolean((founder as any).phone) && (
               <a href={`tel:${(founder as any).phone}`} className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 hover:text-green-500 hover:border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"><Phone size={16} /></a>
             )}
             {founder.social_links?.facebook && (
               <a href={founder.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20 hover:border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.3)] hover:shadow-[0_0_20px_rgba(24,119,242,0.5)] transition-all"><Facebook size={16} /></a>
             )}
             {founder.social_links?.youtube && (
               <a href={founder.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"><Youtube size={16} /></a>
             )}
             {founder.social_links?.spotify && (
               <a href={founder.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"><Spotify size={16} /></a>
             )}
         </div>
      </div>
    </div>
  );
};

