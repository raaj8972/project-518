import React, { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Scan, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { MasonryGallery } from '../components/gallery/MasonryGallery';
import { SEO } from '../components/SEO';
import { FaceSearchDialog } from '../components/gallery/FaceSearchDialog';

export const Gallery: React.FC = () => {
  const { galleryImages, eventCategories, loading, sanitizeUrl } = useData() as any;
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [matchingImageIds, setMatchingImageIds] = useState<number[] | null>(null);
  const [showFaceSearch, setShowFaceSearch] = useState(false);

  // Derive subcategories for the currently selected category
  const subcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const subs = new Set<string>();
    galleryImages.forEach((img: any) => {
      const imgCat = (img?.category || '').toString().trim().toLowerCase();
      const sub = (img as any)?.subcategory || '';
      if (imgCat === selectedCategory.trim().toLowerCase() && sub) {
        subs.add(sub);
      }
    });
    return Array.from(subs).sort();
  }, [selectedCategory, galleryImages]);

  const categories = ['All', ...eventCategories.map((cat: any) => cat.name as string)];

  const selectedCategoryNormalized = (selectedCategory || '').toString().trim().toLowerCase();

  // Memoized filtered images to prevent unnecessary re-renders in MasonryGallery
  const filteredImages = useMemo(() => {
    return (matchingImageIds !== null
      ? galleryImages.filter((img: any) => matchingImageIds.includes(img.id))
      : (selectedCategory === 'All'
          ? galleryImages
          : galleryImages.filter((image: any) => {
              const imgCat = (image?.category || '').toString().trim().toLowerCase();
              if (imgCat !== selectedCategoryNormalized) return false;
              // Apply subcategory filter if one is selected
              if (selectedSubcategory) {
                const imgSub = ((image as any)?.subcategory || '').toString().trim();
                return imgSub === selectedSubcategory;
              }
              return true;
            }))
    ).filter((img: any) => img.src && img.src.trim() !== '');
  }, [galleryImages, matchingImageIds, selectedCategory, selectedCategoryNormalized, selectedSubcategory]);

  // Format images for MasonryGallery
  const masonryImages = useMemo(() => filteredImages.map((img: any) => {
    const s = sanitizeUrl ? sanitizeUrl(img.src) : img.src;
    
    // Optimization Helper
    const getOptimized = (url: string, width: number) => {
      if (!url) return '';
      // Skip optimization in development (localhost) as wsrv.nl cannot access local
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return url;
      }
      
      let absoluteUrl = url;
      if (url.startsWith('/')) {
         // Resolve relative URLs (like /.netlify/functions/...) to absolute for the proxy
         absoluteUrl = `${window.location.protocol}//${window.location.host}${url}`;
      }
      
      // Use wsrv.nl for global CDN caching & resizing
      return `https://wsrv.nl/?url=${encodeURIComponent(absoluteUrl)}&w=${width}&q=80&output=webp`;
    };

    return { 
      id: img.id,
      src: s, 
      thumbnail: getOptimized(s, 400),       // Fast thumbnail
      optimizedSrc: getOptimized(s, 1600),   // High-quality but optimized for lightbox
      alt: (img.title as string) || '',
      category: img.category,
      subcategory: img.subcategory,
      year: img.year
    };
  }), [filteredImages, sanitizeUrl]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            try { observer.unobserve(entry.target); } catch {};
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const attach = () => {
      const animatedElements = document.querySelectorAll('.scroll-animate');
      animatedElements.forEach((el) => {
        const node = el as HTMLElement & { __observed?: boolean };
        if (!node.__observed) {
          observer.observe(node);
          node.__observed = true;
        }
      });
    };

    attach();

    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 300);
    const safety = setTimeout(() => {
      document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
    }, 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); observer.disconnect(); };
  }, [selectedCategory, galleryImages.length, matchingImageIds]);

  return (
    <div className="cyberpunk-theme min-h-screen">
      <SEO 
        title="Gallery" 
        description="Relive the best moments from past RICORRENZA festivals." 
        canonical="https://ricorrenza.fun/gallery" 
      />

      {/* ── Gallery Filter Bar ── */}
      <section className="py-8 pt-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            {/* Active filter breadcrumb */}
            {(selectedCategory !== 'All' || matchingImageIds !== null) && (
              <div className="flex items-center justify-center gap-2 mb-5 text-sm">
                <span className="text-gray-500">Viewing:</span>
                {matchingImageIds !== null ? (
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    🔍 {filteredImages.length} matching photos
                  </span>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {selectedCategory}
                    </span>
                    {selectedSubcategory && (
                      <>
                        <span className="text-gray-600">›</span>
                        <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                          {selectedSubcategory}
                        </span>
                      </>
                    )}
                    <span className="text-gray-500 ml-1">({filteredImages.length})</span>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-5 items-center mb-8">
              {/* ── Main Category Row ── */}
              <div className="w-full max-w-5xl">
                <div
                  className="flex gap-2 md:gap-2.5 justify-start md:justify-center flex-nowrap overflow-x-auto px-1 py-2 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {categories.map((category) => {
                    const categoryData = eventCategories.find((cat: any) => cat.name === category);
                    const categoryColor = categoryData ? categoryData.color : '#6B7280';
                    const isActive = selectedCategory === category && matchingImageIds === null;
                    // Count images in this category
                    const catCount = category === 'All'
                      ? galleryImages.length
                      : galleryImages.filter((img: any) =>
                          (img?.category || '').toString().trim().toLowerCase() === category.trim().toLowerCase()
                        ).length;

                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedSubcategory(null);
                          setMatchingImageIds(null);
                        }}
                        className={`group relative px-4 py-2.5 md:px-5 md:py-3 rounded-2xl font-bold text-sm transition-all duration-400 border whitespace-nowrap flex items-center gap-2 ${
                          isActive
                            ? 'bg-gradient-to-br from-purple-600/90 to-pink-600/90 text-white border-purple-400/60 shadow-[0_4px_20px_rgba(168,85,247,0.35)] scale-[1.03]'
                            : 'text-gray-400 border-gray-700/40 hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/5 hover:shadow-[0_2px_12px_rgba(168,85,247,0.1)]'
                        }`}
                      >
                        {/* Glow effect on active */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-xl -z-10" />
                        )}
                        {category !== 'All' && (
                          <span
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'scale-125 shadow-[0_0_8px_currentColor]' : ''}`}
                            style={{ backgroundColor: categoryColor, color: categoryColor }}
                          />
                        )}
                        {category === 'All' && <span className="text-base">📸</span>}
                        <span>{category}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
                          isActive ? 'bg-white/20 text-white/80' : 'bg-gray-800/50 text-gray-500'
                        }`}>
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Subcategory Row (animated slide-in) ── */}
              <div
                className="w-full max-w-5xl overflow-hidden transition-all duration-500 ease-out"
                style={{
                  maxHeight: subcategories.length > 0 && matchingImageIds === null ? '200px' : '0px',
                  opacity: subcategories.length > 0 && matchingImageIds === null ? 1 : 0,
                }}
              >
                <div className="relative">
                  {/* Decorative line */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

                  <div
                    className="flex gap-2 flex-wrap justify-center pt-3 pb-1 px-2"
                  >
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                        selectedSubcategory === null
                          ? 'bg-purple-500/30 text-purple-200 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                          : 'text-gray-500 border-gray-700/30 hover:border-purple-500/30 hover:text-gray-300'
                      }`}
                    >
                      All Events
                    </button>
                    {subcategories.map((sub) => {
                      const isSubActive = selectedSubcategory === sub;
                      const subCount = galleryImages.filter((img: any) => {
                        const imgCat = (img?.category || '').toString().trim().toLowerCase();
                        const imgSub = ((img as any)?.subcategory || '').toString().trim();
                        return imgCat === selectedCategory.trim().toLowerCase() && imgSub === sub;
                      }).length;

                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 border flex items-center gap-1.5 ${
                            isSubActive
                              ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                              : 'text-gray-400 border-gray-700/30 hover:border-purple-500/25 hover:text-purple-300 hover:bg-purple-500/5'
                          }`}
                        >
                          <span>{sub}</span>
                          <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                            isSubActive ? 'bg-white/15 text-white/70' : 'bg-gray-800/40 text-gray-600'
                          }`}>
                            {subCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Face Search Actions ── */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFaceSearch(true)}
                  className={`px-8 py-3.5 rounded-2xl font-black transition-all duration-500 border-2 flex items-center gap-3 group overflow-hidden relative ${
                    matchingImageIds 
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-400 shadow-[0_0_25px_rgba(79,70,229,0.4)]'
                    : 'text-indigo-400 border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-500/10 hover:shadow-[0_0_20px_rgba(79,70,229,0.2)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Scan size={22} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="tracking-wider uppercase">
                    {matchingImageIds ? 'Results found' : 'Find My Photos'}
                  </span>
                </button>

                {matchingImageIds !== null && (
                  <button
                    onClick={() => setMatchingImageIds(null)}
                    className="p-3.5 text-red-400 border-2 border-red-500/40 rounded-2xl hover:bg-red-500/10 hover:border-red-400 transition-all group shadow-lg shadow-red-500/5"
                    title="Clear Results"
                  >
                    <RotateCcw size={22} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Masonry Gallery */}
      <section className="relative min-h-[50vh]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="cyberpunk-card px-6 py-4 text-sm text-gray-300 bg-black/30 border-cyan-500/30">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" aria-hidden="true" />
                <span>Loading gallery...</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="container mx-auto">
             {masonryImages.length > 0 ? (
               <MasonryGallery images={masonryImages} />
             ) : (
               <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
                 <div className="cyberpunk-card max-w-md mx-auto">
                   <ImageIcon size={64} className="mx-auto mb-4 text-gray-400" />
                   <h3 className="text-xl font-semibold text-gray-300 mb-2">No Images Found</h3>
                   {selectedCategory === 'All' ? (
                     <p className="text-gray-500">No images uploaded yet. Please check back later.</p>
                   ) : (
                     <p className="text-gray-500">{`No images found in the ${selectedCategory} category.`}</p>
                   )}
                 </div>
               </div>
             )}
          </div>
        )}
      </section>

      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .filter-row::-webkit-scrollbar {
          height: 4px;
        }
        .filter-row::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .filter-row::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
      
      {showFaceSearch && (
        <FaceSearchDialog 
          onClose={() => setShowFaceSearch(false)} 
          onResults={(ids) => setMatchingImageIds(ids)} 
        />
      )}
    </div>
  );
};