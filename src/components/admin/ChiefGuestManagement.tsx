import React, { useState, useRef } from 'react';
import { useToast } from '../../components/ToastProvider';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';

export const ChiefGuestManagement: React.FC = () => {
  const { chiefGuests, addChiefGuest, updateChiefGuest, deleteChiefGuest, toggleChiefGuestEnabled } = useData();
  const { push } = useToast();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const dragOverId = useRef<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    title: '',
    image: '',
    specialty: '',
    description: '',
    achievementsRaw: '',
    social_links: { instagram: '', youtube: '', spotify: '' } as any,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setForm({
      name: '', title: '', image: '', specialty: '', description: '', achievementsRaw: '', social_links: { instagram: '', youtube: '', spotify: '' }
    });
    setEditingId(null);
    setError(null);
  };

  const startEdit = (id: number) => {
    const cg = chiefGuests.find(c => c.id === id);
    if (!cg) return;
    setEditingId(id);
    setForm({
      name: cg.name || '',
      title: cg.title || '',
      image: (cg as any).image || '',
      specialty: (cg as any).specialty || '',
      description: cg.description || '',
      achievementsRaw: (cg.achievements || []).join('\n'),
      social_links: (cg as any).social_links || { instagram: '', youtube: '', spotify: '' },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        title: form.title.trim(),
        image: form.image,
        specialty: form.specialty.trim() || null,
        description: form.description.trim(),
        achievements: form.achievementsRaw.split('\n').map(l => l.trim()).filter(Boolean),
        social_links: form.social_links,
        enabled: true,
        is_featured: true,
      };
      if (!payload.name || !payload.title || !payload.image || !payload.description) {
        throw new Error('Name, title, image, description required');
      }
      if (editingId) await updateChiefGuest(editingId, payload); else await addChiefGuest(payload);
      reset();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const ordered = [...chiefGuests].sort((a,b)=>(a.order_position ?? 0) - (b.order_position ?? 0));

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (id: number) => {
    dragOverId.current = id;
  };

  const handleDragEnd = async () => {
    if (draggingId == null || dragOverId.current == null || draggingId === dragOverId.current) { setDraggingId(null); dragOverId.current = null; return; }
    const list = ordered;
    const fromIndex = list.findIndex(c=>c.id===draggingId);
    const toIndex = list.findIndex(c=>c.id===dragOverId.current);
    if (fromIndex === -1 || toIndex === -1) { setDraggingId(null); dragOverId.current = null; return; }
    // Reorder array locally
    const updated = [...list];
    const [moved] = updated.splice(fromIndex,1);
    updated.splice(toIndex,0,moved);
    // Assign new order_position sequentially (1-based)
    const updates = updated.map((item, idx)=>({ id: item.id, order_position: idx+1 }));
    try {
      setReorderSaving(true);
      setReorderMessage(null);
      await Promise.all(updates.map(u => updateChiefGuest(u.id, { order_position: u.order_position } as any)));
      setReorderMessage('Order saved');
      push({ message: 'Chief guest order updated', type: 'success' });
    } catch (err) {
      console.error('Reorder failed', err);
      setReorderMessage('Reorder failed');
      push({ message: 'Reorder failed', type: 'error' });
    } finally {
      setTimeout(()=>setReorderMessage(null), 2500);
      setReorderSaving(false);
      setDraggingId(null);
      dragOverId.current = null;
    }
  };

  const moveItem = async (id: number, direction: -1 | 1) => {
    const list = ordered;
    const index = list.findIndex(c=>c.id===id);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const updated = [...list];
    const [moved] = updated.splice(index,1);
    updated.splice(target,0,moved);
    const updates = updated.map((item, idx)=>({ id: item.id, order_position: idx+1 }));
    try {
      setReorderSaving(true);
      setReorderMessage(null);
      await Promise.all(updates.map(u => updateChiefGuest(u.id, { order_position: u.order_position } as any)));
      setReorderMessage('Order saved');
      push({ message: 'Chief guest order updated', type: 'success' });
    } catch (err) {
      setReorderMessage('Reorder failed');
      push({ message: 'Reorder failed', type: 'error' });
    } finally {
      setTimeout(()=>setReorderMessage(null), 2500);
      setReorderSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Chief Guest</h2>
        <p className="text-sm text-gray-500">Manage the distinguished chief guest shown on the homepage. Drag cards to reorder display priority.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Name *</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Title *</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Specialty</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Instagram</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.social_links.instagram||''} onChange={e=>setForm(f=>({...f,social_links:{...f.social_links,instagram:e.target.value}}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">YouTube</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.social_links.youtube||''} onChange={e=>setForm(f=>({...f,social_links:{...f.social_links,youtube:e.target.value}}))} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Spotify</label>
            <input className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.social_links.spotify||''} onChange={e=>setForm(f=>({...f,social_links:{...f.social_links,spotify:e.target.value}}))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Description / Bio *</label>
          <textarea rows={4} className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Achievements (one per line)</label>
          <textarea rows={3} className="w-full border rounded px-3 py-2 text-sm text-gray-900" value={form.achievementsRaw} onChange={e=>setForm(f=>({...f,achievementsRaw:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-2">Image *</label>
          <ImageUpload
            currentImage={form.image}
            onImageSelect={(url: string)=>setForm(f=>({...f,image:url}))}
            bucket={"guest-artist-images" as any /* TODO: create 'chief-guest-images' bucket */}
            folder="chief"
          />
        </div>
        <div className="flex gap-3">
          <button disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
            {editingId ? 'Update Chief Guest' : 'Add Chief Guest'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm font-semibold">Cancel</button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-3 text-sm">
        {reorderSaving && <span className="text-blue-600">Saving…</span>}
        {reorderMessage && <span className={`text-xs ${reorderMessage.includes('failed') ? 'text-red-600':'text-green-600'}`}>{reorderMessage}</span>}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ordered.map(cg => (
          <div
            key={cg.id}
            draggable
            onDragStart={(e)=>handleDragStart(e,cg.id)}
            onDragEnter={()=>handleDragEnter(cg.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e)=>e.preventDefault()}
            className={`bg-white rounded-lg shadow p-4 relative border ${draggingId===cg.id ? 'opacity-60 ring-2 ring-blue-400' : dragOverId.current===cg.id && draggingId!==cg.id ? 'ring-2 ring-purple-400' : 'border-transparent'}`}
          >
            <div className="absolute top-2 right-2 text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{cg.order_position ?? '-'}</div>
            <div className="flex items-start gap-4">
              {cg.image && <img src={cg.image} alt={cg.name} className="w-20 h-20 object-cover rounded" />}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">{cg.name}</h3>
                <p className="text-xs text-blue-600 font-semibold mb-1">{cg.title}</p>
                {cg.specialty && <p className="text-[11px] text-purple-600 mb-1">{cg.specialty}</p>}
                <p className="text-[11px] text-gray-500 line-clamp-3 mb-2">{cg.description}</p>
                <div className="flex gap-2 text-[10px] flex-wrap">
                  <div className="flex gap-1">
                    <button type="button" disabled={reorderSaving} onClick={()=>moveItem(cg.id,-1)} className="px-2 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-40" aria-label="Move up">↑</button>
                    <button type="button" disabled={reorderSaving} onClick={()=>moveItem(cg.id,1)} className="px-2 py-1 rounded bg-gray-100 text-gray-600 disabled:opacity-40" aria-label="Move down">↓</button>
                  </div>
                  <button onClick={()=>startEdit(cg.id)} className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">Edit</button>
                  <button onClick={()=>toggleChiefGuestEnabled(cg.id)} className={`px-2 py-1 rounded ${cg.enabled ? 'bg-red-100 text-red-600':'bg-green-100 text-green-700'}`}>{cg.enabled ? 'Disable':'Enable'}</button>
                  <button onClick={()=>{ if(confirm('Delete chief guest?')) deleteChiefGuest(cg.id); }} className="px-2 py-1 rounded bg-gray-100 text-gray-700">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {ordered.length === 0 && (
          <div className="text-sm text-gray-500">No chief guest added yet.</div>
        )}
      </div>
    </div>
  );
};
