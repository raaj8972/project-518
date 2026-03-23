import React, { useState, useMemo, useEffect } from 'react';
import { Users, Layout, Shield, User } from 'lucide-react';
import { useSportsData } from '../../context/SportsContext';
import { useAnnualSports } from '../../context/AnnualSportsContext';
import { SportsAuctionBoard } from '../sports/SportsAuctionBoard';
import TeamRosterModal from './TeamRosterModal';
import { AnnualSportsEvent, SportsSeason } from '../../types/data';

type SportItem = AnnualSportsEvent | SportsSeason;

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
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
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
                    className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-red-600/30 hover:bg-white/[0.05] transition-all flex items-center gap-4 text-left w-full"
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
                      <h4 className="font-black text-white group-hover:text-red-500 transition-colors uppercase tracking-tight text-sm">
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
                  <div key={team.id} className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:border-red-600/30 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-2">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                      ) : (
                        <Shield size={20} className="text-white/10" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white group-hover:text-red-500 transition-colors uppercase tracking-tight text-sm">{team.name}</h4>
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
                  <div key={match.id} className="group flex flex-col md:flex-row items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-red-600/30 transition-all">
                    <div className="flex-1 flex items-center justify-end gap-4 text-right">
                      <span className="font-black text-xs md:text-sm text-white uppercase tracking-tight truncate max-w-[120px]">{teamA?.name || 'TBA'}</span>
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                        {teamA?.logo ? <img src={teamA.logo} alt="" className="w-full h-full object-contain" /> : <Shield size={16} className="text-white/5" />}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 min-w-[100px]">
                      <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                        <span className="font-black text-lg text-red-600">{(match as any).score1 || (match as any).score_a || '0'} - {(match as any).score2 || (match as any).score_b || '0'}</span>
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
                       <span className="text-[10px] font-black text-red-600/50 uppercase tracking-widest">{match.match_date ? new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}</span>
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

export default SportDetailsContent;
