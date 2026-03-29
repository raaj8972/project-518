import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, Zap } from 'lucide-react';
import ParticipantCarousel from '../../components/dashboard/ParticipantCarousel';
import BatchWar from '../../components/dashboard/BatchWar';
import AdmirersList from '../../components/dashboard/AdmirersList';

const SocialFeed: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      {/* ... existing header ... */}
      <section className="relative overflow-hidden rounded-[3rem] p-12 superia-glass-card border border-white/10 bg-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-red-600/10 opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] -ml-48 -mb-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <Zap className="w-3 h-3 fill-current" />
              <span>Community Impact Hub</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              Social <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-500">Feed</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl font-medium leading-relaxed">
              Witness the collective pulse of RICO Fest. Explore the legends in the spotlight and the batches dominating the leaderboard.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-[#1a1a1a] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white uppercase tracking-tighter">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-2 border-[#1a1a1a] bg-red-600 flex items-center justify-center text-xs font-black text-white">+99</div>
             </div>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Competitors</p>
          </div>
        </div>
      </section>

      {/* RICO STARS - The Spotlight */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500/20" />
              RICO STARS
            </h2>
            <p className="text-sm text-gray-500 font-medium">The most influential icons of the current season</p>
          </div>
        </div>
        <div className="superia-glass-card rounded-[3rem] py-12 border border-white/10 bg-white/[0.03] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/5 to-transparent pointer-events-none" />
             <ParticipantCarousel />
        </div>
      </section>

      {/* Batch War - The Hierarchy */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-8 px-6">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center border border-red-600/20">
                <Trophy className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Batch Hierarchy</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Points / Engagement / Victory</p>
              </div>
            </div>
            <BatchWar />
        </div>

        <div className="space-y-8">

          {/* Recent Admirers */}
          <AdmirersList />
        </div>
      </section>
    </motion.div>
  );
};

export default SocialFeed;
