import React, { useEffect } from 'react';
import { useData } from '../context/DataContext';

type Props = {
  pageKey: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors';
  className?: string;
};

export const HeroBackground: React.FC<Props> = ({ pageKey, className = '' }) => {
  const { heroMedia, fetchHeroMedia } = useData();
  const media = heroMedia?.[pageKey];

  useEffect(() => {
    // lazy fetch if missing
    if (!media) fetchHeroMedia(pageKey).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const overlayColor = media?.overlay_color || '#000000';
  const overlayOpacity = typeof media?.overlay_opacity === 'number' ? media.overlay_opacity : 0.5;
  const showMedia = media?.enabled !== false && (media?.image_url || media?.video_url);

  return (
    <div className={`absolute inset-0 z-0 ${className}`}>
      {showMedia ? (
        media?.background_type === 'video' && media.video_url ? (
          <video
            src={media.video_url}
            autoPlay
            muted
            playsInline
            loop
            preload="metadata"
            poster={media.poster_url || undefined}
            className="w-full h-full object-cover"
          />
        ) : media?.image_url ? (
          <img
            src={media.image_url}
            alt="Hero background"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="hero-bg parallax" data-speed="0.3">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80" />
          </div>
        )
      ) : (
        <div className="hero-bg parallax" data-speed="0.3">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80" />
        </div>
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
      />

      {/* Cyberpunk Grid Overlay */}
      <div className="absolute inset-0 cyberpunk-grid opacity-20" />
    </div>
  );
};

export default HeroBackground;
