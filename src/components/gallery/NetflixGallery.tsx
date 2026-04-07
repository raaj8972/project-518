import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Share2, Loader2, Instagram } from 'lucide-react';
import gsap from 'gsap';
import { useCoreData } from '../../context/CoreDataContext';

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
  const [fallbackStage, setFallbackStage] = useState(0); // 0: Proxy, 1: Drive Thumbnail (Small), 2: Drive Thumbnail (Large)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleError = (errorDetails?: any) => {
    const errorMsg = errorDetails ? ` | Error: ${JSON.stringify(errorDetails)}` : '';
    if (fallbackStage < 2) {
      console.warn(`[ThumbnailCard] Stage ${fallbackStage} failed for ${img.id}${errorMsg}. Trying stage ${fallbackStage + 1}...`);
      setFallbackStage(prev => prev + 1);
      setStatus('loading');
    } else {
      console.error(`[ThumbnailCard] ALL fallback stages failed for ${img.id}${errorMsg}`);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus('broken');
    }
  };

  useEffect(() => {
    if (!inView || status !== 'loading') return;

    // Reset timeout on each stage transition
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (status === 'loading') {
        console.warn(`[ThumbnailCard] Timeout (30s) at stage ${fallbackStage} for ID ${img.id}`);
        handleError({ type: 'timeout', stage: fallbackStage });
      }
    }, 30000); // Increased to 30s per stage

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [status, inView, fallbackStage, img.id]);

  if (status === 'broken' && fallbackStage >= 2) {
    return (
      <div className="relative flex-none w-[140px] h-[80px] sm:w-[220px] sm:h-[125px] md:w-[280px] md:h-[160px] rounded-md overflow-hidden bg-[#1a1a3a] border border-red-500/10 flex flex-col items-center justify-center text-red-400/40">
        <X size={16} className="mb-1" />
        <span className="text-[8px] uppercase font-bold tracking-tighter">Unavailable</span>
      </div>
    );
  }

  const origin = idx === 0 ? 'left center' : idx === totalInRow - 1 ? 'right center' : 'center center';
  const displayTitle = img.alt && !img.alt.match(/^IMG[_-]?\d+/i) ? img.alt : '';

  // Calculate image source based on fallback stage
  let currentSrc = img.thumbnail || img.src;
  
  const extractFileId = (src: string | undefined): string | null => {
    if (!src) return null;
    if (src.startsWith('drive://')) return src.replace('drive://', '');
    if (src.includes('id=')) {
      try {
        const url = src.startsWith('http') ? new URL(src) : new URL(src, window.location.origin);
        return url.searchParams.get('id');
      } catch (e) { return null; }
    }
    // If it's just a 33-char alphanumeric ID (typical Drive ID length is 33)
    if (/^[a-zA-Z0-9_-]{25,45}$/.test(src)) return src;
    return null;
  };

  const fileId = extractFileId(img.src);

  if (fileId) {
    if (fallbackStage === 1) {
      currentSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    } else if (fallbackStage === 2) {
      currentSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
  }

  return (
    <div
      data-idx={idx}
      className="thumbnail-card relative flex-none w-[140px] h-[80px] sm:w-[220px] sm:h-[125px] md:w-[280px] md:h-[160px] rounded-md overflow-hidden bg-[#0c0c2e] transition-transform duration-300 transform md:hover:scale-125 hover:scale-110 hover:z-30 cursor-pointer group/card"
      onClick={onClick}
      style={{ transformOrigin: origin }}
    >
      {(status === 'loading') && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        </div>
      )}
      
      {inView && (
        <img
          key={`${fallbackStage}-${img.id}`}
          src={currentSrc}
          alt={img.alt || 'Gallery Image'}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => { 
            if (timeoutRef.current) clearTimeout(timeoutRef.current); 
            setStatus('loaded'); 
          }}
          onError={() => handleError({ type: 'error-event', stage: fallbackStage })}
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
  const { homepageSettings } = useCoreData();
  const brandYear = homepageSettings?.brand_year || new Date().getFullYear();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentGroup, setCurrentGroup] = useState<GalleryImage[]>([]);
  const [scale, setScale] = useState(1);
  const [heroStatus, setHeroStatus] = useState<'loading' | 'loaded' | 'broken'>('loading');
  const [heroFallbackStage, setHeroFallbackStage] = useState(0);
  const [lightboxStatus, setLightboxStatus] = useState<'loading' | 'loaded' | 'broken'>('loading');
  const [lightboxFallbackStage, setLightboxFallbackStage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
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
    setLightboxStatus('loading');
    setLightboxFallbackStage(0);
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
    setLightboxStatus('loading');
    setLightboxFallbackStage(0);
    setLightboxIndex(prev => prev !== null ? (prev < currentGroup.length - 1 ? prev + 1 : 0) : null);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScale(1);
    setLightboxStatus('loading');
    setLightboxFallbackStage(0);
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

  const processImageWithWatermark = async (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Important for CORS
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(img.src);
        
        ctx.drawImage(img, 0, 0);
        
        // Watermark height = 8% of image height or minimum 40px
        const barHeight = Math.max(40, Math.floor(img.height * 0.08));
        const fontSize = Math.floor(barHeight * 0.4);
        
        // Dark gradient at bottom for text visibility
        const grad = ctx.createLinearGradient(0, img.height - barHeight * 1.5, 0, img.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, img.height - barHeight * 1.5, img.width, barHeight * 1.5);
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        
        // Brand/Logo on right
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'right';
        ctx.fillText(`RICORRENZA ${brandYear}`, img.width - fontSize, img.height - (barHeight / 2));
        
        // Website on left
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `500 ${Math.floor(fontSize * 0.7)}px sans-serif`;
        ctx.fillText('Downloaded from ricorrenza.in', fontSize, img.height - (barHeight / 2));
        
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (e) {
          console.warn('Canvas tainted due to CORS, falling back to original URL', e);
          resolve(img.src);
        }
      };
      img.onerror = () => resolve(src);
      
      // Route through proxy to avoid CORS iff local/fallback Drive URL
      let urlToLoad = src;
      if (src.includes('drive.google.com/thumbnail')) {
        const fileId = new URL(src).searchParams.get('id');
        if (fileId) urlToLoad = `/api/drive-proxy?id=${fileId}&width=1600`;
      }
      // Cache bust
      img.src = urlToLoad + (urlToLoad.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    });
  };

  // Download cooldown to avoid hitting Google Drive rate limits
  const lastDownloadRef = useRef<number>(0);
  const DOWNLOAD_COOLDOWN_MS = 3000; // 3 seconds between downloads

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null || isProcessing) return;

    // Enforce cooldown
    const now = Date.now();
    const elapsed = now - lastDownloadRef.current;
    if (elapsed < DOWNLOAD_COOLDOWN_MS) {
      const waitSec = Math.ceil((DOWNLOAD_COOLDOWN_MS - elapsed) / 1000);
      alert(`Please wait ${waitSec}s before downloading again to avoid rate limits.`);
      return;
    }

    try {
      setIsProcessing(true);
      lastDownloadRef.current = Date.now();
      const img = currentGroup[lightboxIndex];

      // Try watermarked download first
      let dataUrl: string;
      try {
        dataUrl = await processImageWithWatermark(img.src);
      } catch {
        // Watermark failed (likely CORS / rate limit) → fall back to direct link
        console.warn('Watermark processing failed, falling back to direct download');
        const link = document.createElement('a');
        link.href = img.optimizedSrc || img.src;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = `RICORRENZA-${img.year || brandYear}-${img.id || Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `RICORRENZA-${img.year || brandYear}-${img.id || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed. Google Drive may be rate-limiting requests. Please try again in a few seconds.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null || isProcessing) return;
    
    if (typeof navigator.share === 'function') {
      try {
        setIsProcessing(true);
        const img = currentGroup[lightboxIndex];
        const dataUrl = await processImageWithWatermark(img.src);
        
        const shareData: ShareData = {
          title: 'RICORRENZA Gallery',
          text: 'Check out this memory from RICORRENZA!',
          url: window.location.origin + '/gallery'
        };
        
        if (dataUrl.startsWith('data:') && navigator.canShare) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `ricorrenza-${img.year || brandYear}-${Date.now()}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }
        
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert('Sharing is not fully supported on this browser. You can download the image instead.');
    }
  };

  // Instagram share — uses Web Share API with image file on mobile (lets user pick Story/Post in Instagram app)
  // On desktop, downloads image and opens Instagram
  const handleShareInstagram = async (e: React.MouseEvent, mode: 'story' | 'post') => {
    e.stopPropagation();
    if (lightboxIndex === null || isProcessing) return;

    try {
      setIsProcessing(true);
      const img = currentGroup[lightboxIndex];
      const dataUrl = await processImageWithWatermark(img.src);

      // Try native share with file (works on mobile — Instagram appears as target)
      if (typeof navigator.share === 'function' && navigator.canShare) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `ricorrenza-${img.year || brandYear}-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: mode === 'story' ? 'Share to Instagram Story' : 'Share to Instagram',
            text: `RICORRENZA ${brandYear} 🎶 #ricorrenza #fest`,
          });
          return;
        }
      }

      // Desktop fallback: download image + open Instagram
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `RICORRENZA-${img.year || brandYear}-${img.id || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Short delay then open Instagram
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 500);
      alert('Image downloaded! Open Instagram and share it as a ' + (mode === 'story' ? 'Story' : 'Post') + '.');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Instagram share failed', err);
        alert('Could not share. Please download the image and share it manually on Instagram.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const heroTitle = featuredImage?.alt && !featuredImage.alt.match(/^IMG[_-]?\d+/i) ? featuredImage.alt : 'RICORRENZA Gallery';

  return (
    <div className="w-full min-h-screen bg-[#0a0a2a] overflow-x-hidden">
      {/* Hero Section - Always show header part, image is background */}
      <div className="relative w-full h-[50vh] md:h-[70vh] lg:h-[85vh] -mt-16 md:-mt-24 mb-10 overflow-hidden select-none z-0 bg-[#0a0a2a]">
        {featuredImage && heroStatus !== 'broken' && (
          <img 
            src={(() => {
              const base = featuredImage.optimizedSrc || featuredImage.src;
              if (heroFallbackStage === 0) return base;
              
              const extractId = (src: string | undefined): string | null => {
                if (!src) return null;
                if (src.startsWith('drive://')) return src.replace('drive://', '');
                if (src.includes('id=')) {
                  try {
                    const url = src.startsWith('http') ? new URL(src) : new URL(src, window.location.origin);
                    return url.searchParams.get('id');
                  } catch (e) { return null; }
                }
                if (/^[a-zA-Z0-9_-]{25,45}$/.test(src)) return src;
                return null;
              };

              const fileId = extractId(featuredImage.src);
              if (!fileId) return base;
              return heroFallbackStage === 1 
                ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
                : `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
            })()} 
            alt={featuredImage.alt || 'Featured'} 
            className={`w-full h-full object-cover transition-opacity duration-1000 ${heroStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`} 
            onLoad={() => setHeroStatus('loaded')}
            onError={() => {
              console.warn(`[Hero] Stage ${heroFallbackStage} failed for ${featuredImage.id}`);
              if (heroFallbackStage < 2) {
                setHeroFallbackStage(prev => prev + 1);
                setHeroStatus('loading');
              } else {
                console.error(`[Hero] ALL stages failed for ${featuredImage.id}`);
                setHeroStatus('broken');
              }
            }} 
          />
        )}
        
        {/* Fallback pattern if no image or image fails */}
        {(heroStatus === 'broken' || !featuredImage) && (
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
          <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2 z-[140]">
            <div className="hidden sm:flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 p-1 mr-1">
              <button onClick={handleZoomOut} disabled={scale <= 1 || isProcessing} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><ZoomOut size={18} /></button>
              <button onClick={handleZoomIn} disabled={scale >= 4 || isProcessing} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><ZoomIn size={18} /></button>
            </div>
            {/* Instagram Story */}
            <button onClick={(e) => handleShareInstagram(e, 'story')} disabled={isProcessing} className="p-2.5 sm:p-3 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-500/30 hover:from-purple-600/50 hover:to-pink-500/50 border border-pink-400/30 text-white disabled:opacity-50 transition-all" title="Share to Instagram Story">
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (
                <span className="flex items-center gap-1">
                  <Instagram size={16} />
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Story</span>
                </span>
              )}
            </button>
            {/* Instagram Post */}
            <button onClick={(e) => handleShareInstagram(e, 'post')} disabled={isProcessing} className="p-2.5 sm:p-3 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-500/30 hover:from-purple-600/50 hover:to-pink-500/50 border border-pink-400/30 text-white disabled:opacity-50 transition-all" title="Share to Instagram Post">
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (
                <span className="flex items-center gap-1">
                  <Instagram size={16} />
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Post</span>
                </span>
              )}
            </button>
            {/* General Share */}
            {typeof navigator.share === 'function' && (
              <button onClick={handleShare} disabled={isProcessing} className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors" title="Share Photo">
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              </button>
            )}
            <button onClick={handleDownload} disabled={isProcessing} className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors" title="Download Photo">
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
            <button onClick={closeLightbox} className="p-2.5 sm:p-3 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-white ml-1 transition-colors border border-indigo-400/50" title="Close">
              <X size={20} />
            </button>
          </div>
          <button 
            onClick={prevImage} 
            className="absolute left-2 sm:left-6 md:left-8 p-3 sm:p-4 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-white/10 text-white z-[120] flex transition-all duration-300"
            aria-label="Previous image"
          >
            <ChevronLeft size={28} className="sm:w-8 sm:h-8" />
          </button>
          
          <button 
            onClick={nextImage} 
            className="absolute right-2 sm:right-6 md:right-8 p-3 sm:p-4 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-white/10 text-white z-[120] flex transition-all duration-300"
            aria-label="Next image"
          >
            <ChevronRight size={28} className="sm:w-8 sm:h-8" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={(e) => {
            if (scale > 1) return;
            // Prevent general click-to-close if we clicked on the sides for navigation
            const width = window.innerWidth;
            const x = e.clientX;
            
            if (x < width * 0.3) {
              e.stopPropagation();
              prevImage();
            } else if (x > width * 0.7) {
              e.stopPropagation();
              nextImage();
            } else {
              // Center-ish click closes if on the background, but this div covers everything
              // If they click the image itself, we might want different behavior, but let's stick to side-navigation
            }
          }}>
            <div 
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
              className="relative cursor-zoom-in inline-block"
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => {
                if (scale === 1) {
                  // If clicking the image at normal scale, we let it propagate to the side-detectors above
                } else {
                  e.stopPropagation();
                }
              }}
            >
              <img 
                src={(() => {
                  const img = currentGroup[lightboxIndex];
                  const base = img.optimizedSrc || img.src;
                  if (lightboxFallbackStage === 0) return base;
                  
                  const extractId = (src: string | undefined): string | null => {
                    if (!src) return null;
                    if (src.startsWith('drive://')) return src.replace('drive://', '');
                    if (src.includes('id=')) {
                      try {
                        const url = src.startsWith('http') ? new URL(src) : new URL(src, window.location.origin);
                        return url.searchParams.get('id');
                      } catch (e) { return null; }
                    }
                    if (/^[a-zA-Z0-9_-]{25,45}$/.test(src)) return src;
                    return null;
                  };

                  const fileId = extractId(img.src);
                  if (!fileId) return base;
                  return lightboxFallbackStage === 1 
                    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
                    : `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
                })()} 
                alt={currentGroup[lightboxIndex].alt} 
                className={`max-w-[95vw] max-h-[85vh] object-contain shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg pointer-events-none select-none transition-opacity duration-300 ${lightboxStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={() => setLightboxStatus('loaded')}
                onError={() => {
                  console.warn(`[Lightbox] Stage ${lightboxFallbackStage} failed for ${currentGroup[lightboxIndex].id}`);
                  if (lightboxFallbackStage < 2) {
                    setLightboxFallbackStage(prev => prev + 1);
                    setLightboxStatus('loading');
                  } else {
                    console.error(`[Lightbox] ALL stages failed for ${currentGroup[lightboxIndex].id}`);
                    setLightboxStatus('broken');
                  }
                }}
              />
              {lightboxStatus === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                </div>
              )}
              {lightboxStatus === 'broken' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-black/40 rounded-lg">
                  <X size={48} className="mb-2 opacity-50" />
                  <span className="text-sm font-bold uppercase tracking-widest opacity-50">Photo Unavailable</span>
                </div>
              )}
              {/* Screenshot Protection Tiled Watermark (Screen Only) */}
              <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden opacity-[0.08] sm:opacity-[0.1] mix-blend-overlay">
                <div 
                  className="w-[200%] h-[200%] -top-[50%] -left-[50%] absolute"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(-30 150 150)'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' stroke='%23000000' stroke-width='2' font-family='sans-serif' font-size='32' font-weight='bold'%3ERICORRENZA%3C/text%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center center',
                    backgroundSize: '250px 250px'
                  }}
                />
              </div>

              {/* Clean Bottom Branding Bar — shareable on Instagram */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-lg flex flex-col justify-end">
                <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-14 pb-3 px-4 flex justify-between items-end">
                   <div className="text-white/60 text-[8px] md:text-sm font-medium hidden sm:block">ricorrenza.in</div>
                   <div className="text-white/90 text-xs md:text-lg font-bold tracking-wider drop-shadow-md">RICORRENZA {brandYear}</div>
                </div>
              </div>
            </div>
            
            {/* Direct navigation zones (invisible) for mobile/tablet ease of use */}
            {scale === 1 && (
              <>
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[30%] cursor-w-resize z-[110]" 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  title="Previous"
                />
                <div 
                  className="absolute right-0 top-0 bottom-0 w-[30%] cursor-e-resize z-[110]" 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  title="Next"
                />
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .modal-open { overflow: hidden; }
        img { -webkit-user-drag: none; -webkit-touch-callout: none; }
      `}</style>
    </div>
  );
};
