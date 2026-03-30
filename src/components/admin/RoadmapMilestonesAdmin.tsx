import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import type { RoadmapMilestone } from '../../types/data';
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, Power, Milestone, GripVertical, Download, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { BRAND_YEAR } from '../../constants/brand';

// RICO-themed Roadmap Milestones Admin
// Features: CRUD, enable toggle, duplicate year validation, drag & drop reorder + up/down buttons,
// fallback default dataset import (edit individual default before adding) + bulk import.

const emptyForm = { year: new Date().getFullYear(), title: '', points: '' };

const DEFAULT_FALLBACK: { year: number; title: string | null; points: string[]; side: 'auto'|'left'|'right' }[] = [
  { year: 2015, title: null, points: ['Biggest ever in History of RICORRENZA','Radiant Glow Bands','National Artists','Indo Western Band'], side: 'right' },
  { year: 2017, title: null, points: ['20+ events','500+ participants','3 days of cultural extravaganza'], side: 'left' },
  { year: 2019, title: null, points: ['Bollywood Artist Mohammad Irfan','Bengals Favourite Anupam Roy','Waves in Town Band','10000+ Footfall'], side: 'auto' },
  { year: 2022, title: null, points: ['Develop branding & marketing campaigns','1000+ Footfall','DJ Night','Guest Artists'], side: 'auto' },
  { year: 2023, title: null, points: ['Bollywood Artist Amit Mishra','Ehsaas India Band','DJ Nights','College Band Homeground'], side: 'right' },
  { year: Number(BRAND_YEAR), title: null, points: ['Commencement of Ricorrenza'], side: 'left' }
];

// ─── Styling helpers ─────────────────────────────
const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[11px] font-black text-white/40 uppercase tracking-widest mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

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
  const [list, setList] = useState<RoadmapMilestone[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmFormDelete, setConfirmFormDelete] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(true);

  useEffect(() => {
    if (dragIndex === null && !savingOrder) {
      setList([...roadmapMilestones].sort((a,b)=>a.order_position - b.order_position));
    }
  }, [roadmapMilestones, dragIndex, savingOrder]);

  const sorted = list;

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
  useEffect(()=>{ if (!bulkMode) setSelected(new Set()); }, [bulkMode]);

  // --- Reorder via buttons ---
  const reorder = async (m: RoadmapMilestone, dir: number) => {
    const target = m.order_position + dir;
    const swap = roadmapMilestones.find(r => r.order_position === target);
    if (swap) await updateRoadmapMilestone(swap.id, { order_position: m.order_position });
    await updateRoadmapMilestone(m.id, { order_position: target });
  };

  // --- Drag & drop ---
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

  // --- Bulk helpers ---
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
      for (const id of selected) { await deleteRoadmapMilestone(id); }
      setNotice('Selected milestones deleted.');
      setSelected(new Set()); setBulkMode(false);
    } catch (e:any) {
      const msg = e?.message || 'Bulk delete failed.'; setError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">

      {/* ═══ Hero Header ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-transparent border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Milestone size={14} className="text-purple-400" />
              <span className="text-[10px] font-black text-purple-400/80 uppercase tracking-[0.2em]">Timeline System</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Roadmap Milestones
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              {sorted.length} milestones • {sorted.filter(m => m.enabled).length} active
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sorted.length === 0 && (
              <button 
                onClick={importAllDefaults} 
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-all"
              >
                <Download size={16} /> Import Default Set
              </button>
            )}
            {sorted.length > 0 && (
              <>
                <button 
                  onClick={()=>setBulkMode(b=>!b)} 
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    bulkMode 
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' 
                      : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {bulkMode ? 'Exit Bulk' : 'Bulk Select'}
                </button>
                {bulkMode && (
                  <>
                    <button onClick={selectAll} className="px-3 py-2 rounded-xl text-xs font-bold text-gray-400 bg-white/[0.03] border border-white/10 hover:border-white/20 hover:text-white transition-all">
                      {selected.size === sorted.length ? 'Clear All' : 'Select All'}
                    </button>
                    <button 
                      disabled={selected.size===0 || submitting} 
                      onClick={bulkDelete} 
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 disabled:opacity-40 transition-all"
                    >
                      {submitting ? 'Deleting...' : `Delete (${selected.size})`}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Bulk selection bar ═══ */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-6 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-sm font-bold text-indigo-300">{selected.size} selected</span>
          <button onClick={bulkDelete} disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-50 transition-all">
            <Trash2 size={14} /> {submitting ? 'Deleting…' : `Delete ${selected.size}`}
          </button>
        </div>
      )}

      {/* ═══ Alerts ═══ */}
      {error && (
        <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in duration-300">{error}</div>
      )}
      {notice && !error && (
        <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 font-medium animate-in fade-in duration-300">{notice}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ═══ Form Panel ═══ */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              {editingId ? <Pencil size={14} className="text-purple-400" /> : <Plus size={14} className="text-purple-400" />}
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">{editingId ? 'Edit Milestone' : 'Add Milestone'}</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:parseInt(e.target.value,10)}))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Title (optional)</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Optional title…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Points (one per line)</label>
              <textarea value={form.points} onChange={e=>setForm(f=>({...f,points:e.target.value}))} rows={5} placeholder="Enter highlights, one per line…" className={`${inputCls} font-mono text-xs leading-relaxed resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Side</label>
              <select value={side} onChange={e=>setSide(e.target.value as any)} className={selectCls}>
                <option value="auto">Auto</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>

            {(editingId || fallbackEditingIndex !== null) && (
              <div className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 font-bold flex items-center gap-2">
                <Sparkles size={12} className="text-indigo-400" />
                Editing {editingId ? 'existing milestone' : 'default template'} — click {editingId ? 'Save' : 'Add'} to apply.
              </div>
            )}

            <div className="flex gap-3 items-center flex-wrap pt-4 border-t border-white/5">
              <button 
                onClick={submit} 
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Saving...' : (editingId ? <><Check size={14}/> Save</> : <><Plus size={14}/> Add</>)}
              </button>
              {(editingId !== null || fallbackEditingIndex !== null) && (
                <button onClick={()=>resetForm()} className="px-4 py-2.5 text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all flex items-center gap-2"><X size={14}/> Cancel</button>
              )}
              {editingId && !confirmFormDelete && (
                <button disabled={submitting} onClick={()=>setConfirmFormDelete(true)} className="px-4 py-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50 rounded-xl text-sm font-bold transition-all flex items-center gap-2"><Trash2 size={14}/> Delete</button>
              )}
              {editingId && confirmFormDelete && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <span className="text-xs text-rose-300 font-bold">Confirm delete?</span>
                  <button disabled={submitting} onClick={deleteCurrent} className="px-3 py-1 bg-rose-500/30 hover:bg-rose-500/40 text-rose-300 rounded-lg text-xs font-bold transition-all">Yes</button>
                  <button disabled={submitting} onClick={()=>setConfirmFormDelete(false)} className="px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 rounded-lg text-xs font-bold transition-all">No</button>
                </div>
              )}
              {savingOrder && <span className="text-xs text-gray-500 font-bold animate-pulse">Saving order...</span>}
            </div>
          </div>
        </div>

        {/* ═══ Milestones List ═══ */}
        <div className="space-y-4">
          <h3 className={labelCls + ' px-1'}>Existing Milestones</h3>

          {sorted.length > 0 && sorted.map((m,idx) => (
            <div
              key={m.id}
              className={`rounded-2xl border transition-all duration-300 group ${
                m.enabled 
                  ? bulkMode && selected.has(m.id)
                    ? 'bg-white/[0.04] border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                  : 'bg-white/[0.01] border-rose-500/20 opacity-60'
              } ${dragIndex !== null ? 'cursor-grabbing' : 'cursor-grab'}`}
              draggable
              onDragStart={()=>onDragStart(idx)}
              onDragOver={e=>onDragOver(e,idx)}
              onDrop={persistOrder}
              onDragEnd={persistOrder}
            >
              <div className="p-5">
                {bulkMode && (
                  <button
                    onClick={()=>toggleSelect(m.id)}
                    className={`float-left mr-3 mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                      selected.has(m.id) 
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                        : 'bg-white/[0.03] border-white/20 hover:border-white/40'
                    }`}
                  >
                    {selected.has(m.id) ? '✓' : ''}
                  </button>
                )}

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-xl text-white tracking-tight">{m.year}</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        m.enabled 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}>
                        {m.enabled ? 'Active' : 'Disabled'}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Side: {m.side}</span>
                    </div>
                    {m.title && <p className="text-sm text-gray-300 font-bold mt-1">{m.title}</p>}
                    <ul className="text-sm space-y-1 mt-2.5 text-gray-400">
                      {m.points.map((p: string, i: number)=>(
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-indigo-500/60 mt-2 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!bulkMode && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={()=>toggleRoadmapMilestoneEnabled(m.id)} 
                        className={`p-2 rounded-xl border transition-all ${
                          m.enabled 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title={m.enabled ? 'Disable' : 'Enable'}
                      >
                        <Power size={14}/>
                      </button>
                      <button disabled={idx===0} onClick={()=>reorder(m,-1)} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-gray-500 hover:text-white disabled:opacity-20 transition-all"><ArrowUp size={14}/></button>
                      <button disabled={idx===sorted.length-1} onClick={()=>reorder(m,1)} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-gray-500 hover:text-white disabled:opacity-20 transition-all"><ArrowDown size={14}/></button>
                      <button onClick={()=>startEdit(m)} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 hover:bg-indigo-500/10 text-gray-500 hover:text-indigo-400 transition-all"><Pencil size={14}/></button>
                      <div className="relative">
                        {confirmDeleteId !== m.id ? (
                          <button onClick={()=>setConfirmDeleteId(m.id)} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all"><Trash2 size={14}/></button>
                        ) : (
                          <div className="absolute top-0 right-0 z-10 bg-[#12121a] border border-rose-500/30 shadow-xl shadow-rose-500/10 rounded-xl px-3 py-2 flex items-center gap-2 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-rose-300">Delete?</span>
                            <button disabled={submitting} onClick={async ()=>{ setSubmitting(true); try { await deleteRoadmapMilestone(m.id); setNotice('Milestone deleted.'); } catch(e:any){ setError(e?.message||'Delete failed.'); } finally { setSubmitting(false); setConfirmDeleteId(null);} }} className="text-[10px] px-2.5 py-1 bg-rose-500/30 hover:bg-rose-500/40 text-rose-300 rounded-lg font-bold transition-all">Yes</button>
                            <button onClick={()=>setConfirmDeleteId(null)} className="text-[10px] px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 rounded-lg font-bold transition-all">No</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drag handle indicator */}
                <div className="flex justify-center mt-3 opacity-0 group-hover:opacity-30 transition-opacity">
                  <GripVertical size={14} className="text-gray-500" />
                </div>
              </div>
            </div>
          ))}

          {/* ═══ Empty State — Default Fallback Import ═══ */}
          {sorted.length === 0 && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-sm text-gray-400 font-medium text-center">
                No milestones in database. Add manually on the left or import defaults below.
                <br/><span className="text-gray-600 text-xs">You can edit a default card before adding it.</span>
              </div>

              <button
                onClick={() => setDefaultsOpen(!defaultsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all text-left"
              >
                <span className={labelCls + ' mb-0'}>Default Templates</span>
                {defaultsOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </button>

              {defaultsOpen && (
                <div className="grid md:grid-cols-2 gap-3 animate-in fade-in duration-300">
                  {DEFAULT_FALLBACK.map((f,i)=>(
                    <div key={f.year} className={`p-4 rounded-2xl border transition-all ${
                      fallbackEditingIndex===i 
                        ? 'bg-white/[0.04] border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-lg text-white">{f.year}</span>
                        <div className="flex gap-2">
                          <button onClick={()=>startEditFallback(i)} className="text-[10px] px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 font-bold transition-all">Edit</button>
                          <button disabled={submitting} onClick={()=>addEditedFallback(i)} className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 font-bold transition-all">
                            {submitting && fallbackEditingIndex===i ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 font-bold">Side: {f.side}</div>
                      <ul className="text-xs space-y-1 text-gray-400">
                        {(fallbackEditingIndex===i ? form.points.split('\n') : f.points).map((p,j)=>(
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-purple-500/40 mt-1.5 flex-shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center pt-2">
                <button disabled={submitting} onClick={importAllDefaults} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 hover:scale-[1.02] disabled:opacity-50 transition-all">
                  {submitting ? 'Importing...' : 'Import All Defaults'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapMilestonesAdmin;
