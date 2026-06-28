import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, CalendarDays, Share2, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '../../constants/brand';

interface DashboardContextType {
  registrations: any[];
  dataLoading: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const Events: React.FC = () => {
  const { registrations, dataLoading } = useOutletContext<DashboardContextType>();
  const navigate = useNavigate();

  return (
    <motion.div
      key="events"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="neu-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">My Registrations</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Cultural Events</h1>
        </div>
        <button 
          onClick={() => navigate('/events')}
          className="neu-nav-item px-5 py-2.5 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors w-fit"
        >
          <span className="text-xs font-black uppercase tracking-widest">Discover More</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {dataLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="neu-card rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : registrations.length > 0 ? (
        <div className="space-y-5">
          {registrations.map((reg, idx) => (
            <motion.div
              key={reg.id}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              transition={{ delay: idx * 0.06 }}
            >
              <div className="neu-card rounded-2xl overflow-hidden group">
                {/* Event artwork strip */}
                {(reg.event?.image || reg.event?.image_url) && (
                  <div className="relative h-36 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131720] via-[#131720]/60 to-transparent z-10" />
                    <img
                      src={reg.event.image || reg.event.image_url}
                      alt={reg.event.title}
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-all duration-700 group-hover:scale-105"
                    />
                    {/* Live badge */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl" style={{ background: 'rgba(14,17,23,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                      <span className="text-white text-[9px] uppercase font-black tracking-widest">Confirmed</span>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                      {reg.event?.title || reg.event_title || 'Untitled Event'}
                    </h3>
                    <span className="flex-shrink-0 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-green-400" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      Confirmed
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    {(reg.event?.category) && (
                      <span className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">
                        {typeof reg.event.category === 'object' ? reg.event.category.name : reg.event.category}
                      </span>
                    )}
                    {reg.teams && (
                      <span className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">
                        Team: <span className="text-gray-400">{reg.teams.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button onClick={() => navigate('/events')} className="neu-nav-item px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                      View Details <ChevronRight className="w-3 h-3" />
                    </button>
                    <button className="neu-nav-item px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> Add to Cal
                    </button>
                    <button className="neu-nav-item px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="neu-card p-16 rounded-2xl flex flex-col items-center text-center">
          <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
            <Calendar className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Registrations Yet</h3>
          <p className="text-gray-600 max-w-sm mb-8 text-sm leading-relaxed">
            You haven't signed up for any cultural events. Don't miss out on the action at {BRAND_NAME}!
          </p>
          <button 
            onClick={() => navigate('/events')}
            className="px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
          >
            Explore Cultural Events <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Events;
