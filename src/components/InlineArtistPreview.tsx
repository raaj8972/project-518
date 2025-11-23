import React, { useEffect, useRef } from 'react';

type Props = {
  videoUrl?: string | null;
  poster?: string | null;
  imgSrc?: string | null;
  youtubeUrl?: string | null;
  className?: string;
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

const InlineArtistPreview: React.FC<Props> = ({ videoUrl, poster, imgSrc, youtubeUrl, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const youTubeId = getYouTubeId(youtubeUrl || undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let obs: IntersectionObserver | null = null;
    const v = vidRef.current;
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!v) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
          // Attempt programmatic play when visible
          v.play().catch(() => {});
        } else {
          try { v.pause(); v.currentTime = 0; } catch {};
        }
      });
    };
    try {
      obs = new IntersectionObserver(onIntersect, { threshold: [0, 0.25, 0.5] });
      obs.observe(el);
    } catch (e) { /* ignore */ }
    return () => { try { if (obs && el) obs.unobserve(el); } catch {} };
  }, []);

  if (videoUrl) {
    return (
      <div ref={ref} className={`w-full h-full ${className}`}>
        <video ref={vidRef} src={videoUrl} poster={poster || undefined} muted playsInline loop preload="metadata" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (youTubeId) {
    // For YouTube show thumbnail only (embed in modal)
    return (
      <div ref={ref} className={`w-full h-full ${className}`}>
        <img src={`https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`} alt="preview" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div ref={ref} className={`w-full h-full ${className}`}>
      <img src={imgSrc || poster || ''} alt="preview" className="w-full h-full object-cover" />
    </div>
  );
};

export default InlineArtistPreview;
