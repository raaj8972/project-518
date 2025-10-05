import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useData } from '../context/DataContext';

type CleanProps = {
  pageKey: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors';
  className?: string;
};

export const HeroBackground: React.FC<CleanProps> = ({ pageKey, className = '' }) => {
  const { heroMedia, fetchHeroMedia } = useData();
  const media = heroMedia?.[pageKey];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!media) fetchHeroMedia(pageKey).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    if (!media) return;
    // choose best video for current viewport (supports mobile-only scenarios)
    const choose = () => {
      const w = window.innerWidth;
      const h = window.innerHeight || 1;
      const portraitViewport = h > w;
      // Broaden mobile detection: narrow width OR portrait orientation
      const isMobileLike = w < 900 || portraitViewport;
      const mobileUrl = (media as any)?.mobile_video_url as string | undefined;
      const desktopUrl = media.video_url as string | undefined;
      if (isMobileLike && mobileUrl) {
        setActiveVideoUrl(mobileUrl);
      } else if (desktopUrl) {
        setActiveVideoUrl(desktopUrl);
      } else if (mobileUrl) {
        // Fallback: use mobile video even on desktop if no desktop video provided
        setActiveVideoUrl(mobileUrl);
      } else {
        setActiveVideoUrl(null);
      }
    };
    choose();
    const onResize = () => choose();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize); };
  }, [media]);

  useEffect(() => {
    if (!activeVideoUrl) return;
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    v.muted = true;
    const tryPlay = (attempt = 0) => {
      if (cancelled) return;
      v.play()?.catch(() => {
        if (attempt < 5) setTimeout(() => tryPlay(attempt + 1), 400 * (attempt + 1));
      });
    };
    tryPlay();
    const onPause = () => {
      if (cancelled) return;
      if (!v.ended && v.readyState >= 2 && !document.hidden) tryPlay();
    };
    const onEnded = () => {
      if (cancelled) return;
      v.currentTime = 0; tryPlay();
    };
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    const vis = () => { if (!document.hidden) tryPlay(); };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelled = true; v.removeEventListener('pause', onPause); v.removeEventListener('ended', onEnded); document.removeEventListener('visibilitychange', vis); };
  }, [activeVideoUrl]);

  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', pageKey);
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev);
      else document.documentElement.removeAttribute('data-theme');
    };
  }, [pageKey]);

  const overlayColor = media?.overlay_color || '#000000';
  const overlayOpacity = typeof media?.overlay_opacity === 'number' ? media.overlay_opacity : 0.5;
  const showMedia = media?.enabled !== false && (media?.image_url || (media as any)?.mobile_image_url || media?.video_url || (media as any)?.mobile_video_url);

  const explicit = (media as any)?.fit_mode as string | undefined;
  const [computedFit, setComputedFit] = useState<'cover' | 'contain'>('cover');

  const recomputeFit = useCallback((intrinsicW: number, intrinsicH: number) => {
    if (!intrinsicW || !intrinsicH) return;
    const viewportW = window.innerWidth || intrinsicW;
    const viewportH = window.innerHeight || intrinsicH;
    const mediaRatio = intrinsicW / intrinsicH;
    const viewportRatio = viewportW / viewportH;
    const ratioDelta = Math.abs(mediaRatio - viewportRatio);
    const isPortraitMedia = mediaRatio < 0.9;
    const isPortraitViewport = viewportRatio < 0.9;
    const isMobile = viewportW <= 900; // treat tablets in portrait as mobile
    // For hero VIDEO on mobile we always prefer cover to remove black bars, even if aspect ratios differ.
    if (media?.video_url && isMobile) {
      setComputedFit('cover');
      return;
    }
    // Otherwise use previous adaptive heuristic.
    if (ratioDelta > 0.8 || (isPortraitMedia && !isPortraitViewport) || (!isPortraitMedia && isPortraitViewport)) {
      setComputedFit('contain');
    } else {
      setComputedFit('cover');
    }
  }, []);

  useEffect(() => {
    if (explicit && explicit !== 'auto') return;
    let t: any;
    const onResize = () => {
      clearTimeout(t); t = setTimeout(() => {
        const v = videoRef.current; if (v && v.videoWidth && v.videoHeight) recomputeFit(v.videoWidth, v.videoHeight);
      }, 120);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [explicit, recomputeFit]);

  const finalFit: 'cover' | 'contain' = (() => {
    if (explicit === 'cover') return 'cover';
    if (explicit === 'contain') return 'contain';
    if (explicit === 'auto') return computedFit;
    return computedFit;
  })();

  const mediaObjectClasses = `${finalFit === 'contain' ? 'object-contain' : 'object-cover'} object-center bg-black transition-[object-fit] duration-300`;
  // Dynamic adaptive zoom to ensure full bleed for 16:9 landscape video assets on tall phones AND tablets.
  // Applies ONLY to video (not images) and only when viewport would otherwise show letterboxing vertically.
  const [autoVideoScale, setAutoVideoScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const usingVideo = (media?.background_type === 'video' || media?.background_type === 'auto') && (activeVideoUrl || media?.video_url);
      if (!usingVideo) { setAutoVideoScale(1); return; }
      const w = window.innerWidth; const h = window.innerHeight || 1;
      const portraitViewport = h > w;
      const isMobileLike = w < 900 || portraitViewport;
      const isTablet = !isMobileLike && w >= 900 && w < 1200; // tablet range heuristic
      if (!(isMobileLike || isTablet)) { setAutoVideoScale(1); return; }
      // For portrait mobile video (9:16) we usually already fill, so only apply when asset assumed landscape.
      // We approximate by assuming primary desktop ratio 16:9.
      const viewportRatio = w / h;
      const targetRatio = 16 / 9;
      if (viewportRatio < targetRatio) {
        // Needed scale so that height remains covered; slight overscan.
        // On tablets keep overscan milder.
        const overscan = isTablet ? 1.01 : 1.02;
        const neededScale = (targetRatio / viewportRatio) * overscan;
        setAutoVideoScale(Math.min(2.0, Math.max(1, neededScale)));
      } else {
        setAutoVideoScale(1);
      }
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('orientationchange', calc); };
  }, [activeVideoUrl, media]);

  // Compute persisted zoom/offset from media
  const deviceIsMobileLike = typeof window !== 'undefined' ? (window.innerWidth < 900 || (window.innerHeight > window.innerWidth)) : false;
  const persistedZoom = deviceIsMobileLike ? (media as any)?.mobile_zoom ?? 1 : (media as any)?.desktop_zoom ?? 1;
  const persistedOffsetX = deviceIsMobileLike ? (media as any)?.mobile_offset_x ?? 0 : (media as any)?.desktop_offset_x ?? 0;
  const persistedOffsetY = deviceIsMobileLike ? (media as any)?.mobile_offset_y ?? 0 : (media as any)?.desktop_offset_y ?? 0;
  const effectiveScale = (autoVideoScale !== 1 ? autoVideoScale : 1) * persistedZoom;
  const translateXPercent = persistedOffsetX * 100; // fraction -> percent
  const translateYPercent = persistedOffsetY * 100;
  const needsTransform = effectiveScale !== 1 || persistedOffsetX !== 0 || persistedOffsetY !== 0;
  const transformStyle = needsTransform ? { transform: `translate(${translateXPercent}%, ${translateYPercent}%) scale(${effectiveScale})`, transformOrigin: 'center center' } : undefined;

  return (
    <div className={`absolute inset-0 z-0 ${className}`}>
      {showMedia ? (
        ((media?.background_type === 'video' || media?.background_type === 'auto') && (activeVideoUrl || media.video_url)) ? (
          <video
            ref={videoRef}
            src={(activeVideoUrl !== null ? activeVideoUrl : media.video_url) || undefined}
            playsInline
            preload="metadata"
            muted
            autoPlay
            loop
            poster={(activeVideoUrl && activeVideoUrl === (media as any)?.mobile_video_url
              ? (media as any)?.mobile_poster_url || media.poster_url
              : media.poster_url) || undefined}
            className={`w-full h-full ${mediaObjectClasses}`}
            style={transformStyle}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (!explicit || explicit === 'auto') recomputeFit(v.videoWidth, v.videoHeight);
              if (v.paused) { try { v.play(); } catch { /* ignore */ } }
            }}
          />
        ) : ((media?.background_type === 'image' || media?.background_type === 'auto') && (media?.image_url || (media as any)?.mobile_image_url)) ? (
          <img
            src={(typeof window !== 'undefined' && (window.innerWidth < 900 || window.innerHeight > window.innerWidth))
              ? ((media as any)?.mobile_image_url || media.image_url)
              : (media.image_url || (media as any)?.mobile_image_url)}
            alt="Hero background"
            className={`w-full h-full ${mediaObjectClasses}`}
            style={transformStyle}
            onLoad={(e) => {
              if (explicit && explicit !== 'auto') return;
              const el = e.currentTarget; recomputeFit(el.naturalWidth, el.naturalHeight);
            }}
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
      <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} />
      <div className="absolute inset-0 cyberpunk-grid opacity-20" />
    </div>
  );
};

export default HeroBackground;
