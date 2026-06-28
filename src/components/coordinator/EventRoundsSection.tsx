import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Plus, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface EventRound {
  id: string;
  event_id: string;
  round_number: number;
  name: string;
  is_active: boolean;
}

interface RegistrationRound {
  id: string;
  registration_id: string;
  round_id: string;
  status: 'pending' | 'qualified' | 'disqualified';
  prize_rank: string | null;
  feedback: string | null;
}

const PRIZE_RANKS = ['1st', '2nd', '3rd', 'Special Mention'] as const;
const PRIZE_COLORS: Record<string, string> = {
  '1st':             '#fbbf24',
  '2nd':             '#9ca3af',
  '3rd':             '#b45309',
  'Special Mention': '#818cf8',
};

interface Props {
  session: { eventId: number | string; eventTitle: string } | null;
  approvedRegs: any[];
  push: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const EventRoundsSection: React.FC<Props> = ({ session, approvedRegs, push }) => {
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [roundStatuses, setRoundStatuses] = useState<Record<string, RegistrationRound[]>>({});
  const [loading, setLoading] = useState(true);
  const [newRoundName, setNewRoundName] = useState('');
  const [addingRound, setAddingRound] = useState(false);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackEditing, setFeedbackEditing] = useState<Record<string, string>>({});
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';

  const eventId = session?.eventId ? String(session.eventId) : null;

  const fetchRounds = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Fetch rounds using service-role authenticated fetch
      const roundsResp = await fetch(
        `https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/event_rounds?event_id=eq.${eventId}&order=round_number.asc`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );
      const roundsData: EventRound[] = roundsResp.ok ? await roundsResp.json() : [];
      setRounds(roundsData);

      if (roundsData.length > 0) {
        if (!selectedRound) setSelectedRound(roundsData[roundsData.length - 1].id);
        // Fetch statuses for all rounds
        const roundIds = roundsData.map(r => r.id).join(',');
        const statusResp = await fetch(
          `https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/registration_rounds?round_id=in.(${roundIds})`,
          {
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );
        const statusData: RegistrationRound[] = statusResp.ok ? await statusResp.json() : [];
        // Group by round_id
        const grouped: Record<string, RegistrationRound[]> = {};
        statusData.forEach(s => {
          if (!grouped[s.round_id]) grouped[s.round_id] = [];
          grouped[s.round_id].push(s);
        });
        setRoundStatuses(grouped);
      }
    } catch (err) {
      console.error('[EventRounds] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedRound]);

  useEffect(() => {
    fetchRounds();
  }, [eventId]);

  const addRound = async () => {
    if (!eventId || !newRoundName.trim()) return;
    setAddingRound(true);
    try {
      const nextNum = rounds.length + 1;
      const resp = await fetch(
        `https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/event_rounds`,
        {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ event_id: eventId, round_number: nextNum, name: newRoundName.trim() })
        }
      );
      if (!resp.ok) throw new Error(await resp.text());
      setNewRoundName('');
      await fetchRounds();
      push({ message: `Round "${newRoundName.trim()}" added!`, type: 'success' });
    } catch (err: any) {
      push({ message: err.message || 'Failed to add round', type: 'error' });
    } finally {
      setAddingRound(false);
    }
  };

  const deleteRound = async (roundId: string) => {
    if (!window.confirm('Delete this round and all its qualification data?')) return;
    try {
      await fetch(`https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/event_rounds?id=eq.${roundId}`, {
        method: 'DELETE',
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      });
      if (selectedRound === roundId) setSelectedRound(null);
      await fetchRounds();
      push({ message: 'Round deleted', type: 'info' });
    } catch (err: any) {
      push({ message: 'Failed to delete round', type: 'error' });
    }
  };

  const upsertStatus = async (
    regId: string,
    roundId: string,
    status: 'qualified' | 'disqualified' | 'pending',
    prizeRank?: string | null,
    feedback?: string
  ) => {
    setUpdatingId(regId);
    try {
      // Find the current registration details to check if it's a team registration
      const currentReg = approvedRegs.find(r => (r.reg_id || r.id) === regId);
      const isTeam = currentReg?.is_team_registration;
      const teamId = currentReg?.team_id;
      const teamName = currentReg?.team_name;

      // Determine which registrations need to be updated (qualify entire group/team together)
      let targetRegIds = [regId];
      if (teamName || teamId || isTeam) {
        targetRegIds = approvedRegs
          .filter(r => {
            if (teamId && r.team_id === teamId) return true;
            if (teamName && r.team_name && r.team_name.toLowerCase().trim() === teamName.toLowerCase().trim()) return true;
            return false;
          })
          .map(r => r.reg_id || r.id);

        if (!targetRegIds.includes(regId)) {
          targetRegIds.push(regId);
        }
      }

      // Upsert status for all target registrations
      const promises = targetRegIds.map(async (id) => {
        const payload: any = {
          registration_id: id,
          round_id: roundId,
          status,
          updated_at: new Date().toISOString(),
        };
        if (prizeRank !== undefined) payload.prize_rank = prizeRank || null;
        if (feedback !== undefined) payload.feedback = feedback || null;

        const resp = await fetch(`https://isfqhascrdzaoebhuohs.supabase.co/rest/v1/registration_rounds?on_conflict=registration_id,round_id`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(await resp.text());
      });

      await Promise.all(promises);
      await fetchRounds();
    } catch (err: any) {
      push({ message: err.message || 'Update failed', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRegStatus = (regId: string, roundId: string): RegistrationRound | undefined => {
    return roundStatuses[roundId]?.find(s => s.registration_id === regId);
  };

  const currentRound = rounds.find(r => r.id === selectedRound);

  // Group the approved registrations by team if team_name is present
  const displayGroups = useMemo(() => {
    const groups: Record<string, {
      id: string;
      team_name: string;
      members: any[];
      isTeam: boolean;
    }> = {};
    const individuals: any[] = [];

    (approvedRegs || []).forEach(reg => {
      if (reg.team_name) {
        const teamKey = reg.team_name.toLowerCase().trim();
        if (!groups[teamKey]) {
          groups[teamKey] = {
            id: reg.reg_id || reg.id,
            team_name: reg.team_name,
            members: [],
            isTeam: true
          };
        }
        groups[teamKey].members.push(reg);
      } else {
        individuals.push(reg);
      }
    });

    return [
      ...Object.values(groups),
      ...individuals.map(reg => ({
        id: reg.reg_id || reg.id,
        team_name: '',
        members: [reg],
        isTeam: false
      }))
    ];
  }, [approvedRegs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white">Event Rounds</h2>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-400" /> Event Rounds
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">{approvedRegs.length} approved participants</p>
      </div>

      {/* Add Round */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Round name (e.g. Prelims, Finals...)"
          value={newRoundName}
          onChange={e => setNewRoundName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addRound()}
          className="flex-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <button
          onClick={addRound}
          disabled={addingRound || !newRoundName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/15 transition-all disabled:opacity-50"
        >
          {addingRound ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>

      {/* Rounds list */}
      {rounds.length === 0 ? (
        <div className="text-center py-12 text-gray-600 border border-dashed border-white/10 rounded-2xl">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-black text-gray-400">No rounds yet</p>
          <p className="text-sm mt-1">Add a round above to start managing qualification</p>
        </div>
      ) : (
        <>
          {/* Round tabs */}
          <div className="flex flex-wrap gap-1.5">
            {rounds.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRound(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all border ${
                  selectedRound === r.id
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'
                }`}
              >
                <span>Round {r.round_number}</span>
                <span className="text-xs opacity-60">{r.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteRound(r.id); }}
                  className="ml-1 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>

          {/* Current round participants */}
          {currentRound && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">{currentRound.name}</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Round {currentRound.round_number}</span>
              </div>

              {displayGroups.length === 0 ? (
                <p className="text-gray-600 text-sm">No approved participants yet.</p>
              ) : (
                <div className="space-y-2">
                  {displayGroups.map((group: any) => {
                    const status = getRegStatus(group.id, currentRound.id);
                    const currentStatus = status?.status || 'pending';
                    const currentRank = status?.prize_rank || '';
                    const isUpdating = updatingId === group.id;
                    const regId = group.id;

                    return (
                      <div
                        key={regId}
                        className="flex flex-col gap-3 p-4 rounded-2xl border transition-all"
                        style={{
                          background: currentStatus === 'qualified' ? 'rgba(34,197,94,0.05)' : currentStatus === 'disqualified' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                          borderColor: currentStatus === 'qualified' ? 'rgba(34,197,94,0.2)' : currentStatus === 'disqualified' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            {group.isTeam ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                                    Team: {group.team_name}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-bold">{group.members.length} members</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.members.map((m: any) => (
                                    <span key={m.reg_id || m.id} className="text-xs text-white/80 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                      {m.full_name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-black text-white">{group.members[0].full_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{group.members[0].batch || group.members[0].college || ''}</p>
                              </div>
                            )}
                          </div>

                          {/* Status buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isUpdating ? (
                              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                            ) : (
                              <>
                                <button
                                  onClick={() => upsertStatus(regId, currentRound.id, currentStatus === 'qualified' ? 'pending' : 'qualified')}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                                    currentStatus === 'qualified'
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                      : 'text-gray-500 border-transparent hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/10'
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {currentStatus === 'qualified' ? 'Qualified' : 'Qualify'}
                                </button>
                                <button
                                  onClick={() => upsertStatus(regId, currentRound.id, currentStatus === 'disqualified' ? 'pending' : 'disqualified')}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                                    currentStatus === 'disqualified'
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : 'text-gray-500 border-transparent hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  {currentStatus === 'disqualified' ? 'Eliminated' : 'Eliminate'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Prize rank (only for qualified) */}
                        {currentStatus === 'qualified' && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Award:</span>
                            {PRIZE_RANKS.map(rank => (
                              <button
                                key={rank}
                                onClick={() => upsertStatus(regId, currentRound.id, 'qualified', currentRank === rank ? null : rank)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all`}
                                style={{
                                  background: currentRank === rank ? `${PRIZE_COLORS[rank]}20` : 'transparent',
                                  borderColor: currentRank === rank ? `${PRIZE_COLORS[rank]}40` : 'rgba(255,255,255,0.08)',
                                  color: currentRank === rank ? PRIZE_COLORS[rank] : '#6b7280',
                                }}
                              >
                                {rank === '1st' ? '🥇' : rank === '2nd' ? '🥈' : rank === '3rd' ? '🥉' : '⭐'} {rank}
                              </button>
                            ))}

                            {/* Feedback */}
                            <input
                              type="text"
                              placeholder="Judges' note (optional)"
                              value={feedbackEditing[regId] ?? (status?.feedback || '')}
                              onChange={e => setFeedbackEditing(prev => ({ ...prev, [regId]: e.target.value }))}
                              onBlur={() => {
                                const fb = feedbackEditing[regId];
                                if (fb !== undefined) {
                                  upsertStatus(regId, currentRound.id, 'qualified', currentRank || null, fb);
                                }
                              }}
                              className="flex-1 min-w-[140px] px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventRoundsSection;
