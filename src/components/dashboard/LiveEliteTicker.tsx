import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trophy, Zap, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TickerEvent {
  id: string;
  type: 'heart' | 'level' | 'rank';
  message: string;
  color: string;
  icon: React.ReactNode;
}

const RicoStarTicker: React.FC = () => {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // 1. Listen for new Hearts (likes)
    const heartsSub = supabase
      .channel('ticker-hearts')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'profile_likes' }, async (payload: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payload.new.receiver_id)
          .single();
        
        if (profile) {
          addEvent({
            id: Math.random().toString(),
            type: 'heart',
            message: `Someone appreciated ${profile.full_name.split(' ')[0]}! ❤️`,
            color: 'text-red-400',
            icon: <Heart size={14} className="fill-current" />
          });
        }
      })
      .subscribe();

    // 2. Listen for XP / Level Shifts
    const xpSub = supabase
      .channel('ticker-xp')
      .on('postgres_changes' as any, { event: 'UPDATE', table: 'student_xp' }, async (payload: any) => {
        if (payload.new.xp_total > payload.old.xp_total + 10) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.user_id)
            .single();
          
          if (profile) {
            addEvent({
              id: Math.random().toString(),
              type: 'level',
              message: `${profile.full_name.split(' ')[0]} gained massive XP! 🚀`,
              color: 'text-orange-400',
              icon: <Zap size={14} className="fill-current" />
            });
          }
        }
      })
      .subscribe();

    // Initial dummy data to make it feel alive immediately
    setEvents([
      { id: '1', type: 'rank', message: 'The RICO STARS Top 5 has been updated! 👑', color: 'text-yellow-400', icon: <Crown size={14} /> },
      { id: '2', type: 'heart', message: 'Fest hype is reaching new heights! ❤️', color: 'text-red-400', icon: <Heart size={14} /> },
      { id: '3', type: 'level', message: 'Level 10 reached by several participants! 🏆', color: 'text-blue-400', icon: <Trophy size={14} /> }
    ]);

    return () => {
      supabase.removeChannel(heartsSub);
      supabase.removeChannel(xpSub);
    };
  }, []);

  const addEvent = (event: TickerEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 4)]); // Keep last 5
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="w-full bg-red-950/20 border-y border-red-500/10 backdrop-blur-md overflow-hidden h-10 flex items-center justify-center relative group">
      {/* Dynamic Background Pulse */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-pulse" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={events[currentIndex]?.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          className={`flex items-center gap-3 font-bold text-[11px] uppercase tracking-[0.2em] ${events[currentIndex]?.color}`}
        >
          {events[currentIndex]?.icon}
          <span>{events[currentIndex]?.message}</span>
          {events[currentIndex]?.icon}
        </motion.div>
      </AnimatePresence>

      {/* Decorative Lines */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-[1px] bg-red-500/20 hidden md:block" />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-[1px] bg-red-500/20 hidden md:block" />
    </div>
  );
};

export default RicoStarTicker;
