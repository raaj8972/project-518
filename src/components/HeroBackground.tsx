import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useData } from '../context/DataContext';

// Helper to check if WebP is supported
const supportsWebP = (() => {
  if (typeof window === 'undefined') return false;
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
})();

type CleanProps = {
  pageKey: 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors';
  className?: string;
};

export const HeroBackground: React.FC<CleanProps> = ({ pageKey, className = '' }) => {
  const { heroMedia, fetchHeroMedia } = useData();
  const media = heroMedia?.[pageKey];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  // Defer actual video element rendering so the browser can prioritize the poster/image
  const [showVideo, setShowVideo] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(pageKey === 'home'); // Home page loads immediately
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  // Track previous video URL to reset loaded state when it changes
  const prevVideoUrlRef = useRef<string | null>(null);

  // Intersection Observer for lazy loading (skip for home page)
  useEffect(() => {
    if (pageKey === 'home' || typeof window === 'undefined') return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      { rootMargin: '50px' } // Start loading 50px before entering viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageKey]);

  useEffect(() => {
    if (!media && isIntersecting) fetchHeroMedia(pageKey).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, isIntersecting]);

  // Reset isMediaLoaded when the active video URL changes so new content fades in properly
  useEffect(() => {
    if (activeVideoUrl !== prevVideoUrlRef.current) {
      prevVideoUrlRef.current = activeVideoUrl;
      setIsMediaLoaded(false);
    }
  }, [activeVideoUrl]);

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
    const tryPlay = () => {
      if (cancelled) return;
      const doPlay = (triesLeft = 3) => {
        import('../utils/safePlay').then(({ default: safePlay }) => {
          safePlay(v).then(() => {}).catch(() => {
            if (triesLeft > 0 && !cancelled) setTimeout(() => doPlay(triesLeft - 1), 300);
          });
        }).catch(() => {
          // Fallback to legacy play call if module import fails
          try { v.play(); } catch { if (!cancelled && triesLeft > 0) setTimeout(() => doPlay(triesLeft - 1), 300); }
        });
      };
      doPlay(3);
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

  // Determine the best poster to use for preloading / LCP
  const posterUrl = (() => {
    try {
      if (!media) return null;
      // If using a mobile video and there's a mobile poster, prefer that
      if (activeVideoUrl && (activeVideoUrl === (media as any)?.mobile_video_url) && ((media as any)?.mobile_poster_url)) {
        return (media as any)?.mobile_poster_url as string;
      }
      // Prefer explicit poster_url then mobile poster then image
      return (media as any)?.poster_url || (media as any)?.mobile_poster_url || media?.image_url || (media as any)?.mobile_image_url || null;
    } catch (e) { return null; }
  })();

  // Preload poster to improve LCP (per-page poster choice)
  // Only preload when the media is enabled and likely to be used soon.
  // This prevents browsers warning about unused preloads for resources
  // that we requested but never actually used (e.g., because the user
  // didn't navigate to that page or the hero is disabled).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!posterUrl) return;
  // Only preload if media will be shown (enabled) and either the video
  // is about to be injected or this is the top-level 'home' page (common LCP target).
  if (media?.enabled === false) return;
    const likelySoon = showVideo || pageKey === 'home';
    if (!likelySoon) return;
    try {
      const existing = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]')).find((l) => (l as HTMLLinkElement).href === posterUrl);
      if (existing) return;
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.href = posterUrl;
      // avoid CORS issues for externally hosted assets; set anonymous to be safe
      l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
      return () => { try { document.head.removeChild(l); } catch {} };
    } catch (e) { /* ignore */ }
  }, [posterUrl, showVideo, pageKey, media?.enabled]);

  // Defer video injection until browser is idle / after load so it doesn't block LCP
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeVideoUrl || !isIntersecting) { setShowVideo(false); return; }
    // For home page, load immediately. For others, wait a bit to prioritize text content
    if (pageKey === 'home') {
      setShowVideo(true);
    } else {
      const timer = setTimeout(() => setShowVideo(true), 100);
      return () => clearTimeout(timer);
    }
  }, [activeVideoUrl, isIntersecting, pageKey]);

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

  // Generate srcset for responsive images
  const generateSrcSet = (imageUrl: string | undefined | null, mobileUrl: string | undefined | null) => {
    if (!imageUrl && !mobileUrl) return undefined;
    const srcset: string[] = [];
    if (mobileUrl) srcset.push(`${mobileUrl} 768w`);
    if (imageUrl) srcset.push(`${imageUrl} 1920w`);
    return srcset.length > 0 ? srcset.join(', ') : undefined;
  };

  return (
    <div ref={containerRef} className={`absolute inset-0 z-0 ${className}`}>
      {/* Loading skeleton */}
      {!isMediaLoaded && showMedia && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 animate-pulse" />
      )}
      
      {showMedia && isIntersecting ? (
        <>
          {/* Video element — rendered when background_type is video/auto AND we have a URL AND deferred loading is ready */}
          {((media?.background_type === 'video' || media?.background_type === 'auto') && (activeVideoUrl || media.video_url) && showVideo) && (
            <video
              ref={videoRef}
              src={(activeVideoUrl !== null ? activeVideoUrl : media.video_url) || undefined}
              playsInline
              preload={pageKey === 'home' ? 'auto' : 'metadata'}
              muted
              autoPlay
              loop
              poster={(activeVideoUrl && activeVideoUrl === (media as any)?.mobile_video_url
                ? (media as any)?.mobile_poster_url || media.poster_url
                : media.poster_url) || undefined}
              className={`absolute inset-0 w-full h-full ${mediaObjectClasses} transition-opacity duration-300 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`}
              style={transformStyle}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setIsMediaLoaded(true);
                if (!explicit || explicit === 'auto') recomputeFit(v.videoWidth, v.videoHeight);
                if (v.paused) { try { import('../utils/safePlay').then(({ default: safePlay }) => safePlay(v)).catch(() => {}); } catch { /* ignore */ } }
              }}
            />
          )}

          {/* Poster/image fallback — shown while video is loading OR when background_type is image/auto */}
          {(() => {
            const isVideoMode = media?.background_type === 'video' || media?.background_type === 'auto';
            const hasVideoUrl = !!(activeVideoUrl || media?.video_url);
            const videoIsReady = showVideo && isMediaLoaded;
            // Show image/poster when: (a) type is image/auto with image URLs, or (b) type is video but video isn't ready yet (as fallback)
            const showImageAsMain = (media?.background_type === 'image' || media?.background_type === 'auto') && (media?.image_url || (media as any)?.mobile_image_url) && !(isVideoMode && hasVideoUrl && videoIsReady);
            const showPosterAsFallback = isVideoMode && hasVideoUrl && !videoIsReady && (posterUrl || media?.image_url || (media as any)?.mobile_image_url);
            const shouldShowImage = showImageAsMain || showPosterAsFallback;

            if (!shouldShowImage) {
              // No image to show AND no video showing — gradient fallback
              if (!(isVideoMode && hasVideoUrl)) {
                return (
                  <div className="hero-bg parallax" data-speed="0.3">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80" />
                  </div>
                );
              }
              return null;
            }

            const imgSrc = showPosterAsFallback
              ? (posterUrl || media?.image_url || (media as any)?.mobile_image_url)
              : (typeof window !== 'undefined' && (window.innerWidth < 900 || window.innerHeight > window.innerWidth))
                ? ((media as any)?.mobile_image_url || media?.image_url)
                : (media?.image_url || (media as any)?.mobile_image_url);

            // If video is ready and loaded, hide the poster/image underneath
            const hideForVideo = isVideoMode && hasVideoUrl && videoIsReady;

            return (
              <picture className={hideForVideo ? 'hidden' : undefined}>
                {supportsWebP && media?.image_url && !showPosterAsFallback && (
                  <source
                    type="image/webp"
                    srcSet={generateSrcSet(media.image_url, (media as any)?.mobile_image_url) || undefined}
                    sizes="100vw"
                  />
                )}
                <img
                  src={imgSrc || undefined}
                  srcSet={!showPosterAsFallback ? (generateSrcSet(media?.image_url, (media as any)?.mobile_image_url) || undefined) : undefined}
                  sizes={!showPosterAsFallback ? '100vw' : undefined}
                  alt="Hero background"
                  // @ts-expect-error fetchpriority is valid HTML but React types use camelCase
                  fetchpriority={pageKey === 'home' ? 'high' : 'auto'}
                  loading={pageKey === 'home' ? 'eager' : 'lazy'}
                  className={`absolute inset-0 w-full h-full ${mediaObjectClasses} ${showPosterAsFallback ? '' : `transition-opacity duration-300 ${isMediaLoaded ? 'opacity-100' : 'opacity-0'}`}`}
                  style={transformStyle}
                  onLoad={(e) => {
                    if (!showPosterAsFallback) {
                      setIsMediaLoaded(true);
                      if (explicit && explicit !== 'auto') return;
                      const el = e.currentTarget; recomputeFit(el.naturalWidth, el.naturalHeight);
                    }
                  }}
                />
              </picture>
            );
          })()}
        </>
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
