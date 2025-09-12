import React, { useState, useEffect } from 'react';
import { X, Download, Image as ImageIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
// import GalleryArcSlider from '../components/GalleryArcSlider';
import GalleryWave from '../components/GalleryWave';
import HeroBackground from '../components/HeroBackground';

export const Gallery: React.FC = () => {
  const { galleryImages, eventCategories, gallerySettings } = useData();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...eventCategories.map(cat => cat.name)];

  const filteredImages = selectedCategory === 'All' 
    ? galleryImages 
    : galleryImages.filter(image => image.category === selectedCategory);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

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

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    const currentIndex = filteredImages.findIndex(img => img.id === galleryImages[selectedImage].id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
    } else {
      newIndex = currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    const newImageIndex = galleryImages.findIndex(img => img.id === filteredImages[newIndex].id);
    setSelectedImage(newImageIndex);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = eventCategories.find(cat => cat.name === categoryName);
    return category ? category.color : '#6B7280';
  };

  // Social media links (unused here, kept in context if needed elsewhere)

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="gallery" />

        {/* Floating Particles */}
        <div className="particles-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              ></div>
            ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <ImageIcon className="w-4 h-4 mr-2 animate-pulse" />
              DIGITAL MEMORIES
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title">
              CYBER <span className="neon-purple">GALLERY</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Relive the <span className="neon-pink">magic</span> of RICORRENZA through our 
              <span className="neon-blue"> curated collection</span> of digital memories
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card inline-block p-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {categories.map((category) => {
                    const categoryData = eventCategories.find(cat => cat.name === category);
                    const categoryColor = categoryData ? categoryData.color : '#6B7280';
                    
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 border-2 ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                            : 'text-gray-300 border-gray-600 hover:border-purple-500/50 hover:text-purple-400'
                        }`}
                      >
                        {category !== 'All' && (
                          <span 
                            className="w-3 h-3 rounded-full mr-2 inline-block"
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
        </div>
      </section>

      {/* Gallery 3D Stacked Scroll */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          {/* CSS 3D Wave (reference style using :has and sibling selectors) */}
          <GalleryWave
            items={filteredImages.map(img => ({ id: img.id, src: img.src, title: img.title }))}
            revealEnabled={gallerySettings?.reveal_enabled ?? true}
            revealOrientation={gallerySettings?.reveal_orientation ?? 'horizontal'}
            revealDurationMs={gallerySettings?.reveal_duration_ms ?? 800}
            onItemClick={(idx) => {
              const clicked = filteredImages[idx];
              if (!clicked) return;
              const globalIndex = galleryImages.findIndex(g => g.id === clicked.id);
              if (globalIndex >= 0) setSelectedImage(globalIndex);
            }}
          />

          {/* No Images Message */}
          {filteredImages.length === 0 && (
            <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
              <div className="cyberpunk-card max-w-md mx-auto">
                <ImageIcon size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Images Found</h3>
                <p className="text-gray-500">
                  {selectedCategory === 'All' 
                    ? "No images are currently available."
                    : `No images found in the ${selectedCategory} category.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Lightbox */}
          {selectedImage !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
              <div className="relative max-w-6xl max-h-full">
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 text-white hover:text-purple-400 z-10 cyberpunk-btn cyberpunk-btn-secondary"
                >
                  <X size={24} />
                </button>
                
                <button
                  onClick={() => navigateImage('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-purple-400 text-4xl z-10 cyberpunk-btn cyberpunk-btn-secondary"
                >
                  ‹
                </button>
                
                <button
                  onClick={() => navigateImage('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-purple-400 text-4xl z-10 cyberpunk-btn cyberpunk-btn-secondary"
                >
                  ›
                </button>
                
                <img
                  src={galleryImages[selectedImage].src}
                  alt={galleryImages[selectedImage].title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="cyberpunk-card p-4">
                    <h3 className="text-lg font-semibold mb-2 neon-text">{galleryImages[selectedImage].title}</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(galleryImages[selectedImage].category) }}
                        ></span>
                        <span className="text-sm text-gray-300">{galleryImages[selectedImage].category} • {galleryImages[selectedImage].year}</span>
                      </div>
                      <button
                        onClick={() => window.open(galleryImages[selectedImage].src, '_blank')}
                        className="cyberpunk-btn cyberpunk-btn-primary"
                      >
                        <span className="relative z-10 flex items-center">
                          <Download size={16} className="mr-2" />
                          DOWNLOAD
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-16 scroll-animate opacity-0 transform translate-y-20">
            <div className="cyberpunk-card">
              <div className="grid md:grid-cols-4 gap-6 text-center p-8">
                <div>
                  <div className="text-3xl font-bold neon-purple mb-2">{galleryImages.length}</div>
                  <div className="text-gray-400">Total Photos</div>
                </div>
                {eventCategories.slice(0, 3).map((category) => (
                  <div key={category.id}>
                    <div className="text-3xl font-bold neon-blue mb-2">
                      {galleryImages.filter(img => img.category === category.name).length}
                    </div>
                    <div className="text-gray-400">{category.name} Events</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

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

        .particles-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 50%;
          animation: particleFloat linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
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
            0 0 3px #00ffff,
            0 0 6px #00ffff;
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 3px #ff00ff,
            0 0 6px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 3px #00ffff,
            0 0 6px #00ffff;
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 3px #8a2be2,
            0 0 6px #8a2be2;
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
          .cyberpunk-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          .particles-container {
            display: none;
          }
          
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