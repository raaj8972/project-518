import React, { useEffect, useRef } from 'react';
import WatchLiveButton from './WatchLiveButton';
import { LIVE_LEAD_MINUTES } from '../config/liveStream';
import CountdownTimer from './CountdownTimer';
import Sparkle3D from './Sparkle3D';
import { Calendar, MapPin } from 'lucide-react';
import Instagram3DButtonLink from './Instagram3DButtonLink';
import YouTube3DButtonLink from './YouTube3DButtonLink';
import Facebook3DButtonLink from './Facebook3DButtonLink';

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
};

// Extract YouTube video id from various URL formats
const getYouTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) return parts[1];
      if (parts[0] === 'shorts' && parts[1]) return parts[1];
    }
  } catch {}
  return null;
};

const GuestArtistDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  artist: GuestArtistDetail | null;
}> = ({ isOpen, onClose, artist }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !artist) return null;
  const youTubeId = artist.youtube_url ? getYouTubeId(artist.youtube_url) : null;

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 min-h-full flex items-start justify-center p-4 md:p-8">
        <div className="relative w-full max-w-5xl bg-[#0b0f1a] text-white rounded-xl shadow-2xl border border-white/10">
          {/* Header with image and small play badge */}
          <div className="relative w-full h-64 md:h-80 overflow-hidden">
          {artist.image ? (
            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-800" />
          )}
          {(artist.video_url || artist.youtube_url) && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white border border-white/30 shadow-lg animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
          )}
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
          <div className="md:flex md:items-start md:space-x-8">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-extrabold mb-2">{artist.name}</h3>
              {artist.title && <div className="text-pink-400 font-semibold mb-3">{artist.title}</div>}
              {artist.specialty && (
                <div className="mb-4">
                  <span className="inline-block bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30">
                    {artist.specialty}
                  </span>
                </div>
              )}
              {artist.description && (
                <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-line">{artist.description}</p>
              )}

              {artist.countdown_enabled && artist.performance_at && (
                <div className="relative mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="absolute -top-2 -right-2 w-12 h-12">
                    <Sparkle3D intensity={8} />
                  </div>
                  <div className="flex flex-col items-start gap-3">
                    <div className="text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-pink-300" />
                        <span>{new Date(artist.performance_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</span>
                      </div>
                      {artist.venue && (
                        <div className="flex items-center gap-2 mt-1 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{artist.venue}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 self-start">
                      <CountdownTimer
                        className="max-w-full"
                        target={artist.performance_at}
                        endedText="LIVE NOW"
                        showEnded={(artist as any).live_now_enabled !== false}
                      />
                    </div>
                    {/* Unified gated WatchLiveButton replacing legacy anchor (60m lead) */}
                    {artist.watch_live_url && artist.performance_at && !isNaN(new Date(artist.performance_at).getTime()) && (
                      <div className="mt-4">
                        <WatchLiveButton
                          url={artist.watch_live_url}
                          startTime={artist.performance_at}
                          leadMinutes={LIVE_LEAD_MINUTES}
                          forceLive={(artist as any).live_now_enabled || (artist as any).is_featured}
                          size="xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {artist.achievements && artist.achievements.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-cyan-300 mb-2">Achievements</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                    {artist.achievements.map((a, i) => (<li key={i}>{a}</li>))}
                  </ul>
                </div>
              )}

              {/* Social media buttons */}
              {(artist.social_links && (artist.social_links.instagram || artist.social_links.youtube)) || artist.youtube_url ? (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-pink-300 mb-2">Social & Live</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    {artist.social_links?.instagram && (
                      <Instagram3DButtonLink href={artist.social_links!.instagram} iconSize={28} buttonSize={44} ariaLabel={`Instagram of ${artist.name}`} />
                    )}
                    {artist.social_links?.facebook && (
                      <Facebook3DButtonLink href={artist.social_links!.facebook} iconSize={28} buttonSize={44} ariaLabel={`Facebook of ${artist.name}`} />
                    )}
                    {(artist.social_links?.youtube || artist.youtube_url) && (
                      <YouTube3DButtonLink href={(artist.social_links?.youtube || artist.youtube_url)!} iconSize={28} buttonSize={44} ariaLabel={`YouTube of ${artist.name}`} />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Optional video section */}
          {(artist.video_url || youTubeId) && (
            <div className="mt-6">
              <h4 className="text-sm font-bold text-pink-300 mb-2">Featured Video</h4>
              <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden border border-white/10">
                <div className="absolute inset-0">
                  {artist.video_url ? (
                    <video ref={videoRef} src={artist.video_url || undefined} controls autoPlay playsInline className="w-full h-full object-contain bg-black" />
                  ) : (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&rel=0`}
                      title={artist.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Optional channel + playlist section */}
          {artist.youtube_url && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-red-300">YouTube</h4>
                <a
                  href={artist.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-300 hover:text-red-200 text-sm underline"
                >
                  Visit channel
                </a>
              </div>

              {/* Playlist embed (if URL points to a playlist, try to embed) */}
              {(() => {
                try {
                  const u = new URL(artist.youtube_url!);
                  const listId = u.searchParams.get('list');
                  if (listId) {
                    return (
                      <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-white/10">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/videoseries?list=${listId}`}
                          title="YouTube playlist"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                } catch {}
                return null;
              })()}
            </div>
          )}
          
          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white">✕</button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default GuestArtistDetailModal;
