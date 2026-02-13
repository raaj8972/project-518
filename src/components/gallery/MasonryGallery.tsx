import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

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

  // Reset visible count when images array changes (e.g. filter change)
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
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [images.length]);

  // Keyboard Navigation for Lightbox
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
    setLightboxIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0)); // loop
  };
  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1)); // loop
  };

  const visibleImages = images.slice(0, visibleCount);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 px-4 sm:px-8">
        {visibleImages.map((img, index) => (
          <div 
            key={`${img.id}-${index}`}
            className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in shadow-md hover:shadow-xl transition-all duration-300"
            onClick={() => openLightbox(index)}
          >
            <img 
              src={img.thumbnail || img.src} 
              alt={img.alt}
              loading="lazy"
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <p className="text-white font-bold text-sm line-clamp-1">{img.alt || 'Untitled'}</p>
              <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                {img.year && <span className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">{img.year}</span>}
                {img.category && <span>{img.category}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Sentinel */}
      {visibleCount < images.length && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center mt-10">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200" onClick={closeLightbox}>
          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
           <a 
              href={images[lightboxIndex].src} 
              download 
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              title="Download Original"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={closeLightbox}
              className="p-3 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors backdrop-blur-md"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Buttons */}
          <button 
            onClick={prevImage}
            className="absolute left-4 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all backdrop-blur-md hover:scale-110 z-50 hidden sm:block"
          >
            <ChevronLeft size={32} />
          </button>

          <button 
            onClick={nextImage}
            className="absolute right-4 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-all backdrop-blur-md hover:scale-110 z-50 hidden sm:block"
          >
            <ChevronRight size={32} />
          </button>

          {/* Main Image */}
          <div className="max-w-[95vw] max-h-[95vh] relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={images[lightboxIndex].src} 
              alt={images[lightboxIndex].alt}
              className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg select-none"
            />
            {/* Info Bar */}
            <div className="absolute bottom-[-3rem] left-0 w-full text-center">
              <p className="text-white/90 font-medium text-lg">{images[lightboxIndex].alt || 'Gallery Image'}</p>
              <p className="text-white/50 text-sm">{lightboxIndex + 1} / {images.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
