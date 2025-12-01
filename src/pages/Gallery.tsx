import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import DomeGallery from '../components/DomeGallery';

export const Gallery: React.FC = () => {
  const { galleryImages, eventCategories, loading } = useData() as any;
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...eventCategories.map((cat: any) => cat.name as string)];

  const selectedCategoryNormalized = (selectedCategory || '').toString().trim().toLowerCase();

  const filteredImages = (selectedCategory === 'All'
    ? galleryImages
    : galleryImages.filter((image: any) => {
        const imgCat = (image?.category || '').toString().trim().toLowerCase();
        return imgCat === selectedCategoryNormalized;
      })).filter((img: any) => img.src && img.src.trim() !== '');

  // Build images for DomeGallery. Never pass undefined to avoid demo/default images.
  const domeImages = filteredImages.map((img: any) => ({ src: img.src as string, alt: (img.title as string) || '' }));
  // Only show the Dome when we actually have images for the current filter.
  const showDome = filteredImages.length > 0;

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

    // Immediately reveal any nodes already in/near viewport so category switches
    // or route returns don't leave the page blank while the observer settles.
    try {
      const nodesNow = Array.from(document.querySelectorAll('.scroll-animate')) as HTMLElement[];
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      nodesNow.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.top < viewportH * 0.9) {
          n.classList.add('animate-in');
          try { (n as any).__observed = true; } catch {}
        }
      });
    } catch (e) { /* ignore */ }

    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 300);
    const safety = setTimeout(() => {
      document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
    }, 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); observer.disconnect(); };
  }, [selectedCategory, galleryImages.length]);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lightbox removed; DomeGallery provides its own enlarge experience

  // No category color helper needed in DomeGallery layout

  // Social media links (unused here, kept in context if needed elsewhere)

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      {/* Hero Section removed as per request */}

      {/* Category Filter (optional) */}
      <section className="py-12 pt-24 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card inline-block p-3 md:p-4">
                <div className="filter-row flex gap-2 md:gap-3 justify-start md:justify-center flex-nowrap overflow-x-auto max-w-full px-1 md:px-0">
                  {categories.map((category) => {
                    const categoryData = eventCategories.find((cat: any) => cat.name === category);
                    const categoryColor = categoryData ? categoryData.color : '#6B7280';
                    
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`filter-btn px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-all duration-300 border-2 whitespace-nowrap ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                            : 'text-gray-300 border-gray-600 hover:border-purple-500/50 hover:text-purple-400'
                        }`}
                      >
                        {category !== 'All' && (
                          <span 
                            className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full mr-1.5 md:mr-2 inline-block"
                            style={{ backgroundColor: categoryColor }}
                          ></span>
                        )}
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* dev debug panel removed */}
        </div>
      </section>

      {/* Dome Gallery (immersive) */}
      <section className="relative" style={{ height: '90vh', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(10,10,20,0.6) 0%, rgba(10,10,10,0.95) 70%)'
        }} />
        {/* Loading state: prevent showing default/demo images before data arrives */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="cyberpunk-card px-6 py-4 text-sm text-gray-300 bg-black/30 border-cyan-500/30">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" aria-hidden="true" />
                <span>Loading gallery…</span>
              </div>
            </div>
          </div>
        )}
        {!loading && showDome && (
          <div className="absolute inset-0 dome-fade-in">
            <DomeGallery
              images={domeImages}
              fit={0.52}
              fitBasis="auto"
              minRadius={480}
              maxRadius={1200}
              padFactor={0.18}
              overlayBlurColor="#0a0a0a"
              grayscale={false}
              imageBorderRadius="18px"
              openedImageBorderRadius="18px"
              openedImageWidth="70vmin"
              openedImageHeight="70vmin"
            />
          </div>
        )}

          {/* No Images Message */}
          {!loading && !showDome && (
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

          {/* Lightbox removed: DomeGallery handles enlarge */}

          {/* Stats (optional) removed for cleaner dome focus */}
      </section>

      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        /* Soft fade-in for Dome once real images are ready */
        .dome-fade-in {
          animation: domeFadeIn 320ms ease-out both;
        }
        @keyframes domeFadeIn {
          from { opacity: 0; transform: scale(0.985); filter: blur(2px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @media (prefers-reduced-motion: reduce) { .dome-fade-in { animation: none; } }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        /* particles CSS removed */
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .neon-text {
          color: #00ffff;
          text-shadow: 
            0 0 2px #00ffff,
            0 0 4px #00ffff;
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 2px #ff00ff,
            0 0 4px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 2px #00ffff,
            0 0 4px #00ffff;
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 2px #8a2be2,
            0 0 4px #8a2be2;
        }

        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #ff00ff;
          color: #ff00ff;
          box-shadow: 
            0 0 10px rgba(255, 0, 255, 0.2),
            inset 0 0 10px rgba(255, 0, 255, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(255, 0, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 0, 255, 0.4),
            inset 0 0 20px rgba(255, 0, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-btn-secondary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.2),
            inset 0 0 10px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .cyberpunk-card:hover::before {
          transform: translateX(0);
        }

        .cyberpunk-card:hover {
          border-color: rgba(255, 0, 255, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(255, 0, 255, 0.1);
          transform: translateY(-5px);
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          /* Make category row a one-line scroller */
          .filter-row {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .filter-row::-webkit-scrollbar { display: none; }
          .filter-btn { font-size: 0.85rem; }
          .cyberpunk-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          /* particles CSS removed */
          
          .cyberpunk-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .cyberpunk-card {
            margin: 0 4px;
          }
        }
        
        @media (max-width: 480px) {
          .filter-btn { font-size: 0.8rem; }
          .cyberpunk-card { padding: 8px 6px !important; }
          .cyberpunk-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }
      `}</style>
    </div>
  );
};