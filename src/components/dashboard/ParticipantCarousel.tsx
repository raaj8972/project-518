import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { User, Heart, Star, Crown } from 'lucide-react';
import ProfileModal from './ProfileModal';

const HypeParticles = ({ x, y, color }: { x: number, y: number, color?: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0, x: x - 20, y: y - 20 }}
          animate={{ 
            opacity: 0, 
            scale: [0, 1.5, 0.5], 
            x: x - 20 + (Math.random() - 0.5) * 150, 
            y: y - 20 + (Math.random() - 0.5) * 150,
            rotate: Math.random() * 360
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute"
        >
          {i % 2 === 0 ? <Heart className={`w-4 h-4 ${color || 'text-red-500'} fill-current`} /> : <Star className="w-3 h-3 text-yellow-400 fill-current" />}
        </motion.div>
      ))}
    </div>
  );
};

const ParticipantCarousel: React.FC = () => {
  const { user } = useStudentAuth();
  const { likeProfile: toggleLike } = useXPEngine();
  const { stars: participants, loading, refetch, updateStar } = useTopStars(20);
  
  const [myLikes, setMyLikes] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TopStarProfile | null>(null);
  const [bursts, setBursts] = useState<{ id: string, x: number, y: number, color?: string }[]>([]);

  // Fetch my current likes to sync UI
  useEffect(() => {
    if (!user) return;
    
    const fetchMyLikes = async () => {
      const { data } = await supabase
        .from('profile_likes')
        .select('profile_id')
        .eq('liker_id', user.id);
      
      if (data) {
        setMyLikes(data.map(l => String(l.profile_id)));
      }
    };
    
    fetchMyLikes();
  }, [user]);

  const auraGradients = [
    'from-amber-400 via-orange-500 to-red-500',
    'from-cyan-400 via-blue-500 to-purple-600',
    'from-emerald-400 via-teal-500 to-cyan-500',
    'from-fuchsia-500 via-pink-500 to-rose-600',
    'from-violet-500 via-purple-600 to-indigo-600'
  ];

  const triggerBurst = (id: string, e: React.MouseEvent, auraIdx?: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const colorClass = auraIdx !== undefined ? auraGradients[auraIdx % auraGradients.length].split(' ')[0].replace('from-', 'text-') : undefined;
    const newBurst = { id: `${id}-${Date.now()}`, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: colorClass };
    setBursts(prev => [...prev, newBurst]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== newBurst.id)), 1000);
  };

  // Sync selectedProfile with updated participants after refetch or realtime event
  React.useEffect(() => {
    if (selectedProfile) {
      const updated = participants.find(p => p.id === selectedProfile.id);
      if (updated && (updated.likes_count !== selectedProfile.likes_count || updated.xp !== selectedProfile.xp)) {
        setSelectedProfile(updated);
      }
    }
  }, [participants, selectedProfile]);

  const handleLike = async (id: string, e?: React.MouseEvent, auraIdx?: number) => {
    if (e) triggerBurst(id, e, auraIdx);
    
    // 1. OPTIMISTIC UI UPDATE
    const isLiked = myLikes.includes(id);
    const delta = isLiked ? -1 : 1;
    
    // Update local heart toggle state
    setMyLikes(prev => isLiked ? prev.filter(lid => lid !== id) : [...prev, id]);
    
    // Update central heart count immediately
    updateStar(id, delta);
    
    // If modal is open for this profile, update it too
    if (selectedProfile?.id === id) {
      setSelectedProfile(prev => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count + delta) } : null);
    }

    // 2. NETWORK CALL
    const result = await toggleLike(id);
    
    if (!result) {
      // Revert optimistic update on failure
      setMyLikes(prev => isLiked ? [...prev, id] : prev.filter(lid => lid !== id));
      updateStar(id, -delta);
      if (selectedProfile?.id === id) {
        setSelectedProfile(prev => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count - delta) } : null);
      }
    } else {
      // Background sync to ensure data consistency
      refetch();
    }
  };

  if (loading) return (
    <div className="flex gap-6 overflow-hidden p-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-[230px] h-80 shrink-0 bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5 relative overflow-hidden" />
      ))}
    </div>
  );

  if (participants.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-4 animate-bounce">
        <Star className="w-10 h-10 text-gray-700" />
      </div>
      <h4 className="text-xl font-black text-white uppercase tracking-widest">Searching for Stars</h4>
      <p className="text-sm text-gray-500 max-w-sm">The cosmos is currently aligning. Check back soon as the legends of RICO Fest emerge.</p>
    </div>
  );

  return (
    <div className="relative overflow-visible">
      <AnimatePresence>
        {bursts.map(burst => <HypeParticles key={burst.id} x={burst.x} y={burst.y} color={burst.color} />)}
      </AnimatePresence>

      {/* Horizontal Swipe Scrollable Container */}
      <div 
        data-lenis-prevent
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 no-scrollbar scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {participants.map((star, idx) => {
          const rank = star.rank;
          const isLegendary = rank <= 5;
          const customAura = star.aura_color;
          const customBg = star.background_url;
          
          // Custom border glow based on rank gradient index
          const rankGradients = [
            'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-[#111319]/80',
            'border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.15)] bg-[#0e121a]/80',
            'border-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.15)] bg-[#0c1412]/80',
            'border-fuchsia-500/40 shadow-[0_0_20px_rgba(240,82,244,0.15)] bg-[#150f1a]/80',
            'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-[#190f13]/80'
          ];

          const rankBorderText = [
            'text-amber-400 border-amber-500/30 bg-amber-500/5',
            'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
            'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
            'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/5',
            'text-rose-400 border-rose-500/30 bg-rose-500/5'
          ];

          return (
            <motion.div
              key={star.id}
              whileHover={{ y: -8, scale: 1.01 }}
              onClick={() => setSelectedProfile(star)}
              className={`relative w-[230px] shrink-0 p-5 rounded-[2.5rem] border backdrop-blur-3xl group cursor-pointer transition-all duration-500 overflow-hidden snap-center ${
                isLegendary ? rankGradients[idx] : 'border-white/10 bg-black/40 hover:bg-black/60 shadow-xl'
              }`}
              style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {/* Crown Rank Badge */}
              <div className={`absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest z-30 ${
                isLegendary ? (customAura ? '' : rankBorderText[idx]) : 'text-gray-400 border-white/10 bg-white/5'
              }`}
                style={isLegendary && customAura ? { borderColor: customAura, backgroundColor: `${customAura}15`, color: customAura } : {}}
              >
                {isLegendary ? <Crown className="w-2.5 h-2.5 fill-current" /> : <Star className="w-2.5 h-2.5 text-gray-500 fill-current" />}
                Rank #{rank}
              </div>

              {/* Like Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(star.id, e, isLegendary ? idx : undefined); }}
                className={`absolute top-3.5 right-4 p-2 rounded-2xl transition-all z-40 border ${
                  myLikes.includes(star.id) 
                    ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30 scale-105' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${myLikes.includes(star.id) ? 'fill-current' : ''}`} />
              </button>

              {/* Profile Photo */}
              <div className="relative mb-4 mt-6 flex justify-center">
                <div className={`relative w-20 h-20 rounded-[1.8rem] overflow-hidden bg-gray-950 border group-hover:border-white/20 transition-all duration-500 shadow-xl ${
                  isLegendary ? 'border-cyan-500/50 group-hover:border-fuchsia-500/80 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-white/10'
                }`}>
                  {star.avatar_url ? (
                    <img src={star.avatar_url} alt={star.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-5 text-white/5" />
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="text-center space-y-0.5">
                <h4 className="text-sm font-black text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:text-indigo-300 transition-colors">
                  {star.full_name}
                </h4>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  {star.batch || (isLegendary ? 'LEGENDRY' : 'STAR')}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white/5 rounded-2xl p-2 text-center border border-white/5">
                  <span className="block text-[8px] text-gray-500 font-black uppercase tracking-tighter mb-0.5">XP</span>
                  <span className="text-[11px] font-black text-white">{star.xp}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-2 text-center border border-white/5 flex flex-col justify-center items-center">
                  <span className="block text-[8px] text-gray-500 font-black uppercase tracking-tighter mb-0.5">Hearts</span>
                  <div className="flex items-center gap-0.5 justify-center">
                    <Heart className="w-2.5 h-2.5 text-red-500 fill-current" />
                    <span className="text-[11px] font-black text-white">{star.likes_count}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Profile Modal */}
      <ProfileModal 
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onLike={handleLike}
        isLiked={selectedProfile ? myLikes.includes(selectedProfile.id) : false}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default ParticipantCarousel;
