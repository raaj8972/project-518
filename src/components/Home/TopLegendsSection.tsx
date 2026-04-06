import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, Crown, X, Trophy } from 'lucide-react';
import DynamicBadge from '../dashboard/DynamicBadge';
import AutoCarousel from '../AutoCarousel';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';

const auraGradients = [
  'from-cyan-400 via-blue-500 to-purple-600',
  'from-indigo-500 via-violet-500 to-purple-600',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-blue-400 via-indigo-500 to-violet-500',
  'from-violet-500 via-purple-600 to-indigo-600'
];

const TopLegendsSection: React.FC = () => {
  const { stars: legends } = useTopStars(5);
  const [selectedProfile, setSelectedProfile] = useState<TopStarProfile | null>(null);

  return (
    <section className="py-24 relative overflow-hidden bg-black">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-cyan-400 font-sans italic font-black tracking-[0.5em] uppercase text-xs"
          >
            <Crown className="w-4 h-4 text-cyan-400" />
            RICO
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mt-2 drop-shadow-[0_4px_20px_rgba(34,211,238,0.5)]"
          >
            RICO <span className="font-sans italic bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 drop-shadow-[0_0_20px_rgba(217,70,239,0.5)]">STARS</span>
          </motion.h2>
          <p className="text-cyan-100 max-w-xl mx-auto text-[10px] font-bold uppercase tracking-widest mt-4">
            Ranking: 500x Love / 1x XP • Swipe to Explore
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <AutoCarousel
            intervalMs={4000}
            showArrows={true}
            showDots={true}
            pauseOnHover={true}
            className="pb-20"
          >
            {legends.map((legend, idx) => {
              const customAura = legend.aura_color;
              const customBg = legend.background_url;
              const aura = customAura || auraGradients[idx % auraGradients.length];

              return (
                <div key={legend.id} className="px-4 py-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -15, scale: 1.05 }}
                    onClick={() => setSelectedProfile(legend)}
                    className="relative w-[280px] md:w-[320px] p-8 pb-12 rounded-[2rem] border border-cyan-500/30 backdrop-blur-3xl bg-black/80 hover:bg-black shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all duration-700 cursor-pointer overflow-visible group mx-auto"
                    style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {/* Rank Badge */}
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-gradient-to-r ${customAura ? '' : aura} flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(34,211,238,0.5)] z-40 transition-transform`}
                         style={customAura ? { backgroundColor: customAura } : {}}>
                      SCENE #{legend.rank}
                    </div>

                    <div className="relative mb-6 mx-auto w-36 h-36 group/avatar-container mt-4">
                      {/* Sub-aura Bloom */}
                      <motion.div 
                        animate={{ 
                          opacity: [0.3, 0.5, 0.3],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute -inset-8 bg-gradient-to-tr ${customAura ? '' : aura} opacity-40 blur-2xl z-0 rounded-full`} 
                        style={customAura ? { backgroundColor: customAura } : {}}
                      />
                      <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-gray-900 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] z-10 transition-all duration-700 group-hover:border-fuchsia-500/80">
                        {legend.avatar_url ? (
                          <img src={legend.avatar_url} alt={legend.full_name} className="w-full h-full object-cover transition-all duration-700" />
                        ) : (
                          <User className="w-full h-full p-8 text-cyan-400/20" />
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-3 z-30 transform scale-125 group-hover/avatar-container:scale-150 transition-transform duration-500">
                        <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-purple-600 shadow-[0_0_20px_rgba(217,70,239,0.8),inset_0_2px_2px_rgba(255,255,255,0.5)] border border-white/20 group/trophy overflow-hidden">
                          {/* 3D Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/trophy:translate-x-full transition-transform duration-1000" />
                          <Crown className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                        </div>
                      </div>
                    </div>

                    <div className="text-center space-y-1 mb-8">
                      <span className="block font-sans italic font-black text-white text-2xl tracking-tight truncate drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{legend.full_name}</span>
                      <span className="block text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">
                        RICO STAR
                      </span>
                    </div>

                    <div className="flex gap-4 justify-center relative z-20">
                      <div className="relative px-5 py-3 rounded-lg bg-black/50 border border-cyan-500/30 overflow-hidden group/stat transition-all hover:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <span className="block text-[8px] text-cyan-400 font-black uppercase tracking-[0.2em] opacity-80 mb-1">XP Power</span>
                        <span className="text-sm font-sans italic font-black text-white drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{legend.xp}</span>
                      </div>
                      <div className="relative px-5 py-3 rounded-lg bg-black/50 border border-fuchsia-500/30 overflow-hidden group/stat transition-all hover:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                        <span className="block text-[8px] text-fuchsia-400 font-black uppercase tracking-[0.2em] opacity-80 mb-1">Box Office</span>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-fuchsia-500 fill-current drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]" />
                          <span className="text-sm font-sans italic font-black text-white drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">{legend.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AutoCarousel>
        </div>
      </div>

      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProfile(null)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className={`relative w-full max-w-xl bg-black/60 border border-white/10 rounded-[4rem] overflow-hidden p-12 backdrop-blur-3xl shadow-4xl`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-12">
                  <div className={`absolute inset-0 -m-4 rounded-[4.5rem] bg-gradient-to-tr ${auraGradients[selectedProfile.rank - 1]} animate-spin-slow opacity-30 blur-2xl`} />
                  <div className="relative w-56 h-56 rounded-[3.5rem] overflow-hidden border-4 border-white/20 bg-gray-900 shadow-2xl">
                    {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-12 text-white/5" />}
                  </div>
                  <div className="absolute -bottom-6 -right-6 scale-150"><DynamicBadge tier={selectedProfile.tier} size="md" /></div>
                </div>

                <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{selectedProfile.full_name}</h2>
                <div className="px-5 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12">
                   Rank #{selectedProfile.rank} • RICO STAR
                </div>

                <div className="grid grid-cols-2 gap-6 w-full mb-12">
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
                    <span className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Power Level</span>
                    <span className="text-4xl font-black text-white">{selectedProfile.xp} <span className="text-xs text-yellow-500">XP</span></span>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
                    <span className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Community Love</span>
                    <div className="flex items-center justify-center gap-2">
                       <Heart className="w-6 h-6 text-indigo-400 fill-current shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                       <span className="text-4xl font-black text-white">{selectedProfile.likes_count}</span>
                    </div>
                  </div>
                </div>

                <a 
                  href="/student/login"
                  className="w-full py-6 rounded-[2.5rem] bg-indigo-600 text-white font-black uppercase tracking-[0.4em] text-sm shadow-2xl shadow-indigo-600/50 transition-transform active:scale-95 text-center"
                >
                  Join the Hype
                </a>
              </div>
              
              <button onClick={() => setSelectedProfile(null)} className="absolute top-10 right-10 p-4 rounded-2xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}} />
    </section>
  );
};

export default TopLegendsSection;
