import React, { useEffect, useState } from 'react';
import { useData, RoadmapMilestone } from '../../context/DataContext';
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, Power } from 'lucide-react';
import { useSavingProgress } from '../../context/SavingProgressContext';

// Clean rebuilt component – light theme
// Features: CRUD, enable toggle, duplicate year validation, drag & drop reorder + up/down buttons,
// fallback default dataset import (edit individual default before adding) + bulk import.

const emptyForm = { year: new Date().getFullYear(), title: '', points: '' };

const DEFAULT_FALLBACK: { year: number; title: string | null; points: string[]; side: 'auto'|'left'|'right' }[] = [
  { year: 2015, title: null, points: ['Biggest ever in History of RICORRENZA','Radiant Glow Bands','National Artists','Indo Western Band'], side: 'right' },
  { year: 2017, title: null, points: ['20+ events','500+ participants','3 days of cultural extravaganza'], side: 'left' },
  { year: 2019, title: null, points: ['Bollywood Artist Mohammad Irfan','Bengals Favourite Anupam Roy','Waves in Town Band','10000+ Footfall'], side: 'auto' },
  { year: 2022, title: null, points: ['Develop branding & marketing campaigns','1000+ Footfall','DJ Night','Guest Artists'], side: 'auto' },
  { year: 2023, title: null, points: ['Bollywood Artist Amit Mishra','Ehsaas India Band','DJ Nights','College Band Homeground'], side: 'right' },
  { year: 2026, title: null, points: ['Commencement of Ricorrenza'], side: 'left' }
];

export const RoadmapMilestonesAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { roadmapMilestones, addRoadmapMilestone, updateRoadmapMilestone, deleteRoadmapMilestone, toggleRoadmapMilestoneEnabled } = useData();
  const [form, setForm] = useState(emptyForm);
  const [side, setSide] = useState<'auto'|'left'|'right'>('auto');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fallbackEditingIndex, setFallbackEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [list, setList] = useState<RoadmapMilestone[]>([]); // local ordering copy
  const [savingOrder, setSavingOrder] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null); // list item confirm
  const [confirmFormDelete, setConfirmFormDelete] = useState(false); // form delete confirm

  // Sync list from context
  useEffect(() => {
    if (dragIndex === null && !savingOrder) {
      setList([...roadmapMilestones].sort((a,b)=>a.order_position - b.order_position));
    }
  }, [roadmapMilestones, dragIndex, savingOrder]);

  const sorted = list; // alias

  // --- CRUD ---
  const submit = async () => {
    setError(null); setNotice(null);
    if (!form.year || isNaN(form.year)) { setError('Enter a valid year.'); return; }
    if (form.year < 1900 || form.year > 3000) { setError('Year out of allowed range.'); return; }
    const dup = roadmapMilestones.some(m => m.year === form.year && m.id !== editingId);
    if (dup) { setError('A milestone with this year already exists.'); return; }
    const pts = form.points.split('\n').map(p=>p.trim()).filter(Boolean);
    if (pts.length === 0 && !form.title) { setError('Provide at least one point or a title.'); return; }
    const payload = { year: form.year, title: form.title || null, points: pts, side };
    setSubmitting(true);
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      if (editingId) await updateRoadmapMilestone(editingId, payload);
      else await addRoadmapMilestone(payload);
      setNotice(editingId ? 'Milestone updated.' : 'Milestone added.');
      resetForm(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to save.';
      if (/permission/i.test(msg) || /policy/i.test(msg)) {
        setError('Permission denied: please login (session required) to modify milestones.');
      } else {
        setError(msg);
      }
    } finally { setSubmitting(false); savingProgress.done(); }
  };

  const deleteCurrent = async () => {
    if (!editingId) return;
    setError(null); setNotice(null); setSubmitting(true);
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Deleting');
      await deleteRoadmapMilestone(editingId);
      setNotice('Milestone deleted.');
      resetForm(false); setConfirmFormDelete(false);
    } catch (e:any) {
      const msg = e?.message || 'Delete failed.'; if (/permission/i.test(msg)) setError('Permission denied: login required.'); else setError(msg);
    } finally { setSubmitting(false); savingProgress.done(); }
  };

  const startEdit = (m: RoadmapMilestone) => {
    setEditingId(m.id);
    setFallbackEditingIndex(null);
    setForm({ year: m.year, title: m.title || '', points: m.points.join('\n') });
    setSide(m.side as any);
  };

  const startEditFallback = (i: number) => {
    const f = DEFAULT_FALLBACK[i];
    setFallbackEditingIndex(i);
    setEditingId(null);
    setForm({ year: f.year, title: f.title || '', points: f.points.join('\n') });
    setSide(f.side);
  };

  const resetForm = (clearNotice: boolean = true) => { setEditingId(null); setFallbackEditingIndex(null); setForm(emptyForm); setSide('auto'); if (!clearNotice) return; };
  // Reset selection when leaving bulk mode
  useEffect(()=> { if (!bulkMode) setSelected(new Set()); }, [bulkMode]);

  // --- Reorder via buttons ---
  const reorder = async (m: RoadmapMilestone, dir: number) => {
    const target = m.order_position + dir;
    const swap = roadmapMilestones.find(r => r.order_position === target);
    if (swap) await updateRoadmapMilestone(swap.id, { order_position: m.order_position });
    await updateRoadmapMilestone(m.id, { order_position: target });
  };

  // --- Drag & drop (local reorder then persist) ---
  const onDragStart = (idx: number) => setDragIndex(idx);
  const onDragOver = (e: React.DragEvent<HTMLDivElement>, overIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setList(prev => {
      const arr = [...prev];
      const [item] = arr.splice(dragIndex,1);
      arr.splice(overIndex,0,item);
      setDragIndex(overIndex);
      return arr;
    });
  };
  const persistOrder = async () => {
    if (dragIndex === null) return;
    setSavingOrder(true);
    try {
      const steps = savingProgress.withSteps(list.length || 2, 'Preparing…');
      for (let i=0;i<list.length;i++) {
        const item = list[i];
        if (item.order_position !== i+1) {
          steps.next('Reordering…');
          await updateRoadmapMilestone(item.id,{ order_position: i+1 });
        }
      }
    } finally { setDragIndex(null); setSavingOrder(false); savingProgress.done(); }
  };

  // --- Fallback import ---
  const addEditedFallback = async (index: number) => {
    const editing = fallbackEditingIndex === index;
    const f = DEFAULT_FALLBACK[index];
    const points = editing ? form.points.split('\n').map(p=>p.trim()).filter(Boolean) : f.points;
    const title = editing ? (form.title || null) : f.title;
    setError(null); setNotice(null); setSubmitting(true);
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Importing');
      await addRoadmapMilestone({ year: editing ? form.year : f.year, title, points, side: editing ? side : f.side, order_position: index+1, enabled: true });
      setNotice('Milestone added.');
      if (editing) resetForm(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to add.';
      if (/permission/i.test(msg)) setError('Permission denied: login required.'); else setError(msg);
    } finally { setSubmitting(false); savingProgress.done(); }
  };

  const importAllDefaults = async () => {
    setError(null); setNotice(null); setSubmitting(true);
    try {
      const steps = savingProgress.withSteps(DEFAULT_FALLBACK.length + 1, 'Preparing…');
      for (let i=0;i<DEFAULT_FALLBACK.length;i++) {
        const f = DEFAULT_FALLBACK[i];
        steps.next(`Importing ${f.year}`);
        await addRoadmapMilestone({ year: f.year, title: f.title, points: f.points, side: f.side, order_position: i+1, enabled: true });
      }
      setNotice('Default milestones imported.');
    } catch (e: any) {
      const msg = e?.message || 'Import failed.';
      if (/permission/i.test(msg)) setError('Permission denied: login required.'); else setError(msg);
    } finally { setSubmitting(false); savingProgress.done(); }
  };

  // --- Bulk selection helpers ---
  const toggleSelect = (id: number) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const selectAll = () => {
    if (selected.size === sorted.length) { setSelected(new Set()); return; }
    setSelected(new Set(sorted.map(m=>m.id)));
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} milestone(s)?`)) return;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      // Sequential to keep it simple (volumes are small)
      for (const id of selected) { await deleteRoadmapMilestone(id); }
      setNotice('Selected milestones deleted.');
      setSelected(new Set()); setBulkMode(false);
    } catch (e:any) {
      const msg = e?.message || 'Bulk delete failed.'; setError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Roadmap Milestones</h2>
        {sorted.length === 0 && (
          <button onClick={importAllDefaults} className="px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 rounded font-semibold text-white">Import Default Set</button>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={()=>setBulkMode(b=>!b)} className="px-3 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-800">
              {bulkMode ? 'Exit Bulk' : 'Bulk Select'}
            </button>
            {bulkMode && (
              <>
                <button onClick={selectAll} className="px-3 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-800">
                  {selected.size === sorted.length ? 'Clear All' : 'Select All'}
                </button>
                <button disabled={selected.size===0 || submitting} onClick={bulkDelete} className="px-3 py-2 text-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded font-semibold text-white">
                  {submitting ? 'Deleting...' : `Delete (${selected.size || 0})`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Year</label>
            <input type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:parseInt(e.target.value,10)}))} className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Title (optional)</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Points (one per line)</label>
            <textarea value={form.points} onChange={e=>setForm(f=>({...f,points:e.target.value}))} rows={6} className="w-full bg-white border border-gray-300 rounded px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Side</label>
            <select value={side} onChange={e=>setSide(e.target.value as any)} className="w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="auto">Auto</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          {(editingId || fallbackEditingIndex !== null) && (
            <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 inline-block">Editing {editingId ? 'existing milestone' : 'default template'} – click {editingId ? 'Save' : 'Add'} to apply.</div>
          )}
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-300 rounded px-3 py-2">{error}</div>}
      {notice && !error && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-300 rounded px-3 py-2">{notice}</div>}
          <div className="flex gap-3 items-center flex-wrap">
            <button onClick={submit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-semibold text-white flex items-center gap-2">
        {submitting ? 'Saving...' : (editingId ? <><Check size={16}/> Save</> : <><Plus size={16}/> Add</>)}
            </button>
            {(editingId !== null || fallbackEditingIndex !== null) && (
              <button onClick={()=>resetForm()} className="px-4 py-2 bg-gray-500 hover:bg-gray-400 rounded text-sm font-semibold text-white flex items-center gap-2"><X size={16}/> Cancel</button>
            )}
            {editingId && !confirmFormDelete && (
              <button disabled={submitting} onClick={()=>setConfirmFormDelete(true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded text-sm font-semibold text-white flex items-center gap-2"><Trash2 size={16}/> Delete</button>
            )}
            {editingId && confirmFormDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium">Delete?</span>
                <button disabled={submitting} onClick={deleteCurrent} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded text-xs font-semibold text-white">Yes</button>
                <button disabled={submitting} onClick={()=>setConfirmFormDelete(false)} className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded text-xs font-semibold text-gray-800">No</button>
              </div>
            )}
            {savingOrder && <div className="text-xs text-gray-500">Saving order...</div>}
          </div>
        </div>

        {/* Existing list or fallback */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Existing Milestones</h3>
          {sorted.length > 0 && sorted.map((m,idx)=>(
            <div
              key={m.id}
              className={`p-4 bg-white border rounded relative group shadow-sm ${m.enabled ? 'border-gray-200' : 'border-rose-300/70 opacity-75'} ${dragIndex !== null ? 'cursor-grabbing' : 'cursor-grab'} ${bulkMode && selected.has(m.id) ? 'ring-2 ring-indigo-400' : ''}`}
              draggable
              onDragStart={()=>onDragStart(idx)}
              onDragOver={e=>onDragOver(e,idx)}
              onDrop={persistOrder}
              onDragEnd={persistOrder}
            >
              {bulkMode && (
                <button
                  onClick={()=>toggleSelect(m.id)}
                  className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold ${selected.has(m.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-300'}`}
                  aria-label={selected.has(m.id) ? 'Deselect milestone' : 'Select milestone'}
                >
                  {selected.has(m.id) ? '✓' : ''}
                </button>
              )}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg text-gray-900">{m.year}</div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{m.enabled ? 'ENABLED' : 'DISABLED'}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Side: {m.side}</span>
                  </div>
                  <ul className="text-sm space-y-1 list-disc pl-5 mt-2 text-gray-700">
                    {m.points.map((p,i)=>(<li key={i}>{p}</li>))}
                  </ul>
                </div>
                {!bulkMode && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>toggleRoadmapMilestoneEnabled(m.id)} className={`p-1 rounded hover:bg-gray-100 ${m.enabled ? 'text-emerald-600' : 'text-rose-600'}`} title={m.enabled? 'Disable':'Enable'}><Power size={16}/></button>
                  <button disabled={idx===0} onClick={()=>reorder(m,-1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={16}/></button>
                  <button disabled={idx===sorted.length-1} onClick={()=>reorder(m,1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={16}/></button>
                  <button onClick={()=>startEdit(m)} className="p-1 rounded hover:bg-gray-100"><Pencil size={16}/></button>
                  <div className="relative">
                    {confirmDeleteId !== m.id && (
                      <button onClick={()=>setConfirmDeleteId(m.id)} className="p-1 rounded hover:bg-rose-100 text-rose-600" title="Delete"><Trash2 size={16}/></button>
                    )}
                    {confirmDeleteId === m.id && (
                      <div className="absolute top-0 right-0 z-10 bg-white border border-rose-300 shadow-sm rounded px-2 py-1 flex items-center gap-2">
                        <span className="text-[10px] font-medium text-rose-600">Delete?</span>
                        <button disabled={submitting} onClick={async ()=>{ setSubmitting(true); try { await deleteRoadmapMilestone(m.id); setNotice('Milestone deleted.'); } catch(e:any){ setError(e?.message||'Delete failed.'); } finally { setSubmitting(false); setConfirmDeleteId(null);} }} className="text-[10px] px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold disabled:opacity-50">Yes</button>
                        <button disabled={submitting} onClick={()=>setConfirmDeleteId(null)} className="text-[10px] px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold disabled:opacity-50">No</button>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="space-y-4">
              <div className="p-6 bg-white border border-dashed border-gray-300 rounded text-sm text-gray-600">
                No milestones in database. Add manually on the left or import default set below (you can Edit a default card to modify before adding).
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {DEFAULT_FALLBACK.map((f,i)=>(
                  <div key={f.year} className={`p-4 bg-white border rounded shadow-sm ${fallbackEditingIndex===i ? 'ring-2 ring-indigo-400' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-lg text-gray-900">{f.year}</div>
                      <div className="flex gap-2">
                        <button onClick={()=>startEditFallback(i)} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold text-white">Edit</button>
                        <button disabled={submitting} onClick={()=>addEditedFallback(i)} className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-white">{submitting && fallbackEditingIndex===i ? 'Adding...' : 'Add'}</button>
                      </div>
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Side: {f.side}</div>
                    <ul className="text-xs space-y-1 list-disc pl-4 text-gray-700">
                      {(fallbackEditingIndex===i ? form.points.split('\n') : f.points).map((p,j)=>(<li key={j}>{p}</li>))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button disabled={submitting} onClick={importAllDefaults} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm font-semibold text-white">{submitting ? 'Importing...' : 'Import All Defaults'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapMilestonesAdmin;
