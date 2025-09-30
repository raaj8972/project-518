import React, { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';

export const EventWinnersEditor: React.FC<{ eventId: number }> = ({ eventId }) => {
  const { eventWinners = [], addEventWinner, updateEventWinner, deleteEventWinner, registrations = [] } = useData() as any;
  const winners = (eventWinners || []).filter((w: any) => w.event_id === eventId).sort((a: any, b: any) => a.position - b.position);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; position: number; photo_url?: string | null; category?: string | null; registration_id?: string | null }>({ name: '', position: 1, photo_url: null, category: null, registration_id: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  // Registrations for this event (prefer approved ones so admins pick final participants)
  const eventRegistrations = (registrations || []).filter((r: any) => r.event_id === eventId && (r.status === 'approved' || r.status === 'pending'));

  return (
    <div className="space-y-3">
      {winners.map((w: any) => (
        <div key={w.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
              {w.photo_url ? <img src={w.photo_url} alt={w.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div>
              <div className="font-semibold">{w.position} - {w.name}</div>
              {w.category ? <div className="text-xs text-gray-500">{w.category}</div> : null}
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
              <input className="w-full p-2 border rounded" value={editingDraft.name} onChange={(e)=>setEditingDraft((d:any)=>({ ...d, name: e.target.value }))} />
              <input className="w-full p-2 border rounded" value={editingDraft.position} type="number" onChange={(e)=>setEditingDraft((d:any)=>({ ...d, position: parseInt(e.target.value||'0') }))} />
              {/* Allow picking an existing registrant as the winner to auto-fill name/photo */}
              {eventRegistrations.length > 0 && (
                <select className="w-full p-2 border rounded" value={editingDraft.registration_id || ''} onChange={(e)=>{
                  const rid = e.target.value || null;
                  if (!rid) return setEditingDraft((d:any)=>({ ...d, registration_id: null }));
                  const reg = eventRegistrations.find((r:any)=>r.id === rid);
                  if (reg) setEditingDraft((d:any)=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, photo_url: reg.photo_url || d.photo_url }));
                }}>
                  <option value="">— Choose participant —</option>
                  {eventRegistrations.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
                  ))}
                </select>
              )}
              <ImageUpload onImageSelect={(url)=>setEditingDraft((d:any)=>({ ...d, photo_url: url }))} currentImage={editingDraft.photo_url || ''} bucket="event-images" folder="winners" />
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-yellow-400 text-black rounded" onClick={async ()=>{ await updateEventWinner(editingId, { ...editingDraft, registration_id: editingDraft.registration_id || null }); setEditingId(null); setEditingDraft(null); }}>Save</button>
                <button className="px-3 py-1 border rounded" onClick={()=>{ setEditingId(null); setEditingDraft(null); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="bg-white p-3 rounded border">
          <input className="w-full p-2 border rounded mb-2" placeholder="Name" value={draft.name} onChange={(e)=>setDraft(d=>({ ...d, name: e.target.value }))} />
          <input className="w-full p-2 border rounded mb-2" type="number" value={draft.position} onChange={(e)=>setDraft(d=>({ ...d, position: parseInt(e.target.value||'1') }))} />
          {/* If registrations exist for this event, allow selecting one to auto-fill name/photo */}
          {eventRegistrations.length > 0 && (
            <select className="w-full p-2 border rounded mb-2" value={draft.registration_id || ''} onChange={(e)=>{
              const rid = e.target.value || null;
              if (!rid) return setDraft(d=>({ ...d, registration_id: null }));
              const reg = eventRegistrations.find((r:any)=>r.id === rid);
              if (reg) setDraft(d=>({ ...d, registration_id: reg.id, name: reg.full_name || d.name, photo_url: reg.photo_url || d.photo_url }));
            }}>
              <option value="">— Choose participant —</option>
              {eventRegistrations.map((r: any) => (
                <option key={r.id} value={r.id}>{r.full_name} {r.team_name ? `(${r.team_name})` : ''}</option>
              ))}
            </select>
          )}
          <ImageUpload onImageSelect={(url)=>setDraft(d=>({ ...d, photo_url: url }))} currentImage={draft.photo_url || ''} bucket="event-images" folder="winners" />
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async ()=>{ if (!draft.name) { alert('Enter a name'); return; } await addEventWinner?.({ event_id: eventId, name: draft.name, position: draft.position, photo_url: draft.photo_url || null, category: draft.category || null, registration_id: draft.registration_id || null }); setIsAdding(false); setDraft({ name: '', position: 1, photo_url: null, category: null, registration_id: null }); }}>Add</button>
            <button className="px-3 py-1 border rounded" onClick={()=>{ setIsAdding(false); setDraft({ name: '', position: 1, photo_url: null, category: null, registration_id: null }); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="text-sm text-blue-600 flex items-center gap-1" onClick={()=>setIsAdding(true)}><Plus size={14} /> Add Winner</button>
      )}
    </div>
  );
};

export default EventWinnersEditor;
