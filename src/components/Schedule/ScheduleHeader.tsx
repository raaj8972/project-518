import React from 'react';
import { Calendar, Search, Filter } from 'lucide-react';

interface ScheduleHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  allCategories: string[];
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  allCategories,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[#ff3333] mb-2">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-bold tracking-[0.2em] uppercase">Event Timeline</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white">
          RICO <span className="text-[#ff3333]">SCHEDULE</span>
        </h1>
        <p className="text-gray-400 max-w-xl text-lg">
          Don't miss a single moment. Real-time updates for all events, games, and performances across the festival.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch md:items-center">
        <div className="relative group flex-1 sm:min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#ff3333] transition-colors" />
          <input
            type="text"
            placeholder="Search events, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff3333]/50 focus:border-[#ff3333]/50 transition-all placeholder:text-gray-600"
          />
        </div>
        
        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
          <Filter className="w-5 h-5 text-gray-400 ml-3 mr-2" />
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-transparent text-white py-3 pr-8 focus:outline-none appearance-none cursor-pointer"
          >
            {allCategories.map(cat => (
              <option key={cat} value={cat} className="bg-[#0a0a0a]">{cat}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ScheduleHeader;
