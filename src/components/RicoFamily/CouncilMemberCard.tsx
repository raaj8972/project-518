import React from 'react';
import { Crown, Instagram, Youtube, Facebook, AlignJustify as Spotify, Mail, Phone } from 'lucide-react';
import DescriptionHeaderBody from '../DescriptionHeaderBody';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

interface CouncilMemberCardProps {
  member: any;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
  idx: number;
  isMobile: boolean;
}

export const CouncilMemberCard: React.FC<CouncilMemberCardProps> = ({ member, isLeadWebDevRole, idx, isMobile }) => {
  const lead = isLeadWebDevRole(member.role);
  
  return (
    <div 
      className={`group overflow-hidden border bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] shadow-2xl relative flex flex-col md:grid md:grid-cols-12 gap-0 h-full transition-all duration-500 hover:bg-white/[0.04] ${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}`}
      style={!isMobile ? { animationDelay: `${idx * 0.15}s` } : {}}
    > 
      {/* Image */}
      <div className="relative aspect-[4/5] sm:aspect-square md:aspect-auto md:col-span-4 md:h-full overflow-hidden">
        <img decoding="async" src={member.image} alt={member.name} className="w-full h-full object-cover object-top transition-transform duration-[1.5s] group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] md:from-transparent to-transparent opacity-90"></div>
        <div className="absolute top-4 right-4 md:right-auto md:left-4">
           <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
              <Crown className={`w-3.5 h-3.5 ${lead ? 'text-red-400' : 'text-red-500'}`} />
           </div>
        </div>
        <div className="absolute bottom-4 left-4">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md ${lead ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>COUNCIL</div>
        </div>
      </div>
      {/* Content */}
      <div className="px-6 pb-8 pt-4 md:p-8 flex flex-col justify-center relative md:col-span-8">
        <h3 className={`text-2xl sm:text-3xl font-bold mb-1 tracking-tight ${lead ? 'text-red-50' : 'text-white'}`}>{member.name}</h3>
        <p className={`text-[11px] font-bold uppercase tracking-widest mb-6 ${lead ? 'text-red-400/80' : 'text-red-400/80'}`}>{lead ? 'Founder of Website' : (member.role || 'Member')}</p>
        {member.description && (
          (() => {
            const isTreasurer = String(member.role || '').toLowerCase().includes('treasur');
            const headerClass = isTreasurer
              ? 'text-white font-semibold mb-2'
              : 'text-white/80 font-semibold mb-2';
            return (
              <DescriptionHeaderBody
                text={member.description}
                headerClassName={headerClass}
                bodyClassName="text-white/60 mb-6 leading-relaxed text-sm font-light"
                highlights={["I Treasure Ricorrenza", "Treasure"]}
                headerHighlightRules={[
                  {
                    pattern: new RegExp(`^\\s*as\\s+the\\s+(?:(?:g(?:\\.\\s*)?s(?:\\.|\\b))(?:\\s*\\/\\s*gen(?:e)?ral\\s+secretary)?|gen(?:e)?ral\\s+secretary)\\s+of\\s+${BRAND_NAME.toLowerCase()}\\s*${BRAND_YEAR}`, 'i'),
                    className: 'text-white font-semibold'
                  },
                  {
                    pattern: new RegExp(`^\\s*as\\s+the\\s+president\\s+of\\s+${BRAND_NAME.toLowerCase()}\\s*${BRAND_YEAR}`, 'i'),
                    className: 'text-white font-semibold'
                  }
                ]}
              />
            );
          })()
        )}
        {member.specialty && (
          <div className="mb-6">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-white/70`}>
              {member.specialty}
            </span>
          </div>
        )}
        {member.social_links && Object.values(member.social_links).some(l => l) && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
             {member.social_links.instagram && (
               <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"><Instagram size={18} /></a>
             )}
             {member.social_links.youtube && (
               <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"><Youtube size={18} /></a>
             )}
             {member.social_links.facebook && (
               <a href={member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"><Facebook size={18} /></a>
             )}
             {member.social_links.spotify && (
               <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"><Spotify size={18} /></a>
             )}
          </div>
        )}
        {(Boolean((member as any).email) || Boolean((member as any).phone)) && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {Boolean((member as any).email) && (
                 <a href={`mailto:${(member as any).email}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"><Mail size={18} /></a>
              )}
              {Boolean((member as any).phone) && (
                 <a href={`tel:${(member as any).phone}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"><Phone size={18} /></a>
              )}
            </div>
          </div>
        )}
        {member.achievements && member.achievements.length > 0 && (
          <div>
            <h6 className={`text-xs font-bold mb-4 tracking-widest uppercase text-white/50`}>Key Achievements</h6>
            <div className="space-y-3">
              {member.achievements.map((a: string, i2: number) => (
                <div key={i2} className="flex items-start space-x-3 achievement-item" style={{ animationDelay: `${i2 * 0.18}s` }}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-white/30`}></div>
                  <span className="text-white/60 text-sm font-light leading-snug">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
