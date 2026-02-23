import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { BRAND_YEAR } from '../../constants/brand';

export const DataTickerHub: React.FC = () => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 2000); // Pulse every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group w-full max-w-4xl mx-auto mt-4 px-4 sm:px-0 z-20">
      {/* Outer Glow container */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-blue-500/20 rounded-2xl blur-md opacity-50 group-hover:opacity-100 transition duration-1000"></div>
      
      {/* Ultra-thin glass control bar */}
      <div className="relative flex flex-col sm:flex-row items-center justify-between bg-[#0a0f1c]/80 backdrop-blur-2xl border border-white/5 rounded-2xl p-3 sm:px-6 sm:py-3 shadow-2xl overflow-hidden overflow-x-auto w-full">
        
        {/* Scanline texture */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px' }}></div>
        
        {/* Left Section: Live Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0 justify-center sm:justify-start">
           <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${pulse ? 'opacity-100' : 'opacity-40'}`}></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.2em] text-emerald-400/90 uppercase whitespace-nowrap">System Active</span>
        </div>

        {/* Center/Right Section: Data Points */}
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto justify-start sm:justify-end hide-scrollbar">
          
          <div className="flex items-center gap-2 group/item shrink-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-400/70 group-hover/item:text-indigo-400 transition-colors" />
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono">Date</span>
              <span className="text-[10px] sm:text-xs font-mono text-white/90 tracking-wider">APR 24-26, {BRAND_YEAR}</span>
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-white/10"></div>

          <div className="flex items-center gap-2 group/item shrink-0">
            <MapPin className="w-3.5 h-3.5 text-blue-400/70 group-hover/item:text-blue-400 transition-colors" />
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono">Location</span>
              <span className="text-[10px] sm:text-xs font-mono text-white/90 tracking-wider">KOLKATA, WB</span>
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-white/10"></div>

          <div className="flex items-center gap-2 group/item shrink-0">
            <Users className="w-3.5 h-3.5 text-purple-400/70 group-hover/item:text-purple-400 transition-colors" />
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono">Capacity</span>
              <span className="text-[10px] sm:text-xs font-mono text-white/90 tracking-wider">10,000+ PAX</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
