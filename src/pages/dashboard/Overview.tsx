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
            <div key={i} className="premium-glass p-8 rounded-3xl border border-white/10 bg-white/5 animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/10" />
                <div className="w-12 h-8 rounded bg-white/10" />
              </div>
              <div className="h-5 w-32 bg-white/10 rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="premium-glass p-8 rounded-3xl border border-white/10 premium-shadow premium-glass-hover group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-red-500/10">
                  <Calendar className="w-7 h-7 text-red-500" />
                </div>
                <span className="text-4xl font-black text-white tracking-tighter tabular-nums">{registrations.length}</span>
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Cultural Arsenal</p>
            </div>
 
            <div className="premium-glass p-8 rounded-3xl border border-white/10 premium-shadow premium-glass-hover group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-indigo-500/10">
                  <Trophy className="w-7 h-7 text-indigo-500" />
                </div>
                <span className="text-4xl font-black text-white tracking-tighter tabular-nums">{sportsRegistrations.length}</span>
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Sports Domain</p>
            </div>

            <div className={`premium-glass p-8 rounded-3xl border border-white/10 premium-shadow premium-glass-hover hidden md:block relative overflow-hidden group`}>
              {rankInfo && (
                <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${rankInfo.auraGradient} opacity-5 group-hover:opacity-15 transition-opacity rounded-full blur-3xl`} />
              )}
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-xl shadow-amber-500/10">
                  <Clock className="w-7 h-7 text-amber-500" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-white uppercase tracking-tighter block leading-none">{xpData?.tier || 'Rookie'}</span>
                  {rankInfo && (
                    <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mt-2 block">Rank #{rankInfo.rank}</span>
                  )}
                </div>
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Status Tier</p>
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
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-[10px] text-white uppercase tracking-widest animate-pulse">Live</span>
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
