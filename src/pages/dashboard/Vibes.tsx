import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, TrendingUp } from 'lucide-react';
import ShoutOutBoard from '../../components/dashboard/ShoutOutBoard';

const Vibes: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      {/* Immersive Header */}
      <section className="relative overflow-hidden rounded-[3rem] p-12 superia-glass-card border border-white/10 bg-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-orange-600/10 opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3" />
              <span>Collective Resonance Hub</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-orange-500">Vibe Feed</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl font-medium leading-relaxed mx-auto md:mx-0">
              Connect with the collective energy of RICO Fest. Share your thoughts, cheer for your peers, and let the cosmic vibrations flow.
            </p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-4">
            <div className="px-8 py-5 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md text-center">
              <div className="flex items-center gap-3 mb-1 justify-center">
                <Users className="w-6 h-6 text-red-500" />
                <span className="text-3xl font-black text-white uppercase tracking-tighter">Live</span>
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Channel Active</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Board Container - Centered and Focused */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5 blur-3xl opacity-20 pointer-events-none" />
          <ShoutOutBoard />
        </div>
      </div>

      {/* Community Guidelines / Info Card */}
      <footer className="max-w-3xl mx-auto superia-glass-card rounded-[2.5rem] p-10 border border-white/5 bg-white/[0.01] text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <TrendingUp className="w-8 h-8 text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-black uppercase tracking-widest text-lg">Atmospheric Standards</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              This space is for support, celebration, and pure fest energy. Keep it authentic, keep it positive. 
              Real-time monitoring is active to preserve the atmosphere.
            </p>
          </div>
          <div className="flex gap-4">
            {["Support", "Celebrate", "Engage"].map(tag => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default Vibes;
