import React from 'react';
import { Shield, Instagram, Youtube, Facebook, AlignJustify as Spotify, Mail, Phone, Activity, Linkedin } from 'lucide-react';

interface CommitteeHeadCardProps {
  head: any;
  committeeName: string;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
  isMobile?: boolean;
}

export const CommitteeHeadCard: React.FC<CommitteeHeadCardProps> = ({ head, committeeName, isLeadWebDevRole }) => {
  const lead = isLeadWebDevRole(head.role, committeeName);
  const isTechLeadRaaj = head.name.toLowerCase().includes('raaj') && !lead;
  const themeColor = head.color || '#06b6d4'; // Fallback to cyan
  const isFounder = lead || isTechLeadRaaj;

  return (
    <div
      className={`group overflow-hidden bg-black border backdrop-blur-2xl clip-angular-br shadow-2xl transition-all duration-500 hover:bg-black relative z-10 flex flex-col h-full`}
      style={{
        borderColor: isFounder ? (isTechLeadRaaj ? 'rgba(6, 182, 212, 0.5)' : 'rgba(6, 182, 212, 0.2)') : `${themeColor}33`,
        boxShadow: isTechLeadRaaj ? '0 0 30px rgba(6, 182, 212, 0.3)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (!isFounder) {
          e.currentTarget.style.borderColor = `${themeColor}66`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isFounder) {
          e.currentTarget.style.borderColor = `${themeColor}33`;
        }
      }}
    >
      <img src={head.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-150 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      {/* Decorative Target Corners */}
      <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 pointer-events-none z-30" style={{ borderColor: isFounder ? 'rgba(6, 182, 212, 0.3)' : `${themeColor}4D` }}></div>
      
      {/* Massive Image Section (Portrait) */}
      <div className="relative h-80 md:h-96 w-full overflow-hidden shrink-0 clip-angular-sm m-1">
        <div className="animate-scanline z-10 pointer-events-none mix-blend-overlay"></div>
        <img loading="lazy" decoding="async" src={head.image} alt={head.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10 transition-transform duration-700 ease-out group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0 opacity-90" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay pointer-events-none"></div>
        
        {/* Tech Badge absolute positioned */}
        <div className="absolute top-5 right-5 z-20">
          <div className="w-10 h-10 clip-angular-sm bg-black/70 border border-cyan-500/30 flex items-center justify-center backdrop-blur-md shadow-lg">
            <Shield className={`w-5 h-5 ${lead ? 'text-red-400 animate-pulse' : isTechLeadRaaj ? 'text-cyan-400' : 'text-cyan-500'}`} />
          </div>
        </div>
      </div>

      {/* Content Section — name always visible, specialty+icons on hover */}
      <div className="px-6 pb-6 pt-4 relative z-20 flex-grow flex flex-col items-center text-center">
        
        <h5 className={`text-2xl md:text-3xl font-black tracking-wide uppercase mcu-title-text ${lead ? 'text-white' : isTechLeadRaaj ? 'text-cyan-100 glow-text' : 'text-white'}`}>
          {isTechLeadRaaj ? 'RAAJ' : head.name}
        </h5>

        {/* Hover-expand: Specialty badge + social icons */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 w-full">
          <div className="overflow-hidden">
            <div className="pt-3 flex flex-col items-center w-full">
              
              {/* Role Tag */}
              <div className={`px-4 py-1.5 clip-angular-sm text-[10px] font-black tracking-[0.2em] uppercase border backdrop-blur-md inline-flex items-center gap-2 mb-4 shadow-xl hud-monospace ${lead ? 'bg-red-500/20 text-red-300 border-red-500/30 box-glow-red' : isTechLeadRaaj ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 box-glow-cyan' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'}`}>
                {isTechLeadRaaj && <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />}
                {lead ? 'Founder of Website' : head.role || 'COMMITTEE HEAD'}
              </div>

              {/* Social Icons — only show when real data exists */}
              {((head.social_links?.instagram || (head as any).phone || head.social_links?.facebook || head.social_links?.youtube || head.social_links?.spotify || (head as any).email)) && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-cyan-500/20 w-full">
                  {head.social_links?.instagram && (
                    <a href={head.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:border-[#E1306C] shadow-[0_0_15px_rgba(225,48,108,0.3)] hover:shadow-[0_0_20px_rgba(225,48,108,0.5)] transition-all">
                      <Instagram size={16} />
                    </a>
                  )}
                  {(head as any).phone && (
                    <a href={`tel:${(head as any).phone}`} className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 hover:border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all">
                      <Phone size={16} />
                    </a>
                  )}
                  {head.social_links?.facebook && (
                    <a href={head.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20 hover:border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.3)] hover:shadow-[0_0_20px_rgba(24,119,242,0.5)] transition-all">
                      <Facebook size={16} />
                    </a>
                  )}
                  {head.social_links?.youtube && (
                    <a href={head.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                      <Youtube size={16} />
                    </a>
                  )}
                  {head.social_links?.spotify && (
                    <a href={head.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">
                      <Spotify size={16} />
                    </a>
                  )}
                  {head.social_links?.linkedin && (
                    <a href={head.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#0077B5]/10 border border-[#0077B5]/30 text-[#0077B5] hover:bg-[#0077B5]/20 hover:border-[#0077B5] shadow-[0_0_15px_rgba(0,119,181,0.3)] hover:shadow-[0_0_20px_rgba(0,119,181,0.5)] transition-all">
                      <Linkedin size={16} />
                    </a>
                  )}
                  {(head as any).email && (
                    <a href={`mailto:${(head as any).email}`} className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">
                      <Mail size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
