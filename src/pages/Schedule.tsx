import { useMemo, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { parseTimeValue, getEventTimeRange } from '../utils/timeUtils';
import ScheduleHeader from '../components/Schedule/ScheduleHeader';
import ScheduleTypeToggle from '../components/Schedule/ScheduleTypeToggle';
import DailyScheduleSection from '../components/Schedule/DailyScheduleSection';

export const Schedule = () => {
  const { schedule, events, siteSettings } = useData();
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const [scheduleType, setScheduleType] = useState<'prelims' | 'mains'>('prelims');

  // Set default type from site settings once loaded
  useEffect(() => {
    if (siteSettings?.default_schedule_type) {
      setScheduleType(siteSettings.default_schedule_type);
    }
  }, [siteSettings]);

  const allCategories = useMemo(() => {
    const categories = new Set(['All']);
    schedule.forEach(day => {
      day.events?.forEach((event: any) => {
        if (event.category) categories.add(event.category);
        else if (event.type) categories.add(event.type);
      });
    });
    return Array.from(categories);
  }, [schedule]);

  const filteredGroupedByDate = useMemo(() => {
    // 1. Filter by type (prelims/mains)
    const typeFiltered = schedule.filter((day: any) => (day.schedule_type || 'prelims') === scheduleType);

    return typeFiltered.map(day => {
      // 2. Filter events by search and category
      const filteredEvents = (day.events || []).filter((ev: any) => {
        const matchesSearch = !searchQuery || 
          ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ev.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ev.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = activeFilter === 'All' || 
          ev.category === activeFilter || 
          ev.type === activeFilter;

        return matchesSearch && matchesCategory;
      });

      // 3. Sort events by time
      const sortedEvents = [...filteredEvents].sort((a: any, b: any) => {
        return parseTimeValue(a.time) - parseTimeValue(b.time);
      });

      return {
        ...day,
        events: sortedEvents.map((ev: any) => ({
          ...ev,
          parsedDateRange: getEventTimeRange(ev),
          // Check if registration is closed for linked events (logic preserved)
          registration_closed: (() => {
            const linkedEvent = ev.event_id ? events.find((e: any) => e.id === ev.event_id) : null;
            if (!linkedEvent) return false;
            if (linkedEvent.registration_open) return false;
            
            const le = linkedEvent as any;
            if (le.registration_timer_enabled && le.registration_opens_at) {
              const openAt = new Date(le.registration_opens_at).getTime();
              const nowMs = Date.now();
              if (!isNaN(openAt) && nowMs >= openAt) {
                if (le.registration_closes_at) {
                  const closesAt = new Date(le.registration_closes_at).getTime();
                  if (!isNaN(closesAt) && nowMs >= closesAt) return true;
                }
                return false;
              }
            }
            return true;
          })()
        }))
      };
    }).filter(day => day.events.length > 0 || !searchQuery); // Only show empty days if not searching
  }, [schedule, scheduleType, searchQuery, activeFilter, events]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 bg-[#0a0a0a] text-indigo-50 selection:bg-indigo-600 selection:text-white">
      
      {/* Background Glows */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-indigo-950/20 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 right-10 w-[30rem] h-[30rem] bg-violet-950/10 rounded-full mix-blend-multiply filter blur-[150px] opacity-30 animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <ScheduleHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          allCategories={allCategories}
        />

        <ScheduleTypeToggle 
          scheduleType={scheduleType}
          setScheduleType={setScheduleType}
        />

        <div className="space-y-20">
          {filteredGroupedByDate.map((day, idx) => (
            <DailyScheduleSection 
              key={day.id || idx}
              day={day}
              idx={idx}
              now={now}
            />
          ))}
        </div>
        
        {filteredGroupedByDate.length === 0 && (
          <div className="text-center py-40 border-2 border-white/5 bg-white/5 rounded-[4rem] backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
            <AlertCircle size={80} className="mx-auto text-indigo-900/40 mb-8" />
            <h3 className="text-4xl text-white font-black italic uppercase tracking-tighter mb-4">
              Schedule Not Found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              We couldn't find any events matching your request. Try adjusting your filters or search terms.
            </p>
          </div>
        )}

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .nebula-theme {
            text-shadow: 0 0 30px rgba(99, 102, 241, 0.05);
          }
        `}</style>
      </div>
    </div>
  );
};

