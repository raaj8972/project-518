import React from 'react';
import { Crown, Instagram, Youtube, Facebook, AlignJustify as Spotify, Mail, Phone } from 'lucide-react';
import PreserveNewlines from '../PreserveNewlines';

interface CommitteeHeadCardProps {
  head: any;
  committeeName: string;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
}

export const CommitteeHeadCard: React.FC<CommitteeHeadCardProps> = ({ head, committeeName, isLeadWebDevRole }) => {
  const lead = isLeadWebDevRole(head.role, committeeName);
  const isTechLeadRaaj = head.name.toLowerCase().includes('raaj') && !lead;

  return (
    <div
      className={`group overflow-hidden bg-white/[0.02] border backdrop-blur-2xl rounded-3xl shadow-2xl transition-all duration-500 hover:bg-white/[0.04] ${isTechLeadRaaj ? 'border-green-500/20' : 'border-white/5'} hologram-card hologram-flicker hologram-reveal`}
    >
      <div className="hologram-scanline"></div>
      <div className="grid md:grid-cols-2 gap-0 relative z-10">
        {/* Image Section */}
        <div className="relative h-72 md:h-auto overflow-hidden">
          <img loading="lazy" decoding="async" src={head.image} alt={head.name} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] md:from-transparent to-transparent opacity-90"></div>
          <div className="absolute top-4 right-4">
            <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
              <Crown className={`w-3.5 h-3.5 ${lead ? 'text-red-400' : isTechLeadRaaj ? 'text-orange-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md inline-block ${lead ? 'bg-red-500/10 text-red-300 border-red-500/20' : isTechLeadRaaj ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              COMMITTEE HEAD
            </div>
          </div>
        </div>
        {/* Content Section */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <h5 className={`text-xl md:text-2xl font-bold mb-2 ${lead ? 'text-cyan-50' : isTechLeadRaaj ? 'text-white' : 'text-white'}`}>{isTechLeadRaaj ? 'RAAJ' : head.name}</h5>
          <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${lead ? 'text-red-400/80' : isTechLeadRaaj ? 'text-orange-400/80' : 'text-red-400/80'}`}>{lead ? 'Founder of Website' : head.role}</p>
          <PreserveNewlines text={head.description} className="text-white/60 mb-6 leading-relaxed text-sm font-light hologram-text-reveal" />
          {head.specialty && (
            <div className="mb-6">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-white/70`}>
                {head.specialty}
              </span>
            </div>
          )}
          {head.social_links && Object.values(head.social_links).some(link => link) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
               {head.social_links.instagram && (
                 <a href={head.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"><Instagram size={18} /></a>
               )}
               {head.social_links.youtube && (
                 <a href={head.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"><Youtube size={18} /></a>
               )}
               {head.social_links.facebook && (
                 <a href={head.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"><Facebook size={18} /></a>
               )}
               {head.social_links.spotify && (
                 <a href={head.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"><Spotify size={18} /></a>
               )}
            </div>
          )}
          {(Boolean((head as any).phone) || Boolean((head as any).email)) && (
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                {Boolean((head as any).email) && (
                   <a href={`mailto:${(head as any).email}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"><Mail size={18} /></a>
                )}
                {Boolean((head as any).phone) && (
                   <a href={`tel:${(head as any).phone}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"><Phone size={18} /></a>
                )}
              </div>
            </div>
          )}
          {head.achievements && head.achievements.length > 0 && (
            <div>
              <h6 className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">Key Achievements</h6>
              <div className="space-y-3">
                {head.achievements.map((achievement: string, achievementIndex: number) => (
                  <div key={achievementIndex} className="flex items-start space-x-3 achievement-item" style={{ animationDelay: `${achievementIndex * 0.2}s` }}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-white/30`}></div>
                    <span className="text-white/60 text-sm font-light leading-snug">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="hologram-projection-light"></div>
    </div>
  );
};
