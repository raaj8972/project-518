import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, X, Music, Star, Eye, EyeOff, Instagram, Youtube, AlignJustify as Spotify, Music2, Award, Users, Wand2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { BandMember } from '../../types/data';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { InlineDescriptionAI } from './InlineDescriptionAI';
import { AIHomeBoundImport } from './homebound/AIHomeBoundImport';

// ─── Style tokens ─────────────────────────────
const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

export const BandManagement: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const { 
    bandMembers,
    addBandMember,
    updateBandMember,
    deleteBandMember,
    toggleBandMemberEnabled,
    toggleBandMemberFeatured,
    sanitizeUrl
  } = useData() as any;

  const [isAdding, setIsAdding] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [form, setForm] = useLocalStorage('admin_band_member_form_draft', {
    name: '',
    role: '',
    image: '',
    description: '',
    specialty: '',
    category: '',
    achievements: [] as string[],
    order_position: 1,
    enabled: true,
    is_featured: false,
    social_links: { instagram: '', youtube: '', spotify: '' }
  });

  const resetForm = () => {
    setForm({
      name: '', role: '', image: '', description: '', specialty: '', category: '',
      achievements: [], order_position: bandMembers.length + 1, enabled: true, is_featured: false,
      social_links: { instagram: '', youtube: '', spotify: '' }
    });
  };

  const validateForm = () => {
    const missing = [];
    if (!form.name?.trim()) missing.push('name');
    if (!form.role?.trim()) missing.push('role');
    if (!form.image) missing.push('image');
    if (!form.description?.trim()) missing.push('description');
    if (!form.specialty?.trim()) missing.push('specialty');
    if (!form.category) missing.push('category');
    return missing;
  };

  const handleAdd = async () => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { setShowValidationErrors(true); alert(`Please fill in all required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      if (requiresApproval) {
        await submitForApproval('band_member', 'create', { name: form.name, role: form.role, image: form.image, description: form.description, specialty: form.specialty, category: form.category, achievements: form.achievements, order_position: form.order_position, enabled: form.enabled, is_featured: form.is_featured, social_links: form.social_links });
        alert('Request submitted for approval.');
      } else { await addBandMember(form); }
      setIsAdding(false); resetForm();
      try { localStorage.removeItem('admin_band_member_form_draft'); } catch {}
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add band member. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleUpdate = async (id: number) => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { setShowValidationErrors(true); alert(`Please fill in all required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      if (requiresApproval) {
        await submitForApproval('band_member', 'update', { name: form.name, role: form.role, image: form.image, description: form.description, specialty: form.specialty, category: form.category, achievements: form.achievements, order_position: form.order_position, enabled: form.enabled, is_featured: form.is_featured, social_links: form.social_links }, id);
        alert('Request submitted for approval.');
      } else { await updateBandMember(id, form); }
      setEditing(null); resetForm();
      try { localStorage.removeItem('admin_band_member_form_draft'); } catch {}
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update band member. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this band member? This cannot be undone.')) return;
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Deleting');
      if (requiresApproval) { await submitForApproval('band_member', 'delete', {}, id); alert('Request submitted for approval.'); }
      else { await deleteBandMember(id); }
    } catch { alert('Failed to delete band member.'); }
    finally { savingProgress.done(); }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…'); steps.next('Updating');
      if (requiresApproval) { await submitForApproval('band_member', 'update', { enabled: !bandMembers.find((m: any) => m.id === id)?.enabled }, id); alert('Request submitted for approval.'); }
      else { await toggleBandMemberEnabled(id); }
    } catch { alert('Failed to update status.'); }
    finally { savingProgress.done(); }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…'); steps.next('Updating');
      if (requiresApproval) { await submitForApproval('band_member', 'update', { is_featured: !bandMembers.find((m: any) => m.id === id)?.is_featured }, id); alert('Request submitted for approval.'); }
      else { await toggleBandMemberFeatured(id); }
    } catch { alert('Failed to update featured status.'); }
    finally { savingProgress.done(); }
  };

  const startEditing = (member: BandMember) => {
    setForm({ name: member.name, role: member.role, image: member.image, description: member.description, specialty: member.specialty, category: member.category, achievements: member.achievements, order_position: member.order_position, enabled: member.enabled, is_featured: member.is_featured, social_links: member.social_links || { instagram: '', youtube: '', spotify: '' } });
    setEditing(member.id); setShowValidationErrors(false);
  };

  const addAchievement = () => setForm(prev => ({ ...prev, achievements: [...prev.achievements, ''] }));
  const updateAchievement = (index: number, value: string) => setForm(prev => ({ ...prev, achievements: prev.achievements.map((a, i) => i === index ? value : a) }));
  const removeAchievement = (index: number) => setForm(prev => ({ ...prev, achievements: prev.achievements.filter((_, i) => i !== index) }));

  const sortedBandMembers = [...bandMembers].sort((a: any, b: any) => a.order_position - b.order_position);

  // ─── Form panel (shared between Add and inline Edit) ───
  const renderForm = (mode: 'add' | 'edit', memberId?: number) => (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Full Name <span className="text-rose-400">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Artist Name" className={`${inputCls} ${showValidationErrors && !form.name ? '!border-rose-500/50' : ''}`} />
            {showValidationErrors && !form.name && <p className="text-rose-400 text-[10px] mt-1 font-bold">Required</p>}
          </div>
          <div>
            <label className={labelCls}>Role / Position <span className="text-rose-400">*</span></label>
            <input type="text" value={form.role} onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))} placeholder="Lead Singer, Guitarist, etc." className={`${inputCls} ${showValidationErrors && !form.role ? '!border-rose-500/50' : ''}`} />
            {showValidationErrors && !form.role && <p className="text-rose-400 text-[10px] mt-1 font-bold">Required</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Specialty <span className="text-rose-400">*</span></label>
              <input type="text" value={form.specialty} onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))} placeholder="Vocals, Guitar, etc." className={`${inputCls} ${showValidationErrors && !form.specialty ? '!border-rose-500/50' : ''}`} />
            </div>
            <div>
              <label className={labelCls}>Category <span className="text-rose-400">*</span></label>
              <select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} className={`${selectCls} ${showValidationErrors && !form.category ? '!border-rose-500/50' : ''}`}>
                <option value="">Select…</option>
                <option value="Vocals">Vocals</option>
                <option value="Guitar">Guitar</option>
                <option value="Bass">Bass</option>
                <option value="Drums">Drums</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>Description <span className="text-rose-400">*</span></label>
              <InlineDescriptionAI contextName={form.name} contextType="band member" onDescriptionGenerated={(desc) => setForm(prev => ({ ...prev, description: desc }))} />
            </div>
            <textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Brief description…" className={`${inputCls} resize-none ${showValidationErrors && !form.description ? '!border-rose-500/50' : ''}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Display Order</label>
              <input type="number" value={form.order_position} onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))} min="1" className={inputCls} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))} className="sr-only peer" />
                  <div className="w-8 h-5 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-emerald-500/30 peer-checked:border-emerald-500/30 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-3 peer-checked:bg-emerald-400 transition-all" />
                </div>
                <span className="text-xs text-gray-400 font-bold">Visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm(prev => ({ ...prev, is_featured: e.target.checked }))} className="sr-only peer" />
                  <div className="w-8 h-5 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-amber-500/30 peer-checked:border-amber-500/30 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-3 peer-checked:bg-amber-400 transition-all" />
                </div>
                <span className="text-xs text-gray-400 font-bold">Featured</span>
              </label>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <label className={labelCls}>Social Media <span className="text-white/15 font-medium normal-case tracking-normal">(Optional)</span></label>
            <div className="space-y-2">
              {[
                { icon: <Instagram size={14} className="text-pink-400" />, key: 'instagram' as const, ph: 'Instagram URL' },
                { icon: <Youtube size={14} className="text-red-400" />, key: 'youtube' as const, ph: 'YouTube URL' },
                { icon: <Spotify size={14} className="text-emerald-400" />, key: 'spotify' as const, ph: 'Spotify URL' },
              ].map(({ icon, key, ph }) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">{icon}</div>
                  <input type="url" value={form.social_links[key]} onChange={(e) => setForm(prev => ({ ...prev, social_links: { ...prev.social_links, [key]: e.target.value } }))} placeholder={ph} className={`${inputCls} text-xs`} />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <label className={labelCls}>Achievements</label>
            <div className="space-y-2">
              {form.achievements.map((achievement, index) => (
                <div key={index} className="flex gap-2 animate-in fade-in duration-200">
                  <input type="text" value={achievement} onChange={(e) => updateAchievement(index, e.target.value)} placeholder="Achievement or accomplishment" className={`${inputCls} text-xs flex-1`} />
                  <button type="button" onClick={() => removeAchievement(index)} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addAchievement} className="w-full py-2 border border-dashed border-white/[0.06] rounded-xl text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white/40 hover:border-white/15 transition-all">
                + Add Achievement
              </button>
            </div>
          </div>
        </div>

        {/* Right column — Photo */}
        <div>
          <label className={labelCls}>Profile Photo <span className="text-rose-400">*</span></label>
          <div className={`rounded-xl overflow-hidden ${showValidationErrors && !form.image ? 'ring-2 ring-rose-500/50 ring-offset-2 ring-offset-[#0a0a12]' : ''}`}>
            <ImageUpload
              onImageSelect={(url: string) => setForm(prev => ({ ...prev, image: url }))}
              currentImage={form.image}
              bucket="band-images"
              folder="band"
              cropAspect={4/5}
              autoSave
            />
          </div>
          {showValidationErrors && !form.image && <p className="text-rose-400 text-[10px] mt-2 text-center font-bold">Photo required</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button type="button" onClick={() => { mode === 'add' ? setIsAdding(false) : setEditing(null); resetForm(); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-center gap-2">
          <X size={14} /> Cancel
        </button>
        <button type="button" onClick={() => mode === 'add' ? handleAdd() : handleUpdate(memberId!)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2">
          <Save size={14} /> {mode === 'add' ? 'Add Band Member' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {!isAuthenticated && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 font-medium">
          You are not logged in. Uploads require an admin session. Please log in.
        </div>
      )}

      {/* ═══ Hero Header ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-transparent border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Music2 size={14} className="text-amber-400" />
              <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-[0.2em]">People Management</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Home Bound Band</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">Manage band members, singers, and musical talent</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsBulkImporting(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 hover:scale-[1.02] transition-all"
            >
              <Wand2 size={16} />
              AI Bulk Import
            </button>
            <button
              onClick={() => { resetForm(); setIsAdding(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-2xl text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              Add Member
            </button>
          </div>
        </div>
      </div>

      {/* AI Bulk Import Modal */}
      {isBulkImporting && (
        <AIHomeBoundImport 
          onCancel={() => setIsBulkImporting(false)} 
          onSaved={() => {
            setIsBulkImporting(false);
            window.location.reload(); // Refresh to show new members
          }} 
        />
      )}

      {/* ═══ Stats Bar ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: bandMembers.length, label: 'Total', icon: <Users size={14} />, color: 'purple' },
          { value: bandMembers.filter((m: any) => m.is_featured).length, label: 'Featured', icon: <Star size={14} />, color: 'amber' },
          { value: bandMembers.filter((m: any) => m.enabled).length, label: 'Visible', icon: <Eye size={14} />, color: 'emerald' },
          { value: bandMembers.reduce((t: number, m: any) => t + m.achievements.length, 0), label: 'Achievements', icon: <Award size={14} />, color: 'blue' },
        ].map(({ value, label, icon, color }) => (
          <div key={label} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-center">
            <div className={`text-2xl font-black text-${color}-400 mb-0.5`}>{value}</div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-white/25 uppercase tracking-widest">
              {icon} {label}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Add Form ═══ */}
      {isAdding && (
        <div className="rounded-2xl bg-white/[0.02] border border-amber-500/20 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Plus size={14} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">Add New Band Member</h3>
          </div>
          <div className="p-6">{renderForm('add')}</div>
        </div>
      )}

      {/* ═══ Members Grid ═══ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedBandMembers.map((member: any) => (
          <div key={member.id} className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden hover:border-white/10 transition-all group">
            {editing === member.id ? (
              <div className="p-5">{renderForm('edit', member.id)}</div>
            ) : (
              <>
                {/* Image banner */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={sanitizeUrl?.(member.image) || member.image}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {member.is_featured && (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/30 border border-amber-500/40 backdrop-blur-sm">
                        <Star size={12} className="text-amber-300 fill-current" />
                      </span>
                    )}
                    {!member.enabled && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/30 border border-rose-500/40 backdrop-blur-sm text-[10px] font-bold text-rose-200 uppercase tracking-wider">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm text-[10px] font-bold text-white/60">
                      #{member.order_position}
                    </span>
                  </div>
                  {/* Hover action overlay */}
                  <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button type="button" onClick={() => startEditing(member)} className="p-2 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm text-white hover:bg-indigo-500/40 transition-all" title="Edit">
                      <Edit size={13} />
                    </button>
                    <button type="button" onClick={() => handleDelete(member.id)} className="p-2 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm text-white hover:bg-rose-500/40 transition-all" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                
                {/* Card body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-black text-white text-lg tracking-tight">{member.name}</h3>
                    <p className="text-amber-400/80 font-bold text-sm">{member.role}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                      {member.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/15 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                      {member.specialty}
                    </span>
                  </div>

                  <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{member.description}</p>
                  
                  {/* Social icons */}
                  {member.social_links && Object.values(member.social_links).some((link: any) => link) && (
                    <div className="flex gap-2">
                      {member.social_links.instagram && (
                        <a 
                          href={member.social_links.instagram.startsWith('http') ? member.social_links.instagram : `https://instagram.com/${member.social_links.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center hover:bg-pink-500/20 hover:scale-110 active:scale-95 transition-all"
                          title="View Instagram Profile"
                        >
                          <Instagram size={12} className="text-pink-400" />
                        </a>
                      )}
                      {member.social_links.youtube && (
                        <a 
                          href={member.social_links.youtube.startsWith('http') ? member.social_links.youtube : `https://youtube.com/${member.social_links.youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 hover:scale-110 active:scale-95 transition-all"
                          title="View YouTube Channel"
                        >
                          <Youtube size={12} className="text-red-400" />
                        </a>
                      )}
                      {member.social_links.spotify && (
                        <a 
                          href={member.social_links.spotify.startsWith('http') ? member.social_links.spotify : `https://open.spotify.com/artist/${member.social_links.spotify}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all"
                          title="View Spotify Profile"
                        >
                          <Spotify size={12} className="text-emerald-400" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {member.achievements.length > 0 && (
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-wider">
                      <Award size={10} className="inline -mt-0.5 mr-1" />
                      {member.achievements.length} achievement{member.achievements.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* Bottom action bar */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/[0.04]">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => handleToggleEnabled(member.id)} className={`p-1.5 rounded-lg transition-all ${member.enabled ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/15 border border-rose-500/20 text-rose-400'}`} title={member.enabled ? 'Hide' : 'Show'}>
                        {member.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button type="button" onClick={() => handleToggleFeatured(member.id)} className={`p-1.5 rounded-lg transition-all ${member.is_featured ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400' : 'bg-white/[0.03] border border-white/5 text-gray-600 hover:text-amber-400'}`} title={member.is_featured ? 'Unfeature' : 'Feature'}>
                        <Star size={13} className={member.is_featured ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => startEditing(member)} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 hover:bg-indigo-500/10 text-gray-500 hover:text-indigo-400 transition-all" title="Edit">
                        <Edit size={13} />
                      </button>
                      <button type="button" onClick={() => handleDelete(member.id)} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {bandMembers.length === 0 && (
        <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/5">
          <Music size={40} className="mx-auto mb-4 text-gray-700" />
          <h3 className="text-lg font-black text-white mb-2">No Band Members Yet</h3>
          <p className="text-sm text-gray-500 mb-6 font-medium">Start by adding your first band member</p>
          <button type="button" onClick={() => { setIsAdding(true); resetForm(); }} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all">
            Add First Band Member
          </button>
        </div>
      )}
    </div>
  );
};