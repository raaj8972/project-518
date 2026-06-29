import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, TrendingUp } from 'lucide-react';
import ShoutOutBoard from '../../components/dashboard/ShoutOutBoard';

const Vibes: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >

      {/* Main Board Container - Centered and Focused */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5 blur-3xl opacity-20 pointer-events-none" />
          <ShoutOutBoard />
        </div>
      </div>

      {/* Community Guidelines / Info Card */}
      <footer className="max-w-3xl mx-auto rico-glass-card rounded-[2.5rem] p-10 border border-white/5 bg-white/[0.01] text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <TrendingUp className="w-8 h-8 text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-black uppercase tracking-widest text-lg">Board Guidelines</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              This board is for sharing positive energy and celebrating the fest. Please keep your messages supportive and clean. Real-time filtering is active.
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
