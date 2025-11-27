import React, { useEffect, useRef } from 'react';

type Props = {
  videoUrl?: string | null;
  poster?: string | null;
  imgSrc?: string | null;
  youtubeUrl?: string | null;
  className?: string;
  fallbackPoster?: boolean;
  intrinsic?: boolean;
};

const getYouTubeId = (url?: string | null) => {
  if (!url) return null;
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
  } catch (e) {}
  return null;
};

const InlineArtistPreview: React.FC<Props> = ({
  videoUrl,
  poster,
  imgSrc,
  youtubeUrl,
  className = '',
  fallbackPoster = true,
  intrinsic = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youTubeId = getYouTubeId(youtubeUrl || undefined);

  useEffect(() => {
    if (!videoUrl) return;
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    let obs: IntersectionObserver | null = null;
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!video) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
          import('../utils/safePlay').then(({ default: safePlay }) => safePlay(video)).catch(() => { try { video.play(); } catch {} });
        } else {
          try {
            video.pause();
            video.currentTime = 0;
          } catch {}
        }
      });
    };
    try {
      obs = new IntersectionObserver(onIntersect, { threshold: [0, 0.25, 0.5] });
      obs.observe(el);
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        if (obs && el) obs.unobserve(el);
      } catch {}
    };
  }, [videoUrl]);

  const resolvedImage = imgSrc || (fallbackPoster ? poster : null);

  const rootBaseClass = intrinsic ? 'w-full' : 'w-full h-full';
  const mediaClass = intrinsic ? 'w-full h-auto object-contain' : 'w-full h-full object-cover';

  return (
    <div ref={containerRef} className={`${rootBaseClass} ${className}`}>
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster || undefined}
          muted
          playsInline
          loop
          preload="metadata"
          className={mediaClass}
        />
      ) : youTubeId ? (
        <img
          src={`https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`}
          alt="preview"
          className={mediaClass}
        />
      ) : resolvedImage ? (
        <img src={resolvedImage} alt="preview" className={mediaClass} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-black" />
      )}
    </div>
  );
};

export default InlineArtistPreview;
