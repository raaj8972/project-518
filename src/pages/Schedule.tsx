import { useMemo, useState, useEffect } from 'react';
import { MapPin, AlertCircle, Clock, Timer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';

export const Schedule = () => {
  const { schedule, events } = useData();
  const [now, setNow] = useState(new Date());

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Parse time string to minutes from midnight
  const parseTimeValue = (timeStr: string): number => {
    if (!timeStr) return 9999;
    try {
      const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const ap = match[3]?.toUpperCase();
        
        if (ap) {
            if (ap === 'PM' && h < 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
        } else {
             // Heuristic: < 7 is PM, otherwise AM unless explicit
             if (h < 7) h += 12; 
        }
        return h * 60 + m;
      }
    } catch (e) { return 9999; }
    return 9999;
  };

  // Helper: Get Start and End dates from time string + duration
  const getEventTimeRange = (dateStr: string, timeStr: string, durationStr?: string): { start: Date, end: Date } | null => {
    try {
        // Check for range in timeStr
        const parts = timeStr.split(/\s*(?:-|to)\s*/i);
        
        const startVal = parseTimeValue(parts[0]);
        if (startVal === 9999) return null;

        const startDate = new Date(dateStr);
        startDate.setHours(Math.floor(startVal / 60), startVal % 60, 0, 0);

        let endDate = new Date(startDate);
        
        // Priority 1: Explicit Range in Time String ("1-3 PM")
        if (parts.length > 1 && parts[1]) {
            const endVal = parseTimeValue(parts[1]);
            if (endVal !== 9999) {
                let endH = Math.floor(endVal / 60);
                endDate.setHours(endH, endVal % 60, 0, 0);
                if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
                return { start: startDate, end: endDate };
            }
        }

        // Priority 2: Duration Field ("2h", "1.5 hours")
        if (durationStr) {
             const durationMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour|min|m)/i);
             if (durationMatch) {
                 const val = parseFloat(durationMatch[1]);
                 const isMin = durationStr.match(/(?:min|m)/i) && !durationStr.match(/(?:h)/i); // simple check
                 
                 if (isMin) {
                     endDate.setMinutes(startDate.getMinutes() + val);
                 } else {
                     endDate.setMinutes(startDate.getMinutes() + (val * 60));
                 }
                 return { start: startDate, end: endDate };
             }
        }

        // Default: 2 hours
        endDate.setHours(startDate.getHours() + 2);
        return { start: startDate, end: endDate };
    } catch { return null; }
  };

  const getTimerStatus = (range: { start: Date, end: Date } | null) => {
    if (!range) return null;
    const { start, end } = range;
    const nowMs = now.getTime();
    const startMs = start.getTime();
    const endMs = end.getTime();

    // Not started yet
    if (nowMs < startMs) {
        const diff = startMs - nowMs;
        const diffHours = diff / (1000 * 60 * 60);
        if (diffHours < 1) {
            const mins = Math.floor(diff / (1000 * 60));
            return { label: `STARTS IN ${mins} MIN`, color: 'text-yellow-400' };
        }
        if (diffHours < 24) {
             return { label: `STARTS IN ${Math.floor(diffHours)} HR`, color: 'text-cyan-400' };
        }
        return null;
    }

    // Started (Live or Ended)
    if (nowMs >= startMs) {
        if (nowMs < endMs) {
            return { label: 'LIVE NOW', color: 'text-red-500 animate-pulse' };
        } else {
            return { label: 'ENDED', color: 'text-gray-600' };
        }
    }
    
    return null;
  };

  // Helper handling free text and standard formatting (Display only)
  const formatTimeRange = (time: string, _duration: string): string => {
    if (!time) return 'TBA';
    // If time contains a range indicator ('-' or 'to'), return as is
    if (time.includes('-') || time.toLowerCase().includes('to') || time.toLowerCase().includes('tba')) {
        return time;
    }
    try {
      const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2] ? parseInt(match[2], 10) : 0;
        const ap = match[3]?.toUpperCase();
        
        let isPM = false;

        if (ap) {
             isPM = (ap === 'PM');
        } else {
             if (h > 12) { h -= 12; isPM = true; }
             else if (h === 12) { isPM = true; }
             else if (h === 0) { h = 12; isPM = false; }
             else if (h < 7) { isPM = true; } // Heuristic
             else { isPM = false; }
        }
        
        const hour12 = h;
        const minStr = m > 0 ? `:${m.toString().padStart(2,'0')}` : '';
        return `${hour12}${minStr} ${isPM ? 'PM' : 'AM'}`;
      }
      return time;
    } catch { return time; }
  };

  const [scheduleType, setScheduleType] = useState<'prelims' | 'mains'>('prelims');

  const groupedByDate = useMemo(() => {
    // Filter by type
    const filteredDays = schedule.filter((day: any) => (day.schedule_type || 'prelims') === scheduleType);

    return filteredDays.map(day => {
        // Sort events by time
        const sortedEvents = [...(day.events || [])].sort((a: any, b: any) => {
            return parseTimeValue(a.time) - parseTimeValue(b.time);
        });

        return {
            ...day,
            events: sortedEvents.map((ev: any) => ({
                ...ev,
                displayTime: formatTimeRange(ev.time, ev.duration),
                parsedDate: getEventTimeRange(day.date, ev.time, ev.duration)
            }))
        };
    });
  }, [schedule, scheduleType, now]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(20deg) scale(2)'
           }}>
      </div>
      
      {/* Floating Orbs */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-cyan-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500 font-syncopate uppercase tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            Event Schedule
          </h1>
          
          {/* Cyberpunk Toggle Switch */}
          <div className="flex justify-center gap-6 mb-8 mt-8">
            <button 
                onClick={() => setScheduleType('prelims')}
                className={`relative px-8 py-3 clip-path-polygon font-bold tracking-widest transition-all duration-300 group overflow-hidden ${scheduleType === 'prelims' ? 'text-black bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]' : 'text-cyan-400 border border-cyan-800 hover:bg-cyan-900/30'}`}
            >
                <div className={`absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ${scheduleType !== 'prelims' && 'group-hover:translate-y-0'}`}></div>
                PRELIMS
            </button>
            <button 
                onClick={() => setScheduleType('mains')}
                className={`relative px-8 py-3 clip-path-polygon font-bold tracking-widest transition-all duration-300 group overflow-hidden ${scheduleType === 'mains' ? 'text-black bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'text-purple-400 border border-purple-800 hover:bg-purple-900/30'}`}
            >
                <div className={`absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ${scheduleType !== 'mains' && 'group-hover:translate-y-0'}`}></div>
                MAINS
            </button>
          </div>
        </div>

        <div className="space-y-12">
            {groupedByDate.map((day, idx) => (
                <div
                    key={day.id || idx}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
                >
                    <div className="flex items-center mb-6 pl-2 border-l-4 border-cyan-500">
                        <h2 className="text-3xl font-bold font-syncopate text-white uppercase tracking-widest drop-shadow-lg">
                            {day.date} <span className="text-cyan-400 text-xl ml-3 font-exo tracking-normal">{day.day}</span>
                        </h2>
                    </div>

                    <div className="bg-black/80 backdrop-blur border border-white/10 overflow-hidden relative group rounded-xl">
                        {/* Glowing Border specific to card */}
                        <div className={`absolute inset-0 border border-white/5 pointer-events-none rounded-xl ${scheduleType === 'prelims' ? 'group-hover:border-cyan-500/50' : 'group-hover:border-purple-500/50'} transition-colors duration-500`}></div>

                        {/* Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                            <div className="col-span-2 text-cyan-400">Time</div>
                            <div className="col-span-6 text-white">Event / Details</div>
                            <div className="col-span-4 text-right pr-2">Location</div>
                        </div>

                        {/* Events List */}
                        <div className="divide-y divide-white/5">
                            {day.events?.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 italic font-exo">
                                    No operations scheduled.
                                </div>
                            ) : (
                                day.events?.map((event: any, evIdx: number) => {
                                    const timerStatus = getTimerStatus(event.parsedDate);
                                    
                                    // Check if registration is closed for linked events
                                    const linkedEvent = event.event_id ? events.find((e: any) => e.id === event.event_id) : null;
                                    const isRegistrationClosed = linkedEvent ? !linkedEvent.registration_open : false;
                                    
                                    const handleEventClick = (e: React.MouseEvent) => {
                                      if (event.event_id && isRegistrationClosed) {
                                        e.preventDefault();
                                        alert(`⚠️ Registration Closed\n\nRegistrations for "${event.title}" are currently closed.`);
                                      }
                                    };
                                    
                                    return (
                                    <div 
                                      key={event.id || evIdx} 
                                      className={`grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-4 p-6 hover:bg-white/5 transition-all duration-300 items-center group relative overflow-hidden ${isRegistrationClosed ? 'opacity-75' : ''}`}
                                      onClick={handleEventClick}
                                    >
                                        
                                        {/* Hover Glow Effect */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                        {/* Time */}
                                        <div className="md:col-span-2 space-y-1">
                                            <div className="font-mono text-cyan-300 font-bold tracking-wider flex items-center gap-2">
                                                <Clock size={14} className="md:hidden" />
                                                {event.displayTime}
                                            </div>
                                            {timerStatus && (
                                                <div className={`text-[10px] font-black ${timerStatus.color} flex items-center gap-1`}>
                                                    <Timer size={10} />
                                                    {timerStatus.label}
                                                </div>
                                            )}
                                        </div>

                                        {/* Event Name */}
                                        <div className="md:col-span-6 pl-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {event.event_id ? (
                                                    <Link 
                                                        to={`/events?register=${event.event_id}`}
                                                        className="inline-block font-black text-xl md:text-2xl text-white group-hover:text-cyan-400 transition-colors uppercase font-exo tracking-wide cursor-pointer hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                                                        onClick={(e) => isRegistrationClosed && e.preventDefault()}
                                                    >
                                                        {event.title}
                                                    </Link>
                                                ) : (
                                                    <span className="font-black text-xl md:text-2xl text-white uppercase font-exo tracking-wide">{event.title}</span>
                                                )}
                                                {isRegistrationClosed && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase tracking-wider">
                                                        🔒 Registration Closed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-[0.15em] flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-sm ${scheduleType === 'prelims' ? 'bg-cyan-600' : 'bg-purple-600'}`}></span>
                                                {event.type}
                                            </div>
                                        </div>

                                        {/* Venue */}
                                        <div className="md:col-span-4 text-gray-400 flex items-center md:justify-end font-medium tracking-wide">
                                            <MapPin size={16} className="mr-2 text-cyan-600" />
                                            {event.venue}
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        {groupedByDate.length === 0 && (
             <div className="text-center py-32 border border-white/10 bg-black/50 rounded-2xl backdrop-blur-md">
                <AlertCircle size={64} className="mx-auto text-gray-700 mb-6 animate-pulse" />
                <p className="text-2xl text-gray-500 font-exo uppercase tracking-widest">SCHEDULE TO BE ANNOUNCED SOON</p>
             </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Exo+2:wght@400;600;900&display=swap');
          
          .font-syncopate { font-family: 'Syncopate', sans-serif; }
          .font-exo { font-family: 'Exo 2', sans-serif; }
          
          .clip-path-polygon {
            clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%);
          }
          
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); filter: blur(10px); }
            to { opacity: 1; transform: translateY(0); filter: blur(0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
};
