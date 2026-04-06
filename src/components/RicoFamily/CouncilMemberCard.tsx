import React from 'react';
import { Instagram, Youtube, Facebook, AlignJustify as Spotify, Mail, Phone, Target, Linkedin } from 'lucide-react';

interface CouncilMemberCardProps {
  member: any;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
  idx: number;
  isMobile: boolean;
}

export const CouncilMemberCard: React.FC<CouncilMemberCardProps> = ({ member, isLeadWebDevRole, idx, isMobile }) => {
  const lead = isLeadWebDevRole(member.role);
  const themeColor = member.color || '#EF4444'; // Default to red
  
  return (
    <div 
      className={`group overflow-hidden border bg-black backdrop-blur-3xl clip-angular-br relative flex flex-col h-full transition-all duration-700 ease-out hover:bg-black hover:-translate-y-2 ${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}`}
      style={{
        ...( !isMobile ? { animationDelay: `${idx * 0.15}s` } : {} ),
        borderColor: `${themeColor}33`, // 20% opacity
        boxShadow: `0 0 30px ${themeColor}10, inset 0 2px 10px ${themeColor}1a`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${themeColor}66`;
        e.currentTarget.style.boxShadow = `0 0 50px ${themeColor}26, inset 0 2px 10px ${themeColor}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${themeColor}33`;
        e.currentTarget.style.boxShadow = `0 0 30px ${themeColor}10, inset 0 2px 10px ${themeColor}1a`;
      }}
    >
      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 pointer-events-none z-10" style={{ borderColor: `${themeColor}80` }}></div>
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 pointer-events-none z-10" style={{ borderColor: `${themeColor}80` }}></div>

      {/* Image — takes most of the card height */}
      <div className="relative flex-1 overflow-hidden clip-angular-sm">
        <div className="animate-scanline z-10 pointer-events-none mix-blend-overlay"></div>
        <img src={member.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
        <img loading="lazy" decoding="async" src={member.image} alt={member.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10 transition-transform duration-[1.5s] group-hover:scale-105 grayscale-[0.2] group-hover:grayscale-0 opacity-90 min-h-[280px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-3 left-3 z-20">
           <div className="w-8 h-8 clip-angular-sm bg-black/60 border flex items-center justify-center backdrop-blur-md" style={{ borderColor: lead ? themeColor : `${themeColor}66` }}>
              <Target className="w-3.5 h-3.5" style={{ color: themeColor }} />
           </div>
        </div>
      </div>
      
      {/* Content — name always visible, role+icons on hover */}
      <div className="px-5 pb-5 pt-4 flex flex-col items-center text-center relative z-20 bg-black">
        <h3 className="text-xl font-bold mcu-title-text text-white">{member.name}</h3>

        {/* Hover-expand area */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 w-full">
          <div className="overflow-hidden">
            <div className="pt-3 flex flex-col items-center w-full">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 hud-monospace ${lead ? 'glow-text' : ''}`} style={{ color: `${themeColor}cc` }}>
                {lead ? 'Initiative Creator' : (member.role || 'Member')}
              </p>
              
              {/* Social Icons — only show when real data exists */}
              {((member.social_links?.instagram || (member as any).phone || member.social_links?.facebook || member.social_links?.youtube || member.social_links?.spotify || (member as any).email || member.social_links?.linkedin)) && (
                <div className="flex flex-wrap justify-center items-center gap-3 pt-3 border-t w-full" style={{ borderColor: `${themeColor}33` }}>
                  {member.social_links?.instagram && (
                    <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:border-[#E1306C] shadow-[0_0_15px_rgba(225,48,108,0.3)] hover:shadow-[0_0_20px_rgba(225,48,108,0.5)] transition-all">
                      <Instagram size={16} />
                    </a>
                  )}
                  {(member as any).phone && (
                    <a href={`tel:${(member as any).phone}`} className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 hover:border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all">
                      <Phone size={16} />
                    </a>
                  )}
                  {member.social_links?.facebook && (
                    <a href={member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20 hover:border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.3)] hover:shadow-[0_0_20px_rgba(24,119,242,0.5)] transition-all">
                      <Facebook size={16} />
                    </a>
                  )}
                  {member.social_links?.youtube && (
                    <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Youtube size={16} />
                    </a>
                  )}
                  {member.social_links?.spotify && (
                    <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954] hover:text-white transition-all">
                      <Spotify size={16} />
                    </a>
                  )}
                  {member.social_links?.linkedin && (
                    <a href={member.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#0077B5]/10 border border-[#0077B5]/30 text-[#0077B5] hover:bg-[#0077B5]/20 hover:border-[#0077B5] shadow-[0_0_15px_rgba(0,119,181,0.3)] hover:shadow-[0_0_20px_rgba(0,119,181,0.5)] transition-all">
                      <Linkedin size={16} />
                    </a>
                  )}
                  {Boolean((member as any).email) && (
                    <a href={`mailto:${(member as any).email}`} className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">
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
