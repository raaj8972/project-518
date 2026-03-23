import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, X } from 'lucide-react';
import { TopStarProfile } from '../../hooks/useTopStars';
import DynamicBadge from './DynamicBadge';

interface ProfileModalProps {
  profile: TopStarProfile | null;
  onClose: () => void;
  onLike: (id: string, e?: React.MouseEvent, auraIdx?: number) => void;
  isLiked: boolean;
}

const auraGradients = [
  'from-yellow-400 via-amber-500 to-orange-600',
  'from-cyan-400 via-blue-500 to-indigo-600',
  'from-emerald-400 via-green-500 to-teal-600',
  'from-pink-400 via-rose-500 to-purple-600',
  'from-violet-400 via-fuchsia-500 to-red-600'
];

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose, onLike, isLiked }) => {
  if (!profile) return null;

  const isLegendary = profile.rank <= 5;

  return (
    <AnimatePresence>
      {profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-scrollbar pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 bg-black/95 backdrop-blur-3xl" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            className={`relative w-full max-w-xl bg-gradient-to-br from-white/10 to-transparent border rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden p-6 sm:p-12 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] ${
              isLegendary || profile.aura_color ? 'border-yellow-500/30' : 'border-white/10'
            }`}
            style={profile.background_url ? { backgroundImage: `url(${profile.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-8 sm:mb-12">
                 {(isLegendary || profile.aura_color) && (
                  <div className={`absolute inset-0 -m-4 sm:-m-8 rounded-full bg-gradient-to-tr ${profile.aura_color ? '' : auraGradients[(profile.rank - 1) % 5]} animate-spin-slow opacity-20 blur-3xl`}
                       style={profile.aura_color ? { backgroundColor: profile.aura_color } : {}} />
                )}
                <div className="relative w-32 h-32 sm:w-56 sm:h-56 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden border-2 sm:border-4 border-white/20 bg-gray-900 shadow-2xl">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                  ) : (
                    <User className="w-full h-full p-8 sm:p-12 text-white/5" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 sm:-bottom-6 sm:-right-6 scale-75 sm:scale-150">
                  <DynamicBadge tier={profile.tier} size="md" />
                </div>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter mb-2 px-2 uppercase">{profile.full_name}</h2>
              <div className="flex items-center gap-3 mb-8 sm:mb-12">
                <div className={`px-4 py-1.5 rounded-full ${isLegendary ? `bg-gradient-to-r ${auraGradients[(profile.rank - 1) % 5]}` : 'bg-white/5 border border-white/10'} text-black text-[10px] font-black uppercase tracking-[0.3em]`}>
                  <span className={isLegendary ? 'text-black' : 'text-gray-400'}>
                    Rank #{profile.rank} • {isLegendary ? 'RICO STAR' : 'LEGEND'}
                  </span>
                </div>
                {profile.batch && (
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{profile.batch}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full mb-8 sm:mb-12">
                <div className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/5 border border-white/10 group/stat hover:bg-white/[0.08] transition-colors">
                  <span className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 italic">Power Level</span>
                  <span className="text-2xl sm:text-4xl font-black text-white">{profile.xp} <span className="text-[10px] sm:text-sm text-yellow-500">XP</span></span>
                </div>
                <div className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/5 border border-white/10 group/stat hover:bg-white/[0.08] transition-colors">
                  <span className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 italic">Community Love</span>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                     <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-red-500 fill-current" />
                     <span className="text-2xl sm:text-4xl font-black text-white">{profile.likes_count}</span>
                  </div>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => onLike(profile.id, e, isLegendary ? profile.rank - 1 : undefined)}
                className={`w-full py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2.5rem] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-sm transition-all duration-500 shadow-2xl ${
                  isLiked 
                    ? 'bg-red-600 text-white shadow-red-600/50' 
                    : 'bg-white text-black hover:bg-red-500 hover:text-white'
                }`}
              >
                {isLiked ? 'Love Sent ❤️' : 'Send Love'}
              </motion.button>
            </div>
            
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 sm:top-10 sm:right-10 p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all z-50 border border-white/10"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </motion.div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}} />
    </AnimatePresence>
  );
};

export default ProfileModal;
