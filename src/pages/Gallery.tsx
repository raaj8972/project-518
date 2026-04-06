import React, { useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { NetflixGallery } from '../components/gallery/NetflixGallery';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

export const Gallery: React.FC = () => {
  const { galleryImages, loading, sanitizeUrl, loadGalleryImages } = useData() as any;


  useEffect(() => {
    loadGalleryImages?.();
  }, [loadGalleryImages]);

  // Memoized filtered images
  const filteredImages = useMemo(() => {
    return galleryImages.filter((img: any) => img.src && img.src.trim() !== '');
  }, [galleryImages]);

  // Format images for NetflixGallery
  const netflixImages = useMemo(() => filteredImages.map((img: any) => {
    const s = sanitizeUrl ? sanitizeUrl(img.src) : img.src;
    
    const getOptimized = (url: string) => {
      if (!url) return '';
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return url;
      }
      let absoluteUrl = url;
      if (url.startsWith('/')) {
         absoluteUrl = `${window.location.protocol}//${window.location.host}${url}`;
      }
      return absoluteUrl;
    };

    const today = new Date().toISOString().split('T')[0];
    const viewCount = img.last_view_date && img.last_view_date.startsWith(today) ? (img.daily_views || 0) : 0;

    return { 
      id: img.id,
      src: s, 
      thumbnail: getOptimized(s),
      optimizedSrc: getOptimized(s),
      alt: (img.title as string) || '',
      category: img.category,
      subcategory: img.subcategory,
      year: img.year,
      views: viewCount
    };
  }), [filteredImages, sanitizeUrl]);

  return (
    <div className="nebula-theme min-h-screen relative overflow-hidden">
      <SEO 
        title="Gallery" 
        description="Relive the best moments from past RICORRENZA festivals." 
        canonical="https://ricorrenza.fun/gallery" 
      />


      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a2a]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <span className="font-serif font-bold tracking-[0.2em] uppercase text-indigo-400">Loading Memories...</span>
          </div>
        </div>
      )}

      {/* Netflix Gallery Content */}
      {!loading && (
        <div className="w-full h-full">
             <NetflixGallery 
               images={netflixImages} 
               onPhotoView={async (id) => {
                  try {
                    await supabase.rpc('increment_daily_image_view', { p_image_id: id });
                  } catch (e) {
                    console.log('Analytics tracking blocked', e);
                  }
               }}
             />
        </div>
      )}

      <style>{`
        .nebula-theme {
          background: radial-gradient(circle at center, #0a0a2a 0%, #030303 100%);
          color: #ffffff;
          font-family: 'Crimson Text', serif;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
};