import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, User as UserIcon, Award, ChevronDown } from 'lucide-react';
import { useData } from '../../context/DataContext';


export const EventWinnersEditor: React.FC<{ eventId: number }> = ({ eventId }) => {
  const { eventWinners = [], addEventWinner, updateEventWinner, deleteEventWinner } = useData() as any;
  const winners = (eventWinners || []).filter((w: any) => w.event_id === eventId).sort((a: any, b: any) => a.position - b.position);
  const [isAdding, setIsAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ name: string; position: number; year?: string | null; category?: string | null; registration_id?: string | null }>({ name: '', position: 1, year: null, category: null, registration_id: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);

  // Fetch candidates for this event only
  useEffect(() => {
    let mounted = true;
    const fetchCandidates = async () => {
      console.log('EventWinnersEditor: Fetching candidates for eventId:', eventId);
      try {
        // Use server-side function to bypass RLS restrictions
        const response = await fetch('/.netlify/functions/get-event-candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });
        
        if (!response.ok) {
           const errorText = await response.text();
           console.error(`EventWinnersEditor: Server error ${response.status}: ${errorText}`);
           setEventRegistrations([]); // Clear invalid state
           return; 
        }
        
        const data = await response.json();
        console.log('EventWinnersEditor: Fetched candidates:', data?.length);
        
        if (mounted) {
          setEventRegistrations(data || []);
        }
      } catch (err: any) {
        console.error('Error fetching event candidates:', err);
      }
    };
    
    if (eventId) fetchCandidates();
    return () => { mounted = false; };
  }, [eventId]);

  const handleSave = async (id: number, data: any) => {
    setBusy(true);
    try {
      const { photo_url, registration_year, id: _id, created_at, event_id, ...rest } = data;
      await updateEventWinner(id, { ...rest, registration_id: data.registration_id || null });
      setEditingId(null);
      setEditingDraft(null);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!draft.name) return;
    setBusy(true);
    try {
      await addEventWinner?.({ 
        event_id: eventId, 
        name: draft.name, 
        position: draft.position, 
        year: draft.year || null, 
        photo_url: null, 
        category: draft.category || null, 
        registration_id: draft.registration_id || null 
      });
      setIsAdding(false);
      setDraft({ name: '', position: 1, year: null, category: null, registration_id: null });
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Winners List</span>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 transition-all"
          >
            <Plus size={14} /> Add New Winner
          </button>
        )}
      </div>

      <div className="space-y-3">
        {winners.map((w: any) => (
          <div key={w.id} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-4 transition-all duration-300">
            {editingId === w.id ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Rank / Position</label>
                    <input 
                      type="number" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 transition-all outline-none"
                      value={editingDraft.position} 
                      onChange={(e)=>setEditingDraft((d: any)=>({ ...d, position: parseInt(e.target.value||'0') }))} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Winner Name</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 transition-all outline-none"
                      value={editingDraft.name} 
                      onChange={(e)=>setEditingDraft((d: any)=>({ ...d, name: e.target.value }))} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Link Registration (Optional)</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 transition-all outline-none appearance-none cursor-pointer"
                      value={editingDraft.registration_id || ''} 
                      onChange={(e)=>{
                        const rid = e.target.value || null;
                        const reg = eventRegistrations.find((r:any)=>r.id === rid);
                        if (reg) setEditingDraft((d: any)=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, year: (reg.participant_type || reg.batch || reg.year || d.year || null) }));
                        else setEditingDraft((d: any)=>({ ...d, registration_id: null }));
                      }}
                    >
                      <option value="" className="bg-gray-900">Manual Entry / Unknown</option>
                      {eventRegistrations.map((r: any) => (
                        <option key={r.id} value={r.id} className="bg-gray-900">{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button 
                    disabled={busy}
                    onClick={() => handleSave(w.id, editingDraft)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setEditingId(null); setEditingDraft(null); }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <span className="text-indigo-400 font-black text-sm">{w.position}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm tracking-tight">{w.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium tracking-wide flex items-center gap-2">
                      {w.year && (
                        <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{w.year}</span>
                      )}
                      {w.registration_id && (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <UserIcon size={10} /> Verified Registrant
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => { setEditingId(w.id); setEditingDraft({ ...w }); }}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                    title="Edit Winner"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => { if (confirm('Delete winner?')) deleteEventWinner(w.id); }}
                    className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                    title="Delete Winner"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="bg-[#1c1c2b] border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Plus size={12} strokeWidth={3} /> New Entry
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Position</label>
                <input 
                  type="number" 
                  placeholder="1"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 outline-none"
                  value={draft.position} 
                  onChange={(e)=>setDraft(d=>({ ...d, position: parseInt(e.target.value||'1') }))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  placeholder="Enter name..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 outline-none"
                  value={draft.name} 
                  onChange={(e)=>setDraft(d=>({ ...d, name: e.target.value }))} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Pick Participant (Self-fills)</label>
              <div className="relative">
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-indigo-500/50 outline-none appearance-none cursor-pointer"
                  value={draft.registration_id || ''} 
                  onChange={(e)=>{
                    const rid = e.target.value || null;
                    const reg = eventRegistrations.find((r:any)=>r.id === rid);
                    if (reg) setDraft(d=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, year: (reg.participant_type || reg.batch || reg.year || d.year || null) }));
                    else setDraft(d=>({ ...d, registration_id: null }));
                  }}
                >
                  <option value="" className="bg-gray-900">— Manual Entry —</option>
                  {eventRegistrations.map((r: any) => (
                    <option key={r.id} value={r.id} className="bg-gray-900">{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button 
                disabled={busy || !draft.name}
                onClick={handleAdd}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              >
                Add Winner
              </button>
              <button 
                onClick={() => { setIsAdding(false); setDraft({ name: '', position: 1, year: null, category: null, registration_id: null }); }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {winners.length === 0 && !isAdding && (
          <div className="py-12 flex flex-col items-center justify-center border border-white/5 rounded-3xl border-dashed">
            <Award className="w-8 h-8 text-gray-600 mb-3" />
            <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">No Winners Declared</div>
            <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tight">Add the champions for this event</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventWinnersEditor;
