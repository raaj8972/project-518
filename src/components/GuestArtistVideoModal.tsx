import React, { useEffect, useRef } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  artist: {
    name: string;
    image?: string | null;
    video_url?: string | null;
    youtube_url?: string | null;
  } | null;
};

// Extract YouTube video id from various URL formats
const getYouTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes('youtube.com')) {
      // Handle watch?v=, embed/, shorts/
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) return parts[1];
      if (parts[0] === 'shorts' && parts[1]) return parts[1];
    }
  } catch {
    // ignore
  }
  return null;
};

const GuestArtistVideoModal: React.FC<Props> = ({ isOpen, onClose, artist }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Lock body scroll and handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', keyHandler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', keyHandler);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  // Try to autoplay when opened (user gesture likely present from click)
  useEffect(() => {
    if (isOpen && videoRef.current) {
      import('../utils/safePlay').then(({ default: safePlay }) => safePlay(videoRef.current)).catch(() => { try { videoRef.current?.play(); } catch {} });
    }
  }, [isOpen]);

  if (!isOpen || !artist) return null;

  const youTubeId = artist.youtube_url ? getYouTubeId(artist.youtube_url) : null;
  const hasUpload = !!artist.video_url;
  const hasYouTube = !!youTubeId;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full h-full md:h-auto md:w-5/6 lg:w-3/4 max-w-5xl mx-auto px-0 md:px-6">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1"
        >
          ✕
        </button>

        <div className="relative w-full pt-[56.25%] md:pt-[56.25%] rounded-lg overflow-hidden shadow-2xl">
          {/* Content layer positioned absolutely to fill aspect box */}
          <div className="absolute inset-0 bg-black">
            {hasUpload ? (
              <video
                ref={videoRef}
                src={artist.video_url || undefined}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : hasYouTube ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&rel=0`}
                title={artist.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-white/80">
                <div className="text-center px-6">
                  <div className="text-lg font-semibold mb-2">No video available</div>
                  <div className="text-sm text-white/70">This artist doesn't have a video attached yet.</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 text-center text-white/90 text-sm md:text-base">{artist.name}</div>
      </div>
    </div>
  );
};

export default GuestArtistVideoModal;
