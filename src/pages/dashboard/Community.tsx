import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopStars, TopStarProfile } from '../../hooks/useTopStars';
import { User, Search, Filter, Heart, Crown, Trophy, Star, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../lib/supabase';
import DynamicBadge from '../../components/dashboard/DynamicBadge';
import ProfileModal from '../../components/dashboard/ProfileModal';

const Community: React.FC = () => {
  const { stars: participants, majorEvents, loading } = useTopStars(100);
  const { user } = useStudentAuth();
  const { likeProfile } = useXPEngine();
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('All');
  const [selectedProfile, setSelectedProfile] = useState<TopStarProfile | null>(null);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [showGuide, setShowGuide] = useState(false);

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

  const [visibleRemainingCount, setVisibleRemainingCount] = useState(30);

  // Reset pagination when search/filters change to free memory
  React.useEffect(() => {
    setVisibleRemainingCount(30);
  }, [search, filterBatch]);

  const topTen = useMemo(() => filteredStars.slice(0, 10), [filteredStars]);
  const remaining = useMemo(() => filteredStars.slice(10), [filteredStars]);
  const visibleRemaining = useMemo(() => remaining.slice(0, visibleRemainingCount), [remaining, visibleRemainingCount]);

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

      {/* R Points Guide Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 backdrop-blur-3xl overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-5 flex items-center justify-between text-left focus:outline-none hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">How to Earn Rico Points (R Points)?</h3>
              <p className="text-gray-500 text-[10px] font-semibold">Click to expand leaderboard scoring guide & multipliers</p>
            </div>
          </div>
          <div className="text-indigo-400">
            {showGuide ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-indigo-500/10"
            >
              <div className="p-5 pt-2 space-y-1.5">
                <p className="text-gray-500 text-xs font-semibold leading-relaxed">
                  Leaderboard rankings are decided strictly by your total **R Points**. Major events (the top 2 events with the most approved participants) award double points due to longer durations and complexity.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  {/* Normal Events */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <span className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">Normal Events</span>
                    <div className="space-y-1.5 text-[11px] text-gray-400">
                      <div className="flex justify-between"><span>Like Received</span> <span className="font-black text-white">+10 R Pts</span></div>
                      <div className="flex justify-between"><span>Event Joined</span> <span className="font-black text-white">+15 R Pts</span></div>
                      <div className="flex justify-between"><span>Round Qualified</span> <span className="font-black text-white">+20 R Pts</span></div>
                      <div className="flex justify-between"><span>Final Round Qualified</span> <span className="font-black text-white">+30 R Pts</span></div>
                      <div className="flex justify-between text-amber-400/90 border-t border-white/[0.04] pt-1.5">
                        <span>Winner Position (1st / 2nd / 3rd)</span> 
                        <span className="font-black">+50 / +30 / +20 R Pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Major Events */}
                  <div className="p-4 rounded-2xl bg-[#1d1b26]/50 border border-indigo-500/20 space-y-2 relative overflow-hidden">
                    <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-bold uppercase tracking-wider">High Duration</div>
                    <span className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                      Major Events <span className="text-[8px] text-gray-500 font-semibold">({majorEvents.join(', ')})</span>
                    </span>
                    <div className="space-y-1.5 text-[11px] text-gray-400">
                      <div className="flex justify-between"><span>Like Received</span> <span className="font-black text-white">+10 R Pts</span></div>
                      <div className="flex justify-between"><span>Event Joined</span> <span className="font-black text-emerald-400">+30 R Pts</span></div>
                      <div className="flex justify-between"><span>Round Qualified</span> <span className="font-black text-emerald-400">+40 R Pts</span></div>
                      <div className="flex justify-between"><span>Final Round Qualified</span> <span className="font-black text-emerald-400">+60 R Pts</span></div>
                      <div className="flex justify-between text-amber-400 border-t border-white/[0.04] pt-1.5">
                        <span>Winner Position (1st / 2nd / 3rd)</span> 
                        <span className="font-black">+100 / +60 / +40 R Pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="space-y-10">
          
          {/* Top 10 featured grid */}
          {topTen.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500" /> Top 10 Stars Leaderboard
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
                <AnimatePresence mode="popLayout">
                  {topTen.map((star, idx) => {
                    const isLegendary = star.rank <= 5;
                    const usernameText = star.username || star.full_name.toLowerCase().replace(/\s+/g, '');

                    return (
                      <motion.div
                        key={star.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.01 }}
                        onClick={() => setSelectedProfile(star)}
                        className="group relative cursor-pointer"
                      >
                        <div className={`p-4 rounded-[1.8rem] bg-[#111319]/80 border transition-all duration-300 h-full relative overflow-hidden backdrop-blur-3xl hover:border-white/20 text-center flex flex-col justify-between ${
                          isLegendary ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent' : 'border-white/10'
                        }`}>
                          {/* Like Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLike(star.id, e, isLegendary ? star.rank - 1 : undefined); }}
                            className={`absolute top-3 right-3 p-1.5 rounded-xl transition-all z-20 border ${
                              myLikes.has(star.id)
                                ? 'bg-red-500 border-red-400 text-white scale-105 shadow-md shadow-red-500/10'
                                : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${myLikes.has(star.id) ? 'fill-current' : ''}`} />
                          </button>

                          {/* Rank Badge */}
                          <span className={`absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            isLegendary 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                              : 'bg-white/5 border-white/10 text-gray-400'
                          }`}>
                            #{star.rank}
                          </span>

                          {/* Avatar */}
                          <div className="relative mt-5 mb-3 flex justify-center">
                            <div className={`w-16 h-16 rounded-full overflow-hidden bg-gray-950 border-2 transition-all duration-500 ${
                              isLegendary ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-white/10'
                            }`}>
                              {star.avatar_url ? (
                                <img src={star.avatar_url} alt={star.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-full h-full p-4 text-white/5" />
                              )}
                            </div>
                          </div>

                          {/* Name/Username */}
                          <div className="min-w-0 space-y-0.5 mb-3">
                            <h4 className="text-xs font-black text-white truncate flex items-center justify-center gap-1">
                              {star.full_name}
                              {isLegendary && <Crown className="w-3 text-amber-400 fill-amber-400/20 shrink-0" />}
                            </h4>
                            <p className="text-[10px] font-black text-indigo-400 truncate">
                              @{usernameText}
                            </p>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{star.batch || 'Class of --'}</p>
                          </div>

                          {/* Stats Inline - R POINTS */}
                          <div className="flex items-center justify-center gap-1.5 pt-2.5 border-t border-white/[0.04] text-[10px] font-black text-indigo-400">
                            <span className="flex items-center gap-1 shrink-0">
                              {star.hype_score} R POINTS
                              {(() => {
                                const TierIcon = star.tier?.toLowerCase() === 'platinum' ? Crown :
                                                 star.tier?.toLowerCase() === 'gold' ? Trophy :
                                                 star.tier?.toLowerCase() === 'silver' ? Star : Shield;
                                const tierColor = star.tier?.toLowerCase() === 'platinum' ? 'text-cyan-400' :
                                                  star.tier?.toLowerCase() === 'gold' ? 'text-amber-400' :
                                                  star.tier?.toLowerCase() === 'silver' ? 'text-slate-400' : 'text-orange-500';
                                return <TierIcon className={`w-3.5 h-3.5 ${tierColor}`} />;
                              })()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Remaining stars in List Form */}
          {remaining.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-indigo-400" /> Community Directory
              </h3>
              <div className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {visibleRemaining.map((star, idx) => {
                    const usernameText = star.username || star.full_name.toLowerCase().replace(/\s+/g, '');
                    return (
                      <motion.div
                        key={star.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: Math.min(idx * 0.005, 0.1) }} // Cap delay to prevent animation queue overflow
                        onClick={() => setSelectedProfile(star)}
                        className="group relative cursor-pointer"
                      >
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111319]/80 border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all duration-300 backdrop-blur-3xl">
                          
                          {/* Left side: Rank, Avatar, Name/Username */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 text-center text-xs font-black text-gray-500 shrink-0">
                              #{star.rank}
                            </span>
                            
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-950 border border-white/10 shrink-0">
                              {star.avatar_url ? (
                                <img src={star.avatar_url} alt={star.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-full h-full p-2.5 text-white/5" />
                              )}
                            </div>
                            
                            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="text-xs sm:text-sm font-black text-white truncate">{star.full_name}</span>
                              <span className="text-[10px] font-black text-indigo-400 truncate">@{usernameText}</span>
                            </div>
                          </div>
                          
                          {/* Right side: Batch, R Points, Heart Button */}
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="hidden sm:inline text-[9px] font-bold text-gray-500 uppercase tracking-widest">{star.batch || 'Class of --'}</span>
                            
                            <div className="flex items-center gap-2 text-xs font-black text-indigo-400">
                              <span className="flex items-center gap-1 shrink-0">
                                {star.hype_score} R POINTS
                                {(() => {
                                  const TierIcon = star.tier?.toLowerCase() === 'platinum' ? Crown :
                                                   star.tier?.toLowerCase() === 'gold' ? Trophy :
                                                   star.tier?.toLowerCase() === 'silver' ? Star : Shield;
                                  const tierColor = star.tier?.toLowerCase() === 'platinum' ? 'text-cyan-400' :
                                                    star.tier?.toLowerCase() === 'gold' ? 'text-amber-400' :
                                                    star.tier?.toLowerCase() === 'silver' ? 'text-slate-400' : 'text-orange-500';
                                  return <TierIcon className={`w-3.5 h-3.5 ${tierColor}`} />;
                                })()}
                              </span>
                            </div>
 
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLike(star.id); }}
                              className={`p-1.5 rounded-lg border transition-all ${
                                myLikes.has(star.id)
                                  ? 'bg-red-500 border-red-400 text-white shadow-md'
                                  : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <Heart className="w-3 h-3 fill-current" />
                            </button>
                          </div>
 
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {remaining.length > visibleRemainingCount && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setVisibleRemainingCount(prev => prev + 30); }}
                      className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-indigo-400 hover:bg-white/10 hover:text-white transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Load More Stars ({remaining.length - visibleRemainingCount} Remaining)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

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
