import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Music, 
  Camera, 
  Palette, 
  Mic2, 
  Theater, 
  Flame
} from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('music')) return <Music className="w-4 h-4" />;
  if (c.includes('photography') || c.includes('media')) return <Camera className="w-4 h-4" />;
  if (c.includes('art') || c.includes('fine')) return <Palette className="w-4 h-4" />;
  if (c.includes('dance') || c.includes('stage')) return <Theater className="w-4 h-4" />;
  if (c.includes('drama') || c.includes('theatre')) return <Theater className="w-4 h-4" />;
  if (c.includes('vocal') || c.includes('speech')) return <Mic2 className="w-4 h-4" />;
  if (c === 'all') return <Sparkles className="w-4 h-4" />;
  return <Flame className="w-4 h-4" />;
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector('.active-category');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedCategory]);

  return (
    <section className="py-8 relative">
      <div className="max-w-7xl mx-auto px-4">
        <div className="scroll-animate opacity-0 transform translate-y-10">
          <div className="relative group">
            {/* Glossy Background Container */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-violet-900/15 to-indigo-600/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-2 md:p-3 shadow-2xl overflow-hidden">
              <div 
                ref={scrollRef}
                className="flex gap-2 items-center overflow-x-auto no-scrollbar scroll-smooth px-2 py-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categories.map((category: string) => {
                  const isActive = selectedCategory === category;
                  return (
                    <motion.button
                      key={category}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCategory(category)}
                      className={`
                        relative flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs md:text-sm
                        transition-all duration-500 whitespace-nowrap uppercase tracking-[0.2em]
                        ${isActive ? 
                          'text-white active-category' : 
                          'text-gray-400 hover:text-indigo-400'
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute inset-0 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] rounded-2xl z-0"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                      
                      <span className="relative z-10 flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {category}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Edge gradients for scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/40 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};
