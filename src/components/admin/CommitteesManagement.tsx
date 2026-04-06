import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Layers } from 'lucide-react';
import { AdminModal } from './layout/AdminModal';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';

export const CommitteesManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const { 
    coreCommittees, 
    addCoreCommittee, 
    updateCoreCommittee, 
    deleteCoreCommittee,
    toggleCoreCommitteeEnabled
  } = useData() as any;

  const sortedCommittees = [...(coreCommittees || [])].sort((a, b) => a.order_position - b.order_position);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm] = useLocalStorage('admin_committee_form_draft', {
    name: '',
    color: 'violet',
    is_core: true,
    order_position: 1,
    enabled: true
  });

  const resetForm = () => {
    setForm({
      name: '',
      color: 'violet',
      is_core: true,
      order_position: sortedCommittees.length + 1,
      enabled: true
    });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return alert('Name is required');
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      
      const payload: any = { ...form };

      if (requiresApproval) {
        await submitForApproval('core_committee', 'create', payload);
        alert('Request submitted for approval.');
      } else {
        await addCoreCommittee(payload);
      }
      setIsAdding(false);
      resetForm();
      try { localStorage.removeItem('admin_committee_form_draft'); } catch {}
    } catch (error) {
      alert('Failed to add committee.');
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name.trim()) return alert('Name is required');
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      
      const payload: any = { ...form };

      if (requiresApproval) {
        await submitForApproval('core_committee', 'update', payload, id);
        alert('Request submitted for approval.');
      } else {
        await updateCoreCommittee(id, payload);
      }
      setEditing(null);
      resetForm();
      try { localStorage.removeItem('admin_committee_form_draft'); } catch {}
    } catch (error) {
      alert('Failed to update committee.');
    } finally {
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this committee? This will orphan its members.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        if (requiresApproval) {
          await submitForApproval('core_committee', 'delete', {}, id);
          alert('Request submitted for approval.');
        } else {
          await deleteCoreCommittee(id);
        }
      } catch (error) {
        alert('Failed to delete committee.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const startEditing = (committee: any) => {
    setEditing(committee.id);
    setForm({
      name: committee.name || '',
      color: committee.color || 'violet',
      is_core: committee.is_core !== false,
      order_position: committee.order_position || 1,
      enabled: committee.enabled !== false
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-sm">Create and manage structural divisions (e.g. PR, Web Dev, Design)</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-lg font-bold shadow-lg transition-all"
        >
          <Plus size={18} />
          Create Committee
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sortedCommittees.map((committee: any) => (
          <div key={committee.id} className={`bg-white/[0.03] rounded-2xl p-4 border transition-all ${!committee.enabled ? 'opacity-50 grayscale' : `border-white/5 hover:border-${committee.color}-500/30`} flex flex-col`}>
            <div className="flex gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${committee.color}-500/20 flex items-center justify-center shrink-0`}>
                <Layers className={`text-${committee.color}-400`} size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{committee.name}</h4>
              </div>
            </div>
            
            <div className="mt-auto pt-4 flex gap-2 border-t border-white/5">
              <button onClick={() => toggleCoreCommitteeEnabled(committee.id)} className={`flex-1 flex justify-center py-2 rounded-lg transition-colors ${committee.enabled ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-red-500/20 text-red-400'}`}>
                {committee.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button onClick={() => startEditing(committee)} className="flex-1 flex justify-center py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                <Edit size={18} />
              </button>
              <button onClick={() => handleDelete(committee.id)} className="flex-1 flex justify-center py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminModal
        isOpen={isAdding || editing !== null}
        onClose={() => { setIsAdding(false); setEditing(null); resetForm(); }}
        title={editing !== null ? "Edit Committee" : "Create Committee"}
        onSave={editing !== null ? () => handleUpdate(editing) : handleAdd}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1">Committee Name</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Color Theme</label>
              <select value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full bg-[#1a1b23] border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="violet">Violet</option>
                <option value="blue">Blue</option>
                <option value="emerald">Emerald</option>
                <option value="rose">Rose</option>
                <option value="amber">Amber</option>
                <option value="cyan">Cyan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Order Position</label>
              <input type="number" value={form.order_position} onChange={e => setForm({...form, order_position: parseInt(e.target.value) || 1})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};
