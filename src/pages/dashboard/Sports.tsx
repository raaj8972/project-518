import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sports Arena</h1>
          <p className="text-gray-400">Competitive sports you've registered for.</p>
        </div>
        <button 
          onClick={() => navigate('/sports')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-sm flex items-center gap-2 w-fit"
        >
          Sports Section <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : sportsRegistrations.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {sportsRegistrations.map((reg) => (
            <div 
              key={reg.id} 
              className="superia-glass-card p-6 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-blue-600/10 transition-colors" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white mb-1 truncate">{reg.event?.name || reg.competition_name || reg.name}</h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm">
                    <span className="text-blue-400 font-medium">{reg.event?.category || reg.category}</span>
                    {reg.teams && (
                      <span className="text-gray-400">
                        Team Code: <span className="text-white font-medium">{reg.teams.code}</span>
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                      Registered
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/sports')}
                  className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/5"
                >
                  Arena Page
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="superia-glass-card p-16 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Sports Registrations</h3>
          <p className="text-gray-400 max-w-sm mb-8">
            The arena is waiting! Sign up for football, cricket, and more at {BRAND_NAME}.
          </p>
          <button 
            onClick={() => navigate('/sports')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Enter Sports Arena
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Sports;
