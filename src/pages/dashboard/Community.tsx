import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';
import { User, Search, Filter, Heart, Crown } from 'lucide-react';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../lib/supabase';
import DynamicBadge from '../../components/dashboard/DynamicBadge';
import ProfileModal from '../../components/dashboard/ProfileModal';

const Community: React.FC = () => {
  const { stars: participants, loading } = useTopStars(100);
  const { user } = useStudentAuth();
  const { likeProfile } = useXPEngine();
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('All');
  const [selectedProfile, setSelectedProfile] = useState<TopStarProfile | null>(null);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  // Fetch user's likes
  React.useEffect(() => {
    if (!user) return;
    
    const fetchLikes = async () => {
      const { data } = await supabase
        .from('profile_likes')
        .select('profile_id')
        .eq('liker_id', user.id);
      
      if (data) {
        setMyLikes(new Set(data.map(l => l.profile_id)));
      }
    };

    fetchLikes();

    const channel = supabase.channel('community_likes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profile_likes',
        filter: `liker_id=eq.${user.id}`
      }, () => {
        fetchLikes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLike = async (targetId: string) => {
    if (!user) return;
    await likeProfile(targetId);
  };

  const filteredStars = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.batch || '').toLowerCase().includes(search.toLowerCase());
      const matchesBatch = filterBatch === 'All' || p.batch === filterBatch;
      return matchesSearch && matchesBatch;
    });
  }, [participants, search, filterBatch]);

  const batches = useMemo(() => {
    const b = Array.from(new Set(participants.map(p => p.batch).filter((val): val is string => !!val)));
    return ['All', ...b];
  }, [participants]);

  if (loading) {
    return (
      <div className="min-h-screen pt-4 pb-12">
        <div className="flex flex-col gap-8">
          <div className="h-10 w-64 bg-white/5 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-80 rico-glass-card rounded-[2.5rem] bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            RICO COMMUNITY
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] uppercase tracking-[0.2em] animate-pulse">Live</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Connect with {participants.length} verified RICO Stars.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search stars..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-11 pr-6 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all w-full md:w-64"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="bg-transparent text-sm text-gray-300 focus:outline-none cursor-pointer"
            >
              {batches.map(b => <option key={b} value={b} className="bg-[#111]">{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filteredStars.length === 0 ? (
        <div className="py-24 text-center space-y-4 rico-glass-card rounded-[3rem] border border-white/5 bg-white/[0.02]">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-700" />
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">No Stars Found</h3>
          <p className="text-gray-500 max-w-xs mx-auto text-sm">Maybe they're currently aligning in another galaxy. Try a different search!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredStars.map((star, idx) => {
              const auraIdx = star.rank <= 5 ? star.rank - 1 : (idx % 5);
              const isLegendary = star.rank <= 5;
              
              const auraGradients = [
                'from-yellow-400 via-amber-500 to-orange-600',
                'from-cyan-400 via-blue-500 to-indigo-600',
                'from-emerald-400 via-green-500 to-teal-600',
                'from-pink-400 via-rose-500 to-purple-600',
                'from-violet-400 via-fuchsia-500 to-red-600'
              ];

              return (
                <motion.div
                  key={star.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedProfile(star)}
                  className="group relative cursor-pointer"
                >
                  <div className={`p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500 h-full relative overflow-hidden backdrop-blur-3xl ${isLegendary ? 'bg-gradient-to-br from-white/10 to-transparent shadow-2xl' : ''}`}>
                    {/* Background Aura */}
                    <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${auraGradients[auraIdx]} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full blur-3xl`} />
                    
                    {isLegendary && (
                      <div className={`absolute top-4 left-4 w-10 h-10 rounded-xl bg-gradient-to-br ${auraGradients[auraIdx]} flex items-center justify-center text-black z-20 shadow-xl`}>
                        <Crown className="w-5 h-5" />
                      </div>
                    )}

                    <div className="relative mb-6">
                      <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border-4 border-white/10 bg-gray-950 group-hover:scale-105 transition-transform duration-500 relative z-10">
                        {star.avatar_url ? (
                          <img src={star.avatar_url} alt={star.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-6 text-white/5" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 right-1/2 translate-x-1/2 z-20 scale-110">
                        <DynamicBadge tier={star.tier} size="sm" />
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <h4 className="text-lg font-black text-white truncate group-hover:text-indigo-400 transition-colors">{star.full_name}</h4>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{star.batch || 'Participant'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                        <span className="block text-[8px] text-gray-500 font-black uppercase tracking-tighter mb-1">XP</span>
                        <span className="text-sm font-black text-white">{star.xp}</span>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                        <span className="block text-[8px] text-gray-500 font-black uppercase tracking-tighter mb-1">Love</span>
                        <div className="flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3 text-indigo-500 fill-current" />
                          <span className="text-sm font-black text-white">{star.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onLike={handleLike}
        isLiked={selectedProfile ? myLikes.has(selectedProfile.id) : false}
      />
    </motion.div>
  );
};

export default Community;
