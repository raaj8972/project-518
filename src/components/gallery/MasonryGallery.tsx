import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
  images: GalleryImage[];
}

export const MasonryGallery: React.FC<MasonryGalleryProps> = ({ images }) => {
  const [visibleCount, setVisibleCount] = useState(100);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  
  // Pan state (replaces framer-motion drag)
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const observerTarget = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset visible count when source images change
  useEffect(() => {
    setVisibleCount(100);
  }, [images]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 100, images.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [images.length]);

  // GSAP Entrance Animation for new items
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

  // Reset pan when scale goes to 1
  useEffect(() => {
    if (scale <= 1) {
      setPanX(0);
      setPanY(0);
    }
  }, [scale]);

  // Keyboard Navigation & Zoom
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === '=' || e.key === '+') handleZoomIn();
    if (e.key === '-') handleZoomOut();
    if (e.key === '0') resetZoom();
  }, [lightboxIndex, images.length, scale]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setScale(1);
    setPanX(0);
    setPanY(0);
    // Suppress navbar
    document.body.classList.add('modal-open');
  };
  
  const closeLightbox = () => {
    setLightboxIndex(null);
    setScale(1);
    setPanX(0);
    setPanY(0);
    // Restore navbar
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
    setPanX(0);
    setPanY(0);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => {
      if (prev > 1) { setPanX(0); setPanY(0); return 1; }
      return 2.5;
    });
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

  // Pointer-based drag (replaces framer-motion drag)
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
       setScale(1);
       setPanX(0); setPanY(0);
       setLightboxIndex(0);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setScale(1);
      setPanX(0); setPanY(0);
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
      setScale(1);
      setPanX(0); setPanY(0);
      setLightboxIndex(images.length - 1);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const img = images[lightboxIndex!];
    if (!img) return;

    const downloadUrl = img.src;
    const filename = img.alt ? `${img.alt.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}.jpg` : 'download.jpg';

    try {
      const response = await fetch(downloadUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, falling back to direct link:', err);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareImage = async (img: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: img.alt || 'RICORRENZA Gallery',
          text: `Check out this photo from RICORRENZA 2026!`,
          url: window.location.href
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
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
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
                
                <div className="absolute top-3 right-3 transform translate-x-10 group-hover:translate-x-0 transition-transform duration-300 delay-200">
                   <div className="p-2 rounded-full bg-red-600/10 backdrop-blur-md text-red-500 hover:bg-red-600/20 transition-colors">
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
          <div className="relative px-8 py-3 rounded-sm bg-black border border-red-900/40 flex items-center gap-4 shadow-[0_0_20px_rgba(153,27,27,0.15)]">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            <span className="text-xs font-serif font-black text-red-600 tracking-[0.3em] animate-pulse uppercase">Searching Archives_</span>
          </div>
        </div>
      )}

      {/* Premium Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          ref={lightboxRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050505]/98 backdrop-blur-3xl" 
          onClick={closeLightbox}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-black to-black -z-10 pointer-events-none" />

          {/* Top Controls */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
             <div className="text-red-100/80 font-serif font-bold text-xs tracking-[0.2em] bg-red-950/40 px-5 py-2.5 rounded-sm border border-red-900/30 uppercase shadow-[0_0_15px_rgba(153,27,27,0.1)]">
                {lightboxIndex + 1} <span className="text-red-500/30 mx-1">/</span> {images.length}
             </div>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2 sm:gap-3 z-50">
           <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 p-1 mr-2">
             <button 
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button 
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              {scale > 1 && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button 
                    onClick={resetZoom}
                    className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-all"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={18} />
                  </button>
                </>
              )}
           </div>

           <button 
              onClick={(e) => { e.stopPropagation(); shareImage(images[lightboxIndex]); }}
              className="p-3 rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all hidden sm:block"
              title="Share"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleDownload}
              className="p-3 rounded-full bg-white/5 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all hidden sm:block"
              title="Download Original"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={closeLightbox}
              className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Navigation Buttons */}
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

          {/* Main Image Container - CSS transform replaces framer-motion */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden" 
            onClick={() => scale === 1 && closeLightbox()}
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
                transition: isPanning.current ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                cursor: scale > 1 ? 'grab' : 'default',
                touchAction: 'none',
              }}
              className="relative flex items-center justify-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={toggleZoom}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img 
                ref={imageRef}
                src={images[lightboxIndex].optimizedSrc || images[lightboxIndex].src} 
                alt={images[lightboxIndex].alt}
                className="main-image max-w-[90vw] max-h-[85vh] object-contain shadow-2xl rounded-lg select-none pointer-events-none"
                style={{ 
                  boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                  willChange: 'transform'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
