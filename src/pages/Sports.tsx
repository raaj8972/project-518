import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  ArrowRight, 
  Search, 
  Zap, 
  Shield, 
  Layout, 
  Info,
  X,
  User,
  Target,
  Activity,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { getSportTheme } from '../utils/sportBranding';
import { useAnnualSports } from '../context/AnnualSportsContext';
import { useSportsData } from '../context/SportsContext';
import { usePersonnelData } from '../context/PersonnelContext';
import { useData } from '../context/DataContext';
import { ModernRegistrationModal } from '../components/ModernRegistrationModal';
import { AnnualSportsRegistrationModal } from '../components/AnnualSportsRegistrationModal';
import SportsProfileModal from '../components/SportsProfileModal';
import { SportsAuctionBoard } from '../components/sports/SportsAuctionBoard';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnnualSportsEvent, SportsSeason, SportsTeamMember } from '../types/data';
import { createPortal } from 'react-dom';

gsap.registerPlugin(ScrollTrigger);

// --- Sub-components for Clean Structure ---

const CommitteeBackgroundEffect: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] select-none pointer-events-none flex items-center justify-center overflow-hidden mix-blend-overlay">
      <div className="text-[20rem] font-black transform rotate-12 translate-x-20">COMMITTEE</div>
    </div>
    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
    <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-gold-600/10 rounded-full blur-[120px]" />
  </div>
);

// --- Sport Details / Tabs (Polished) ---

type SportItem = AnnualSportsEvent | SportsSeason;

// --- Premium Team Roster Modal ---

interface TeamRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: any;
  sportTitle: string;
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'target': Target,
    'activity': Activity,
    'zap': Zap,
    'user': User,
    'shield': Shield
  };
  return iconMap[iconName] || Shield;
};

const TeamRosterModal: React.FC<TeamRosterModalProps> = ({ isOpen, onClose, registration, sportTitle }) => {
  if (!isOpen || !registration) return null;

  const theme = getSportTheme(sportTitle);
  
  const members = [
    { 
      name: registration.full_name, 
      photo: registration.photo_url, 
      role: 'Captain',
      metadata: registration.metadata || {}
    },
    ...(registration.team_members || []).map((m: any) => ({
      ...m,
      photo: m.photo_url,
      role: m.metadata?.role || m.role || 'Player'
    }))
  ];

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-[#0a0a0f] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20 overflow-hidden"
              style={{ background: registration.metadata?.team_logo_url ? 'transparent' : `linear-gradient(to bottom right, ${theme.primaryColor}, ${theme.secondaryColor})` }}
            >
              {registration.metadata?.team_logo_url ? (
                <img src={registration.metadata.team_logo_url} alt="" className="w-full h-full object-contain p-1 bg-black/40" />
              ) : (
                React.createElement(getIconComponent(theme.icon), { size: 24, className: "text-black" })
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                {registration.team_name || registration.metadata?.team_name || registration.full_name}
              </h2>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <SparklesIcon size={10} className="text-gold-500" /> Team Squad • {sportTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {members.map((player, idx) => (
              <div key={idx} className="group relative">
                <div className="relative h-[420px] w-full bg-[#12121a] rounded-[2.5rem] border border-white/5 overflow-hidden transition-all duration-500 hover:border-gold-500/40 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.secondaryColor} opacity-[0.03] group-hover:opacity-[0.1] transition-opacity`} />
                  
                  <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                    {player.photo ? (
                      <img src={player.photo} alt={player.name} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="relative w-full h-full flex items-end justify-center">
                         <User className="w-[85%] h-[85%] text-white/[0.02] mb-[-10%]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-7 z-10">
                    <div className="flex flex-col gap-1 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gold-500 uppercase tracking-[0.2em]">{player.role}</span>
                        <div className="h-px bg-gold-500/20 flex-grow" />
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight line-clamp-1">{player.name}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {theme.attributes.slice(0, 4).map(attr => (
                        <div key={attr.key} className="bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-0.5">
                          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest leading-none">{attr.label}</span>
                          <span className="text-[12px] font-black text-white/90 truncate leading-tight">
                            {player.metadata?.[attr.key] || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute top-6 left-6 z-20">
                    <div className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center font-black text-gold-400 text-xl shadow-xl">
                      {player.metadata?.jersey_number || '00'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-white/5 bg-black/40 flex justify-between items-center backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gold-500/50" />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{members.length} Squad Members</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Verified Rosters</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const SportDetailsContent: React.FC<{ sport: SportItem }> = ({ sport }) => {
  const [activeTab, setActiveTab] = useState<string>('Teams');
  const { sportsTeams, sportsMatches } = useSportsData();
  const { annualRegistrations } = useAnnualSports();
  const [selectedRosterTeam, setSelectedRosterTeam] = useState<any | null>(null);
  
  const sportId = sport.id;
  const isAnnual = 'image_url' in sport;
  const annualSport = isAnnual ? (sport as AnnualSportsEvent) : null;

  const displayTeams = isAnnual ? annualSport?.display_teams !== false : true;
  const displaySchedule = isAnnual ? annualSport?.display_schedule !== false : true;
  const isIndividual = isAnnual && annualSport?.registration_default_mode === 'individual';
  const hasAuction = !isAnnual;

  const tabs: string[] = [];
  if (displayTeams) tabs.push(isIndividual ? 'Players' : 'Teams');
  if (hasAuction) tabs.push('Auction');
  if (displaySchedule) tabs.push('Schedule');

  useEffect(() => {
    if (!tabs.includes(activeTab) && tabs.length > 0) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  const filteredTeams = useMemo(() => 
    isAnnual 
      ? sportsTeams.filter(t => String(t.annual_event_id) === String(sportId))
      : sportsTeams.filter(t => String(t.sport_id) === String(sportId)), 
    [sportId, sportsTeams, isAnnual]
  );
  
  const filteredMatches = useMemo(() => 
    isAnnual
      ? sportsMatches.filter(m => String(m.annual_event_id) === String(sportId))
      : sportsMatches.filter(m => String(m.sport_id) === String(sportId)), 
    [sportId, sportsMatches, isAnnual]
  );

  const eventRegistrations = useMemo(() => 
    isAnnual ? annualRegistrations.filter(r => r.event_id === sportId && r.status === 'approved') : [],
    [isAnnual, annualRegistrations, sportId]
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === t 
                ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/40' 
                : 'text-white/80 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-[400px] p-1">
        {activeTab === 'Auction' && (
          <SportsAuctionBoard sportId={sportId} isAnnual={isAnnual} />
        )}

        {(activeTab === 'Teams' || activeTab === 'Players') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAnnual ? (
              eventRegistrations.length > 0 ? (
                eventRegistrations.map((reg) => (
                  <button 
                    key={reg.id} 
                    onClick={() => setSelectedRosterTeam(reg)}
                    className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-gold-500/30 hover:bg-white/[0.05] transition-all flex items-center gap-4 text-left w-full"
                  >
                    <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                      {isIndividual ? (
                        reg.photo_url ? (
                          <img src={reg.photo_url} alt={reg.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-white/20" />
                        )
                      ) : (
                        reg.metadata?.team_logo_url ? (
                          <img src={reg.metadata?.team_logo_url} alt={reg.team_name || reg.metadata?.team_name || reg.full_name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Shield size={24} className="text-white/20" />
                        )
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white group-hover:text-gold-400 transition-colors uppercase tracking-tight text-sm">
                        {reg.team_name || reg.metadata?.team_name || reg.full_name}
                      </h4>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center h-[350px] text-white/20 italic text-center p-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                  <Users size={48} className="mb-4 opacity-10" />
                  <p>No {activeTab.toLowerCase()} have been registered yet.</p>
                </div>
              )
            ) : (
              filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <div key={team.id} className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-gold-500/30 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-2">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                      ) : (
                        <Shield size={20} className="text-white/10" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white group-hover:text-gold-400 transition-colors uppercase tracking-tight text-sm">{team.name}</h4>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center h-[350px] text-white/20 italic text-center p-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                  <Users size={48} className="mb-4 opacity-10" />
                  <p>No teams have been registered yet.</p>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'Schedule' && (
          <div className="space-y-3">
            {filteredMatches.length > 0 ? (
              filteredMatches.map((match) => {
                const matchAny = match as any;
                const teamA = isAnnual && eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)
                  ? { name: eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)?.team_name || eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)?.metadata?.team_name || eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)?.full_name, logo: eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)?.metadata?.team_logo_url || eventRegistrations.find(r => r.id === matchAny.annual_team_a_id)?.photo_url }
                  : sportsTeams.find(t => String(t.id) === String(matchAny.team_a_id));
                const teamB = isAnnual && eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)
                  ? { name: eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)?.team_name || eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)?.metadata?.team_name || eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)?.full_name, logo: eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)?.metadata?.team_logo_url || eventRegistrations.find(r => r.id === matchAny.annual_team_b_id)?.photo_url }
                  : sportsTeams.find(t => String(t.id) === String(matchAny.team_b_id));
                return (
                  <div key={match.id} className="group flex flex-col md:flex-row items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-gold-500/30 transition-all">
                    <div className="flex-1 flex items-center justify-end gap-4 text-right">
                      <span className="font-black text-xs md:text-sm text-white uppercase tracking-tight truncate max-w-[120px]">{teamA?.name || 'TBA'}</span>
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                        {teamA?.logo ? <img src={teamA.logo} alt="" className="w-full h-full object-contain" /> : <Shield size={16} className="text-white/5" />}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 min-w-[100px]">
                      <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                        <span className="font-black text-lg text-gold-500">{(match as any).score1 || (match as any).score_a || '0'} - {(match as any).score2 || (match as any).score_b || '0'}</span>
                      </div>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{match.status || 'Upcoming'}</span>
                    </div>

                    <div className="flex-1 flex items-center justify-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                        {teamB?.logo ? <img src={teamB.logo} alt="" className="w-full h-full object-contain" /> : <Shield size={16} className="text-white/5" />}
                      </div>
                      <span className="font-black text-xs md:text-sm text-white uppercase tracking-tight truncate max-w-[120px]">{teamB?.name || 'TBA'}</span>
                    </div>

                    <div className="md:ml-4 pl-4 md:border-l border-white/5 flex flex-col justify-center items-center md:items-start">
                      <span className="text-[10px] font-black text-gold-500/50 uppercase tracking-widest">{match.match_date ? new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}</span>
                      <span className="text-[10px] text-white/30 font-medium">{match.venue || 'Main Arena'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-white/20 italic text-center p-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                <Layout size={48} className="mb-4 opacity-10" />
                <p>The schedule for {sport.name} is currently being finalized.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <TeamRosterModal 
        isOpen={!!selectedRosterTeam} 
        onClose={() => setSelectedRosterTeam(null)} 
        registration={selectedRosterTeam}
        sportTitle={(sport as any).name || (sport as any).title}
      />
    </div>
  );
};

export const Sports: React.FC = () => {
  const { annualEvents, annualRegistrations } = useAnnualSports();
  const { sportsSeasons, sportsPlayers, sportsTeams } = useSportsData();
  const { sportsCommittees, sportsTeamMembers } = usePersonnelData();
  const { siteSettings, loading, isAdmin } = useData();

  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportForReg, setSelectedSportForReg] = useState<string | null>(null);
  const [selectedSportForView, setSelectedSportForView] = useState<SportItem | null>(null);
  const [selectedCommitteeMember, setSelectedCommitteeMember] = useState<SportsTeamMember | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAnnualMode = siteSettings?.annual_sports_mode_enabled;

  const isSportRegistrationOpen = (sport: SportItem): boolean => {
    const globalSportsOpen = (siteSettings as any)?.sports_registration_config?.registration_open ?? true;
    if (!globalSportsOpen) return false;
    if (sport.registration_open) return true;

    if ('registration_timer_enabled' in sport && sport.registration_timer_enabled) {
      const now = Date.now();
      const openAt = sport.registration_opens_at ? new Date(sport.registration_opens_at).getTime() : null;
      const closesAt = sport.registration_closes_at ? new Date(sport.registration_closes_at).getTime() : null;
      if (openAt && !isNaN(openAt) && now < openAt) return false;
      if (closesAt && !isNaN(closesAt) && now >= closesAt) return false;
      if (!openAt) return false;
      return true;
    }

    if ('owner_registration_open' in sport || 'player_registration_open' in sport) {
      return !!(sport.registration_open || (sport as any).owner_registration_open || (sport as any).player_registration_open);
    }
    return !!sport.registration_open;
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-title-part', {
        y: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out'
      });
      
      gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 20,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out'
      });

      gsap.from('.stat-box', {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.8,
        ease: 'back.out(1.7)'
      });
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  const filteredSports = useMemo(() => {
    let baseList: SportItem[] = isAnnualMode ? (annualEvents as SportItem[]) : (sportsSeasons.filter(s => s.enabled) as SportItem[]);
    
    // Filter by visibility for non-admins
    if (!isAdmin()) {
      baseList = baseList.filter(item => {
        if ('visible' in item) return item.visible !== false;
        return true; // Default to true if field missing (older data)
      });
    }

    return baseList.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const cat = 'category' in item ? item.category : 'Division';
      const catMatch = selectedCategory === 'All' || cat === selectedCategory;
      return nameMatch && catMatch;
    });
  }, [isAnnualMode, annualEvents, sportsSeasons, searchQuery, selectedCategory, isAdmin]);

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-gold-500/20 rounded-full animate-ping" />
        <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold-500 animate-pulse" size={40} />
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="min-h-screen bg-[#030712] text-white selection:bg-gold-500/30 overflow-x-hidden">
        
        {/* 1. FUTURISTIC HERO */}
        <section className="relative pt-40 pb-32 overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold-600/10 rounded-full blur-[160px] opacity-50" />
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-blue-600/5 rounded-full blur-[160px] rotate-12" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="hero-subtitle inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-gold-400 text-[10px] font-black tracking-[0.3em] uppercase mb-8 backdrop-blur-md">
              <Zap size={14} className="text-gold-500" />
              Unleash Your Power
              <Zap size={14} className="text-gold-500" />
            </div>
            
            <h1 className="text-6xl md:text-[10rem] font-black mb-6 leading-[0.85] tracking-tighter uppercase hero-title">
              <div className="hero-title-part overflow-hidden">THE ARENA</div>
              <div className="hero-title-part bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent italic">OF GIANTS</div>
            </h1>
            
            <p className="hero-subtitle text-lg md:text-xl text-white/40 max-w-2xl font-light leading-relaxed mb-12 mx-auto uppercase tracking-widest">
              Witness the convergence of strength, strategy, and sheer will.
            </p>

            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="stat-box">
                <div className="text-4xl md:text-5xl font-black mb-1">{filteredSports.length}</div>
                <div className="text-[10px] text-gold-500/50 font-black uppercase tracking-[0.2em]">Disciplines</div>
              </div>
              <div className="stat-box">
                <div className="text-4xl md:text-5xl font-black mb-1">
                  {isAnnualMode ? annualRegistrations.length : sportsPlayers.length}
                </div>
                <div className="text-[10px] text-gold-500/50 font-black uppercase tracking-[0.2em]">Competitors</div>
              </div>
              <div className="stat-box">
                <div className="text-4xl md:text-5xl font-black mb-1">{sportsTeams.length}</div>
                <div className="text-[10px] text-gold-500/50 font-black uppercase tracking-[0.2em]">Elite Teams</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. NAVIGATION & SEARCH */}
        <section className="sticky top-0 z-[100] py-6 border-y border-white/5 bg-black/40 backdrop-blur-2xl">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
              {['All', 'Indoor', 'Outdoor'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCategory === cat 
                      ? 'bg-gold-500 text-black shadow-gold-500/40 shadow-2xl' 
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
              <input 
                type="text" 
                placeholder="LOCATE YOUR BATTLE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-white/10 uppercase tracking-widest"
              />
            </div>
          </div>
        </section>

        {/* 3. CORE SPORTS GRID */}
        <section className="py-24 container mx-auto px-4">
          <div className="sports-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSports.map((sportItem) => {
              const regCount = isAnnualMode 
                ? annualRegistrations.filter(r => r.event_id === String(sportItem.id)).length
                : sportsPlayers.filter(p => p.sport_id === sportItem.id).length;
              const isOpen = isSportRegistrationOpen(sportItem);
              
              return (
                <div 
                  key={sportItem.id}
                  className="sport-card group relative bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-1 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-gold-500/40"
                >
                  <div className="p-8 h-full flex flex-col justify-between bg-[#08080c] rounded-[2.9rem] relative z-10 transition-colors group-hover:bg-[#0c0c14]">
                    <div>
                      {/* Image Header */}
                      <div className="relative h-48 -mt-8 -mx-8 mb-8 overflow-hidden rounded-t-[2.9rem] border-b border-white/5 bg-white/[0.02]">
                        {((sportItem as any).image_url || (sportItem as any).image) ? (
                          <img 
                            src={(sportItem as any).image_url || (sportItem as any).image} 
                            alt={sportItem.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold-500/10 to-transparent">
                            <Trophy size={48} className="text-gold-500/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-transparent" />
                      </div>

                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                          <div className="px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[9px] font-black uppercase tracking-widest">
                            {'category' in sportItem ? sportItem.category : 'Major'}
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedSportForView(sportItem)}
                          className="p-3 bg-white/5 hover:bg-gold-500 hover:text-black rounded-2xl transition-all text-white/40"
                        >
                          <Info size={18} />
                        </button>
                      </div>

                      <h3 className="text-3xl font-black mb-4 group-hover:text-gold-400 transition-colors uppercase tracking-tight leading-none">
                        {sportItem.name}
                      </h3>
                      
                      <p className="text-white/30 text-sm font-light leading-relaxed mb-8 line-clamp-3">
                        {sportItem.description || 'Global championship event featuring top tier talents from across the nation.'}
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-white/[0.05] border border-white/10 rounded-2xl shadow-inner">
                        <div className="flex items-center gap-3">
                          <Users size={16} className="text-amber-400" />
                          <span className="text-sm font-black text-white">{regCount} <span className="text-white/50 font-medium tracking-tight">Competitors</span></span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                      </div>

                      {isOpen ? (
                        <button 
                          onClick={() => setSelectedSportForReg(String(sportItem.id))}
                          style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b, #ea580c) !important' }}
                          className="w-full py-5 text-black hover:scale-[1.02] active:scale-95 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(251,191,36,0.5)] border-none relative overflow-hidden group/btn"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                          <span className="relative z-10">Enlist Now</span>
                          <ArrowRight size={18} className="relative z-10" />
                        </button>
                      ) : (
                        <div className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] text-white/20 cursor-not-allowed">
                          <Shield size={16} className="opacity-10" />
                          Closed
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Background Decor */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[60px] group-hover:bg-gold-500/20 transition-all" />
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. THE COUNCIL */}
        <section id="committee" className="py-32 relative bg-black/60">
          <CommitteeBackgroundEffect />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-end justify-between gap-12 mb-20">
              <div className="max-w-2xl">
                <h2 className="text-5xl md:text-8xl font-black mb-8 leading-none tracking-tighter">THE <span className="text-gold-500 italic">COUNCIL</span></h2>
                <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed uppercase tracking-widest">The architects of the arena. Managing excellence behind every play.</p>
              </div>
              <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center min-w-[200px] backdrop-blur-xl">
                <div className="text-5xl font-black text-white mb-2">{sportsCommittees.length}</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">Strategic Divisions</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {sportsCommittees.filter(c => c.enabled).map((committee) => {
                const head = sportsTeamMembers.find(m => m.committee_id === committee.id && m.is_head && m.enabled);
                return (
                  <div 
                    key={committee.id}
                    onClick={() => head && setSelectedCommitteeMember(head)}
                    className="group relative h-60 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2.5rem] p-8 cursor-pointer overflow-hidden transition-all hover:border-gold-500/50 hover:-translate-y-2"
                  >
                    <div className="absolute inset-0 bg-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative h-full flex flex-col justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-black transition-all shadow-xl group-hover:shadow-gold-500/20">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black group-hover:text-gold-400 transition-colors uppercase tracking-widest leading-tight">{committee.name}</h4>
                        <div className="mt-2 text-[8px] text-white/20 font-black uppercase tracking-widest group-hover:text-white/40 transition-colors">Coordinator</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="py-24" />
      </div>

      {/* 5. MODALS & OVERLAYS */}
      {selectedSportForView && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="relative w-full max-w-5xl bg-[#0c0c14] border border-white/10 rounded-[4rem] overflow-hidden max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{selectedSportForView.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-gold-500" />
                  <span className="text-gold-500/50 text-[10px] font-black uppercase tracking-[0.3em]">Operational Intel</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSportForView(null)} 
                className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center border border-white/10"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
              <SportDetailsContent sport={selectedSportForView} />
            </div>
          </div>
        </div>
      )}

      {selectedSportForReg && (
        <div className="relative z-[10001]">
          {isAnnualMode ? (
            <AnnualSportsRegistrationModal
              isOpen={!!selectedSportForReg}
              onClose={() => setSelectedSportForReg(null)}
              registrationTargetId={selectedSportForReg}
              registrationTargetTitle={
                annualEvents.find(ev => String(ev.id) === selectedSportForReg)?.name || 'Registration'
              }
            />
          ) : (
            <ModernRegistrationModal
              isOpen={!!selectedSportForReg}
              onClose={() => setSelectedSportForReg(null)}
              type="legacy"
              targetId={selectedSportForReg}
              targetTitle={sportsSeasons.find(ev => String(ev.id) === selectedSportForReg)?.name || 'Registration'}
              targetData={sportsSeasons.find(ev => String(ev.id) === selectedSportForReg) as SportsSeason}
              config={{ customFields: [] }}
            />
          )}
        </div>
      )}

      {selectedCommitteeMember && (
        <div className="relative z-[10002]">
          <SportsProfileModal
            open={!!selectedCommitteeMember}
            onClose={() => setSelectedCommitteeMember(null)}
            person={selectedCommitteeMember}
          />
        </div>
      )}
    </>
  );
};
