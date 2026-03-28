import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User } from 'lucide-react';
import { useAdmirers } from '../../hooks/useAdmirers';
import DynamicBadge from './DynamicBadge';

const AdmirersList: React.FC = () => {
  const { admirers, loading } = useAdmirers();

  if (loading) {
    return (
      <div className="rico-glass-card rounded-[2.5rem] p-8 border border-white/10 bg-white/5 animate-pulse">
        <div className="h-4 w-24 bg-white/10 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rico-glass-card rounded-[2.5rem] p-8 border border-white/10 bg-white/[0.03] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <Heart className="w-16 h-16 text-red-500 group-hover:scale-110 transition-transform duration-500" />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Recent Admirers
        </h4>
        <span className="text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] animate-pulse">Live Feed</span>
      </div>

      {admirers.length === 0 ? (
        <div className="py-12 text-center space-y-3 opacity-40">
          <Heart className="w-8 h-8 mx-auto text-gray-500" />
          <div className="space-y-1">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Quiet in the cosmos...</p>
            <p className="text-[9px] text-gray-600">Your profile is waiting for its first spark!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
          <AnimatePresence mode="popLayout">
            {admirers.map((admirer) => (
              <motion.div
                key={`${admirer.liker_id}-${admirer.created_at}`}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center justify-between group/item p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-red-500/20 transition-all cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-gray-950 group-hover/item:border-red-500/30 transition-colors">
                    {admirer.liker_avatar ? (
                      <img src={admirer.liker_avatar} alt={admirer.liker_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-full h-full p-2 text-white/5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate max-w-[100px] group-hover/item:text-red-400 transition-colors">
                      {admirer.liker_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <DynamicBadge tier={admirer.liker_tier || 'bronze'} size="sm" />
                       <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter tabular-nums">
                         {new Date(admirer.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       </span>
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  className="p-2 rounded-xl bg-red-500/5 border border-red-500/10 group-hover/item:bg-red-500/20 transition-all"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-white/10">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
          {admirers.length} {admirers.length === 1 ? 'Person' : 'People'} Dig Your Vibe
        </p>
      </div>
    </div>
  );
};

export default AdmirersList;
