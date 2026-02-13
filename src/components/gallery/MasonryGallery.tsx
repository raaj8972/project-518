import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn } from 'lucide-react';
import gsap from 'gsap';

interface GalleryImage {
  id: number;
  src: string;
  thumbnail?: string;
  alt: string;
  category?: string;
  subcategory?: string;
  year?: string;
}

interface MasonryGalleryProps {
  images: GalleryImage[];
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({ images }) => {
  const [visibleCount, setVisibleCount] = useState(20);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Reset visible count when source images change
  useEffect(() => {
    setVisibleCount(20);
  }, [images]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, images.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Load earlier
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [images.length]);

  // GSAP Entrance Animation for new items
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    // Select only items that haven't been animated yet
    const items = containerRef.current.querySelectorAll('.gallery-item:not(.animated)');
    
    if (items.length > 0) {
      gsap.fromTo(items, 
        { opacity: 0, y: 50, scale: 0.9 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.6, 
          stagger: 0.05, 
          ease: 'power3.out',
          onComplete: () => {
             items.forEach(el => el.classList.add('animated'));
          }
        }
      );
    }
  }, [visibleCount, images]);

  // Lightbox GSAP Animation
  useEffect(() => {
    if (lightboxIndex !== null && lightboxRef.current) {
      gsap.fromTo(lightboxRef.current,
        { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [lightboxIndex]);

  // Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') setLightboxIndex(null);
    if (e.key === 'ArrowLeft') setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : prev));
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
       // Micro-animation for slide
       const img = lightboxRef.current?.querySelector('img.main-image');
       if (img) {
         gsap.to(img, { x: -50, opacity: 0, duration: 0.2, onComplete: () => {
           setLightboxIndex(lightboxIndex + 1);
           gsap.fromTo(img, { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
         }});
       } else {
         setLightboxIndex(lightboxIndex + 1);
       }
    } else {
       // Loop
       setLightboxIndex(0);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      const img = lightboxRef.current?.querySelector('img.main-image');
      if (img) {
        gsap.to(img, { x: 50, opacity: 0, duration: 0.2, onComplete: () => {
          setLightboxIndex(lightboxIndex - 1);
          gsap.fromTo(img, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
        }});
      } else {
        setLightboxIndex(lightboxIndex - 1);
      }
    } else {
      // Loop
      setLightboxIndex(images.length - 1);
    }
  };

  const shareImage = async (img: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: img.alt || 'RICORRENZA Gallery',
          text: `Check out this photo from RICORRENZA 2026!`,
          url: window.location.href // Ideally specific image URL if routed
        });
      } catch (err) { console.error('Share failed', err); }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const visibleImages = images.slice(0, visibleCount);

  return (
    <div className="w-full min-h-screen pb-20 select-none">
      {/* Masonry Grid */}
      <div 
        ref={containerRef}
        className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 px-4 sm:px-8"
      >
        {visibleImages.map((img, index) => (
          <div 
            key={`${img.id}-${index}`}
            className="gallery-item break-inside-avoid group relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 cursor-zoom-in"
            onClick={() => openLightbox(index)}
          >
            {/* Image */}
            <img 
              src={img.thumbnail || img.src} 
              alt={img.alt}
              loading="lazy"
              className="w-full h-auto object-cover transform transition-all duration-700 ease-in-out group-hover:scale-110 group-hover:filter-none filter grayscale-[20%] group-hover:grayscale-0"
            />
            
            {/* Cyberpunk Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              
              {/* Neon Border Effect */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-500/50 rounded-2xl transition-all duration-500 box-border pointer-events-none shadow-[inset_0_0_20px_rgba(79,70,229,0.3)]" />
              
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                <p className="text-white font-bold text-sm line-clamp-2 drop-shadow-md">{img.alt || 'Untitled'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {img.year && (
                    <span className="text-[10px] font-mono bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full backdrop-blur-md">
                      {img.year}
                    </span>
                  )}
                  {img.category && (
                    <span className="text-[10px] font-mono bg-purple-600/30 border border-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full backdrop-blur-md">
                      {img.category}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="absolute top-3 right-3 transform translate-x-10 group-hover:translate-x-0 transition-transform duration-300 delay-200">
                <div className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
                   <ZoomIn size={16} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Sentinel */}
      {visibleCount < images.length && (
        <div ref={observerTarget} className="h-24 flex items-center justify-center mt-12 mb-20 group">
          <div className="relative px-6 py-2 rounded-full bg-gray-900 border border-indigo-500/30 flex items-center gap-3 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
            <span className="text-xs font-mono text-indigo-300 tracking-widest animate-pulse">LOADING MEMORIES_</span>
          </div>
        </div>
      )}

      {/* Premium Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          ref={lightboxRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl" 
          onClick={closeLightbox}
        >
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10 pointer-events-none" />

          {/* Top Controls */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
             <div className="text-white/80 font-mono text-xs tracking-wider bg-white/5 px-4 py-2 rounded-full border border-white/10">
                {lightboxIndex + 1} <span className="text-white/30">/</span> {images.length}
             </div>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
           <button 
              onClick={(e) => { e.stopPropagation(); shareImage(images[lightboxIndex]); }}
              className="p-3 rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all hover:scale-105 active:scale-95"
              title="Share"
            >
              <Share2 size={20} />
            </button>
           <a 
              href={images[lightboxIndex].src} 
              download 
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all hover:scale-105 active:scale-95"
              title="Download Original"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={closeLightbox}
              className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all hover:scale-105 active:scale-95 group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Navigation Buttons (Floating) */}
          <button 
            onClick={prevImage}
            className="absolute left-4 sm:left-8 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 hover:border-white/20 transition-all hover:scale-110 z-50 hidden sm:flex items-center justify-center w-14 h-14"
          >
            <ChevronLeft size={32} />
          </button>

          <button 
            onClick={nextImage}
            className="absolute right-4 sm:right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 hover:border-white/20 transition-all hover:scale-110 z-50 hidden sm:flex items-center justify-center w-14 h-14"
          >
            <ChevronRight size={32} />
          </button>

          {/* Main Image Container */}
          <div className="relative max-w-full max-h-screen p-4 sm:p-10 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={images[lightboxIndex].src} 
              alt={images[lightboxIndex].alt}
              className="main-image max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg select-none"
              style={{ boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
            />
            
            {/* Info Metadata */}
            <div className="mt-6 max-w-2xl text-center space-y-2 animate-in slide-in-from-bottom-4 duration-500 delay-100">
              <h2 className="text-white font-bold text-xl sm:text-2xl tracking-tight">{images[lightboxIndex].alt || 'Untitled Image'}</h2>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400">
                {images[lightboxIndex].year && <span>{images[lightboxIndex].year}</span>}
                {images[lightboxIndex].year && images[lightboxIndex].category && <span>•</span>}
                {images[lightboxIndex].category && <span className="text-indigo-400">{images[lightboxIndex].category}</span>}
                {images[lightboxIndex].subcategory && (
                  <>
                    <span>•</span>
                    <span className="text-pink-400">{images[lightboxIndex].subcategory}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
