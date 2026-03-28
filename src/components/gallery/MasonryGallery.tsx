import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';
import gsap from 'gsap';

interface GalleryImage {
  id: number;
  src: string;
  optimizedSrc?: string;
  thumbnail?: string;
  alt: string;
  category?: string;
  subcategory?: string;
  year?: string;
}

interface MasonryGalleryProps {
  items: GalleryImage[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({ 
  items: images, 
  hasMore, 
  loadingMore, 
  onLoadMore 
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  
  // Pan state
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const observerTarget = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, images.length]);

  // GSAP Entrance Animation
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
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
             items.forEach(el => (el as HTMLElement).classList.add('animated'));
          }
        }
      );
    }
  }, [images]);

  // Lightbox GSAP Animation
  useEffect(() => {
    if (lightboxIndex !== null && lightboxRef.current) {
      gsap.fromTo(lightboxRef.current,
        { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [lightboxIndex]);

  // Reset pan when scale goes to 1
  useEffect(() => {
    if (scale <= 1) {
      setPanX(0);
      setPanY(0);
    }
  }, [scale]);

  // Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  }, [lightboxIndex, images.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setScale(1);
    setPanX(0); setPanY(0);
    document.body.classList.add('modal-open');
  };
  
  const closeLightbox = () => {
    setLightboxIndex(null);
    setScale(1);
    setPanX(0); setPanY(0);
    document.body.classList.remove('modal-open');
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next <= 1) { setPanX(0); setPanY(0); }
      return next;
    });
  };

  const resetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setPanX(0); setPanY(0);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => (prev > 1 ? 1 : 2.5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (lightboxIndex === null) return;
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 4));
    } else {
      setScale(prev => {
        const next = Math.max(prev - 0.1, 1);
        if (next <= 1) { setPanX(0); setPanY(0); }
        return next;
      });
    }
  };

  // Pointer drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPanX(panStart.current.panX + dx);
    setPanY(panStart.current.panY + dy);
  };

  const handlePointerUp = () => {
    isPanning.current = false;
  };
  
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
       setScale(1);
       setPanX(0); setPanY(0);
       setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setScale(1);
      setPanX(0); setPanY(0);
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const img = images[lightboxIndex!];
    if (!img) return;
    window.open(img.src, '_blank');
  };

  const shareImage = async (img: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(img.src);
      alert('Link copied to clipboard!');
    } catch (err) { console.error('Share failed', err); }
  };

  return (
    <div className="w-full min-h-screen pb-20 select-none">
      <div 
        ref={containerRef}
        className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 px-4 sm:px-8"
      >
        {images.map((img, index) => (
          <div 
            key={`${img.id}-${index}`}
            className="gallery-item break-inside-avoid group relative rounded-sm overflow-hidden bg-[#050505] border border-red-950/20 cursor-zoom-in"
            onClick={() => openLightbox(index)}
          >
            <img 
              src={img.thumbnail || img.src} 
              alt={img.alt}
              loading="lazy"
              className="w-full h-auto object-cover transform transition-all duration-700 ease-in-out group-hover:scale-110 group-hover:filter-none filter grayscale-[20%] group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              <p className="text-red-50 text-sm font-serif font-bold italic tracking-wide line-clamp-2 drop-shadow-md">{img.alt || ''}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {img.year && (
                  <span className="text-[10px] font-serif font-black tracking-widest bg-red-950/60 border border-red-800/30 text-red-400 px-2 py-0.5 rounded-sm backdrop-blur-md uppercase">
                    {img.year}
                  </span>
                )}
                {img.category && (
                  <span className="text-[10px] font-serif font-black tracking-widest bg-black/60 border border-red-900/40 text-red-500 px-2 py-0.5 rounded-sm backdrop-blur-md uppercase">
                    {img.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center mt-12 mb-20 gap-6">
        {hasMore && <div ref={observerTarget} className="h-4 w-full" />}
        
        {loadingMore ? (
          <div className="flex items-center gap-3 bg-red-950/20 px-6 py-3 rounded-xl border border-red-900/40">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span className="text-xs font-serif font-black text-red-600 tracking-[0.3em] uppercase">Decrypting Memories_</span>
          </div>
        ) : hasMore ? (
          <button
            onClick={onLoadMore}
            className="px-8 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-900/40 font-serif font-bold text-xs tracking-[0.3em] uppercase transition-all hover:scale-105"
          >
            Load More_
          </button>
        ) : images.length > 0 ? (
          <div className="text-gray-600 font-serif text-[10px] tracking-[0.2em] uppercase">
            — End of Archives —
          </div>
        ) : null}
      </div>

      {lightboxIndex !== null && (
        <div 
          ref={lightboxRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050505]/98 backdrop-blur-3xl" 
          onClick={closeLightbox}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-full border border-white/10 mr-4">
              <button 
                onClick={handleZoomOut}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button 
                onClick={resetZoom}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw size={18} />
              </button>
              <button 
                onClick={handleZoomIn}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); shareImage(images[lightboxIndex]); }}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleDownload}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={closeLightbox}
              className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400"
            >
              <X size={24} />
            </button>
          </div>

          <button onClick={prevImage} className="absolute left-4 p-4 text-white/50 hover:text-white transition-all hidden sm:block">
            <ChevronLeft size={48} />
          </button>
          <button onClick={nextImage} className="absolute right-4 p-4 text-white/50 hover:text-white transition-all hidden sm:block">
            <ChevronRight size={48} />
          </button>

          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
                transition: isPanning.current ? 'none' : 'transform 0.2s ease-out',
                cursor: scale > 1 ? 'grab' : 'default',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={toggleZoom}
              className="flex items-center justify-center"
            >
              <img 
                ref={imageRef}
                src={images[lightboxIndex].optimizedSrc || images[lightboxIndex].src} 
                alt={images[lightboxIndex].alt}
                className="max-w-[90vw] max-h-[85vh] object-contain shadow-2xl rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
