import React, { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useData } from '../../context/DataContext';
// Photo upload removed: no images in winners editor

export const EventWinnersEditor: React.FC<{ eventId: number }> = ({ eventId }) => {
  const { eventWinners = [], addEventWinner, updateEventWinner, deleteEventWinner, registrations = [] } = useData() as any;
  const winners = (eventWinners || []).filter((w: any) => w.event_id === eventId).sort((a: any, b: any) => a.position - b.position);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; position: number; year?: string | null; category?: string | null; registration_id?: string | null }>({ name: '', position: 1, year: null, category: null, registration_id: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  // Registrations for this event (prefer approved ones so admins pick final participants)
  const eventRegistrations = (registrations || []).filter((r: any) => r.event_id === eventId && (r.status === 'approved' || r.status === 'pending'));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Winners</div>
      </div>
      {winners.map((w: any) => (
        <div key={w.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold text-gray-900">{w.position} - {w.name}</div>
              <div className="text-xs text-gray-500">
                {w.year && <span className="mr-2">{w.year}</span>}
                {w.category && <span>{w.category}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-sm text-blue-600" onClick={() => {
              setEditingId(w.id); setEditingDraft({ ...w });
            }} title="Edit"><Edit size={14} /></button>
            <button className="p-1 text-red-600" onClick={() => { if (confirm('Delete winner?')) deleteEventWinner(w.id); }} title="Delete"><Trash2 size={14} /></button>
          </div>
          {editingId === w.id && editingDraft && (
            <div className="col-span-12 mt-2 space-y-2">
              <input className="w-full p-2 border rounded text-gray-900" value={editingDraft.name} onChange={(e)=>setEditingDraft((d:any)=>({ ...d, name: e.target.value }))} />
              <input className="w-full p-2 border rounded text-gray-900" value={editingDraft.position} type="number" onChange={(e)=>setEditingDraft((d:any)=>({ ...d, position: parseInt(e.target.value||'0') }))} />
              <input className="w-full p-2 border rounded text-gray-900" placeholder="Batch / Participant Type" value={editingDraft.year || ''} onChange={(e)=>setEditingDraft((d:any)=>({ ...d, year: e.target.value || null }))} />
              {/* Allow picking an existing registrant as the winner to auto-fill name/photo */}
              {eventRegistrations.length > 0 && (
                <select className="w-full p-2 border rounded text-gray-900" value={editingDraft.registration_id || ''} onChange={(e)=>{
                  const rid = e.target.value || null;
                  if (!rid) return setEditingDraft((d:any)=>({ ...d, registration_id: null }));
                  const reg = eventRegistrations.find((r:any)=>r.id === rid);
                  if (reg) setEditingDraft((d:any)=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, year: (reg.participant_type || reg.batch || reg.year || d.year || null) }));
                }}>
                  <option value="">— Choose participant —</option>
                  {eventRegistrations.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-yellow-400 text-black rounded" onClick={async ()=>{
                  // Remove client-only/computed or immutable fields before update
                  const { photo_url, registration_year, id, created_at, event_id, ...rest } = editingDraft || {};
                  await updateEventWinner(editingId, { ...rest, registration_id: editingDraft.registration_id || null });
                  setEditingId(null);
                  setEditingDraft(null);
                }}>Save</button>
                <button className="px-3 py-1 border rounded text-gray-700" onClick={()=>{ setEditingId(null); setEditingDraft(null); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="bg-white p-3 rounded border">
          <input className="w-full p-2 border rounded mb-2 text-gray-900" placeholder="Name" value={draft.name} onChange={(e)=>setDraft(d=>({ ...d, name: e.target.value }))} />
          <input className="w-full p-2 border rounded mb-2 text-gray-900" type="number" value={draft.position} onChange={(e)=>setDraft(d=>({ ...d, position: parseInt(e.target.value||'1') }))} />
          <input className="w-full p-2 border rounded mb-2 text-gray-900" placeholder="Batch / Participant Type" value={draft.year || ''} onChange={(e)=>setDraft(d=>({ ...d, year: e.target.value || null }))} />
          {/* If registrations exist for this event, allow selecting one to auto-fill name */}
          {eventRegistrations.length > 0 && (
            <select className="w-full p-2 border rounded mb-2 text-gray-900" value={draft.registration_id || ''} onChange={(e)=>{
              const rid = e.target.value || null;
              if (!rid) return setDraft(d=>({ ...d, registration_id: null }));
              const reg = eventRegistrations.find((r:any)=>r.id === rid);
              if (reg) setDraft(d=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, year: (reg.participant_type || reg.batch || reg.year || d.year || null) }));
            }}>
              <option value="">— Choose participant —</option>
              {eventRegistrations.map((r: any) => (
                <option key={r.id} value={r.id}>{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async ()=>{ if (!draft.name) { alert('Enter a name'); return; } await addEventWinner?.({ event_id: eventId, name: draft.name, position: draft.position, year: draft.year || null, photo_url: null, category: draft.category || null, registration_id: draft.registration_id || null }); setIsAdding(false); setDraft({ name: '', position: 1, year: null, category: null, registration_id: null }); }}>Add</button>
            <button className="px-3 py-1 border rounded text-gray-700" onClick={()=>{ setIsAdding(false); setDraft({ name: '', position: 1, year: null, category: null, registration_id: null }); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="text-sm text-blue-600 flex items-center gap-1" onClick={()=>setIsAdding(true)}><Plus size={14} /> Add Winner</button>
      )}
    </div>
  );
};

export default EventWinnersEditor;
