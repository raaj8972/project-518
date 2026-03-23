import React, { useEffect } from 'react';
import WatchLiveButton from './WatchLiveButton';
import CountdownTimer from './CountdownTimer';
import Sparkle3D from './Sparkle3D';
import { Calendar, MapPin, Music2 } from 'lucide-react';
import Instagram3DButtonLink from './Instagram3DButtonLink';
import YouTube3DButtonLink from './YouTube3DButtonLink';
import Facebook3DButtonLink from './Facebook3DButtonLink';
import PreserveNewlines from './PreserveNewlines';

type SocialLinks = Record<string, string> | null | undefined;

export type GuestArtistDetail = {
  id?: number;
  name: string;
  title?: string | null;
  image?: string | null;
  specialty?: string | null;
  description?: string | null;
  achievements?: string[];
  social_links?: SocialLinks;
  video_url?: string | null;
  youtube_url?: string | null;
  performance_at?: string | null;
  venue?: string | null;
  countdown_enabled?: boolean;
  watch_live_url?: string | null; // new live stream link
  detail_music_url?: string | null;
};

const GuestArtistDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  artist: GuestArtistDetail | null;
}> = ({ isOpen, onClose, artist }) => {

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    return () => { 
      document.removeEventListener('keydown', onKey); 
      document.body.style.overflow = prevOverflow; 
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  if (!isOpen || !artist) return null;

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 min-h-full flex items-start justify-center p-4 md:p-8">
        <div className="relative w-full max-w-5xl bg-[#0b0f1a] text-white rounded-xl shadow-2xl border border-white/10">
          {/* Full-card background image with transparency */}
          {artist.image && (
            <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden rounded-xl">
               <img 
                 src={artist.image} 
                 alt="" 
                 className="w-full h-full object-cover opacity-40 blur-sm scale-105" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/60 to-black/30" />
            </div>
          )}

          {/* Spacer to push content down slightly if header was removed, or just use padding */}
          {/* Header removed as requested, using just padding in Body */}\n

          {/* Body Content with Glassmorphism Design */}
          <div className="relative z-10 p-6 md:p-10 flex flex-col h-full bg-gradient-to-b from-transparent via-black/20 to-black/80">
            
            {/* Artist Header Section */}
            <div className="mb-6 md:mb-8 pt-6 md:pt-0">
              <div className="flex flex-col gap-2 relative">
                <h3 className="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight drop-shadow-sm uppercase font-heading leading-tight">
                  {artist.name}
                </h3>
                {artist.title && (
                  <div className="text-lg md:text-2xl text-yellow-400/90 font-light tracking-wide font-sans border-l-4 border-yellow-500 pl-3">
                    {artist.title}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 md:gap-3 mt-4">
                {artist.specialty && (
                  <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-xs md:text-sm shadow-lg">
                    {artist.specialty}
                  </span>
                )}
                {artist.detail_music_url && (
                  <span className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/30 text-purple-200 font-medium text-xs md:text-sm shadow-lg flex items-center gap-2 animate-pulse-slow">
                    <Music2 className="w-3.5 h-3.5" />
                    Now Playing
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-10">
              {/* Left Column: Description & Achievements */}
              <div className="lg:col-span-7 space-y-6 md:space-y-8">
                {artist.description && (
                  <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/5 shadow-inner">
                    <PreserveNewlines text={artist.description} className="text-base md:text-lg text-gray-200 leading-relaxed font-light" />
                  </div>
                )}

                {artist.achievements && artist.achievements.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-cyan-400 mb-3 md:mb-4 flex items-center gap-2">
                      <span className="w-8 h-1 bg-cyan-500 rounded-full"></span>
                      Highlights
                    </h4>
                    <div className="grid gap-2 md:gap-3">
                      {artist.achievements.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 group">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-150 transition-transform shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          <span className="text-sm md:text-base text-gray-300 group-hover:text-white transition-colors">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Schedule & Socials */}
              <div className="lg:col-span-5 space-y-6">
                 {/* Live/Schedule Card */}
                 {(artist.performance_at || artist.countdown_enabled) && (
                   <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl group hover:border-white/30 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-50"><Sparkle3D intensity={5} /></div>
                     <div className="p-5 md:p-6">
                       <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Live Performance</h4>
                       
                       {artist.performance_at && (
                         <div className="space-y-4">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shrink-0">
                               <Calendar className="w-5 h-5 md:w-6 md:h-6 text-pink-400" />
                             </div>
                             <div>
                               <div className="text-white font-bold text-base md:text-lg">
                                 {new Date(artist.performance_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                               </div>
                               <div className="text-pink-300 font-mono text-sm md:text-base">
                                 {new Date(artist.performance_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </div>
                             </div>
                           </div>

                           {artist.venue && (
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                                 <MapPin className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                               </div>
                               <div className="text-gray-200 text-sm md:text-base">{artist.venue}</div>
                             </div>
                           )}
                           
                           {artist.countdown_enabled && (
                             <div className="mt-6 pt-4 border-t border-white/10">
                               <CountdownTimer target={artist.performance_at || ''} className="scale-90 origin-left" />
                             </div>
                           )}

                           {artist.watch_live_url && (
                             <div className="mt-4">
                              <WatchLiveButton 
                                url={artist.watch_live_url} 
                                startTime={artist.performance_at}
                                size="sm"
                              />
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Social Links Card */}
                 <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-5 md:p-6 shadow-xl">
                   <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Connect</h4>
                   <div className="flex flex-wrap gap-3 md:gap-4">
                     {artist.social_links?.instagram && (
                       <Instagram3DButtonLink href={artist.social_links.instagram} iconSize={20} buttonSize={40} />
                     )}
                     {artist.social_links?.facebook && (
                        <Facebook3DButtonLink href={artist.social_links.facebook} iconSize={20} buttonSize={40} />
                     )}
                     {(artist.social_links?.youtube || artist.youtube_url) && (
                       <YouTube3DButtonLink href={(artist.social_links?.youtube || artist.youtube_url)!} iconSize={20} buttonSize={40} />
                     )}
                   </div>
                    
                   {/* Channel Link fallback if only main URL exists */}
                   {artist.youtube_url && !artist.social_links?.youtube && (
                      <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer" className="mt-4 block text-xs text-red-300 hover:text-white transition-colors text-right">
                        Visit YouTube Channel →
                      </a>
                   )}
                 </div>
              </div>
            </div>
            
            {/* Close Button redesign - repositioned on mobile to not overlap header */}
            <button 
              onClick={onClose} 
              className="absolute top-2 right-2 md:top-6 md:right-6 lg:top-8 lg:right-8 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all transform hover:rotate-90 shadow-lg z-50"
            >
              <span className="text-lg md:text-xl leading-none">&times;</span>
            </button>
          </div>
      </div>
    </div>
  </div>
  );
};

export default GuestArtistDetailModal;
