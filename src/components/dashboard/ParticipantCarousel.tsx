import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { User, Heart, Star, Crown } from 'lucide-react';
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
    'rgba(34, 211, 238, 0.15)', // Cyan
    'rgba(217, 70, 239, 0.15)', // Fuchsia
    'rgba(52, 211, 153, 0.15)', // Emerald
    'rgba(250, 204, 21, 0.15)', // Yellow
    'rgba(139, 92, 246, 0.15)'  // Violet
  ];

  const auraGradients = [
    'from-cyan-400 via-blue-500 to-purple-600',
    'from-fuchsia-500 via-pink-500 to-rose-600',
    'from-emerald-400 via-teal-500 to-cyan-500',
    'from-yellow-400 via-orange-500 to-red-500',
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
        <h3 className="text-xl md:text-2xl font-black text-white tracking-widest flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(34,211,238,0.2)]">
          <Crown className={`w-6 h-6 transition-colors duration-500 fill-current ${hoveredAura ? 'text-white' : 'text-cyan-400'}`} />
          RICO <span className="font-sans italic bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600">STARS</span>
        </h3>
        <span className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em]">Ratio: 5x Love / 1x XP</span>
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
                  className={`relative w-[220px] p-6 pb-10 rounded-[2rem] backdrop-blur-3xl group/card transition-all duration-700 cursor-pointer overflow-visible mx-auto ${
                    isLegendary ? 'border border-cyan-500/30 bg-black/80 hover:bg-black shadow-[0_0_30px_rgba(34,211,238,0.15)]' : 'border border-white/10 bg-black/40 opacity-60 hover:opacity-100 shadow-xl'
                  }`}
                  style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {isLegendary && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r ${customAura ? '' : aura} flex items-center justify-center text-white shadow-xl z-40 transition-transform`}
                         style={customAura ? { backgroundColor: customAura } : {}}>
                      <span className="text-[10px] font-black uppercase tracking-widest mt-0.5">SCENE #{rank}</span>
                    </div>
                  )}

                  <div className="relative mb-6 mx-auto group/avatar-container mt-2">
                    {isLegendary && (
                      <motion.div 
                        animate={{ 
                          opacity: [0.3, 0.5, 0.3],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute -inset-8 bg-gradient-to-tr ${customAura ? '' : aura} opacity-40 blur-xl z-0 rounded-full`} 
                        style={customAura ? { backgroundColor: customAura } : {}}
                      />
                    )}
                    <div className={`relative w-32 h-32 mx-auto rounded-[2.5rem] overflow-hidden bg-gray-900 border-2 shadow-2xl z-10 transition-all duration-700 ${isLegendary ? 'border-cyan-500/50 group-hover/card:border-fuchsia-500/80 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-white/10'}`}>
                      {participant.avatar_url ? (
                        <img src={participant.avatar_url} className={`w-full h-full object-cover transition-all duration-700`} alt={participant.full_name} />
                      ) : (
                        <User className={`w-full h-full p-8 ${isLegendary ? 'text-cyan-400/20' : 'text-white/5'}`} />
                      )}
                    </div>
                    {isLegendary && (
                      <div className="absolute -bottom-3 right-4 z-30 transform scale-110 group-hover/avatar-container:scale-125 transition-transform duration-500">
                        <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-purple-600 shadow-[0_0_20px_rgba(217,70,239,0.8),inset_0_2px_2px_rgba(255,255,255,0.5)] border border-white/20 group/trophy overflow-hidden">
                          {/* 3D Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/trophy:translate-x-full transition-transform duration-1000" />
                          <Crown className="w-3 h-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-1 mb-6">
                    <span className={`block font-black text-xl tracking-tight truncate ${isLegendary ? 'font-sans italic text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] text-2xl' : 'text-white'}`}>{participant.full_name}</span>
                    <span className={`block text-[9px] font-bold uppercase tracking-[0.2em] ${isLegendary ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]' : 'text-gray-500'}`}>Rank {rank} • {isLegendary ? 'RICO STAR' : 'Participant'}</span>
                  </div>

                  <div className="flex gap-3 justify-center relative">
                    <div className={`relative px-4 py-2 rounded-lg border overflow-hidden group/stat transition-all ${isLegendary ? 'bg-black/50 border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                      <span className={`block text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5 ${isLegendary ? 'text-cyan-400' : 'text-gray-400'}`}>XP Power</span>
                      <span className={`text-sm font-black ${isLegendary ? 'font-sans italic text-white drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-white'}`}>{participant.xp}</span>
                    </div>
                    <div className={`relative px-4 py-2 rounded-lg border overflow-hidden group/stat transition-all ${isLegendary ? 'bg-black/50 border-fuchsia-500/30 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'bg-white/5 border-white/10 hover:border-red-500/50'}`}>
                      <span className={`block text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5 ${isLegendary ? 'text-fuchsia-400' : 'text-gray-400'}`}>Box Office</span>
                      <div className="flex items-center gap-1">
                        <Heart className={`w-3 h-3 fill-current ${isLegendary ? 'text-fuchsia-500 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]' : 'text-red-500'}`} />
                        <span className={`text-sm font-black ${isLegendary ? 'font-sans italic text-white drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]' : 'text-white'}`}>{participant.likes_count}</span>
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
