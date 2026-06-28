import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight, Users, ArrowRight, Shield } from 'lucide-react';
import { BRAND_NAME } from '../../constants/brand';

interface DashboardContextType {
  sportsRegistrations: any[];
  dataLoading: boolean;
}

const Sports: React.FC = () => {
  const { sportsRegistrations, dataLoading } = useOutletContext<DashboardContextType>();
  const navigate = useNavigate();

  return (
    <motion.div
      key="sports"
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
          <h1 className="text-2xl font-black text-white tracking-tight">Sports Arena</h1>
        </div>
        <button 
          onClick={() => navigate('/sports')}
          className="neu-nav-item px-5 py-2.5 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors w-fit"
        >
          <span className="text-xs font-black uppercase tracking-widest">Sports Section</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="neu-card rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : sportsRegistrations.length > 0 ? (
        <div className="space-y-4">
          {sportsRegistrations.map((reg, idx) => (
            <motion.div
              key={reg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
            >
              <div className="neu-card neu-accent-cyan rounded-2xl p-6 group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,211,238,0.1)' }}>
                    <Trophy className="w-7 h-7 text-cyan-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-white mb-2 truncate tracking-tight">
                      {reg.event?.name || reg.competition_name || reg.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      {(reg.event?.category || reg.category) && (
                        <span className="text-cyan-400 font-black uppercase tracking-widest text-[10px]">
                          {reg.event?.category || reg.category}
                        </span>
                      )}
                      {reg.teams && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                            Team: <span className="text-gray-400">{reg.teams.name || reg.teams.code}</span>
                          </span>
                        </div>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-green-400" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Registered
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button 
                    onClick={() => navigate('/sports')}
                    className="neu-nav-item px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Arena Page
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="neu-card p-16 rounded-2xl flex flex-col items-center text-center">
          <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
            <Trophy className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Sports Registrations</h3>
          <p className="text-gray-600 max-w-sm mb-8 text-sm leading-relaxed">
            The arena is waiting! Sign up for football, cricket, and more at {BRAND_NAME}.
          </p>
          <button 
            onClick={() => navigate('/sports')}
            className="px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', boxShadow: '0 8px 24px rgba(34,211,238,0.3)' }}
          >
            Enter Sports Arena <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Sports;
