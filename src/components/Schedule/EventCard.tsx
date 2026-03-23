import React from 'react';
import { Clock, MapPin, Users, Ticket, ExternalLink } from 'lucide-react';
import { getTimerStatus, formatTimeRange } from '../../utils/timeUtils';
import { useNavigate } from 'react-router-dom';

interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  location: string;
  venue?: string;
  venue_location?: string;
  type: 'workshop' | 'seminar' | 'networking' | 'main_event';
  category?: string;
  speaker?: string;
  expected_crowd?: string;
  capacity?: number;
  event_id?: string; // Links to main event registrations
  isFeatured?: boolean;
  registration_closed?: boolean;
}

interface EventCardProps {
  event: ScheduleEvent;
  currentTime: Date;
}

const EventCard: React.FC<EventCardProps> = ({ event, currentTime }) => {
  const navigate = useNavigate();
  const status = getTimerStatus(event, currentTime);

  const handleJoin = () => {
    if (event.event_id) {
      navigate(`/events?register=${event.event_id}`);
    }
  };

  return (
    <div className={`group relative transition-all duration-500 ${event.isFeatured ? 'col-span-1 md:col-span-2' : ''}`}>
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${
        status === 'live' ? 'from-[#ff3333] to-[#ff6666]' :
        status === 'upcoming' ? 'from-white/20 to-white/5' :
        'from-white/5 to-transparent'
      } rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500`}></div>
      
      <div className="relative h-full bg-[#111111] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Time Badge - Left Section */}
        <div className="md:w-48 shrink-0 flex flex-col justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${
              status === 'live' ? 'bg-[#ff3333] text-white animate-pulse' :
              status === 'upcoming' ? 'bg-white/10 text-white' :
              'bg-white/5 text-gray-500'
            }`}>
              {status === 'live' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
              {status}
            </div>
            <div className="text-3xl font-black text-white italic tracking-tighter mb-1">
              {formatTimeRange(event.time)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Clock className="w-4 h-4" />
              {event.date}
            </div>
          </div>
          
          <div className="hidden md:block mt-8">
             <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Venue</div>
             <div className="flex items-center gap-2 text-white font-bold group-hover:text-[#ff3333] transition-colors">
               <MapPin className="w-4 h-4 text-[#ff3333]" />
               {event.venue || event.location}
             </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#ff3333] text-[10px] font-bold uppercase tracking-widest leading-none">
                {event.category || event.type?.replace('_', ' ')}
              </span>
              {event.venue_location && (
                <a 
                  href={event.venue_location} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-white/5 hover:bg-[#ff3333] rounded-xl text-white transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <h3 className={`text-2xl md:text-3xl font-black mb-3 italic tracking-tight group-hover:translate-x-1 transition-transform ${event.isFeatured ? 'text-[#ff3333]' : 'text-white'}`}>
              {event.title}
            </h3>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed line-clamp-2 group-hover:text-gray-300 transition-colors">
              {event.description}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-white/5">
            {event.expected_crowd && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Expectation</div>
                  <div className="text-sm text-white font-bold">{event.expected_crowd}</div>
                </div>
              </div>
            )}
            
            {event.speaker && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Speaker</div>
                  <div className="text-sm text-white font-bold">{event.speaker}</div>
                </div>
              </div>
            )}
            
            {event.event_id && (
              <div className="ml-auto">
                <button 
                  onClick={handleJoin}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all bg-[#ff3333] hover:bg-[#ff4444] text-white shadow-lg shadow-[#ff3333]/20 hover:scale-105 active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  Join
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
