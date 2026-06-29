import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, X, Crown, Star, Trophy, Shield, Calendar, Award } from 'lucide-react';
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
  const usernameText = profile.username || profile.full_name.toLowerCase().replace(/\s+/g, '');

  // Calculate R Points Breakdown dynamically from profile object if available
  const breakdown = profile.points_breakdown || {
    likes: (profile.likes_count || 0) * 10,
    participation: (profile.participated_events?.length || 0) * 15,
    rounds: (profile.rounds_cleared || 0) * 20,
    finalRound: 0,
    prizes: 0,
    events_count: profile.participated_events?.length || 0
  };
  const totalRPoints = profile.hype_score || (breakdown.likes + breakdown.participation + breakdown.rounds + breakdown.finalRound + breakdown.prizes);

  // Dynamic achievement badges based on user stats
  const achievements: string[] = [];
  if (isLegendary) achievements.push('Legendary Star 👑');
  if (profile.likes_count >= 10) achievements.push('Crowd Favorite ❤️');
  if (profile.participated_events && profile.participated_events.length >= 3) achievements.push('Super Active ⚡');
  if (profile.rounds_cleared && profile.rounds_cleared >= 2) achievements.push('Qualified Champion 🏆');

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
            className={`relative w-full max-w-lg bg-gradient-to-br from-[#12131a] to-[#0a0a0f] border rounded-[3rem] overflow-hidden p-6 sm:p-8 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto no-scrollbar ${
              isLegendary || profile.aura_color ? 'border-amber-500/30' : 'border-white/10'
            }`}
            style={profile.background_url ? { backgroundImage: `url(${profile.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {/* Ambient Background Aura */}
            {(isLegendary || profile.aura_color) && (
              <div className={`absolute inset-0 bg-gradient-to-tr ${profile.aura_color ? '' : auraGradients[(profile.rank - 1) % 5]} opacity-[0.04] blur-3xl pointer-events-none`}
                   style={profile.aura_color ? { backgroundColor: profile.aura_color } : {}} />
            )}

            <div className="flex flex-col items-center text-center relative z-10">
              
              {/* Profile Photo */}
              <div className="relative mb-4 mt-2">
                <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-gray-950 border-4 shadow-2xl transition-all duration-500 ${
                  isLegendary ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.25)]' : 'border-white/20'
                }`}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                  ) : (
                    <User className="w-full h-full p-6 text-white/5" />
                  )}
                </div>

                {/* dynamic XP badge overlay at bottom */}
                <div className="absolute -bottom-2 right-1/2 translate-x-1/2 scale-75 shadow-xl">
                  <DynamicBadge tier={profile.tier} size="sm" />
                </div>
              </div>

              {/* Names and Usernames */}
              <div className="space-y-0.5 mb-4">
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight">
                  {profile.full_name}
                </h2>
                <p className="text-xs font-black text-indigo-400 tracking-wider">
                  @{usernameText}
                </p>
              </div>

              {/* Ranks & Batch Badge */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                  isLegendary 
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' 
                    : 'text-gray-400 border-white/10 bg-white/5'
                }`}>
                  {isLegendary ? <Crown className="w-2.5 h-2.5 fill-current" /> : <Star className="w-2.5 h-2.5 fill-current" />}
                  <span>Rank #{profile.rank} • {isLegendary ? 'RICO STAR' : 'Star'}</span>
                </div>
                {profile.batch && (
                  <span className="px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-gray-500 text-[9px] font-black uppercase tracking-widest">
                    Class of {profile.batch}
                  </span>
                )}
              </div>

              {/* R Points Total & Breakdown */}
              <div className="w-full bg-[#161822]/90 border border-indigo-500/20 rounded-2xl p-5 mb-5 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Award className="w-24 h-24 text-indigo-400" />
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-0.5">Total Rico Power</span>
                    <span className="text-2xl font-black text-indigo-400">{totalRPoints} <span className="text-[10px] font-bold text-white uppercase tracking-widest">R POINTS</span></span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-0.5">Community Rank</span>
                    <span className="text-xl font-black text-white">#{profile.rank}</span>
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-white/[0.04] pt-3.5 text-[11px] font-semibold text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> Likes Received ({profile.likes_count || 0})</span>
                    <span className="font-black text-white">+{breakdown.likes} R Pts ({profile.likes_count || 0} × 10)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-400" /> Events Joined ({breakdown.events_count})</span>
                    <span className="font-black text-white">+{breakdown.participation} R Pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> Rounds Qualified ({profile.rounds_cleared || 0})</span>
                    <span className="font-black text-white">+{breakdown.rounds} R Pts</span>
                  </div>
                  {breakdown.finalRound > 0 && (
                    <div className="flex items-center justify-between text-indigo-300">
                      <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-indigo-400 fill-current" /> Final Rounds Cleared</span>
                      <span className="font-black">+{breakdown.finalRound} R Pts</span>
                    </div>
                  )}
                  {breakdown.prizes > 0 && (
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-500 fill-current" /> Winner Placement Bonuses</span>
                      <span className="font-black">+{breakdown.prizes} R Pts</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Achievements Badges */}
              {achievements.length > 0 && (
                <div className="w-full mb-5 text-left">
                  <span className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 italic">Earned Achievements</span>
                  <div className="flex flex-wrap gap-1.5">
                    {achievements.map((ach, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg border border-white/5 bg-white/[0.01] text-[9px] font-black text-white/70 shadow-sm">
                        {ach}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Participated Events section */}
              <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400" /> Participated Events</span>
                  {profile.participated_events && (
                    <span className="text-gray-600 font-bold">{profile.participated_events.length} joined</span>
                  )}
                </div>
                {profile.participated_events && profile.participated_events.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                    {profile.participated_events.map((evt, idx) => (
                      <span 
                        key={idx} 
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-[10px] font-black text-indigo-300"
                      >
                        <Award className="w-2.5 h-2.5 text-indigo-400" />
                        {evt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-semibold text-gray-600 italic">No approved event participations yet.</p>
                )}
              </div>

              {/* Action Button */}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={(e) => onLike(profile.id, e, isLegendary ? profile.rank - 1 : undefined)}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-500 shadow-2xl ${
                  isLiked 
                    ? 'bg-red-500 text-white shadow-red-500/20' 
                    : 'bg-white text-black hover:bg-red-500 hover:text-white shadow-white/5'
                }`}
              >
                {isLiked ? 'Love Sent ❤️' : 'Send Love'}
              </motion.button>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border border-white/5 transition-all z-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </AnimatePresence>
  );
};

export default ProfileModal;
