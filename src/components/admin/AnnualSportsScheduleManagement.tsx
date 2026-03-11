import React, { useState } from 'react';
import { useAnnualSports } from '../../context/AnnualSportsContext';
import { useSportsData } from '../../context/SportsContext';
import { useData } from '../../context/DataContext';
import { Calendar, Plus, Edit, Trash2, X } from 'lucide-react';
import { SportsMatch } from '../../types/data';

const inputCls = 'w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20';
const labelCls = 'block text-[11px] font-black text-gold-500/60 uppercase tracking-[0.2em] mb-2';

export const AnnualSportsScheduleManagement: React.FC = () => {
  const { annualEvents, annualRegistrations } = useAnnualSports();
  const { sportsMatches, addSportsMatch, updateSportsMatch, deleteSportsMatch } = useSportsData();
  const { isAdmin } = useData();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<SportsMatch>>({
    annual_event_id: null,
    team_a_id: null,
    team_b_id: null,
    match_date: new Date().toISOString().slice(0, 16),
    venue: '',
    status: 'upcoming',
    score_a: '',
    score_b: ''
  });

  // Filter out non-annual sports matches
  const annualMatches = sportsMatches.filter(m => m.annual_event_id);
  const visibleMatches = selectedEventId 
    ? annualMatches.filter(m => String(m.annual_event_id) === String(selectedEventId))
    : annualMatches;

  const eventTeams = annualRegistrations.filter(r => r.event_id === selectedEventId && r.status === 'approved');

  const resetForm = () => {
    setForm({
      annual_event_id: selectedEventId || null,
      team_a_id: null,
      team_b_id: null,
      match_date: new Date().toISOString().slice(0, 16),
      venue: '',
      status: 'upcoming',
      score_a: '',
      score_b: ''
    });
  };

  const handleSave = async () => {
    if (!form.annual_event_id || !form.match_date) {
      alert('Event and Date are required');
      return;
    }

    try {
      if (editingId) {
        await updateSportsMatch(editingId as any, form);
      } else {
        await addSportsMatch(form);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert(`Error saving match: ${err.message}`);
    }
  };

  const startEdit = (match: SportsMatch) => {
    setForm({ ...match, match_date: new Date(match.match_date).toISOString().slice(0, 16) });
    setEditingId(match.id as any);
    setIsAdding(true);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Delete this schedule entry?')) return;
    try {
      await deleteSportsMatch(id as any);
    } catch (err: any) {
      alert('Failed to delete');
    }
  };

  if (!isAdmin()) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Annual Sports Schedule</h2>
          <p className="text-white/50 text-sm">Manage matches and timelines for Annual events.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setForm(prev => ({ ...prev, annual_event_id: e.target.value }));
            }}
            className={inputCls + ' w-64'}
          >
            <option value="">All Annual Events</option>
            {annualEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          {!isAdding && selectedEventId && (
            <button
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-semibold flex items-center border border-emerald-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Match
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-50"></div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">
              {editingId ? 'Edit Match' : 'Schedule New Match'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Match Date & Time *</label>
              <input type="datetime-local" value={form.match_date} onChange={e => setForm({...form, match_date: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Venue</label>
              <input type="text" placeholder="e.g. Main Ground" value={form.venue || ''} onChange={e => setForm({...form, venue: e.target.value})} className={inputCls} />
            </div>

            <div className="md:col-span-2 border-t border-white/10 my-2 pt-4">
              <label className={labelCls}>Teams / Participants (Optional for individual)</label>
            </div>
            <div>
              <select value={form.team_a_id || ''} onChange={e => setForm({...form, team_a_id: e.target.value})} className={inputCls}>
                <option value="">Select Participant 1 (Optional)</option>
                {eventTeams.map(r => <option key={r.id} value={r.id}>{r.is_team_registration ? r.team_name : r.full_name}</option>)}
              </select>
            </div>
            <div>
              <select value={form.team_b_id || ''} onChange={e => setForm({...form, team_b_id: e.target.value})} className={inputCls}>
                <option value="">Select Participant 2 (Optional)</option>
                {eventTeams.map(r => <option key={r.id} value={r.id}>{r.is_team_registration ? r.team_name : r.full_name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 border-t border-white/10 my-2 pt-4">
              <label className={labelCls}>Status & Score</label>
            </div>
            <div>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className={inputCls}>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Score 1" value={form.score_a || ''} onChange={e => setForm({...form, score_a: e.target.value})} className={inputCls} />
              <input type="text" placeholder="Score 2" value={form.score_b || ''} onChange={e => setForm({...form, score_b: e.target.value})} className={inputCls} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-black rounded-lg font-bold hover:bg-emerald-400">Save</button>
          </div>
        </div>
      )}

      {visibleMatches.length > 0 ? (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-xs font-black text-white/40 uppercase">Date & Venue</th>
                <th className="p-4 text-xs font-black text-white/40 uppercase">Matchup</th>
                <th className="p-4 text-xs font-black text-white/40 uppercase">Status/Score</th>
                <th className="p-4 text-xs font-black text-white/40 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMatches.map(match => {
                const r1 = annualRegistrations.find(r => r.id === match.team_a_id);
                const r2 = annualRegistrations.find(r => r.id === match.team_b_id);
                const ev = annualEvents.find(e => String(e.id) === String(match.annual_event_id));
                
                return (
                  <tr key={match.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white text-sm">{new Date(match.match_date).toLocaleString()}</div>
                      <div className="text-xs text-white/40">{match.venue || 'TBA'}</div>
                      {!selectedEventId && <div className="text-[10px] text-emerald-400 mt-1 uppercase tracking-wider">{ev?.name}</div>}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-white">
                        {r1 ? (r1.is_team_registration ? r1.team_name : r1.full_name) : 'TBA'} 
                        <span className="text-white/30 mx-2 text-xs font-normal">vs</span> 
                        {r2 ? (r2.is_team_registration ? r2.team_name : r2.full_name) : 'TBA'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${match.status === 'completed' ? 'bg-zinc-500/20 text-zinc-300' : match.status === 'ongoing' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {match.status}
                      </div>
                      {(match.score_a || match.score_b) && (
                        <div className="mt-1 text-sm font-bold text-gold-400">
                          {match.score_a || '-'} : {match.score_b || '-'}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => startEdit(match)} className="p-1.5 text-white/30 hover:text-gold-400 hover:bg-white/10 rounded transition-colors"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(match.id!)} className="p-1.5 text-white/30 hover:text-red-400 hover:bg-white/10 rounded transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-3xl">
          <Calendar size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40">No matches scheduled {selectedEventId ? 'for this event' : 'yet'}.</p>
        </div>
      )}
    </div>
  );
};
