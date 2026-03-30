import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, MessageSquareHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShoutOut {
  id: string;
  message: string;
  is_anonymous: boolean;
  created_at: string;
  author_name?: string;
  author_rank?: number;
}

const VibePreview: React.FC = () => {
  const [latestVibes, setLatestVibes] = useState<ShoutOut[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestVibes();

    const channel = supabase
      .channel('vibe-preview')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'shoutouts' 
      }, () => {
        fetchLatestVibes();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const fetchLatestVibes = async () => {
    try {
      const { data, error } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      setLatestVibes(data || []);
    } catch (err) {
      console.error('Error fetching preview vibes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rico-glass-card rounded-[2rem] border border-white/10 bg-white/5 overflow-hidden flex flex-col h-full min-h-[320px]">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-red-600/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/20">
            <MessageSquareHeart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Community Vibes</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400 font-black uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard/vibes')}
          className="p-2 hover:bg-white/5 rounded-full transition-colors group"
        >
          <Sparkles className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </div>

      <div className="flex-1 p-6 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : latestVibes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            <p className="text-xs text-gray-400 font-medium italic">No echoes in the void yet...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {latestVibes.map((vibe, idx) => (
              <motion.div
                key={vibe.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${vibe.author_rank ? 'text-red-400' : 'text-gray-500'}`}>
                    {vibe.is_anonymous ? 'Cosmic Soul' : (vibe.author_name || 'Participant')}
                  </span>
                  {vibe.author_rank && < Sparkles className="w-2.5 h-2.5 text-red-500" />}
                </div>
                <p className="text-sm text-gray-300 line-clamp-2 font-medium leading-relaxed italic">
                  "{vibe.message}"
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <button 
        onClick={() => navigate('/dashboard/vibes')}
        className="w-full p-6 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-between border-t border-white/5 group"
      >
        <span className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">Enter Atmospheric Feed</span>
        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-red-500 transition-all transform group-hover:translate-x-1" />
      </button>
    </div>
  );
};

export default VibePreview;
