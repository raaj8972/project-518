import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Trophy, 
  ChevronRight,
  Zap,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  User,
  ShieldCheck,
  QrCode,
  Settings,
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
  tierColor: string;
  firstName: string;
  setSelectedPass: (pass: any) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

interface StatCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  glowClass: string;
  bgIcon: string;
}

const Overview: React.FC = () => {
  const { 
    registrations, 
    sportsRegistrations, 
    entryPasses,
    xpData, 
    dataLoading, 
    rankInfo,
    tierColor,
    firstName,
    setSelectedPass,
  } = useOutletContext<DashboardContextType>();
  const navigate = useNavigate();

  const totalXP = xpData?.total_xp ?? 0;
  const tier    = xpData?.tier ?? 'Rookie';

  const stats: StatCard[] = [
    {
      label: 'Cultural Events',
      value: registrations.length,
      sub: registrations.length === 1 ? '1 event registered' : `${registrations.length} events registered`,
      icon: Calendar,
      accent: '#6366f1',
      glowClass: 'neu-accent-indigo',
      bgIcon: 'bg-indigo-500/10',
    },
    {
      label: 'Sports Events',
      value: sportsRegistrations.length,
      sub: sportsRegistrations.length === 1 ? '1 sport registered' : `${sportsRegistrations.length} sports registered`,
      icon: Trophy,
      accent: '#22d3ee',
      glowClass: 'neu-accent-cyan',
      bgIcon: 'bg-cyan-500/10',
    },
    {
      label: 'My Points',
      value: totalXP,
      sub: 'higher points = better rank',
      icon: Zap,
      accent: '#f59e0b',
      glowClass: 'neu-accent-amber',
      bgIcon: 'bg-amber-500/10',
    },
    {
      label: 'My Rank',
      value: tier,
      sub: rankInfo ? `Community Rank: #${rankInfo.rank}` : 'earn points to rank up',
      icon: Award,
      accent: tierColor,
      glowClass: 'neu-accent-violet',
      bgIcon: 'bg-violet-500/10',
    },
  ];

  const handleShowPass = () => {
    if (entryPasses && entryPasses.length > 0) {
      setSelectedPass(entryPasses[0]);
    } else {
      navigate('/dashboard/passes');
    }
  };

  return (
    <motion.div
      key="overview"
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* ── Welcome & Interactive Dashboard Bar ────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="neu-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Student Dashboard</p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {firstName}'s <span style={{ color: tierColor }}>Space</span>
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            {rankInfo && (
              <div className="neu-inset px-4 py-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-black text-white">#{rankInfo.rank}</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black">rank</span>
              </div>
            )}
            <button
              onClick={handleShowPass}
              className="neu-nav-item px-4 py-2 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Entry Pass</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="neu-nav-item px-4 py-2 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dataLoading
          ? [0, 1, 2, 3].map(i => (
              <div key={i} className="neu-stat-card p-6 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/5 mb-4" />
                <div className="h-7 w-16 bg-white/5 rounded-lg mb-2" />
                <div className="h-3 w-24 bg-white/5 rounded" />
              </div>
            ))
          : stats.map((s) => (
              <motion.div key={s.label} variants={itemVariants} className={`neu-stat-card ${s.glowClass} p-5`}>
                <div className={`w-10 h-10 ${s.bgIcon} rounded-xl flex items-center justify-center mb-4`}>
                  <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
                <p className="text-2xl font-black text-white leading-none mb-1">{s.value}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.label}</p>
                {s.sub && <p className="text-[9px] text-gray-700 mt-1 truncate font-bold">{s.sub}</p>}
              </motion.div>
            ))}
      </div>

      {/* ── Two-Column Layout (Balanced height structure, no empty gaps) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) — Timeline + Celebrity Carousel */}
        <div className="lg:col-span-2 space-y-6">
          
          <motion.div variants={itemVariants}>
            <NextUpTimeline onBrowseEvents={() => navigate('/events')} />
          </motion.div>
          
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">RICO STARS</h2>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                  Top Performers
                </span>
              </div>
              <button 
                onClick={() => navigate('/dashboard/community')}
                className="neu-nav-item px-3 py-1.5 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
              >
                All Students <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <ParticipantCarousel />
          </motion.section>

        </div>

        {/* Right Column (1/3 width) — Likes + Stories + Batch Race */}
        <div className="space-y-6">
          
          <motion.div variants={itemVariants}>
            <AdmirersList />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <VibePreview />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <BatchWar />
          </motion.div>

        </div>

      </div>
    </motion.div>
  );
};

export default Overview;
