import React, { useRef, useEffect, useState } from 'react';

interface OptimizedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  priority?: boolean; // If true, preloads video
  lazy?: boolean; // If true, only loads when in viewport
}

/**
 * OptimizedVideo - Automatically optimizes all videos with:
 * - Lazy loading (intersection observer)
 * - Automatic playback management
 * - Preload optimization
 * - Poster image optimization
 */
export const OptimizedVideo: React.FC<OptimizedVideoProps> = ({
  src,
  poster,
  priority = false,
  lazy = true,
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  ...props
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before entering viewport
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority]);

  // Auto-play management
  useEffect(() => {
    if (!shouldLoad || !autoPlay) return;

    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        // Autoplay prevented, user interaction required
        console.log('Video autoplay prevented');
      }
    };

    // Play when loaded
    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('loadeddata', playVideo, { once: true });
    }
  }, [shouldLoad, autoPlay]);

  return (
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      poster={poster}
      className={className}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload={priority ? 'auto' : lazy ? 'none' : 'metadata'}
      {...props}
    />
  );
};

export default OptimizedVideo;
