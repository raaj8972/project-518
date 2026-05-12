import React, { useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { NetflixGallery } from '../components/gallery/NetflixGallery';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

const ProfileSelection = ({ onSelect }: { onSelect: (category: string | null) => void }) => {
  const [clickedProfile, setClickedProfile] = React.useState<string | null>(null);

  const profiles = [
    {
      name: 'Cultural',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop', // Event/concert vibe
    },
    {
      name: 'Sports',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=400&auto=format&fit=crop', // Athletic track vibe
    },
    {
      name: 'Academic',
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=400&auto=format&fit=crop', // Books/Library vibe
    }
  ];

  const handleSelect = (name: string) => {
    if (clickedProfile) return;
    setClickedProfile(name);
    setTimeout(() => {
      onSelect(name);
    }, 700); // Wait for transition
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] px-4 transition-all duration-700 ease-in-out ${clickedProfile ? 'opacity-0 scale-105' : 'opacity-100 scale-100 animate-slide-up-fade'}`}>
      <h1 className={`text-3xl md:text-5xl font-bold mb-10 text-white font-sans tracking-tight transition-opacity duration-300 ${clickedProfile ? 'opacity-0' : 'opacity-100'}`}>Which memories will you relive?</h1>
      <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-4xl">
        {profiles.map((p) => {
          const isClicked = clickedProfile === p.name;
          const isOtherClicked = clickedProfile && !isClicked;
          
          return (
            <div 
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={`group flex flex-col items-center cursor-pointer transition-all duration-500 ease-out
                ${isClicked ? 'scale-110 z-10' : ''} 
                ${isOtherClicked ? 'opacity-0 scale-95' : 'hover:scale-105'}
              `}
            >
              <div className={`w-28 h-28 md:w-40 md:h-40 rounded-md mb-4 shadow-xl border-4 transition-all overflow-hidden relative ${isClicked ? 'border-white' : 'border-transparent group-hover:border-white'}`}>
                <img 
                  src={p.image} 
                  alt={p.name} 
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 transition-colors duration-500 ${isClicked ? 'bg-transparent' : 'bg-black/40 group-hover:bg-transparent'}`} />
                {isClicked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <span className={`font-sans text-xl md:text-2xl transition-colors duration-300 ${isClicked ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Gallery: React.FC = () => {
  const { galleryImages, loading, sanitizeUrl, loadGalleryImages } = useData() as any;
  const [selectedCategory, setSelectedCategory] = React.useState<string | null | undefined>(undefined);

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

  const filteredNetflixImages = useMemo(() => {
    if (!selectedCategory) return netflixImages;
    return netflixImages.filter((img: any) => 
      img.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [netflixImages, selectedCategory]);

  return (
    <div className="nebula-theme min-h-screen relative flex flex-col pt-20">
      <SEO 
        title="Gallery" 
        description="Relive the best moments from past RICORRENZA festivals." 
        canonical="https://ricorrenza.fun/gallery" 
      />

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <span className="font-serif font-bold tracking-[0.2em] uppercase text-indigo-400">Loading Memories...</span>
          </div>
        </div>
      )}

      {/* Netflix Profile Selection */}
      {!loading && selectedCategory === undefined && (
        <ProfileSelection onSelect={setSelectedCategory} />
      )}

      {/* Netflix Gallery Content */}
      {!loading && selectedCategory !== undefined && (
        <div className="w-full flex-1 animate-scale-fade">
             <div className="px-4 md:px-12 mb-6 mt-4 flex items-center gap-4">
                <button 
                  onClick={() => setSelectedCategory(undefined)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md font-sans transition-colors"
                >
                  ← Back to Profiles
                </button>
             </div>
             <NetflixGallery 
               images={filteredNetflixImages} 
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

        @keyframes scaleFadeIn {
          0% { opacity: 0; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .animate-scale-fade {
          animation: scaleFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-up-fade {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};