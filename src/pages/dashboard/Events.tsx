import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, CalendarDays, Share2 } from 'lucide-react';
import { BRAND_NAME } from '../../constants/brand';

interface DashboardContextType {
  registrations: any[];
  dataLoading: boolean;
}

const Events: React.FC = () => {
  const { registrations, dataLoading } = useOutletContext<DashboardContextType>();
  const navigate = useNavigate();

  return (
    <motion.div
      key="events"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cultural Events</h1>
          <p className="text-gray-400">Events you've registered to participate in.</p>
        </div>
        <button 
          onClick={() => navigate('/events')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2 w-fit"
        >
          Discover More <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : registrations.length > 0 ? (
        <div className="relative border-l-2 border-white/5 ml-2 sm:ml-4 space-y-8 pb-8">
          {registrations.map((reg) => (
            <div key={reg.id} className="relative pl-8 sm:pl-12">
              {/* Timeline node */}
              <div className="absolute left-[-9px] sm:left-[-9px] top-10 w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] border-[3px] border-[#050508] z-10" />
              
              <div 
                className="rico-glass-card rounded-3xl border border-white/10 hover:border-red-500/30 transition-all duration-500 group overflow-hidden block"
              >
                {/* Immersive Event Artwork Background */}
                <div className="relative h-40 sm:h-56 w-full bg-[#111] overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent z-10" />
                   {reg.event?.image_url ? (
                     <img src={reg.event.image_url} alt={reg.event.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-transform duration-[2s] group-hover:scale-105" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-tr from-red-900/40 to-indigo-900/40 opacity-60 group-hover:opacity-80 transition-all duration-[2s] group-hover:scale-105" />
                   )}
                   
                   {/* Live Countdown Badge */}
                   <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                     <span className="text-white text-[10px] uppercase font-black tracking-widest">Starts in 2h 15m</span>
                   </div>
                </div>

                <div className="p-6 sm:p-8 relative z-10 bg-[#0a0a0a]">
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                    {reg.event?.title || reg.event_title || 'Untitled Event'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-3 gap-x-4 mb-8">
                    <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">{reg.event?.category?.name || reg.registration_type}</span>
                    {reg.teams && (
                      <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                        Team: <span className="text-white">{reg.teams.name}</span>
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider">
                      Confirmed
                    </span>
                  </div>

                  {/* Functional Action Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-white/5">
                    <button 
                      onClick={() => navigate('/events')}
                      className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest transition-all border border-white/5"
                    >
                      View Details
                    </button>
                    <button className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Add to Calendar</span>
                    </button>
                    <button className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Share Hype Card</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rico-glass-card p-16 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Registrations Yet</h3>
          <p className="text-gray-400 max-w-sm mb-8">
            You haven't signed up for any cultural events. Don't miss out on the action at {BRAND_NAME}!
          </p>
          <button 
            onClick={() => navigate('/events')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Explore Cultural Events
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Events;
