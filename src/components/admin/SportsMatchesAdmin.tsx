import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, X, Save, Trophy, Swords, MapPin, Clock } from 'lucide-react';
import { useSportsData } from '../../context/SportsContext';
import { useSavingProgress } from '../../context/SavingProgressContext';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

export const SportsMatchesAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { 
    sportsSeasons, sportsTeams, sportsMatches, sportsRegistrations,
    annualSportsEvents, annualSportsRegistrations, annualSportsMatches,
    addSportsMatch, updateSportsMatch, deleteSportsMatch,
    addAnnualSportsMatch, updateAnnualSportsMatch, deleteAnnualSportsMatch,
    addSportsTeam
  } = useSportsData() as any;

  const [activeCategory, setActiveCategory] = useState<'season' | 'annual'>('season');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<any>({
    sport_id: 0,
    event_id: 0,
    team_a_id: null,
    team_b_id: null,
    team_a_registration_id: null,
    team_b_registration_id: null,
    match_date: '',
    match_time: '',
    venue: '',
    round: 'Group Stage',
    status: 'upcoming',
    score_a: '',
    score_b: '',
    winner_team_id: null,
    winner_registration_id: null,
    highlights: ''
  });

  // Default selections
  useEffect(() => {
    if (activeCategory === 'season' && !selectedSeasonId && sportsSeasons?.length > 0) {
      setSelectedSeasonId(sportsSeasons[0].id.toString());
    }
    if (activeCategory === 'annual' && !selectedEventId && annualSportsEvents?.length > 0) {
      setSelectedEventId(annualSportsEvents[0].id.toString());
    }
  }, [activeCategory, sportsSeasons, annualSportsEvents, selectedSeasonId, selectedEventId]);

  // CATEGORY: SEASON
  const currentTeams = (sportsTeams || []).filter((t: any) => String(t.sport_id) === String(selectedSeasonId));
  const approvedSportsRegs = (sportsRegistrations || [])
    .filter((r: any) => String(r.sport_id) === String(selectedSeasonId) && r.status === 'approved')
    .filter((r: any) => !currentTeams.some((t: any) => t.name === (r.team_name || r.name)));

  const seasonSelectableTeams = [
    ...currentTeams.map((t: any) => ({ id: t.id, name: t.name, type: 'team' })),
    ...approvedSportsRegs.map((r: any) => ({ id: `reg-${r.id}`, name: r.team_name || r.name, type: 'reg' }))
  ];

  const seasonMatches = (sportsMatches || []).filter((m: any) => String(m.sport_id) === String(selectedSeasonId));

  // CATEGORY: ANNUAL
  const approvedAnnualRegs = (annualSportsRegistrations || [])
    .filter((r: any) => String(r.event_id) === String(selectedEventId) && r.status === 'approved');

  const annualSelectableTeams = approvedAnnualRegs.map((r: any) => ({ 
    id: r.id, 
    name: r.is_team_registration ? r.team_name : r.full_name, 
    type: 'reg' 
  }));

  const annualMatches = (annualSportsMatches || []).filter((m: any) => String(m.event_id) === String(selectedEventId));

  // Resolved Data for UI
  const selectableParticipants = activeCategory === 'season' ? seasonSelectableTeams : annualSelectableTeams;
  const currentMatches = (activeCategory === 'season' ? seasonMatches : annualMatches)
    .sort((a: any, b: any) => new Date(a.match_date || 0).getTime() - new Date(b.match_date || 0).getTime());

  const resetForm = () => {
    setForm({
      sport_id: activeCategory === 'season' ? parseInt(selectedSeasonId) : 0,
      event_id: activeCategory === 'annual' ? selectedEventId : null,
      team_a_id: null,
      team_b_id: null,
      team_a_registration_id: null,
      team_b_registration_id: null,
      match_date: '',
      match_time: '',
      venue: '',
      round: activeCategory === 'season' ? 'Group Stage' : 'Stage 1',
      status: 'upcoming',
      score_a: '',
      score_b: '',
      winner_team_id: null,
      winner_registration_id: null,
      highlights: ''
    });
  };

  const ensureTeamExists = async (val: any) => {
    if (!val) return null;
    if (activeCategory === 'annual') return val; // For annual, we store registration ID directly
    
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && !val.startsWith('reg-')) return parseInt(val);

    const regId = parseInt(val.replace('reg-', ''));
    const reg = sportsRegistrations.find((r: any) => r.id === regId);
    if (!reg) return null;

    const teamData = {
      sport_id: reg.sport_id,
      name: reg.team_name || reg.name,
      short_name: (reg.team_name || reg.name).slice(0, 3).toUpperCase(),
      owner_name: reg.name,
      owner_image: reg.photo_url || reg.metadata?.photo_url || '',
      enabled: true
    };

    try {
      const existing = sportsTeams.find((t: any) => t.name === teamData.name && String(t.sport_id) === String(teamData.sport_id));
      if (existing) return existing.id;
      const newTeam = await addSportsTeam(teamData);
      return newTeam?.id || null;
    } catch (err) {
      return null;
    }
  };

  const handleSave = async () => {
    const contextId = activeCategory === 'season' ? selectedSeasonId : selectedEventId;
    if (!contextId) return alert(`${activeCategory === 'season' ? 'Season' : 'Event'} is required`);
    
    try {
      const steps = savingProgress.withSteps(2, editingId ? 'Updating Match' : 'Adding Match');
      
      steps.next('Processing participants...');
      const participantA = await ensureTeamExists(form.team_a_id || form.team_a_registration_id);
      const participantB = await ensureTeamExists(form.team_b_id || form.team_b_registration_id);
      const winner = await ensureTeamExists(form.winner_team_id || form.winner_registration_id);

      steps.next('Saving match details...');
      
      const commonData = {
        match_date: form.match_date || null,
        match_time: form.match_time || null,
        venue: form.venue || 'Main Ground',
        round: form.round || (activeCategory === 'season' ? 'Group Stage' : 'Stage 1'),
        status: form.status || 'upcoming',
        score_a: form.score_a || '',
        score_b: form.score_b || '',
        highlights: form.highlights || ''
      };

      if (activeCategory === 'season') {
        const matchData = {
          ...commonData,
          sport_id: parseInt(selectedSeasonId),
          team_a_id: participantA,
          team_b_id: participantB,
          winner_team_id: winner,
          motm_player_id: form.motm_player_id || null
        };
        if (editingId) await updateSportsMatch(editingId, matchData);
        else await addSportsMatch(matchData);
      } else {
        const matchData = {
          ...commonData,
          event_id: selectedEventId,
          team_a_registration_id: participantA,
          team_b_registration_id: participantB,
          winner_registration_id: winner
        };
        if (editingId) await updateAnnualSportsMatch(editingId, matchData);
        else await addAnnualSportsMatch(matchData);
      }
      
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to save match'}`);
    } finally {
      savingProgress.done();
    }
  };

  const startEdit = (match: any) => {
    if (activeCategory === 'season') {
      setForm({ ...match, team_a_id: match.team_a_id, team_b_id: match.team_b_id, winner_team_id: match.winner_team_id });
    } else {
      setForm({ ...match, team_a_registration_id: match.team_a_registration_id, team_b_registration_id: match.team_b_registration_id, winner_registration_id: match.winner_registration_id });
    }
    setEditingId(match.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (activeCategory === 'season') await deleteSportsMatch(id);
      else await deleteAnnualSportsMatch(id);
    } catch { alert('Failed to delete'); }
  };

  const getDisplayName = (id: any) => {
    if (!id) return 'TBA';
    if (activeCategory === 'season') {
      if (typeof id === 'string' && id.startsWith('reg-')) {
        const reg = sportsRegistrations?.find((r: any) => String(r.id) === id.replace('reg-', ''));
        return reg ? (reg.team_name || reg.name) : 'Unknown';
      }
      return sportsTeams?.find((t: any) => String(t.id) === String(id))?.name || 'TBA';
    } else {
      const reg = annualSportsRegistrations?.find((r: any) => String(r.id) === String(id));
      return reg ? (reg.team_name || reg.full_name) : 'TBA';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={() => { setActiveCategory('season'); setIsAdding(false); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === 'season' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-white/40 hover:text-white'}`}
            >
              SEASON LEAGUE
            </button>
            <button 
              onClick={() => { setActiveCategory('annual'); setIsAdding(false); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === 'annual' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-white/40 hover:text-white'}`}
            >
              ANNUAL TOURNEY
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-0.5">Match Schedule</h2>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-wider">
              Managing {activeCategory === 'season' ? 'League' : 'Tournament'} Matches
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {activeCategory === 'season' ? (
            <select 
              key="season-selector"
              value={selectedSeasonId} 
              onChange={e => setSelectedSeasonId(e.target.value)} 
              className={`${selectCls} py-2 min-w-[200px]`}
            >
              {sportsSeasons?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.season})</option>
              ))}
            </select>
          ) : (
            <select 
              key="event-selector"
              value={selectedEventId} 
              onChange={e => setSelectedEventId(e.target.value)} 
              className={`${selectCls} py-2 min-w-[200px]`}
            >
              {annualSportsEvents?.map((e: any) => (
                <option key={e.id} value={e.id}>{e.title || e.name}</option>
              ))}
            </select>
          )}
          
          {!isAdding && (
            <button 
              onClick={() => { resetForm(); setIsAdding(true); }} 
              className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center shrink-0 border border-red-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Schedule Match
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden mb-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-50"></div>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center">
              {editingId ? 'Edit Match Details' : 'Schedule New Match'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <label className={labelCls}>Match Date</label>
              <input 
                type="date" 
                value={form.match_date || ''} 
                onChange={e => setForm({...form, match_date: e.target.value})} 
                className={inputCls} 
              />
            </div>
            <div className="lg:col-span-1">
              <label className={labelCls}>Match Time</label>
              <input 
                type="time" 
                value={form.match_time || ''} 
                onChange={e => setForm({...form, match_time: e.target.value})} 
                className={inputCls} 
              />
            </div>
            <div className="lg:col-span-1">
              <label className={labelCls}>Venue</label>
              <input 
                type="text" 
                placeholder="e.g. Center Court" 
                value={form.venue || ''} 
                onChange={e => setForm({...form, venue: e.target.value})} 
                className={inputCls} 
              />
            </div>

            <div className="md:col-span-1" key={`teama-${activeCategory}`}>
              <label className={labelCls}>{activeCategory === 'season' ? 'Team A' : 'Participant 1'}</label>
              <select 
                key={`select-teama-${activeCategory}`}
                value={activeCategory === 'season' ? (form.team_a_id || '') : (form.team_a_registration_id || '')} 
                onChange={e => {
                  const val = e.target.value;
                  if (activeCategory === 'season') setForm({...form, team_a_id: val});
                  else setForm({...form, team_a_registration_id: val});
                }} 
                className={selectCls}
              >
                <option value="">-- Select Participant --</option>
                {selectableParticipants.map((t: any) => (
                  <option key={t.id} value={t.id} className={t.type === 'reg' ? 'text-emerald-400 font-bold' : ''}>
                    {t.type === 'reg' ? '[Reg] ' : ''}{t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-center justify-center pt-6 text-white/20 font-black italic">VS</div>
            <div className="md:col-span-1" key={`teamb-${activeCategory}`}>
              <label className={labelCls}>{activeCategory === 'season' ? 'Team B' : 'Participant 2'}</label>
              <select 
                key={`select-teamb-${activeCategory}`}
                value={activeCategory === 'season' ? (form.team_b_id || '') : (form.team_b_registration_id || '')} 
                onChange={e => {
                  const val = e.target.value;
                  if (activeCategory === 'season') setForm({...form, team_b_id: val});
                  else setForm({...form, team_b_registration_id: val});
                }} 
                className={selectCls}
              >
                <option value="">-- Select Participant --</option>
                {selectableParticipants.map((t: any) => (
                  <option key={t.id} value={t.id} className={t.type === 'reg' ? 'text-emerald-400 font-bold' : ''}>
                    {t.type === 'reg' ? '[Reg] ' : ''}{t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select 
                value={form.status} 
                onChange={e => setForm({...form, status: e.target.value as any})} 
                className={selectCls}
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Round / Phase</label>
              <input 
                type="text" 
                placeholder="e.g. Semi-Final" 
                value={form.round || ''} 
                onChange={e => setForm({...form, round: e.target.value})} 
                className={inputCls} 
              />
            </div>
            <div>
              <label className={labelCls}>Match Highlights (Optional)</label>
              <input 
                type="text" 
                placeholder="URL or short text" 
                value={form.highlights || ''} 
                onChange={e => setForm({...form, highlights: e.target.value})} 
                className={inputCls} 
              />
            </div>

            {form.status === 'completed' && (
              <>
                <div className="md:col-span-1">
                  <label className={labelCls}>Score A</label>
                  <input 
                    type="text" 
                    placeholder="Team A Score" 
                    value={form.score_a || ''} 
                    onChange={e => setForm({...form, score_a: e.target.value})} 
                    className={inputCls} 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className={labelCls}>Score B</label>
                  <input 
                    type="text" 
                    placeholder="Team B Score" 
                    value={form.score_b || ''} 
                    onChange={e => setForm({...form, score_b: e.target.value})} 
                    className={inputCls} 
                  />
                </div>
                <div className="md:col-span-1" key={`winner-${activeCategory}`}>
                  <label className={labelCls}>Winner</label>
                  <select 
                    key={`select-winner-${activeCategory}`}
                    value={activeCategory === 'season' ? (form.winner_team_id || '') : (form.winner_registration_id || '')} 
                    onChange={e => {
                      const val = e.target.value;
                      if (activeCategory === 'season') setForm({...form, winner_team_id: val ? parseInt(val) : null});
                      else setForm({...form, winner_registration_id: val || null});
                    }}
                    className={selectCls}
                  >
                    <option value="">-- Select Winner --</option>
                    {(activeCategory === 'season' ? form.team_a_id : form.team_a_registration_id) && (
                      <option key="winner-a" value={activeCategory === 'season' ? form.team_a_id : form.team_a_registration_id}>
                        {getDisplayName(activeCategory === 'season' ? form.team_a_id : form.team_a_registration_id)}
                      </option>
                    )}
                    {(activeCategory === 'season' ? form.team_b_id : form.team_b_registration_id) && (
                      <option key="winner-b" value={activeCategory === 'season' ? form.team_b_id : form.team_b_registration_id}>
                        {getDisplayName(activeCategory === 'season' ? form.team_b_id : form.team_b_registration_id)}
                      </option>
                    )}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">Cancel</button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Match' : 'Save Match'}
            </button>
          </div>
        </div>
      )}

      {!isAdding && (
        <div className="grid grid-cols-1 gap-4">
          {currentMatches.length > 0 ? (
            currentMatches.map((match: any) => (
              <div key={`${activeCategory}-${match.id}`} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${match.status === 'completed' ? 'bg-emerald-500/50' : match.status === 'cancelled' ? 'bg-red-500/50' : 'bg-blue-500/50'}`}></div>
                
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest">{match.round}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        match.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        match.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {match.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="flex-1 text-right">
                        <div className="text-lg font-black text-white truncate">
                          {getDisplayName(activeCategory === 'season' ? match.team_a_id : match.team_a_registration_id)}
                        </div>
                        {match.status === 'completed' && <div className="text-2xl font-black text-white/90 mt-1">{match.score_a || '0'}</div>}
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                          <Swords className="w-5 h-5 text-white/20" />
                        </div>
                        <div className="text-[10px] font-black text-white/10 mt-2 uppercase">VS</div>
                      </div>

                      <div className="flex-1 text-left">
                        <div className="text-lg font-black text-white truncate">
                          {getDisplayName(activeCategory === 'season' ? match.team_b_id : match.team_b_registration_id)}
                        </div>
                        {match.status === 'completed' && <div className="text-2xl font-black text-white/90 mt-1">{match.score_b || '0'}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="md:w-64 border-l border-white/5 pl-6 flex flex-col justify-center space-y-3">
                    <div className="flex items-center text-sm text-white/60">
                      <Calendar className="w-4 h-4 mr-3 text-red-500" />
                      {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'TBA'}
                    </div>
                    <div className="flex items-center text-sm text-white/60">
                      <Clock className="w-4 h-4 mr-3 text-orange-500" />
                      {match.match_time || 'TBA'}
                    </div>
                    <div className="flex items-center text-sm text-white/60">
                      <MapPin className="w-4 h-4 mr-3 text-emerald-500" />
                      {match.venue || 'TBA'}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-end gap-2">
                    <button 
                      onClick={() => startEdit(match)} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all border border-white/5"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(match.id)} 
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500/60 hover:text-red-400 rounded-xl transition-all border border-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {match.status === 'completed' && match.winner_team_id && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-gold-500/10 border border-gold-500/20 rounded-full">
                      <Trophy className="w-4 h-4 text-gold-500" />
                      <span className="text-xs font-black text-gold-500 uppercase tracking-widest leading-none">
                        Winner: {getDisplayName(activeCategory === 'season' ? match.winner_team_id : match.winner_registration_id)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
              <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Matches Scheduled</h3>
              <p className="text-white/50 text-sm mb-6">Start by scheduling the first match of the season.</p>
              <button 
                onClick={() => { resetForm(); setIsAdding(true); }} 
                className="px-6 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold inline-flex items-center border border-red-500/20"
              >
                <Plus className="w-4 h-4 mr-2" /> Create First Match
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
