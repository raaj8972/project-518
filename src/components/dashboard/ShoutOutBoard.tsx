import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, VenetianMask, Sparkles, MessageSquareHeart, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useData } from '../../context/DataContext';

interface ShoutOut {
  id: string;
  message: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string;
  author_name?: string;
  author_rank?: number;
}

const DUMMY_SHOUTOUTS: ShoutOut[] = [
  { id: '1', message: 'Best of luck to all the participants! 🚀', is_anonymous: false, created_at: new Date().toISOString(), user_id: 'dummy1' },
  { id: '2', message: 'This fest is going to be legendary! 🔥', is_anonymous: true, created_at: new Date().toISOString(), user_id: 'dummy2' },
  { id: '3', message: 'Kudos to the organizing team! ❤️', is_anonymous: false, created_at: new Date().toISOString(), user_id: 'dummy3' },
];

const ShoutOutBoard: React.FC = () => {
  const { user } = useStudentAuth();
  const { awardXP } = useXPEngine();
  const { siteSettings } = useData();
  const [shoutouts, setShoutouts] = useState<ShoutOut[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<{ reachedLimit: boolean, nextAvailable: Date | null, count: number }>({ reachedLimit: false, nextAvailable: null, count: 0 });
  const [countdown, setCountdown] = useState<string>('');
  const [totalVibes, setTotalVibes] = useState(0);

  useEffect(() => {
    fetchShoutouts();
    if (user) checkUserLimit();

    const channel = supabase
      .channel('public:shoutouts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shoutouts'
      }, fetchShoutouts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, siteSettings?.shoutouts_daily_limit, siteSettings?.shoutouts_enabled, siteSettings?.shoutouts_expiry_hours]);

  // Countdown Timer for Limit
  useEffect(() => {
    if (!userStatus.nextAvailable) return;

    const timer = setInterval(() => {
      const diff = userStatus.nextAvailable!.getTime() - Date.now();
      if (diff <= 0) {
        setUserStatus(prev => ({ ...prev, reachedLimit: false, nextAvailable: null }));
        clearInterval(timer);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [userStatus.nextAvailable]);

  const checkUserLimit = async () => {
    if (!user) return;
    const dailyLimit = siteSettings?.shoutouts_daily_limit ?? 3;
    if (dailyLimit <= 0) {
      setUserStatus({ reachedLimit: false, nextAvailable: null, count: 0 });
      return;
    }

    const last24h = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    const { data: recent, error } = await supabase
      .from('shoutouts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', last24h)
      .order('created_at', { ascending: true });

    if (error) return;

    if (recent && recent.length >= dailyLimit) {
      const oldestInWindow = new Date(recent[0].created_at);
      const nextTime = new Date(oldestInWindow.getTime() + (24 * 60 * 60 * 1000));
      setUserStatus({ reachedLimit: true, nextAvailable: nextTime, count: recent.length });
    } else {
      setUserStatus({ reachedLimit: false, nextAvailable: null, count: recent?.length || 0 });
    }
  };

  const fetchShoutouts = async () => {
    try {
      // 1. Fetch Top 5 IDs (RICO STARS) for ranking badges
      const { data: topProfiles } = await supabase
        .from('profiles')
        .select('id, likes_count, student_xp(xp_total)')
        .eq('is_approved', true);

      let ricoStarIds: string[] = [];
      if (topProfiles) {
        ricoStarIds = topProfiles
          .map((p: any) => ({
            id: p.id,
            hype: ((p.likes_count || 0) * 500) + (p.student_xp?.[0]?.xp_total || 0)
          }))
          .sort((a: any, b: any) => b.hype - a.hype)
          .slice(0, 5)
          .map(p => p.id);
      }

      // 2. Fetch Total Count
      const { count } = await supabase
        .from('shoutouts')
        .select('*', { count: 'exact', head: true });
      setTotalVibes(count || 0);

      // 3. Fetch Shoutouts (Open visibility)
      // Only fetch within expiry window
      const expiryHours = siteSettings?.shoutouts_expiry_hours ?? 24;
      const expiryDate = new Date(Date.now() - (expiryHours * 60 * 60 * 1000)).toISOString();

      const { data, error } = await supabase
        .from('shoutouts')
        .select('*, profiles(full_name)')
        .gte('created_at', expiryDate)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map((s: any) => {
          const rank = ricoStarIds.indexOf(s.user_id) + 1;
          return {
            ...s,
            author_name: s.profiles?.full_name || 'Participant',
            author_rank: rank > 0 ? rank : undefined
          };
        });
        setShoutouts(formatted);
      } else {
        // Only set dummy if we are truly empty and not loading
        setShoutouts([]);
      }
    } catch (err) {
      console.error('Error fetching shoutouts:', err);
      // Fallback only on critical error to keep UI alive
      setShoutouts(DUMMY_SHOUTOUTS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    // 1. Check if shoutouts are enabled
    if (siteSettings?.shoutouts_enabled === false) {
      toast.error('Shout-out board is currently closed.');
      return;
    }

    setSubmitting(true);
    try {
      // 2. Enforce Daily Limit (last 24h rolling)
      const dailyLimit = siteSettings?.shoutouts_daily_limit ?? 3;
      if (dailyLimit > 0) {
        const last24h = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
        const { count, error: countError } = await supabase
          .from('shoutouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', last24h);
        
        if (countError) throw countError;
        if (count !== null && count >= dailyLimit) {
          throw new Error(`You have reached your daily limit of ${dailyLimit} shout-outs.`);
        }
      }

      const { error } = await supabase.from('shoutouts').insert({
        user_id: user.id,
        message: newMessage.trim(),
        is_anonymous: isAnonymous
        // is_approved now defaults to true in DB
      });

      if (error) throw error;
      
      // Award +2 XP for spreading positivity
      await awardXP('submitted_shoutout', 2, { anonymous: isAnonymous });

      toast.success('Shout-out posted!');
      setNewMessage('');
      checkUserLimit();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send shout-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rico-glass-card rounded-[2.5rem] p-8 border border-white/10 bg-white/5 relative overflow-hidden group min-h-[500px] flex flex-col">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-orange-600/5 opacity-50" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[100px] -ml-32 -mb-32 animate-pulse" />
      
      {/* Floating Particles (CSS only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-red-500 animate-float"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDuration: Math.random() * 10 + 10 + 's',
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 space-y-8 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500/20 to-orange-600/20 rounded-2xl border border-red-500/20 shadow-lg shadow-red-500/10">
              <MessageSquareHeart className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">Vibe Feed</h3>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{totalVibes} Cosmic Vibrations</p>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-yellow-500/40" />
          </motion.div>
        </div>

        {/* Action Center (Input) */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-1 overflow-hidden relative group/input-container">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover/input-container:opacity-100 transition-opacity duration-500" />
          
          {siteSettings?.shoutouts_enabled !== false ? (
            userStatus.reachedLimit ? (
              <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300 relative z-10">
                <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                  <Clock className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Cooling Down</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">Next vibe available in:</p>
                </div>
                <div className="px-6 py-2 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-md">
                  <span className="text-xl font-black text-red-400 tabular-nums tracking-tighter shadow-sm">{countdown || '---'}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative z-10 flex flex-col">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value.slice(0, 150))}
                  placeholder="Drop a cosmic vibe..."
                  className="w-full bg-transparent border-none rounded-2xl px-5 py-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-0 transition-all resize-none h-24 font-medium"
                />
                
                <div className="px-3 pb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${isAnonymous ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-lg shadow-red-500/5' : 'bg-white/5 border-white/10 text-gray-400 opacity-60'}`}
                    >
                      <VenetianMask className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.1em]">{isAnonymous ? 'Cloaked' : 'Public'}</span>
                    </button>
                    <span className="text-[9px] font-black text-gray-600 uppercase tabular-nums">{newMessage.length}/150</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !newMessage.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Vibe</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="p-8 text-center relative z-10">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Channel Offline</p>
            </div>
          )}
        </div>

        {/* Live Scroll Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-20 w-full rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              ))
            ) : shoutouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 opacity-30">
                <Heart className="w-8 h-8 text-gray-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Waitng for the first soul...</p>
              </div>
            ) : (
              shoutouts.map((shout) => (
                <motion.div
                  key={shout.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className={`p-5 rounded-2xl border backdrop-blur-md transition-all group/shout relative overflow-hidden ${
                    shout.author_rank ? 'bg-gradient-to-br from-red-600/10 to-orange-600/5 border-red-500/30 shadow-lg shadow-red-500/5' : 
                    'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                  }`}
                >
                  {/* Holographic Rank Effect */}
                  {shout.author_rank && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-conic from-red-500/20 via-orange-500/20 to-transparent rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
                  )}
                  
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${shout.author_rank ? 'bg-red-500 animate-ping' : 'bg-gray-700'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${shout.author_rank ? 'text-red-400' : 'text-gray-500'}`}>
                          {shout.is_anonymous ? 'Cosmic Soul' : (shout.author_name || 'Participant')}
                        </span>
                        {shout.author_rank && (
                          <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/20">
                            <Sparkles className="w-2.5 h-2.5 text-red-500" />
                            <span className="text-[8px] font-black text-red-400">STAR #{shout.author_rank}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-gray-700 uppercase tabular-nums">
                        {new Date(shout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-white leading-relaxed break-words">
                      {shout.message}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ShoutOutBoard;
