import React, { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Scan, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { MasonryGallery } from '../components/gallery/MasonryGallery';
import { SEO } from '../components/SEO';
import { FaceSearchDialog } from '../components/gallery/FaceSearchDialog';
import { getOptimizedImageUrl } from '../utils/dataUtils';

export const Gallery: React.FC = () => {
  const { 
    galleryImages, 
    hasMore, 
    loadingMore, 
    fetchMore, 
    fetchGalleryData, 
    eventCategories, 
    loading, 
    sanitizeUrl 
  } = useData();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [matchingImageIds, setMatchingImageIds] = useState<number[] | null>(null);
  const [showFaceSearch, setShowFaceSearch] = useState(false);

  // Derive subcategories for the currently selected category
  const subcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const subs = new Set<string>();
    galleryImages.forEach((img) => {
      const imgCat = (img.category || '').toString().trim().toLowerCase();
      // Temporarily cast subcategory if it's missing in type annotations but present in data
      const sub = (img as any).subcategory || '';
      if (imgCat === selectedCategory.trim().toLowerCase() && sub) {
        subs.add(sub);
      }
    });
    return Array.from(subs).sort();
  }, [selectedCategory, galleryImages]);

  const categories = ['All', ...eventCategories.map((cat) => cat.name)];

  const selectedCategoryNormalized = (selectedCategory || '').toString().trim().toLowerCase();

  // Memoized filtered images to prevent unnecessary re-renders in MasonryGallery
  // Use local state for UI responsiveness, but trigger server-side fetch
  useEffect(() => {
    if (fetchGalleryData) {
      fetchGalleryData(0, false, selectedCategory, selectedSubcategory || undefined);
    }
  }, [selectedCategory, selectedSubcategory, fetchGalleryData]);

  const filteredImages = useMemo(() => {
    return (matchingImageIds !== null
      ? galleryImages.filter((img) => matchingImageIds.includes(img.id))
      : (selectedCategory === 'All'
          ? galleryImages
          : galleryImages.filter((image) => {
              const imgCat = (image.category || '').toString().trim().toLowerCase();
              if (imgCat !== selectedCategoryNormalized) return false;
              // Apply subcategory filter if one is selected
              if (selectedSubcategory) {
                const imgSub = ((image as any).subcategory || '').toString().trim();
                return imgSub === selectedSubcategory;
              }
              return true;
            }))
    ).filter((img) => img.src && img.src.trim() !== '');
  }, [galleryImages, matchingImageIds, selectedCategory, selectedCategoryNormalized, selectedSubcategory]);

  // Format images for MasonryGallery
  const masonryImages = useMemo(() => filteredImages.map((img) => {
    const s = sanitizeUrl ? sanitizeUrl(img.src) : img.src;

    return { 
      id: img.id,
      src: s, 
      thumbnail: getOptimizedImageUrl(s, 400),       // Fast thumbnail
      optimizedSrc: getOptimizedImageUrl(s, 1600),   // High-quality but optimized for lightbox
      alt: (img.title as string) || '',
      category: img.category,
      subcategory: (img as any).subcategory,
      year: (img as any).year
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
    <div className="stranger-things-theme min-h-screen">
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
              <div className="flex items-center justify-center gap-2 mb-5 text-sm font-serif">
                <span className="text-gray-500 italic">Viewing:</span>
                {matchingImageIds !== null ? (
                  <span className="px-3 py-1 rounded-full bg-red-950/40 text-red-100 border border-red-900/50 font-bold shadow-[0_0_15px_rgba(153,27,27,0.2)]">
                    🔍 {filteredImages.length} matching photos
                  </span>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-full bg-red-900/20 text-red-200 border border-red-800/30 font-semibold shadow-[0_0_10px_rgba(153,27,27,0.1)]">
                      {selectedCategory}
                    </span>
                    {selectedSubcategory && (
                      <>
                        <span className="text-gray-600">›</span>
                        <span className="px-3 py-1 rounded-full bg-red-800/20 text-red-300 border border-red-700/30 font-semibold shadow-[0_0_10px_rgba(153,27,27,0.1)]">
                          {selectedSubcategory}
                        </span>
                      </>
                    )}
                    <span className="text-gray-500 ml-1 italic">({filteredImages.length})</span>
                  </>
                )}
              </div>

            <div className="flex flex-col gap-5 items-center mb-8">
              {/* ── Main Category Row ── */}
              <div className="w-full max-w-5xl">
                <div
                  className="flex gap-2 md:gap-2.5 justify-start md:justify-center flex-nowrap overflow-x-auto px-1 py-2 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {categories.map((category) => {
                    const categoryData = eventCategories.find((cat) => cat.name === category);
                    const categoryColor = categoryData ? categoryData.color : '#6B7280';
                    const isActive = selectedCategory === category && matchingImageIds === null;
                    // Count images in this category
                    const catCount = category === 'All'
                      ? galleryImages.length
                      : galleryImages.filter((img) =>
                          (img.category || '').toString().trim().toLowerCase() === category.trim().toLowerCase()
                        ).length;

                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedSubcategory(null);
                          setMatchingImageIds(null);
                        }}
                        className={`group relative px-4 py-2.5 md:px-5 md:py-3 rounded-2xl font-serif font-black text-sm tracking-widest transition-all duration-400 border whitespace-nowrap flex items-center gap-2 uppercase ${
                          isActive
                            ? 'bg-gradient-to-br from-red-900 to-black text-red-500 border-red-600/60 shadow-[0_0_25px_rgba(220,38,38,0.3)] scale-[1.03]'
                            : 'text-gray-500 border-gray-800/40 hover:border-red-900/40 hover:text-red-400 hover:bg-red-950/10'
                        }`}
                      >
                        {/* Glow effect on active */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl bg-red-600/10 blur-xl -z-10" />
                        )}
                        {category !== 'All' && (
                          <span
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'scale-125 shadow-[0_0_8px_currentColor]' : ''}`}
                            style={{ backgroundColor: categoryColor, color: categoryColor }}
                          />
                        )}
                        {category === 'All' && <span className="text-base">📸</span>}
                        <span>{category}</span>
                         <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all font-sans ${
                          isActive ? 'bg-red-500/20 text-red-200' : 'bg-gray-800/50 text-gray-500'
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
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />

                  <div
                    className="flex gap-2 flex-wrap justify-center pt-3 pb-1 px-2"
                  >
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold tracking-wider transition-all duration-300 border uppercase ${
                        selectedSubcategory === null
                          ? 'bg-red-950/40 text-red-500 border-red-800/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                          : 'text-gray-500 border-gray-800/30 hover:border-red-900/30 hover:text-red-400'
                      }`}
                    >
                      All Events
                    </button>
                    {subcategories.map((sub) => {
                      const isSubActive = selectedSubcategory === sub;
                      const subCount = galleryImages.filter((img) => {
                        const imgCat = (img.category || '').toString().trim().toLowerCase();
                        const imgSub = ((img as any).subcategory || '').toString().trim();
                        return imgCat === selectedCategory.trim().toLowerCase() && imgSub === sub;
                      }).length;

                      return (
                         <button
                          key={sub}
                          onClick={() => setSelectedSubcategory(sub)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold tracking-tight transition-all duration-300 border flex items-center gap-1.5 uppercase ${
                            isSubActive
                              ? 'bg-gradient-to-r from-red-950/60 to-black/60 text-red-500 border-red-800/50 shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                              : 'text-gray-400 border-gray-800/30 hover:border-red-900/30 hover:text-red-400'
                          }`}
                        >
                          <span>{sub}</span>
                          <span className={`text-[9px] px-1 py-0.5 rounded-full font-sans ${
                            isSubActive ? 'bg-red-500/10 text-red-400' : 'bg-gray-800/40 text-gray-600'
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
                  className={`px-8 py-3.5 rounded-2xl font-serif font-black transition-all duration-500 border-2 flex items-center gap-3 group overflow-hidden relative ${
                    matchingImageIds 
                    ? 'bg-gradient-to-r from-red-900 to-red-950 text-red-500 border-red-600 shadow-[0_0_25px_rgba(153,27,27,0.4)]'
                    : 'text-red-500 border-red-900/40 hover:border-red-800 hover:bg-red-950/20 hover:shadow-[0_0_20px_rgba(153,27,27,0.2)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-red-500/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Scan size={22} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="tracking-widest uppercase">
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
            <div className="stranger-card px-8 py-6 text-sm text-red-100 bg-black/60 border-red-900/40 shadow-[0_0_30px_rgba(153,27,27,0.2)]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-red-600 border-t-transparent animate-spin shadow-[0_0_15px_rgba(220,38,38,0.5)]" aria-hidden="true" />
                <span className="font-serif font-bold tracking-[0.2em] uppercase text-red-500">Loading Gallery...</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="container mx-auto">
             {masonryImages.length > 0 ? (
               <MasonryGallery 
                 items={masonryImages} 
                 hasMore={hasMore} 
                 loadingMore={loadingMore}
                 onLoadMore={() => fetchMore?.(selectedCategory, selectedSubcategory || undefined)}
               />
             ) : (
                <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
                 <div className="stranger-card max-w-md mx-auto p-10">
                   <ImageIcon size={64} className="mx-auto mb-4 text-red-900/40" />
                   <h3 className="text-2xl font-serif font-black text-red-500 mb-2 tracking-widest uppercase">Lost in the Woods</h3>
                   {selectedCategory === 'All' ? (
                     <p className="text-gray-500 font-serif italic">No memories discovered yet. Check the flashlight.</p>
                   ) : (
                     <p className="text-gray-500 font-serif italic">{`No memories found in the ${selectedCategory} archives.`}</p>
                   )}
                 </div>
               </div>
             )}
          </div>
        )}
      </section>

      <style>{`
        .stranger-things-theme {
          background: radial-gradient(circle at center, #1a0505 0%, #0a0a0a 100%);
          color: #ffffff;
          font-family: 'Crimson Text', serif;
          min-height: 100vh;
          position: relative;
        }

        .stranger-things-theme::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url('https://www.transparenttextures.com/patterns/carbon-fibre.png');
          opacity: 0.05;
          pointer-events: none;
        }

        .stranger-card {
          background: rgba(10, 10, 10, 0.9);
          border: 1px solid rgba(153, 27, 27, 0.3);
          border-radius: 4px;
          backdrop-filter: blur(10px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .stranger-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid transparent;
          background: linear-gradient(to bottom right, rgba(220, 38, 38, 0.2), transparent, rgba(220, 38, 38, 0.1)) border-box;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
        }

        .scroll-animate {
          transition: all 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Custom scrollbar for some rows if needed */
        .filter-row::-webkit-scrollbar {
          height: 3px;
        }
        .filter-row::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .filter-row::-webkit-scrollbar-thumb {
          background: rgba(153, 27, 27, 0.5);
          border-radius: 4px;
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