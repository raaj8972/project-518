import React, { useEffect, useState } from 'react';
import { heroMediaService, HeroMediaV2 } from '../services/heroMediaService';

interface HeroBackgroundV2Props {
  pageKey: string;
  className?: string;
  children?: React.ReactNode;
}

export const HeroBackgroundV2: React.FC<HeroBackgroundV2Props> = ({ pageKey, className = '', children }) => {
  const [media, setMedia] = useState<HeroMediaV2 | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = heroMediaService.subscribeHeroMedia(pageKey, (data) => {
      setMedia(data);
    });
    return () => unsubscribe();
  }, [pageKey]);

  if (!media || !media.enabled) {
    return <div className={`absolute inset-0 bg-[#030712] ${className}`}>{children}</div>;
  }

  const {
    background_type,
    video_url,
    mobile_video_url,
    image_url,
    mobile_image_url,
    overlay_color,
    overlay_opacity,
    desktop_zoom,
    desktop_offset_x,
    desktop_offset_y,
    mobile_zoom,
    mobile_offset_x,
    mobile_offset_y,
    poster_url,
    mobile_poster_url
  } = media;

  const zoom = isMobile ? mobile_zoom : desktop_zoom;
  const offsetX = isMobile ? mobile_offset_x : desktop_offset_x;
  const offsetY = isMobile ? mobile_offset_y : desktop_offset_y;

  const transformStyle = {
    transform: `translate3d(${offsetX * 100}%, ${offsetY * 100}%, 0) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: 'transform 0.5s ease-out',
    willChange: 'transform'
  };

  const activeVideo = isMobile && mobile_video_url ? mobile_video_url : video_url;
  const activeImage = isMobile && mobile_image_url ? mobile_image_url : image_url;
  const activePoster = isMobile && mobile_poster_url ? mobile_poster_url : poster_url;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {(background_type === 'video' || (background_type === 'auto' && activeVideo)) ? (
        <video 
          key={activeVideo} /* Force re-mount on source change */
          src={activeVideo} 
          autoPlay 
          loop 
          muted 
          playsInline
          preload="auto"
          poster={activePoster || undefined}
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
        />
      ) : (
        <img 
          src={activeImage} 
          alt={`${pageKey} Hero`} 
          className="absolute inset-0 w-full h-full object-cover" 
          style={transformStyle}
        />
      )}
      
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ backgroundColor: overlay_color, opacity: overlay_opacity }} 
      />
      {children}
    </div>
  );
};

export default HeroBackgroundV2;
