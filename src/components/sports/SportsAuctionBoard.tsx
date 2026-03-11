import React, { useMemo, useState } from 'react';
import { useSportsData } from '../../context/SportsContext';
import { useAnnualSports } from '../../context/AnnualSportsContext';
import { Zap, TrendingUp, Trophy, Crown, ChevronDown, Clock, User, Calendar } from 'lucide-react';

interface SportsAuctionBoardProps {
  sportId: string | number;
  isAnnual?: boolean;
}

export const SportsAuctionBoard: React.FC<SportsAuctionBoardProps> = ({ sportId, isAnnual }) => {
  const { sportsTeams, sportsPlayers, sportsSeasons } = useSportsData();
  const { annualEvents } = useAnnualSports();
  const [expandedTeamId, setExpandedTeamId] = useState<string | number | null>(null);
  const [auctionView, setAuctionView] = useState<'overview' | 'timeline'>('overview');

  const sport = isAnnual 
    ? annualEvents.find(e => String(e.id) === String(sportId))
    : sportsSeasons.find(s => String(s.id) === String(sportId));

  const teams = useMemo(() => 
    isAnnual
      ? sportsTeams.filter(t => String(t.annual_event_id) === String(sportId) && t.enabled)
      : sportsTeams.filter(t => String(t.sport_id) === String(sportId) && t.enabled), 
    [sportsTeams, sportId, isAnnual]
  );

  const players = useMemo(() => 
    isAnnual
      ? sportsPlayers.filter(p => String(p.annual_event_id) === String(sportId) && p.enabled)
      : sportsPlayers.filter(p => String(p.sport_id) === String(sportId) && p.enabled), 
    [sportsPlayers, sportId, isAnnual]
  );

  if (!sport) return null;

  const auctionDays = (sport as any).auction_days || 1;

  // Compute auction stats
  const totalBudgetPerTeam = 100000;
  const teamStats = teams.map((team: any) => {
    const teamPlayers = players.filter((p: any) => p.team_id === team.id);
    const spent = teamPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
    const remaining = Math.max(0, totalBudgetPerTeam - spent);
    return { ...team, teamPlayers, spent, remaining };
  }).sort((a: any, b: any) => b.remaining - a.remaining);

  const topBuys = [...players]
    .filter((p: any) => (p.status === 'sold' || p.status === 'retained') && p.sold_price)
    .sort((a: any, b: any) => (b.sold_price || 0) - (a.sold_price || 0))
    .slice(0, 5);

  const availablePlayers = players
    .filter((p: any) => p.status === 'available')
    .sort((a: any, b: any) => (b.base_price || 0) - (a.base_price || 0));

  const unsoldPlayers = players.filter((p: any) => p.status === 'unsold');

  // Group sold players by day
  const soldByDay: Record<number, any[]> = {};
  for (let d = 1; d <= auctionDays; d++) soldByDay[d] = [];
  players.filter(p => p.status === 'sold' || p.status === 'retained').forEach(p => {
    const day = (p as any).sold_day || 1;
    if (!soldByDay[day]) soldByDay[day] = [];
    soldByDay[day].push(p);
  });

  const status = (sport as any).auction_status || 'draft';
  const live = status === 'live';
  const upcoming = status === 'draft' || (!live && status !== 'completed');

  return (
    <div className="bg-[#030712] border border-white/10 rounded-3xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3 backdrop-blur-md text-xs font-bold uppercase tracking-widest
            bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
            {live ? (
              <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> LIVE AUCTION</>
            ) : upcoming ? (
              <><Clock className="w-3 h-3" /> AUCTION UPCOMING</>
            ) : (
              <><Trophy className="w-3 h-3" /> AUCTION COMPLETED</>
            )}
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">{sport.name} Auction</h3>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2 bg-[#0a0a12] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setAuctionView('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${auctionView === 'overview' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setAuctionView('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${auctionView === 'timeline' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            <Calendar className="w-3 h-3 inline mr-1" />Day View
          </button>
        </div>
      </div>

      {/* Timeline / Day View */}
      {auctionView === 'timeline' && (
        <div className="p-6 md:p-8 space-y-8">
          {Array.from({ length: auctionDays }, (_, i) => i + 1).map(day => {
            const dayPlayers = soldByDay[day] || [];
            return (
              <div key={day}>
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">{day}</span>
                  <span className="text-white">Day {day}</span>
                  <span className="text-white/30 ml-1">({dayPlayers.length} players)</span>
                </h4>
                {dayPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dayPlayers.sort((a: any, b: any) => (b.sold_price || 0) - (a.sold_price || 0)).map((player: any) => {
                      const team = teams.find(t => String(t.id) === String(player.team_id));
                      return (
                        <div key={player.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/20 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                            {player.image ? <img src={player.image} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white/20" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{player.name}</div>
                            <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: team?.color || '#888' }}>{team?.short_name || team?.name || '—'}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-emerald-400 text-sm">{(player.sold_price || 0).toLocaleString()}</div>
                            <div className="text-[8px] text-white/30 uppercase">Pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm border border-dashed border-white/10 rounded-xl p-4 text-center">No players sold on this day</p>
                )}
              </div>
            );
          })}

          {/* Unsold Section */}
          {unsoldPlayers.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4">
                <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-black">✕</span>
                <span className="text-white">Unsold</span>
                <span className="text-white/30 ml-1">({unsoldPlayers.length} players)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unsoldPlayers.map((player: any) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl opacity-60">
                    <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                      {player.image ? <img src={player.image} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{player.name}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">{player.category} • {player.position}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-red-400">{(player.base_price || 0).toLocaleString()}</div>
                      <div className="text-[8px] text-white/30 uppercase">Base</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Pool in Timeline View */}
          {availablePlayers.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4">
                <span className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-black">⚡</span>
                <span className="text-white">Available Pool</span>
                <span className="text-white/30 ml-1">({availablePlayers.length} players)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availablePlayers.map((player: any) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                      {player.image ? <img src={player.image} alt={player.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{player.name}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">{player.category} • {player.position}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-yellow-400">{(player.base_price || 0).toLocaleString()}</div>
                      <div className="text-[8px] text-white/30 uppercase">Base</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview View (original layout) */}
      {auctionView === 'overview' && (
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Top Buys or Pool Info */}
          <div className="lg:col-span-1 space-y-8">
            {!upcoming && topBuys.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-white/50 uppercase tracking-widest mb-4">
                  <TrendingUp className="w-4 h-4 text-green-400" /> Top Signings
                </h4>
                <div className="space-y-3">
                  {topBuys.map((player) => {
                    const team = teams.find(t => String(t.id) === String(player.team_id));
                    return (
                      <div key={player.id} className="flex flex-col bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
                             style={{ backgroundColor: team?.color || 'gray', filter: 'blur(20px)' }} />
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                            {player.image ? (
                              <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              <Zap className="w-full h-full p-2 text-white/20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate text-sm">{player.name}</div>
                            <div className="text-[10px] text-white/50 uppercase tracking-widest truncate" style={{ color: team?.color || 'inherit' }}>
                              {team?.name || 'Unknown Team'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-emerald-400">{(player.sold_price || 0).toLocaleString()}</div>
                            <div className="text-[9px] text-white/40 uppercase tracking-widest">Points</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Auction Pool (Always show if available players exist) */}
            {availablePlayers.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-white/50 uppercase tracking-widest mb-4">
                  <Zap className="w-4 h-4 text-yellow-400" /> Player Pool
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {availablePlayers.map((player: any) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                          {player.image ? <img src={player.image} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white/20" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{player.name}</div>
                          <div className="text-[9px] text-white/40 uppercase tracking-widest">{player.category} • {player.position}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-xs font-mono font-bold text-yellow-400">{player.base_price?.toLocaleString()}</div>
                        <div className="text-[8px] text-white/30 uppercase">Base</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Teams Status */}
          <div className="lg:col-span-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white/50 uppercase tracking-widest mb-4">
              <Crown className="w-4 h-4 text-green-400" /> Franchises
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamStats.map(team => (
                <div key={team.id} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10">
                   {/* Team Header */}
                   <div 
                     className="p-4 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                     onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: team.color || '#333' }}>
                         {team.logo && <img src={team.logo} alt={team.short_name} className="w-full h-full object-cover" />}
                       </div>
                       <div>
                         <div className="font-bold text-white text-sm shrink-0" style={{ color: team.color || '#fff' }}>{team.short_name}</div>
                         <div className="text-[10px] text-white/40 uppercase tracking-widest">{team.teamPlayers.length} Players</div>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                       <div className="text-right">
                         <div className="font-mono text-xs font-bold text-white">{(team.remaining).toLocaleString()}</div>
                         <div className="text-[9px] text-white/40 uppercase tracking-widest">Purse</div>
                       </div>
                       <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expandedTeamId === team.id ? 'rotate-180' : ''}`} />
                     </div>
                   </div>
                   
                   {/* Expanded Squad View */}
                   {expandedTeamId === team.id && (
                     <div className="p-4 bg-black/20 max-h-48 overflow-y-auto space-y-2">
                       {team.teamPlayers.length === 0 ? (
                         <div className="text-center text-white/30 text-xs py-4">No players drafted yet</div>
                       ) : (
                         team.teamPlayers.map((p: any) => (
                           <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                             <div className="flex items-center gap-2 min-w-0">
                               <div className="w-1 h-1 rounded-full" style={{ backgroundColor: p.status === 'retained' ? '#a855f7' : '#10b981' }} />
                               <span className="text-white truncate">{p.name}</span>
                               {p.role === 'captain' && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded uppercase">C</span>}
                             </div>
                             <span className="text-emerald-400 font-mono shrink-0 ml-2">{(p.sold_price || 0).toLocaleString()}</span>
                           </div>
                         ))
                       )}
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};
