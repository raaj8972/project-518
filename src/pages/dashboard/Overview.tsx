import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Trophy, 
  Clock,
  ChevronRight,
} from 'lucide-react';
import NextUpTimeline from '../../components/dashboard/NextUpTimeline';
import ParticipantCarousel from '../../components/dashboard/ParticipantCarousel';
import VibePreview from '../../components/dashboard/VibePreview';
import BatchWar from '../../components/dashboard/BatchWar';
import AdmirersList from '../../components/dashboard/AdmirersList';

interface DashboardContextType {
  user: any;
  profile: any;
  registrations: any[];
  sportsRegistrations: any[];
  entryPasses: any[];
  xpData: any;
  dataLoading: boolean;
  rankInfo: any;
  isNightMode: boolean;
}

const Overview: React.FC = () => {
  const { 
    registrations, 
    sportsRegistrations, 
    xpData, 
    dataLoading, 
    rankInfo,
  } = useOutletContext<DashboardContextType>();
  const navigate = useNavigate();

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 sm:space-y-6 lg:space-y-8"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {dataLoading ? (
          [0, 1, 2].map(i => (
            <div key={i} className="rico-glass-card p-6 rounded-2xl border border-white/10 bg-white/5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10" />
                <div className="w-10 h-7 rounded bg-white/10" />
              </div>
              <div className="h-4 w-28 bg-white/10 rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="rico-glass-card p-6 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-indigo-500" />
                </div>
                <span className="text-2xl font-bold text-white">{registrations.length}</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Cultural Events</p>
            </div>

            <div className="rico-glass-card p-6 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-2xl font-bold text-white">{sportsRegistrations.length}</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Sports Events</p>
            </div>

            <div className={`rico-glass-card p-6 rounded-2xl border border-white/10 bg-white/5 hidden md:block relative overflow-hidden group`}>
              {rankInfo && (
                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${rankInfo.auraGradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full blur-2xl`} />
              )}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white uppercase tracking-tighter block">{xpData?.tier || 'Rookie'}</span>
                  {rankInfo && (
                    <span className="text-[10px] font-black text-yellow-500/50 uppercase tracking-widest">Rank #{rankInfo.rank}</span>
                  )}
                </div>
              </div>
              <p className="text-gray-400 text-sm font-medium relative z-10">Status Tier</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <NextUpTimeline onBrowseEvents={() => navigate('/events')} />
        </div>
        
        <div className="space-y-6 sm:space-y-8">
          <AdmirersList />
          <VibePreview />
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            RICO STARS
            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-[10px] text-white uppercase tracking-widest animate-pulse">Live</span>
          </h2>
          <button 
            onClick={() => navigate('/dashboard/community')}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
          >
            Full Community <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <ParticipantCarousel />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 mt-12 pb-12">
        <BatchWar />
      </div>
    </motion.div>
  );
};

export default Overview;
