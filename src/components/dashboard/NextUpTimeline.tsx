import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Clock, ChevronRight, Zap, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UpcomingEvent {
  item_id: string;
  event_title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  student_id: string;
  item_type: 'event' | 'sport';
  status: string;
}

interface NextUpTimelineProps {
  onBrowseEvents: () => void;
}

const useCountdown = (targetDate: Date | null) => {
  const calculateTimeLeft = () => {
    if (!targetDate) return null;
    const diff = targetDate.getTime() - new Date().getTime();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    if (!targetDate) return;
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
};

const CountdownBadge: React.FC<{ targetDateStr: string | null }> = ({ targetDateStr }) => {
  const targetDate = targetDateStr ? new Date(targetDateStr) : null;
  const time = useCountdown(targetDate);
  
  if (!targetDateStr) return null;
  if (!time) return <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1"><Zap size={10} /> LIVE</span>;
  
  if (time.days > 0) return <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{time.days}d {time.hours}h</span>;
  return (
    <span className="text-[10px] text-orange-400 font-black tabular-nums bg-orange-400/10 px-2 py-0.5 rounded-full">
      {String(time.hours).padStart(2, '0')}:{String(time.minutes).padStart(2, '0')}:{String(time.seconds).padStart(2, '0')}
    </span>
  );
};

const NextUpTimeline: React.FC<NextUpTimelineProps> = ({ onBrowseEvents }) => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_upcoming_events')
        .select('*')
        .eq('student_id', user.id)
        .order('start_time', { ascending: true, nullsFirst: false });

      if (!error && data) {
        setEvents(data as UpcomingEvent[]);
      }
      setLoading(false);
    };

    fetchTimeline();
    
    // Refresh every 5 mins or on any registration change?
    const interval = setInterval(fetchTimeline, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="superia-glass-card p-6 rounded-2xl border border-white/10 bg-white/5 animate-pulse">
        <div className="h-6 w-24 bg-white/10 rounded-md mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="superia-glass-card p-6 rounded-2xl border border-white/10 bg-white/5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-red-400" /> Next Up</h3>
        <div className="text-center py-6">
          <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-xs">No approved events. Get registered!</p>
          <button onClick={onBrowseEvents} className="mt-3 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest flex items-center gap-1 mx-auto transition-all">
            Explore <ChevronRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="superia-glass-card p-6 rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/10 transition-colors" />
      
      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <Clock size={18} className="text-red-400" /> Your Schedule
      </h3>
      
      <div className="space-y-0 relative">
        {/* Vertical line with gradient */}
        <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-red-500/50 via-orange-500/20 to-transparent" />

        {events.slice(0, 5).map((event, idx) => {
          const isNext = idx === 0;
          const isSport = event.item_type === 'sport';

          return (
            <motion.div
              key={`${event.item_id}-${event.item_type}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className={`flex items-start gap-4 py-3.5 relative ${isNext ? 'z-10' : ''}`}
            >
              {/* Timeline icon */}
              <div className="relative flex-shrink-0 mt-1">
                {isNext ? (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-600/30 ring-2 ring-red-500/20">
                      {isSport ? <Trophy size={16} className="text-white" /> : <Calendar size={16} className="text-white" />}
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-red-500 -z-10"
                    />
                  </>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    {isSport ? <Trophy size={14} className="text-orange-400/60" /> : <Calendar size={14} className="text-red-400/60" />}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold truncate text-sm ${isNext ? 'text-white' : 'text-gray-300'}`}>
                      {event.event_title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                         {isSport ? 'Sports Arena' : 'Cultural Hall'}
                       </p>
                       {event.venue && (
                         <>
                           <span className="w-1 h-1 rounded-full bg-white/10" />
                           <p className="text-[10px] text-red-400/60 flex items-center gap-1 font-bold">
                             <MapPin size={10} /> {event.venue}
                           </p>
                         </>
                       )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <CountdownBadge targetDateStr={event.start_time} />
                  </div>
                </div>
                {isNext && (
                  <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-red-500/10 text-[9px] text-red-400 font-black uppercase tracking-[0.2em]">
                    Upcoming
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default NextUpTimeline;

