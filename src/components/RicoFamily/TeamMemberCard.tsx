import React from 'react';
import { Star, AlignJustify as Spotify } from 'lucide-react';
import Instagram3DButtonLink from '../Instagram3DButtonLink';
import YouTube3DButtonLink from '../YouTube3DButtonLink';
import Email3DButtonLink from '../Email3DButtonLink';
import Phone3DButtonLink from '../Phone3DButtonLink';
import PreserveNewlines from '../PreserveNewlines';

interface TeamMemberCardProps {
  member: any;
  committee: any;
  isExpanded: boolean;
  isBooting: boolean;
  toggleMemberExpanded: (id: number) => void;
  isMobile: boolean;
  committeeIndex: number;
  memberIndex: number;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  committee,
  isExpanded,
  isBooting,
  toggleMemberExpanded,
  isMobile,
  committeeIndex,
  memberIndex
}) => {
  return (
    <div
      className={`${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""} transition-all duration-500 ${isExpanded ? 'z-20' : 'hover:-translate-y-1 hover:z-10'}`}
      style={!isMobile ? { animationDelay: `${(committeeIndex * 0.3) + (memberIndex * 0.15)}s` } : {}}
    >
      <div className={`group h-full overflow-hidden bg-white/[0.02] border backdrop-blur-xl transition-all duration-500 rounded-2xl ${isExpanded ? 'scale-105 border-red-400/50 shadow-2xl shadow-red-900/20' : 'border-white/5'} stranger-card stranger-flicker ${isBooting ? 'stranger-booting' : ''}`}>
        <div className={`hologram-scanline ${isBooting ? 'opacity-100 scale-y-150 brightness-200' : 'opacity-50'}`}></div>
        <div className={`relative z-10 h-full flex flex-col ${isBooting ? 'hologram-glitch-active' : ''}`}>
          {/* Member Image (always visible) */}
          <div className={`relative overflow-hidden ${isExpanded ? 'h-80' : 'h-64'}`}>
            <img
              loading="lazy"
              src={member.image}
              alt={member.name}
              className={`w-full h-full object-cover object-top transition-transform duration-700 ${isExpanded ? 'scale-105' : 'group-hover:scale-110'} team-member-image hologram-tint`}
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            {/* Specialty Badge (overlay) */}
            {member.specialty && (
              <div
                className="absolute top-2 left-2 opacity-0 translate-y-1 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
                title={member.specialty}
              >
                <span
                  className="text-white px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm border shadow-lg"
                  style={{
                    backgroundColor: committee.color + 'CC',
                    borderColor: committee.color,
                    boxShadow: `0 0 6px ${committee.color}, 0 0 14px ${committee.color}55`
                  }}
                >
                  {member.specialty}
                </span>
              </div>
            )}
            {/* Floating Icon */}
            <div className="absolute top-2 right-2 floating-icon">
              <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* Collapsed Basic Info */}
          <div className="p-4 flex-1">
            <h4 className="text-base font-bold text-white mb-0.5 member-name">
              {member.name}
            </h4>
            <p className="text-red-400 font-semibold mb-2 text-xs">
              {member.role}
            </p>
            {/* Social Links + More/Less button row */}
            {((member.social_links && Object.values(member.social_links).some(link => Boolean(link))) || Boolean((member as any).phone)) ? (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {member.social_links?.instagram && (
                  <Instagram3DButtonLink href={member.social_links.instagram} iconSize={24} buttonSize={40} ariaLabel={`Instagram of ${member.name}`} />
                )}
                {member.social_links?.youtube && (
                  <YouTube3DButtonLink href={member.social_links.youtube} iconSize={22} buttonSize={38} ariaLabel={`YouTube of ${member.name}`} />
                )}
                {member.social_links?.spotify && (
                  <a
                    href={member.social_links.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 transition-colors hover:scale-110"
                  >
                    <Spotify size={22} />
                  </a>
                )}
                {Boolean((member as any).phone) && (
                  <Phone3DButtonLink href={`tel:${(member as any).phone}`} iconSize={18} buttonSize={30} ariaLabel={`Call ${member.name}`} variant="ring" />
                )}
                {/* Spacer pushes button to right */}
                <button
                  type="button"
                  onClick={() => toggleMemberExpanded(member.id)}
                  className="ml-auto text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                  aria-label={isExpanded ? `Show less about ${member.name}` : `Show more about ${member.name}`}
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              </div>
            ) : (
              <div className="flex items-center mb-3">
                <button
                  type="button"
                  onClick={() => toggleMemberExpanded(member.id)}
                  className="ml-auto text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                  aria-label={isExpanded ? `Show less about ${member.name}` : `Show more about ${member.name}`}
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              </div>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <div className="text-xs text-gray-300 space-y-3 mb-4 animate-fade-in">
                {member.description && (
                  <PreserveNewlines text={member.description} className="leading-relaxed" />
                )}
                {member.specialty && (
                  <p><span className="text-cyan-400 font-semibold">Specialty:</span> {member.specialty}</p>
                )}
                {Boolean((member as any).email) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Email3DButtonLink href={`mailto:${(member as any).email}`} iconSize={20} buttonSize={32} ariaLabel={`Email ${member.name}`} variant="ring" />
                  </div>
                )}
                {member.achievements && member.achievements.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-cyan-400 uppercase tracking-wide mb-1">
                      Achievements
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-400">
                      {member.achievements.map((ach: string, i: number) => (
                        <li key={i}>{ach}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className={`hologram-projection-light ${isExpanded ? 'hologram-projection-light-expanded' : ''}`}></div>
      </div>
    </div>
  );
};
