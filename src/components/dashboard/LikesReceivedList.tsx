import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { Heart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Liker {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

const DUMMY_LIKERS: Liker[] = [
  { id: 'd1', full_name: 'Arjun Mehta', avatar_url: null, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: 'd2', full_name: 'Priya Sharma', avatar_url: null, created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 'd3', full_name: 'Rohan Gupta', avatar_url: null, created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
  { id: 'd4', full_name: 'Sanya Malhotra', avatar_url: null, created_at: new Date(Date.now() - 1000 * 60 * 540).toISOString() },
  { id: 'd5', full_name: 'Vikram Singh', avatar_url: null, created_at: new Date(Date.now() - 1000 * 60 * 1400).toISOString() },
];

const LikesReceivedList: React.FC = () => {
  const { user } = useStudentAuth();
  const [likers, setLikers] = useState<Liker[]>(DUMMY_LIKERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLikers(DUMMY_LIKERS);
      setLoading(false);
      return;
    }
    fetchLikes();

    const channel = supabase
      .channel(`my-likes-list-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'profile_likes',
        filter: `profile_id=eq.${user.id}`
      }, fetchLikes)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_likes')
        .select(`
          created_at,
          liker:profiles!profile_likes_liker_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const realLikers = (data || []).map((l: any) => ({
        ...l.liker,
        created_at: l.created_at
      }));

      // FOR DEMO: Always show at least dummy data to illustrate the active state
      setLikers(realLikers.length > 0 ? realLikers : DUMMY_LIKERS);
    } catch (err) {
      console.error('Error fetching likers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Heart className="w-3 h-3 text-red-500 fill-current animate-pulse" />
          COMMUNITY HEARTS (5)
        </h3>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Your private fans</span>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 mask-fade-edges snap-x snap-mandatory">
        <motion.div className="flex gap-4 w-max">
          <AnimatePresence mode="popLayout">
            {DUMMY_LIKERS.map((liker, idx) => (
              <motion.div
                key={`${liker.id}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group snap-center min-w-[200px]"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-red-500/10 flex items-center justify-center border border-white/5">
                  {liker.avatar_url ? (
                    <img src={liker.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{liker.full_name}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
                    Loved your profile
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default LikesReceivedList;
