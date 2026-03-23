import React from 'react';
import { Trophy, Users, ArrowRight, Info, Layout } from 'lucide-react';
import { AnnualSportsEvent, SportsSeason } from '../../types/data';

interface SportCardProps {
  sportItem: AnnualSportsEvent | SportsSeason;
  regCount: number;
  isOpen: boolean;
  onViewDetails: (sport: AnnualSportsEvent | SportsSeason) => void;
  onRegister: (id: string) => void;
}

const SportCard: React.FC<SportCardProps> = ({
  sportItem,
  regCount,
  isOpen,
  onViewDetails,
  onRegister,
}) => {
  const imageUrl = (sportItem as any).image_url || (sportItem as any).image;

  return (
    <div className="sport-card group relative bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-1 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-red-600/40">
      <div className="p-8 h-full flex flex-col justify-between bg-[#08080c] rounded-[2.9rem] relative z-10 transition-colors group-hover:bg-[#0c0c14]">
        <div>
          {/* Image Header */}
          <div className="relative h-48 -mt-8 -mx-8 mb-8 overflow-hidden rounded-t-[2.9rem] border-b border-white/5 bg-white/[0.02]">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={sportItem.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600/10 to-transparent">
                <Trophy size={48} className="text-red-600/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-transparent" />
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="px-4 py-1.5 rounded-full bg-red-600/10 border border-red-600/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
                {'category' in sportItem ? sportItem.category : 'Major'}
              </div>
            </div>
            <button 
              onClick={() => onViewDetails(sportItem)}
              className="p-3 bg-white/5 hover:bg-red-600 hover:text-white rounded-2xl transition-all text-white/40"
              title="View Details"
            >
              <Info size={18} />
            </button>
          </div>

          <h3 className="text-3xl font-black mb-4 group-hover:text-red-500 transition-colors uppercase tracking-tight leading-none">
            {sportItem.name}
          </h3>
          
          <p className="text-white/30 text-sm font-light leading-relaxed mb-8 line-clamp-3">
            {sportItem.description || 'Global championship event featuring top tier talents from across the nation.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/[0.05] border border-white/10 rounded-2xl shadow-inner">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-orange-500" />
              <span className="text-sm font-black text-white">{regCount} <span className="text-white/50 font-medium tracking-tight">Competitors</span></span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] animate-pulse" />
          </div>

          {isOpen ? (
            <button 
              onClick={() => onRegister(String(sportItem.id))}
              className="w-full py-5 bg-red-600 text-white hover:scale-[1.02] active:scale-95 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(220,38,38,0.3)] border-none relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <span className="relative z-10">Enlist Now</span>
              <ArrowRight size={18} className="relative z-10" />
            </button>
          ) : (
            <div className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] text-white/20 cursor-not-allowed">
              <Layout size={16} className="opacity-10" />
              Closed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SportCard);
