import React from 'react';
import { Instagram, Youtube, Play } from 'lucide-react';
// Changed Spotify icon import since lucide-react doesn't have a dedicated one that looks right, using standard or text
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
  index: number;
}

export const ArtistCard: React.FC<BandMemberProps> = ({ member }) => {
  return (
    <div className="group relative flex flex-col bg-[#181818] hover:bg-[#282828] transition-all duration-300 rounded-xl p-4 sm:p-5 cursor-pointer shadow-lg overflow-hidden border border-white/5 h-full">
      {/* Image Container with 1:1 Aspect Ratio */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#242424] mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex-shrink-0">
        <img 
          src={member.image} 
          alt={member.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play Button Overlay (Spotify Style) */}
        <div className="absolute right-3 bottom-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
          <button className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-black shadow-xl hover:bg-green-400 hover:scale-105 transition-all">
            <Play fill="black" size={24} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow">
        <h3 className="text-white font-bold text-lg sm:text-xl truncate tracking-tight mb-1">
          {member.name}
        </h3>
        <p className="text-[#a7a7a7] text-sm font-medium uppercase tracking-wider mb-2">
          {member.role}
        </p>
        <div className="text-[#a7a7a7] text-xs sm:text-sm line-clamp-2 mt-1">
          <PreserveNewlines text={member.description} />
        </div>
      </div>

      {/* Social Links inside Card */}
      {member.social_links && Object.values(member.social_links).some(Boolean) && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
          {member.social_links.instagram && (
            <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Instagram">
              <Instagram size={18} />
            </a>
          )}
          {member.social_links.youtube && (
            <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="YouTube">
              <Youtube size={18} />
            </a>
          )}
          {member.social_links.spotify && (
            <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-xs font-bold tracking-widest border border-white/20 px-2 py-0.5 rounded-full" title="Spotify">
              SPOTIFY
            </a>
          )}
        </div>
      )}
    </div>
  );
};
