import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Info, Megaphone, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Announcement {
  id: string;
  text: string;
  urgent: boolean;
  target: 'all' | 'students' | 'coordinators';
  sender_role: string;
  sender_id: string;
  event_id: string | null;
  created_at: string;
}

const AnnouncementsTicker: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, string>>({});
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);

  const TRUNCATE_LIMIT = 100;

  const truncateText = (text: string) => {
    if (text.length <= TRUNCATE_LIMIT) return { text, isLong: false };
    return { 
      text: text.slice(0, TRUNCATE_LIMIT) + '...', 
      isLong: true 
    };
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: regs } = await supabase.from('registrations').select('event_id').eq('user_id', uid);
      if (regs) setRegisteredEventIds(new Set(regs.map((r: any) => String(r.event_id))));
    });
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('category', 'general')
        .in('target', ['all', 'students'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        let filtered = data as Announcement[];
        // Students only see coordinator announcements for events they registered for
        filtered = filtered.filter(ann => {
          if (ann.sender_role === 'admin') return true;
          return ann.event_id ? registeredEventIds.has(String(ann.event_id)) : false;
        });

        setAnnouncements(filtered);
        
        // Fetch event names if any coordinator announcements exist
        const eids = data.filter(a => a.sender_role === 'coordinator' && a.event_id).map(a => String(a.event_id));
        if (eids.length > 0) {
          const { data: eData } = await supabase.from('events').select('id, title').in('id', eids);
          if (eData) {
            const map: Record<string, string> = {};
            eData.forEach((e: any) => { map[String(e.id)] = e.title; });
            setEventsMap((prev: any) => ({ ...prev, ...map }));
          }
        }
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);

    const channel = supabase.channel('announcements_ticker_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAnn = payload.new as Announcement;
          if (newAnn.sender_role === 'admin' || (newAnn.event_id && registeredEventIds.has(String(newAnn.event_id)))) {
            setAnnouncements((prev: any) => [newAnn, ...prev].slice(0, 10));
          }
        }
        if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          fetchAnnouncements(); // Easiest way to keep ticker synced
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [registeredEventIds]);

  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    if (trackRef.current && announcements.length > 0) {
      // The track contains 2x announcements. We want to scroll by 1x width.
      setScrollWidth(trackRef.current.scrollWidth / 2);
    }
  }, [announcements]);

  // Duplicate for smooth loop
  const displayItems = announcements.length > 0 
    ? [...announcements, ...announcements] 
    : [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm flex items-center h-11">
      {/* Left label */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 h-full bg-red-600/20 border-r border-red-500/20 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <Bell size={14} className="text-red-400" />
        <span className="text-[11px] font-black text-red-400 uppercase tracking-widest hidden sm:block">Live Update</span>
      </div>

      {/* Scrolling ticker */}
      <div className="overflow-hidden flex-1 relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#200708]/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#200708]/80 to-transparent z-10 pointer-events-none" />

        {announcements.length === 0 ? (
          <div className="flex items-center px-6 text-xs text-gray-500 italic">
            Waiting for latest updates... Stay tuned for event highlights!
          </div>
        ) : (
          <motion.div
            ref={trackRef}
            animate={{ x: [0, -scrollWidth] }}
            transition={{ 
              repeat: Infinity, 
              duration: Math.max(20, scrollWidth / 50), // Dynamic speed: ~50px per second
              ease: 'linear' 
            }}
            className="flex items-center gap-16 whitespace-nowrap px-6 w-max"
          >
            {displayItems.map((ann, idx) => {
              const { text, isLong } = truncateText(ann.text);
              return (
                <button 
                  key={`${ann.id}-${idx}`} 
                  onClick={() => navigate(`/dashboard/announcements#announcement-${ann.id}`)}
                  className="flex items-center gap-3 text-sm hover:opacity-80 transition-opacity whitespace-nowrap group/ann"
                >
                  {ann.urgent ? (
                    <AlertTriangle size={13} className="text-red-500 flex-shrink-0 animate-bounce" />
                  ) : ann.sender_role === 'admin' ? (
                    <Megaphone size={13} className="text-orange-400 flex-shrink-0" />
                  ) : (
                    <Info size={13} className="text-blue-400 flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-2">
                    <span className={ann.urgent ? 'text-white font-bold' : 'text-gray-300'}>
                      {ann.sender_role === 'admin' ? 'ADMIN' : (ann.event_id ? eventsMap[String(ann.event_id)]?.toUpperCase() || 'COORDINATOR' : 'COORDINATOR')}: {text}
                    </span>
                    {isLong && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-black text-white/40 group-hover/ann:text-white/60 transition-colors uppercase">
                         MORE <ChevronRight size={10} />
                      </span>
                    )}
                  </div>
                  <span className="text-white/10 ml-8 select-none">✦</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsTicker;

