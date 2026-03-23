import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { User, Heart, Star, Crown, Trophy } from 'lucide-react';
import AutoCarousel from '../AutoCarousel';
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
  const [hoveredAura, setHoveredAura] = useState<string | null>(null);

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

  const auras = [
    'rgba(245, 158, 11, 0.15)', // Apex Gold
    'rgba(34, 211, 238, 0.15)', // Frost Silver
    'rgba(16, 185, 129, 0.15)', // Nature Legend
    'rgba(244, 114, 182, 0.15)', // Heart Thief
    'rgba(139, 92, 246, 0.15)'  // Chaos Legend
  ];

  const auraGradients = [
    'from-yellow-400 via-amber-500 to-orange-600',
    'from-cyan-400 via-blue-500 to-indigo-600',
    'from-emerald-400 via-green-500 to-teal-600',
    'from-pink-400 via-rose-500 to-purple-600',
    'from-violet-400 via-fuchsia-500 to-red-600'
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
    <div className="flex gap-8 p-12 overflow-hidden items-center justify-center">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="min-w-[220px] h-80 bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/5" />
        </div>
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
    <div className="relative group p-4 overflow-visible transition-colors duration-1000" style={{ backgroundColor: hoveredAura || 'transparent' }}>
      <AnimatePresence>
        {bursts.map(burst => <HypeParticles key={burst.id} x={burst.x} y={burst.y} color={burst.color} />)}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8 px-2">
        <h3 className="text-xl font-black text-white tracking-[0.4em] flex items-center gap-4">
          <Crown className={`w-6 h-6 transition-colors duration-500 fill-current ${hoveredAura ? 'text-white' : 'text-yellow-500'}`} />
          RICO STARS
        </h3>
        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Ratio: 5x Love / 1x XP</span>
      </div>

      <div className="max-w-6xl mx-auto">
        <AutoCarousel
          paused={true}
          showArrows={true}
          showDots={true}
          pauseOnHover={true}
          className="pb-10"
        >
          {participants.map((participant, idx) => {
            const isLegendary = idx < 5;
            const customAura = participant.aura_color;
            const customBg = participant.background_url;
            const aura = customAura || (isLegendary ? auraGradients[idx] : null);
            const rank = participant.rank;

            return (
              <div key={participant.id} className="px-4 py-10">
                <motion.div
                  layout
                  onMouseEnter={() => isLegendary && setHoveredAura(customAura ? `rgba(${customAura}, 0.15)` : auras[idx])}
                  onMouseLeave={() => setHoveredAura(null)}
                  whileHover={{ y: -15, scale: 1.02 }}
                  onClick={() => setSelectedProfile(participant)}
                  className={`relative w-[220px] p-6 rounded-[2.5rem] border backdrop-blur-3xl group/card transition-all duration-700 cursor-pointer overflow-visible mx-auto ${
                    isLegendary ? 'border-white/20 bg-gradient-to-br from-white/10 to-white/5 shadow-2xl' : 'border-white/5 bg-white/2 opacity-60 hover:opacity-100'
                  }`}
                  style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {isLegendary && (
                    <div className={`absolute -top-3 -left-3 w-14 h-14 rounded-2xl bg-gradient-to-br ${customAura ? '' : aura} flex flex-col items-center justify-center text-black shadow-2xl z-40 transform -rotate-12 group-hover/card:rotate-0 transition-transform`}
                         style={customAura ? { backgroundColor: customAura } : {}}>
                      <span className="text-xs font-black leading-none opacity-60">#</span>
                      <span className="text-2xl font-black leading-none">{rank}</span>
                    </div>
                  )}

                  <div className="relative mb-6 mx-auto group/avatar-container">
                    {isLegendary && (
                      <motion.div 
                        animate={{ 
                          borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "50% 50% 20% 80% / 25% 80% 20% 75%", "30% 70% 70% 30% / 30% 30% 70% 70%"],
                          rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className={`absolute -inset-10 bg-gradient-to-tr ${customAura ? '' : aura} opacity-50 blur-2xl z-0 scale-110`} 
                        style={customAura ? { backgroundColor: customAura } : {}}
                      />
                    )}
                    <div className="relative w-36 h-36 rounded-[2.5rem] overflow-hidden bg-gray-950 border-4 border-white/10 shadow-2xl z-10">
                      {participant.avatar_url ? (
                        <img src={participant.avatar_url} className="w-full h-full object-cover" alt={participant.full_name} />
                      ) : (
                        <User className="w-full h-full p-8 text-white/5" />
                      )}
                    </div>
                    <div className="absolute -bottom-3 -right-3 z-30 transform scale-125 group-hover/avatar-container:scale-150 transition-transform duration-500">
                      <div className="relative p-2 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.5)] border-2 border-black transform -rotate-6 rotate-x-12 shadow-2xl group/trophy overflow-hidden">
                        {/* 3D Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/trophy:translate-x-full transition-transform duration-1000" />
                        <Trophy className="w-4 h-4 text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1 mb-6">
                    <span className="block font-black text-white text-2xl tracking-tight truncate">{participant.full_name}</span>
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Rank {rank} • {isLegendary ? 'RICO STAR' : 'Participant'}</span>
                  </div>

                  <div className="flex gap-3 justify-center relative">
                    <div className={`relative px-4 py-2 rounded-2xl bg-white/5 border border-white/10 overflow-hidden group/stat transition-all`}>
                      {isLegendary && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover/stat:translate-x-full transition-transform duration-1000" />}
                      <span className="block text-[8px] text-gray-400 font-black uppercase tracking-tighter opacity-50 mb-1">XP</span>
                      <span className="text-sm font-black text-white">{participant.xp}</span>
                    </div>
                    <div className={`relative px-4 py-2 rounded-2xl bg-white/5 border border-white/10 overflow-hidden group/stat transition-all ${isLegendary ? 'hover:border-red-500/50' : ''}`}>
                       {isLegendary && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover/stat:translate-x-full transition-transform duration-1000" />}
                      <span className="block text-[8px] text-gray-400 font-black uppercase tracking-tighter opacity-50 mb-1">Hearts</span>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500 fill-current" />
                        <span className="text-sm font-black text-white">{participant.likes_count}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(participant.id, e, idx < 5 ? idx : undefined); }}
                    className={`absolute top-4 right-4 p-3 rounded-2xl transition-all z-40 ${
                      myLikes.includes(participant.id) ? 'bg-red-500 text-white shadow-xl shadow-red-500/40 scale-110' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${myLikes.includes(participant.id) ? 'fill-current' : ''}`} />
                  </button>
                </motion.div>
              </div>
            );
          })}
        </AutoCarousel>
      </div>

      <ProfileModal 
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onLike={handleLike}
        isLiked={selectedProfile ? myLikes.includes(selectedProfile.id) : false}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .mask-fade-edges { mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); }
      `}} />

    </div>
  );
};

export default ParticipantCarousel;
