import React from 'react';
import { AlignJustify as Spotify, Activity, Instagram, Facebook, Linkedin } from 'lucide-react';
import YouTube3DButtonLink from '../YouTube3DButtonLink';
import Email3DButtonLink from '../Email3DButtonLink';
import Phone3DButtonLink from '../Phone3DButtonLink';

interface TeamMemberCardProps {
  member: any;
  committee: any;
  isMobile: boolean;
  committeeIndex: number;
  memberIndex: number;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  committee,
  isMobile,
  committeeIndex,
  memberIndex
}) => {
  const themeColor = member.color || committee?.color || '#06b6d4'; // Fallback to cyan
  
  return (
    <div
      className={`${!isMobile ? "scroll-animate opacity-0 transform translate-y-10" : ""} transition-all duration-300 hover:-translate-y-1 hover:z-10`}
      style={!isMobile ? { animationDelay: `${(committeeIndex * 0.1) + (memberIndex * 0.05)}s` } : {}}
    >
      <div 
        className="group h-full overflow-hidden bg-black border transition-all duration-300 clip-angular-sm relative"
        style={{ borderColor: `${themeColor}1a` }} // 10% opacity
        onMouseEnter={(e) => e.currentTarget.style.borderColor = `${themeColor}4d`} // 30% opacity
        onMouseLeave={(e) => e.currentTarget.style.borderColor = `${themeColor}1a`}
      >
        
        <div className={`relative z-10 h-full flex flex-col`}>
          {/* Decorative Corner lines */}
          <div className="absolute top-1 left-1 w-4 h-4 border-t border-l pointer-events-none z-20" style={{ borderColor: `${themeColor}66` }}></div>

          {/* Member Image */}
          <div className={`relative overflow-hidden h-48`}>
            {member.image && (
              <>
                <img src={member.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-125 saturate-150 pointer-events-none" />
                <img
                  loading="lazy" decoding="async"
                  src={member.image}
                  alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover object-top relative z-10 grayscale opacity-80 transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-100"
                />
              </>
            )}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay pointer-events-none"></div>
          </div>

          {/* Name + Role + Instagram */}
          <div className="px-4 pb-4 pt-3 flex-1 relative z-10 flex flex-col bg-black">
            <h4 className="text-sm font-bold mcu-title-text text-white mb-1 leading-tight tracking-wider text-center">
              {member.name}
            </h4>

            {/* Hover-expand: role + Instagram */}
            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 w-full">
              <div className="overflow-hidden">
                <div className="pt-2 flex flex-col items-center w-full">
                  <p className="text-[9px] font-bold hud-monospace tracking-widest uppercase mb-3 flex items-center gap-1.5" style={{ color: themeColor }}>
                    <Activity className="w-3 h-3" />
                    {member.role || 'OPERATIVE'}
                  </p>
                  
                    {/* Social row — only show if data exists */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t w-full" style={{ borderColor: `${themeColor}26` }}>
                      {member.social_links?.instagram && (
                        <a
                          href={member.social_links.instagram}
                          target="_blank" rel="noopener noreferrer"
                          className="w-7 h-7 clip-angular-sm flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:border-[#E1306C] shadow-[0_0_10px_rgba(225,48,108,0.3)] hover:shadow-[0_0_15px_rgba(225,48,108,0.5)] transition-all"
                        >
                          <Instagram size={13} />
                        </a>
                      )}
                    {member.social_links?.youtube && (
                      <YouTube3DButtonLink href={member.social_links.youtube} iconSize={13} buttonSize={28} ariaLabel={`YouTube of ${member.name}`} />
                    )}
                    {member.social_links?.facebook && (
                      <a
                        href={member.social_links.facebook}
                        target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 clip-angular-sm flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20 hover:border-[#1877F2] shadow-[0_0_10px_rgba(24,119,242,0.3)] hover:shadow-[0_0_15px_rgba(24,119,242,0.5)] transition-all"
                      >
                        <Facebook size={13} />
                      </a>
                    )}
                    {member.social_links?.linkedin && (
                      <a
                        href={member.social_links.linkedin}
                        target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 clip-angular-sm flex items-center justify-center bg-[#0077B5]/10 border border-[#0077B5]/30 text-[#0077B5] hover:bg-[#0077B5]/20 hover:border-[#0077B5] shadow-[0_0_10px_rgba(0,119,181,0.3)] hover:shadow-[0_0_15px_rgba(0,119,181,0.5)] transition-all"
                      >
                        <Linkedin size={13} />
                      </a>
                    )}
                    {member.social_links?.spotify && (
                      <a
                        href={member.social_links.spotify}
                        target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 clip-angular-sm flex items-center justify-center bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/20 hover:border-[#1DB954] shadow-[0_0_10px_rgba(29,185,84,0.3)] hover:shadow-[0_0_15px_rgba(29,185,84,0.5)] transition-all"
                      >
                        <Spotify size={13} />
                      </a>
                    )}
                    {Boolean((member as any).phone) && (
                      <Phone3DButtonLink href={`tel:${(member as any).phone}`} iconSize={12} buttonSize={28} ariaLabel={`Call ${member.name}`} variant="ring" />
                    )}
                    {Boolean((member as any).email) && (
                      <Email3DButtonLink href={`mailto:${(member as any).email}`} iconSize={12} buttonSize={28} ariaLabel={`Email ${member.name}`} variant="ring" />
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};


