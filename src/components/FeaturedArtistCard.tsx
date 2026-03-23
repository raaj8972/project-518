import React from 'react';
import { Sparkles, Play, Calendar, ArrowUpRight } from 'lucide-react';
import type { GuestArtist } from '../types/data';
import InlineArtistPreview from './InlineArtistPreview';


interface FeaturedArtistCardProps {
  artist: GuestArtist;
  onClick: () => void;
  onPlayVideo?: (artist: GuestArtist) => void;
  onMouseEnter?: () => void;
  priority?: boolean;
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv|ogg|avi)$/i;
const looksLikeVideoAsset = (url?: string | null) => {
  if (!url) return false;
  try {
    const trimmed = url.split('?')[0].toLowerCase();
    if (VIDEO_EXTENSIONS.test(trimmed)) return true;
    if (trimmed.includes('guest-artist-videos')) return true;
  } catch {}
  return false;
};

const FeaturedArtistCard: React.FC<FeaturedArtistCardProps> = ({ 
  artist, 
  onClick, 
  onPlayVideo, 
  onMouseEnter,
  priority = false
}) => {
  // Determine media mode
  const rawCardMediaUrl = (artist as any).card_media_url as string | null;
  const cardMediaUrl = rawCardMediaUrl && rawCardMediaUrl.trim() ? rawCardMediaUrl : null;
  const cardMediaExplicitVideo = !!(cardMediaUrl && (artist as any).card_media_is_video);
  const cardMediaLooksVideo = cardMediaUrl ? looksLikeVideoAsset(cardMediaUrl) : false;
  const cardMediaMode: 'video' | 'image' | null = cardMediaUrl
    ? (cardMediaExplicitVideo || cardMediaLooksVideo ? 'video' : 'image')
    : null;
    
  // Use card media if available, otherwise fallback to main image for logic
  const hasCardMedia = !!cardMediaMode;

  return (
    <div
      id={`artist-${artist.id}`}
      className="group relative w-full h-[550px] sm:h-[600px] md:h-[700px] rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.4),0_0_50px_rgba(220,38,38,0.2)] hover:scale-[1.01] border border-white/10 bg-[#030712] tilt-3d"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onMouseEnter}
    >
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {hasCardMedia ? (
          <InlineArtistPreview
            className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
            videoUrl={cardMediaMode === 'video' ? cardMediaUrl : undefined}
            imgSrc={cardMediaMode === 'image' ? cardMediaUrl : undefined}
            poster={artist.image}
            youtubeUrl={undefined}
            fallbackPoster={false}
            intrinsic={false} 
            priority={priority}
          />
        ) : (
          <img
            src={artist.image}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
          />
        )}
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      {/* Floating Badges */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2.5">
        <div className="px-5 py-2 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 text-white text-[9px] font-black tracking-[0.2em] shadow-2xl flex items-center gap-2.5">
          <Sparkles className="w-3 h-3 text-red-400" />
          FEATURED ARTIST
        </div>
        {(() => {
          const isUpcoming = artist.countdown_enabled && artist.performance_at && new Date(artist.performance_at) > new Date();
          const isLive = (artist as any).live_now_enabled;

          if (isUpcoming) {
            return (
              <div className="px-5 py-2 rounded-2xl bg-red-500/10 backdrop-blur-2xl border border-red-500/20 text-red-300 text-[9px] font-black tracking-[0.2em] shadow-2xl flex items-center gap-2.5">
                <Calendar className="w-3 h-3" />
                UPCOMING PERFORMANCE
              </div>
            );
          }
          
          if (isLive) {
            return (
              <div className="px-5 py-2 rounded-2xl bg-red-500/10 backdrop-blur-2xl border border-red-500/20 text-red-300 text-[9px] font-black tracking-[0.2em] shadow-2xl flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW
              </div>
            );
          }
          
          return null;
        })()}
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-8 md:p-10">
        
        {/* Artist Name & Title */}
        <div className="transform transition-transform duration-700 group-hover:-translate-y-3">
          <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-3 font-serif">
            {artist.name}
          </h3>
          <div className="flex items-center gap-4">
             <div className="h-px w-10 bg-indigo-500/50 rounded-full" />
             <p className="text-xl md:text-2xl text-white/60 font-light tracking-wide italic">
               {artist.title}
             </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 pt-8 border-t border-white/5 flex items-center gap-4">
           <button 
             className="flex-1 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/10 text-white font-black py-4 px-8 text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 group/btn"
           >
             View Details
             <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
           </button>
           
           {(artist.video_url || artist.youtube_url || cardMediaMode === 'video') && onPlayVideo && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onPlayVideo(artist);
               }}
               className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-[0_10px_20px_rgba(220,38,38,0.3)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
               aria-label="Play Video"
             >
               <Play className="w-6 h-6 ml-1" fill="currentColor" />
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedArtistCard;
