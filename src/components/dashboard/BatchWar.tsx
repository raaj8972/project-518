import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Users, Zap, TrendingUp, Award } from 'lucide-react';

interface BatchStats {
  batch: string;
  count: number;
}

const DUMMY_WAR: BatchStats[] = [
  { batch: 'Undergraduate', count: 124 },
  { batch: 'Postgraduate', count: 86 },
  { batch: 'Faculty', count: 52 },
  { batch: 'Alumni', count: 31 },
];

const BatchWar: React.FC = () => {
  const [stats, setStats] = useState<BatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Direct query to profiles to count registrations per batch/type
      const { data, error } = await supabase
        .from('profiles')
        .select('batch, participant_type')
        .eq('is_approved', true);

      if (error) throw error;

      if (data) {
        // Group and count
        const counts: Record<string, number> = {};
        data.forEach(p => {
          const key = p.participant_type || p.batch || 'General Participant';
          counts[key] = (counts[key] || 0) + 1;
        });

        const formatted = Object.entries(counts)
          .map(([batch, count]) => ({ batch, count }))
          .sort((a, b) => b.count - a.count);

        setStats(formatted);
      }
    } catch (err) {
      console.error('[BatchWar] Error fetching stats:', err);
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to profile changes to update counts in realtime
    const channel = supabase
      .channel('batch-war-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div className="superia-glass-card rounded-[2.5rem] p-8 border border-white/10 bg-white/5 overflow-hidden relative group">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 opacity-30 group-hover:opacity-50 transition-opacity" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl border border-orange-500/20 shadow-lg shadow-orange-500/20">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Batch War</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] leading-none">Who's leading the registration race?</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-colors duration-500" />
        </div>

        <div className="space-y-6">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 w-full rounded-2xl bg-white/5 animate-pulse" />
            ))
          ) : (
            stats.map((stat, idx) => (
              <div key={stat.batch} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                    <span className={idx === 0 ? 'text-white' : 'text-gray-400'}>{stat.batch}</span>
                  </div>
                  <span className="text-white flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <Users className="w-3 h-3 text-orange-500" />
                    {stat.count} <span className="text-[10px] text-gray-500 font-bold">REGS</span>
                  </span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stat.count / maxCount) * 100}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    className={`h-full rounded-full relative ${
                      idx === 0 
                        ? 'bg-gradient-to-r from-orange-600 via-red-500 to-orange-400' 
                        : 'bg-gradient-to-r from-gray-700 to-gray-500'
                    }`}
                  >
                    {idx === 0 && (
                      <motion.div
                        animate={{ opacity: [0, 1, 0], x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />
                    )}
                  </motion.div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Live Registration Pulse</span>
          </div>
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Updated Real-time</p>
        </div>
      </div>
    </div>
  );
};

export default BatchWar;
