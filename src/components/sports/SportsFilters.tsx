import React from 'react';
import { Search } from 'lucide-react';

interface SportsFiltersProps {
  selectedCategory: 'All' | 'Indoor' | 'Outdoor';
  setSelectedCategory: (category: 'All' | 'Indoor' | 'Outdoor') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SportsFilters: React.FC<SportsFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <section className="sticky top-16 z-[100] py-6 border-y border-white/5 bg-black/40 backdrop-blur-2xl">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['All', 'Indoor', 'Outdoor'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                  ? 'bg-red-600 text-white shadow-red-600/40 shadow-2xl' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text" 
            placeholder="LOCATE YOUR BATTLE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-red-600/50 transition-all placeholder:text-white/10 uppercase tracking-widest"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(SportsFilters);
