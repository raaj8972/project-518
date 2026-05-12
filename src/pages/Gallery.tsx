import React, { useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { NetflixGallery } from '../components/gallery/NetflixGallery';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

const AlternatingIcon = ({ icons, intervalMs, className }: { icons: string[], intervalMs: number, className?: string }) => {
  const [index, setIndex] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % icons.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [icons.length, intervalMs]);

  return (
    <div className={`relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 ${className || ''}`}>
      {icons.map((icon, i) => (
        <div
          key={i}
          className={`absolute transition-all duration-1000 ease-in-out drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]
            ${i === index 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-75 translate-y-4 pointer-events-none'}`}
        >
          {icon}
        </div>
      ))}
    </div>
  );
};

const CulturalAnimated = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#2a0845] to-[#6441A5] relative overflow-hidden flex items-center justify-center">
    <div className="absolute inset-0 opacity-30 mix-blend-screen bg-[url('/noise.png')]"></div>
    <div className="absolute w-[180%] h-[180%] bg-pink-500/30 blur-3xl rounded-full animate-spin-slow"></div>
    <div className="relative z-10 flex items-center justify-center text-4xl md:text-5xl">
      <AlternatingIcon icons={['🎭', '💃', '🎤', '🎸', '🥁', '🎆']} intervalMs={1500} />
    </div>
  </div>
);

const SportsAnimated = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#0B132B] to-[#14744b] relative overflow-hidden flex items-center justify-center group">
    <div className="absolute top-0 right-0 w-[200%] h-full bg-gradient-to-l from-transparent via-green-400/20 to-transparent -skew-x-12 translate-x-full animate-shimmer"></div>
    <div className="relative z-10 flex items-center justify-center text-4xl md:text-5xl mt-[-5px]">
      <AlternatingIcon icons={['🏏', '⚽', '🏀', '🏸', '🏃‍♂️', '🏆']} intervalMs={1200} />
    </div>
  </div>
);

const AcademicAnimated = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] relative overflow-hidden flex items-center justify-center">
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-300 to-transparent animate-pulse-slow"></div>
    <div className="relative z-10 flex items-center justify-center text-4xl md:text-5xl">
      <AlternatingIcon icons={['🧬', '🔬', '🩺', '🫀', '🧠', '🧪']} intervalMs={1600} />
    </div>
  </div>
);

const ProfileSelection = ({ onSelect }: { onSelect: (category: string | null) => void }) => {
  const [clickedProfile, setClickedProfile] = React.useState<string | null>(null);

  const profiles = [
    {
      name: 'Cultural',
      component: <CulturalAnimated />,
      colorClass: 'text-fuchsia-300 group-hover:text-fuchsia-400 group-hover:drop-shadow-[0_0_12px_rgba(232,121,249,0.9)]'
    },
    {
      name: 'Sports',
      component: <SportsAnimated />,
      colorClass: 'text-emerald-300 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]'
    },
    {
      name: 'Academic',
      component: <AcademicAnimated />,
      colorClass: 'text-cyan-300 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]'
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
      <h1 className={`text-3xl md:text-5xl font-bold mb-10 bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-sans tracking-tight transition-opacity duration-300 ${clickedProfile ? 'opacity-0' : 'opacity-100'}`}>Which memories will you relive?</h1>
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
                {p.component}
                <div className={`absolute inset-0 transition-colors duration-500 ${isClicked ? 'bg-transparent' : 'bg-black/40 group-hover:bg-transparent'}`} />
                {isClicked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <span className={`font-sans font-medium text-xl md:text-2xl transition-all duration-300 ${isClicked ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : p.colorClass}`}>
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

        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-pop-in {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-scale-fade {
          animation: scaleFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-up-fade {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes blob {
          0%, 100% { transform: scale(1) translate(0px, 0px); }
          33% { transform: scale(1.1) translate(10px, -15px); }
          66% { transform: scale(0.9) translate(-10px, 15px); }
        }
        .animate-blob {
          animation: blob 8s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes bounce-custom {
          0%, 100% { transform: scaleY(0.7); }
          50% { transform: scaleY(1.3); }
        }
        .animate-bounce-custom {
          animation: bounce-custom 1s infinite ease-in-out;
          transform-origin: bottom;
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(150%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        .animate-pulse-fast {
          animation: pulse-fast 1s infinite ease-in-out;
        }
        @keyframes spin-slow {
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s infinite linear;
        }
        @keyframes spin-reverse-slow {
          100% { transform: rotate(-360deg); }
        }
        .animate-spin-reverse-slow {
          animation: spin-reverse-slow 12s infinite linear;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; transform: scale(1.2); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};