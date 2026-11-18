import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminModal } from './layout/AdminModal';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { isCouncilPerson } from '../../utils/familyPeople';
import type { CoreCommittee } from '../../types/data';

export const CommitteesManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState<boolean | null>(null);
  useEffect(() => { checkRequiresApproval().then(setRequiresApproval).catch(() => setError('Could not check account permissions. Please reload.')); }, []);
  const { coreCommittees = [], coreTeamMembers = [], addCoreCommittee, updateCoreCommittee, deleteCoreCommittee } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrder, setPendingOrder] = useState<number[] | null>(null);
  const sorted = [...coreCommittees].sort((a, b) => a.order_position - b.order_position || a.id - b.id);
  const departments = pendingOrder ? [...sorted].sort((a, b) => pendingOrder.indexOf(a.id) - pendingOrder.indexOf(b.id)) : sorted;
  const [form, setForm] = useLocalStorage('admin_committee_form_draft', { name: '', description: '', order_position: 1, enabled: true });
  const resetForm = () => { setError(''); setForm({ name: '', description: '', order_position: Math.max(0, ...departments.map(department => department.order_position)) + 1, enabled: true }); };

  async function write(action: 'create' | 'update' | 'delete', payload: Partial<CoreCommittee>, id?: number) {
    if (requiresApproval === null) throw new Error('Account permissions are still loading.');
    if (requiresApproval) {
      const result = await submitForApproval('core_committee', action, payload, id);
      if (!result.success) throw new Error(result.error || 'Could not submit the change for approval.');
    } else if (action === 'create') await addCoreCommittee(payload);
    else if (action === 'update') await updateCoreCommittee(id!, payload);
    else await deleteCoreCommittee(id!);
  }
  async function save() {
    if (busy) return;
    if (!form.name.trim()) { setError('Enter a department name.'); return; }
    setBusy(true); setError('');
    try {
      savingProgress.withSteps(1, 'Saving department…');
      const payload = { name: form.name.trim(), description: form.description?.trim() || '', enabled: form.enabled, order_position: Math.max(1, form.order_position || 1) };
      await write(editing === null ? 'create' : 'update', editing === null ? { ...payload, is_core: true, color: 'emerald' } : payload, editing ?? undefined);
      setIsAdding(false); setEditing(null); resetForm(); localStorage.removeItem('admin_committee_form_draft');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the department. Please try again.'); }
    finally { setBusy(false); savingProgress.done(); }
  }
  async function move(id: number, direction: number) {
    if (busy) return;
    const next = [...departments];
    const from = next.findIndex(department => department.id === id), to = from + direction;
    if (to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    setBusy(true); setError('');
    if (!requiresApproval) setPendingOrder(next.map(department => department.id));
    try {
      savingProgress.withSteps(1, 'Saving department order…');
      for (const [index, department] of next.entries()) {
        if (department.order_position !== index + 1) await write('update', { order_position: index + 1 }, department.id);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the order. Please try again.'); }
    finally { setBusy(false); setPendingOrder(null); savingProgress.done(); }
  }
  async function toggle(department: CoreCommittee) {
    if (busy) return;
    setBusy(true); setError('');
    try { await write('update', { enabled: !department.enabled }, department.id); }
    catch { setError('Could not change department visibility. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove(department: CoreCommittee) {
    if (busy || !confirm(`Delete ${department.name}? Its people will become unassigned.`)) return;
    setBusy(true); setError('');
    try { await write('delete', {}, department.id); }
    catch { setError('Could not delete the department. Please try again.'); }
    finally { setBusy(false); }
  }
  const edit = (department: CoreCommittee) => { setError(''); setEditing(department.id); setForm({ name: department.name, description: department.description || '', order_position: department.order_position, enabled: department.enabled }); };
  const disabled = busy || requiresApproval === null;

  return <div className="people-management space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-gray-400 max-w-xl">Departments appear in this order on Rico Family. Move Tech to the top to show it first. Hidden departments and their people stay off the public page.</p>
      <button disabled={disabled} type="button" onClick={() => { resetForm(); setIsAdding(true); }} className="people-button people-button-primary"><Plus size={16} />Create Department</button>
    </div>
    {error && !isAdding && editing === null && <p role="alert" className="text-red-300 text-sm">{error}</p>}
    {requiresApproval && <p role="status" className="text-sm text-amber-200">Your department changes will be submitted for owner approval.</p>}
    <ol className="people-departments space-y-3" aria-label="Department display order">
      {departments.map((department, index) => {
        const people = coreTeamMembers.filter(person => person.committee_id === department.id && !isCouncilPerson(person));
        return <li key={department.id} className={`flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 ${department.enabled ? '' : 'opacity-60'}`}>
          <span className="text-gray-500 text-sm w-5" aria-label={`Position ${index + 1}`}>{index + 1}</span>
          <Layers size={22} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-[140px]"><h3 className="text-sm font-semibold text-white">{department.name}</h3><p className="text-xs text-gray-400 mt-1">{people.filter(person => person.is_head).length} heads · {people.filter(person => !person.is_head).length} members · {department.enabled ? 'Shown' : 'Hidden'}</p></div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={disabled || index === 0} aria-label={`Move ${department.name} up`} onClick={() => move(department.id, -1)} className="p-2 rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-25"><ArrowUp size={17} /></button>
            <button type="button" disabled={disabled || index === departments.length - 1} aria-label={`Move ${department.name} down`} onClick={() => move(department.id, 1)} className="p-2 rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-25"><ArrowDown size={17} /></button>
            <button type="button" disabled={disabled} aria-label={`${department.enabled ? 'Hide' : 'Show'} ${department.name}`} onClick={() => toggle(department)} className="p-2 rounded-lg text-emerald-300 hover:bg-white/10">{department.enabled ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            <button type="button" disabled={disabled} aria-label={`Edit ${department.name}`} onClick={() => edit(department)} className="p-2 rounded-lg text-blue-300 hover:bg-white/10"><Edit size={17} /></button>
            <button type="button" disabled={disabled} aria-label={`Delete ${department.name}`} onClick={() => remove(department)} className="p-2 rounded-lg text-red-300 hover:bg-white/10"><Trash2 size={17} /></button>
          </div>
        </li>;
      })}
    </ol>
    {!departments.length && <p className="text-sm text-gray-400 py-8 text-center">Create your first department, then add its heads and team members.</p>}
    <AdminModal appearance="people" subtitle="Name the department and choose whether it appears on the website." isOpen={isAdding || editing !== null} onClose={() => { if (!busy) { setIsAdding(false); setEditing(null); resetForm(); } }} title={editing === null ? 'Create Department' : 'Edit Department'} footer={<button disabled={disabled} type="button" onClick={save} className="people-button people-button-primary">{busy ? 'Saving…' : 'Save Department'}</button>}>
      <fieldset disabled={busy} className="people-form-fieldset people-form-section">
        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
        <div className="people-field"><label htmlFor="family-department-name" className="block text-sm text-gray-300 mb-2">Department name *</label><input id="family-department-name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Tech Team"  /></div>
        <div className="people-field"><label htmlFor="family-department-subtitle" className="block text-sm text-gray-300 mb-2">Department subtitle (optional)</label><input id="family-department-subtitle" value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Website · App · Systems"  /></div>
        <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })} />Show department on Rico Family</label>
      </fieldset>
    </AdminModal>
  </div>;
};
