import React from 'react';
import { Sparkles, Play, Calendar, ArrowUpRight } from 'lucide-react';
import type { GuestArtist } from '../context/DataContext';
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
      className="group relative w-full h-[550px] sm:h-[600px] md:h-[700px] rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_40px_rgba(236,72,153,0.3)] hover:scale-[1.02] border border-white/10 bg-[#0b0f1a]"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onMouseEnter}
    >
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {hasCardMedia ? (
          <InlineArtistPreview
            className="w-full h-full object-cover"
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
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            loading={priority ? "eager" : "lazy"}
          />
        )}
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Floating Badges */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wider shadow-lg flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
          FEATURED
        </div>
        {(() => {
          const isUpcoming = artist.countdown_enabled && artist.performance_at && new Date(artist.performance_at) > new Date();
          const isLive = (artist as any).live_now_enabled;

          if (isUpcoming) {
            return (
              <div className="px-4 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-200 text-xs font-bold tracking-wider shadow-lg flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                UPCOMING
              </div>
            );
          }
          
          if (isLive) {
            return (
              <div className="px-4 py-1.5 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 text-xs font-bold tracking-wider shadow-lg flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                LIVE
              </div>
            );
          }
          
          return null;
        })()}
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-8">
        
        {/* Artist Name & Title */}
        <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
          <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 uppercase font-heading leading-none mb-2 drop-shadow-sm">
            {artist.name}
          </h3>
          <div className="flex items-center gap-3">
             <div className="h-0.5 w-8 bg-pink-500 rounded-full" />
             <p className="text-lg md:text-xl text-pink-200 font-light tracking-wide font-sans">
               {artist.title}
             </p>
          </div>
        </div>

        {/* Hover Reveal Details - NOW ALWAYS VISIBLE */}
        <div className="mt-6 border-t border-white/10 pt-4">
           <div className="overflow-hidden">
             
             {/* Date/Venue Info */}


             {/* Action Buttons */}
             <div className="flex items-center gap-3">
               <button 
                 className="flex-1 bg-white text-black font-bold py-2 px-5 text-sm rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group/btn"
               >
                 View Details
                 <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
               </button>
               
               {(artist.video_url || artist.youtube_url || cardMediaMode === 'video') && onPlayVideo && (
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     onPlayVideo(artist);
                   }}
                   className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-105 transition-all"
                   aria-label="Play Video"
                 >
                   <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                 </button>
               )}
             </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedArtistCard;
