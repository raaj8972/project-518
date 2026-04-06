import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download } from 'lucide-react';
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
  views?: number;
}

interface NetflixGalleryProps {
  images: GalleryImage[];
  onPhotoView?: (imgId: number) => void;
}

// ─── Lazy Row Wrapper ───────────────────────────────────────────────────────
const LazyRow = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!visible) {
    return (
      <div ref={ref} className="mb-8 md:mb-12 pl-4 md:pl-12">
        <div className="h-7 w-48 rounded bg-white/5 mb-4 animate-pulse" />
        <div className="flex gap-2 overflow-hidden py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-none w-[140px] h-[80px] sm:w-[220px] sm:h-[125px] md:w-[280px] md:h-[160px] rounded-md bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ─── Thumbnail Card ─────────────────────────────────────────────────────────
const ThumbnailCard = ({
  img,
  idx,
  totalInRow,
  onClick,
  inView,
}: {
  img: GalleryImage;
  idx: number;
  totalInRow: number;
  onClick: () => void;
  inView: boolean;
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'broken'>('loading');
  const [isFallback, setIsFallback] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = () => {
    if (img.src?.includes('drive-proxy') && !isFallback) {
      setIsFallback(true);
      return; // Try again with fallback URL
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('broken');
  };

  useEffect(() => {
    if (!inView || status !== 'loading') return;

    timeoutRef.current = setTimeout(() => {
      if (status === 'loading') setStatus('broken');
    }, 10000);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [status, inView]);

  if (status === 'broken') {
    return (
      <div className="relative flex-none w-[140px] h-[80px] sm:w-[220px] sm:h-[125px] md:w-[280px] md:h-[160px] rounded-md overflow-hidden bg-[#1a1a3a] border border-red-500/20 flex flex-col items-center justify-center text-red-400">
        <X size={20} className="mb-1 opacity-50" />
        <span className="text-[10px] uppercase font-bold opacity-50 px-2 text-center">Failed</span>
      </div>
    );
  }

  const origin = idx === 0 ? 'left center' : idx === totalInRow - 1 ? 'right center' : 'center center';
  const displayTitle = img.alt && !img.alt.match(/^IMG[_-]?\d+/i) ? img.alt : '';

  // Calculate image source with fallback support
  let currentSrc = img.thumbnail || img.src;
  if (isFallback && currentSrc.includes('id=')) {
    try {
      const fileId = new URL(currentSrc, window.location.origin).searchParams.get('id');
      if (fileId) {
        currentSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div
      data-idx={idx}
      className="thumbnail-card relative flex-none w-[140px] h-[80px] sm:w-[220px] sm:h-[125px] md:w-[280px] md:h-[160px] rounded-md overflow-hidden bg-[#0c0c2e] transition-transform duration-300 transform md:hover:scale-125 hover:scale-110 hover:z-30 cursor-pointer group/card"
      onClick={onClick}
      style={{ transformOrigin: origin }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      )}
      
      {inView && (
        <img
          key={isFallback ? 'fallback' : 'primary'}
          src={currentSrc}
          alt={img.alt || 'Gallery Image'}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setStatus('loaded'); }}
          onError={handleError}
        />
      )}
      
      {status === 'loaded' && displayTitle && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity flex flex-col justify-end h-full hover:opacity-100">
          <h3 className="text-white text-xs md:text-sm font-bold truncate drop-shadow-md">{displayTitle}</h3>
          <div className="flex gap-2 mt-1 items-center">
            {img.year && <span className="text-[10px] text-green-500 font-bold">{img.year}</span>}
            {img.category && (
              <span className="text-[10px] text-gray-300 border border-gray-500 px-1 rounded-sm uppercase">
                {img.category}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Carousel Row ────────────────────────────────────────────────────────────
const CarouselRow = ({
  title,
  images,
  onOpen,
}: {
  title: string;
  images: GalleryImage[];
  onOpen: (idx: number, group: GalleryImage[]) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const [renderLimit, setRenderLimit] = useState(40);

  const checkScroll = useCallback(() => {
    if (rowRef.current) {
      setShowLeft(rowRef.current.scrollLeft > 0);
      setShowRight(rowRef.current.scrollLeft < rowRef.current.scrollWidth - rowRef.current.clientWidth - 10);
    }
  }, []);

  useEffect(() => { checkScroll(); }, [checkScroll]);

  useEffect(() => {
    const scroller = rowRef.current;
    if (!scroller) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIndices(prev => {
          const next = new Set(prev);
          entries.forEach(entry => {
            const idx = parseInt((entry.target as HTMLElement).dataset.idx || '-1', 10);
            if (idx === -1) return;
            if (entry.isIntersecting) {
              next.add(idx);
              if (idx >= renderLimit - 5) setRenderLimit(old => Math.min(images.length, old + 40));
            }
          });
          return next;
        });
      },
      { root: scroller, rootMargin: '400px', threshold: 0.01 }
    );

    scroller.querySelectorAll('.thumbnail-card').forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [renderLimit, images.length]);

  const slide = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const amount = direction === 'left' ? -rowRef.current.clientWidth : rowRef.current.clientWidth;
      rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const renderedImages = useMemo(() => images.slice(0, renderLimit), [images, renderLimit]);

  return (
    <div className="mb-8 md:mb-12 relative group z-10 w-full pl-4 md:pl-12">
      <h2 className="text-xl md:text-2xl font-bold font-serif text-white mb-3 flex items-center lg:mb-4 lg:text-3xl">
        {title} <span className="ml-3 text-xs md:text-sm font-sans font-normal text-indigo-400 opacity-60">({images?.length || 0})</span>
      </h2>
      <div className="relative">
        {showLeft && (
          <button onClick={() => slide('left')} className="absolute left-0 top-0 bottom-0 w-12 bg-black/60 z-20 flex items-center justify-center text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"><ChevronLeft size={40} /></button>
        )}
        <div ref={rowRef} onScroll={checkScroll} className="flex gap-2 overflow-x-auto scrollbar-hide py-4 px-1" style={{ width: '100%', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
          {renderedImages.map((img, idx) => (
            <ThumbnailCard key={`${img.id}-${idx}`} img={img} idx={idx} totalInRow={images.length} onClick={() => onOpen(idx, images)} inView={visibleIndices.has(idx)} />
          ))}
          {renderLimit < images.length && (
            <div className="flex-none w-[100px] flex items-center justify-center text-indigo-400/30 text-xs uppercase font-bold tracking-widest animate-pulse">+ {images.length - renderLimit} more</div>
          )}
        </div>
        {showRight && (
          <button onClick={() => slide('right')} className="absolute right-0 top-0 bottom-0 w-12 bg-black/60 z-20 flex items-center justify-center text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"><ChevronRight size={40} /></button>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const NetflixGallery: React.FC<NetflixGalleryProps> = ({ images: initialImages, onPhotoView }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentGroup, setCurrentGroup] = useState<GalleryImage[]>([]);
  const [scale, setScale] = useState(1);
  const [heroError, setHeroError] = useState(false);
  const [heroFallback, setHeroFallback] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const uniqueImages = useMemo(() => {
    const seen = new Set<string>();
    return (initialImages || []).filter((img: GalleryImage) => {
      const key = `${img.id || 'no-id'}-${img.src}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [initialImages]);

  const sortedImages = useMemo(() => [...uniqueImages].sort((a, b) => (b.views || 0) - (a.views || 0)), [uniqueImages]);
  const featuredImage = useMemo(() => sortedImages.length > 0 ? sortedImages[0] : null, [sortedImages]);

  const rows = useMemo(() => {
    const dynamicRowMap = new Map<string, GalleryImage[]>();
    uniqueImages.forEach(img => {
      const title = img.subcategory || img.category || 'Other';
      if (!dynamicRowMap.has(title)) dynamicRowMap.set(title, []);
      dynamicRowMap.get(title)!.push(img);
    });
    const categories = Array.from(dynamicRowMap.entries()).map(([title, data]) => ({ title, data })).filter(r => r.data.length > 0);
    return [{ title: 'Trending Now', data: sortedImages.slice(0, 20) }, ...categories].filter(r => r.data.length > 0);
  }, [uniqueImages, sortedImages]);

  const openLightbox = useCallback((imgIndex: number, group: GalleryImage[]) => {
    setCurrentGroup(group);
    setLightboxIndex(imgIndex);
    setScale(1);
    document.body.classList.add('modal-open');
    const img = group[imgIndex];
    if (img?.id && onPhotoView) {
      const key = `tracked_img_view_${img.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        onPhotoView(img.id);
      }
    }
  }, [onPhotoView]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    document.body.classList.remove('modal-open');
  }, []);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setLightboxIndex(prev => prev !== null ? (prev < currentGroup.length - 1 ? prev + 1 : 0) : null);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setLightboxIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : currentGroup.length - 1) : null);
  };

  useEffect(() => {
    if (lightboxIndex !== null && lightboxRef.current) {
      gsap.fromTo(lightboxRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    }
  }, [lightboxIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, currentGroup, closeLightbox]);

  const handleZoomIn = (e?: React.MouseEvent) => { e?.stopPropagation(); setScale(p => Math.min(p + 0.5, 4)); };
  const handleZoomOut = (e?: React.MouseEvent) => { e?.stopPropagation(); setScale(p => Math.max(p - 0.5, 1)); };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    const img = currentGroup[lightboxIndex];
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'ricorrenza.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const heroTitle = featuredImage?.alt && !featuredImage.alt.match(/^IMG[_-]?\d+/i) ? featuredImage.alt : 'RICORRENZA Gallery';

  return (
    <div className="w-full min-h-screen bg-[#0a0a2a] overflow-x-hidden">
      {/* Hero Section - Always show header part, image is background */}
      <div className="relative w-full h-[50vh] md:h-[70vh] lg:h-[85vh] -mt-16 md:-mt-24 mb-10 overflow-hidden select-none z-0 bg-[#0a0a2a]">
        {featuredImage && !heroError && (
          <img 
            key={heroFallback ? 'h-fallback' : 'h-primary'}
            src={heroFallback ? (featuredImage.src?.includes('id=') ? `https://drive.google.com/thumbnail?id=${new URL(featuredImage.src, window.location.origin).searchParams.get('id')}&sz=w1600` : featuredImage.src) : (featuredImage.optimizedSrc || featuredImage.src)} 
            alt={featuredImage.alt || 'Featured'} 
            className="w-full h-full object-cover transition-opacity duration-1000" 
            onError={() => {
              if (featuredImage.src?.includes('drive-proxy') && !heroFallback) {
                setHeroFallback(true);
              } else {
                setHeroError(true);
              }
            }} 
          />
        )}
        
        {/* Fallback pattern if no image or image fails */}
        {(heroError || !featuredImage) && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#1e1b4b_0%,#0a0a2a_100%)] opacity-60" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a2a] via-[#0a0a2a]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a2a] via-transparent to-transparent opacity-80" />
        
        <div className="absolute bottom-[10%] left-[5%] right-[5%] md:left-[5%] md:w-1/2 flex flex-col z-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] uppercase">
            {heroTitle}
          </h1>
          <p className="mt-4 text-sm md:text-lg text-indigo-100 drop-shadow-md line-clamp-3 max-w-xl">
            Explore the unforgettable moments, electrifying performances, and cherished memories from the largest student festival.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button 
              onClick={() => openLightbox(0, sortedImages)} 
              className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded hover:bg-white/90 transition-colors font-bold shadow-lg"
            >
              <Play fill="black" size={20} /> 
              <span className="uppercase text-sm sm:text-base">Start Viewing</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-20 -mt-10 md:-mt-20">
        {rows.map((row, index) => (
          <LazyRow key={`row-${index}`}><CarouselRow title={row.title} images={row.data} onOpen={openLightbox} /></LazyRow>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div ref={lightboxRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/98 backdrop-blur-3xl" onClick={closeLightbox}>
          <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
            <div className="text-indigo-100/80 font-serif font-bold text-xs tracking-[0.2em] bg-indigo-950/40 px-5 py-2.5 rounded-sm border border-indigo-900/30 uppercase">{lightboxIndex + 1} / {currentGroup.length}</div>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2 sm:gap-3 z-[110]">
            <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 p-1 mr-2"><button onClick={handleZoomOut} disabled={scale <= 1} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><ZoomOut size={18} /></button><button onClick={handleZoomIn} disabled={scale >= 4} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><ZoomIn size={18} /></button></div>
            <button onClick={handleDownload} className="p-3 rounded-full bg-white/5 hover:bg-white/20 text-white hidden sm:block"><Download size={20} /></button>
            <button onClick={closeLightbox} className="p-3 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400"><X size={24} /></button>
          </div>
          <button onClick={prevImage} className="absolute left-4 sm:left-8 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white z-[110] hidden sm:flex"><ChevronLeft size={32} /></button>
          <button onClick={nextImage} className="absolute right-4 sm:right-8 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white z-[110] hidden sm:flex"><ChevronRight size={32} /></button>
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={() => scale === 1 && closeLightbox()}>
            <div style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}>
              <img src={currentGroup[lightboxIndex].optimizedSrc || currentGroup[lightboxIndex].src} alt={currentGroup[lightboxIndex].alt} className="max-w-[90vw] max-h-[85vh] object-contain shadow-2xl rounded-lg pointer-events-none select-none" />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .modal-open { overflow: hidden; }
      `}</style>
    </div>
  );
};
