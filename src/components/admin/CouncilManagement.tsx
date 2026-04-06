import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Palette } from 'lucide-react';
import { AdminModal } from './layout/AdminModal';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';

// ── Color presets for council members ──
const COUNCIL_COLORS: { id: string; label: string; example: string; tailwind: string }[] = [
  { id: 'red',     label: 'Crimson (Default)', example: 'President / Vice President', tailwind: 'bg-red-500' },
  { id: 'emerald', label: 'Emerald (Money)',     example: 'Treasurer / Finance Head',    tailwind: 'bg-emerald-500' },
  { id: 'blue',    label: 'Royal Blue',          example: 'General Secretary',            tailwind: 'bg-blue-500' },
  { id: 'amber',   label: 'Gold',                example: 'Cultural Head',               tailwind: 'bg-amber-500' },
  { id: 'violet',  label: 'Purple',              example: 'Technical Head',              tailwind: 'bg-violet-500' },
  { id: 'cyan',    label: 'Cyan',                example: 'PR / Media Head',             tailwind: 'bg-cyan-500' },
  { id: 'rose',    label: 'Rose',                example: 'Design / Creative',           tailwind: 'bg-rose-500' },
  { id: 'orange',  label: 'Orange',              example: 'Sports / Events',             tailwind: 'bg-orange-500' },
];

export const CouncilManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const { 
    coreTeamMembers, 
    addCoreTeamMember, 
    updateCoreTeamMember, 
    deleteCoreTeamMember,
    toggleCoreTeamMemberEnabled
  } = useData() as any;

  const councilMembers = (coreTeamMembers || [])
    .filter((m: any) => m.is_council === true || m.isCouncil === true)
    .sort((a: any, b: any) => a.order_position - b.order_position);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm] = useLocalStorage('admin_council_form_draft', {
    name: '',
    role: '',
    image: '',
    phone: '',
    color: 'red',
    instagram: '',
    linkedin: '',
    facebook: '',
    youtube: '',
    spotify: '',
    email: '',
    order_position: 1,
    enabled: true
  });

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      image: '',
      phone: '',
      color: 'red',
      instagram: '',
      linkedin: '',
      facebook: '',
      youtube: '',
      spotify: '',
      email: '',
      order_position: councilMembers.length + 1,
      enabled: true
    });
  };

  const buildPayload = () => {
    const socialLinks: Record<string, string> = {};
    if (form.instagram?.trim()) socialLinks.instagram = form.instagram.trim();
    if (form.linkedin?.trim()) socialLinks.linkedin = form.linkedin.trim();
    if (form.facebook?.trim()) socialLinks.facebook = form.facebook.trim();
    if (form.youtube?.trim()) socialLinks.youtube = form.youtube.trim();
    if (form.spotify?.trim()) socialLinks.spotify = form.spotify.trim();

    return {
      name: form.name,
      role: form.role,
      image: form.image,
      phone: form.phone,
      email: form.email,
      color: form.color,
      order_position: form.order_position,
      enabled: form.enabled,
      committee_id: null,
      is_head: false,
      is_council: true,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null
    };
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return alert('Name is required');
    if (!form.image) return alert('Image is required');
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      const payload = buildPayload();

      if (requiresApproval) {
        await submitForApproval('core_team_member', 'create', payload);
        alert('Request submitted for approval.');
      } else {
        await addCoreTeamMember(payload);
      }
      setIsAdding(false);
      resetForm();
      try { localStorage.removeItem('admin_council_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding council member:', error);
      alert('Failed to add council member. ' + ((error as any)?.message || ''));
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name.trim()) return alert('Name is required');
    if (!form.image) return alert('Image is required');
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      const payload = buildPayload();

      if (requiresApproval) {
        await submitForApproval('core_team_member', 'update', payload, id);
        alert('Request submitted for approval.');
      } else {
        await updateCoreTeamMember(id, payload);
      }
      setEditing(null);
      resetForm();
      try { localStorage.removeItem('admin_council_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating council member:', error);
      alert('Failed to update council member. ' + ((error as any)?.message || ''));
    } finally {
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this council member? This action cannot be undone.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        if (requiresApproval) {
          await submitForApproval('core_team_member', 'delete', {}, id);
          alert('Request submitted for approval.');
        } else {
          await deleteCoreTeamMember(id);
        }
      } catch (error) {
        alert('Failed to delete council member.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const startEditing = (member: any) => {
    setEditing(member.id);
    setForm({
      name: member.name || '',
      role: member.role || '',
      image: member.image || '',
      phone: member.phone || '',
      color: member.color || 'red',
      instagram: member.social_links?.instagram || '',
      linkedin: member.social_links?.linkedin || '',
      facebook: member.social_links?.facebook || '',
      youtube: member.social_links?.youtube || '',
      spotify: member.social_links?.spotify || '',
      email: member.email || '',
      order_position: member.order_position || 1,
      enabled: member.enabled !== false
    });
  };

  const getColorClasses = (color: string) => {
    const map: Record<string, { border: string; text: string; bg: string }> = {
      red:     { border: 'border-red-500/30',     text: 'text-red-400',     bg: 'bg-red-500' },
      emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500' },
      blue:    { border: 'border-blue-500/30',    text: 'text-blue-400',    bg: 'bg-blue-500' },
      amber:   { border: 'border-amber-500/30',   text: 'text-amber-400',   bg: 'bg-amber-500' },
      violet:  { border: 'border-violet-500/30',  text: 'text-violet-400',  bg: 'bg-violet-500' },
      cyan:    { border: 'border-cyan-500/30',    text: 'text-cyan-400',    bg: 'bg-cyan-500' },
      rose:    { border: 'border-rose-500/30',    text: 'text-rose-400',    bg: 'bg-rose-500' },
      orange:  { border: 'border-orange-500/30',  text: 'text-orange-400',  bg: 'bg-orange-500' },
    };
    return map[color] || map.red;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-sm">Manage the central organizing council. Each member gets a unique color on the website.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-lg font-bold shadow-lg transition-all"
        >
          <Plus size={18} />
          Add Council Member
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {councilMembers.map((member: any) => {
          const c = getColorClasses(member.color || 'red');
          return (
            <div key={member.id} className={`bg-white/[0.03] rounded-2xl p-4 border transition-all ${!member.enabled ? 'opacity-50 grayscale' : `${c.border} hover:border-opacity-60`} flex flex-col`}>
              <div className="flex gap-4 mb-4">
                <div className="relative">
                  <img src={member.image || 'https://via.placeholder.com/150'} alt={member.name} className="w-16 h-16 rounded-xl object-cover" />
                  {/* Color dot indicator */}
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${c.bg} border-2 border-[#0f1015] shadow-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-lg truncate">{member.name}</h4>
                  <p className={`${c.text} text-sm font-medium truncate`}>{member.role}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-2 h-2 rounded-full ${c.bg}`} />
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      {COUNCIL_COLORS.find(cc => cc.id === (member.color || 'red'))?.label || 'Crimson'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-4 flex gap-2 border-t border-white/5">
                <button onClick={() => toggleCoreTeamMemberEnabled(member.id)} className={`flex-1 flex justify-center py-2 rounded-lg transition-colors ${member.enabled ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-red-500/20 text-red-400'}`}>
                  {member.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button onClick={() => startEditing(member)} className="flex-1 flex justify-center py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(member.id)} className="flex-1 flex justify-center py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminModal
        isOpen={isAdding || editing !== null}
        onClose={() => { setIsAdding(false); setEditing(null); resetForm(); }}
        title={editing !== null ? "Edit Council Member" : "Add Council Member"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Riya Sharma" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Role *</label>
              <input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="e.g. General Secretary" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1">Profile Image *</label>
            <ImageUpload 
              currentImage={form.image} 
              onImageSelect={(url: string) => setForm({...form, image: url})} 
              folder="team" 
              bucket="team-images"
            />
          </div>

          {/* ── Color Theme Picker ── */}
          <div>
            <label className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
              <Palette size={16} className="text-gray-400" />
              Card Color Theme
            </label>
            <p className="text-[11px] text-gray-500 mb-3">This color will be used for the member's card glow, border and accent on the public Rico Family page.</p>
            <div className="grid grid-cols-4 gap-2">
              {COUNCIL_COLORS.map(cc => (
                <button
                  key={cc.id}
                  type="button"
                  onClick={() => setForm({...form, color: cc.id})}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    form.color === cc.id
                      ? 'border-white/40 bg-white/[0.06] shadow-lg scale-[1.02]'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full ${cc.tailwind} shadow-md ${form.color === cc.id ? 'ring-2 ring-white/30' : ''}`} />
                    <span className="text-xs font-bold text-white truncate">{cc.label.split(' (')[0]}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 truncate">{cc.example}</div>
                  {form.color === cc.id && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1">Order Position</label>
            <input type="number" value={form.order_position} onChange={e => setForm({...form, order_position: parseInt(e.target.value) || 1})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Instagram</label>
              <input type="text" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} placeholder="@handle or full URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">LinkedIn</label>
              <input type="text" value={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.value})} placeholder="linkedin.com/in/..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Facebook</label>
              <input type="text" value={form.facebook} onChange={e => setForm({...form, facebook: e.target.value})} placeholder="Facebook URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">YouTube</label>
              <input type="text" value={form.youtube} onChange={e => setForm({...form, youtube: e.target.value})} placeholder="YouTube URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Spotify</label>
              <input type="text" value={form.spotify} onChange={e => setForm({...form, spotify: e.target.value})} placeholder="Spotify URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email address" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600" />
            </div>
          </div>
        </div>
      </AdminModal>

      {/* Save Button for Modal */}
      {(isAdding || editing !== null) && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <button
            onClick={editing !== null ? () => handleUpdate(editing) : handleAdd}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            {editing !== null ? "Save Changes" : "Save Member"}
          </button>
        </div>
      )}
    </div>
  );
};
