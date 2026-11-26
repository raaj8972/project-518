import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, X, Music, Star, Eye, EyeOff, Instagram, Youtube, Wand2, Search, ArrowUpRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { BandMember } from '../../types/data';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { getHomeboundSocialLinks, safeHomeboundUrl } from '../../utils/homebound';
import { getHomeboundCategoryOptions, getHomeboundMemberCategory, readHomeboundContent } from '../../utils/homeboundContent';
import { InlineDescriptionAI } from './InlineDescriptionAI';
import { AIHomeBoundImport } from './homebound/AIHomeBoundImport';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all';
const labelCls = 'block text-xs font-semibold text-gray-300 mb-2';
const actionCls = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';

interface BandDraft {
  name: string; role: string; image: string; description: string; specialty: string; category: string;
  achievements: string[]; order_position: number; enabled: boolean; is_featured: boolean;
  social_links: { instagram: string; youtube: string; spotify: string };
}
const emptyDraft = (order = 1): BandDraft => ({ name: '', role: '', image: '', description: '', specialty: '', category: '', achievements: [], order_position: order, enabled: true, is_featured: false, social_links: { instagram: '', youtube: '', spotify: '' } });
function normalizeDraft(value: unknown): BandDraft {
  const raw = value && typeof value === 'object' ? value as Partial<BandDraft> : {};
  const links = raw.social_links && typeof raw.social_links === 'object' ? raw.social_links : {} as BandDraft['social_links'];
  const text = (input: unknown) => typeof input === 'string' ? input : '';
  return {
    name: text(raw.name), role: text(raw.role), image: text(raw.image), description: text(raw.description), specialty: text(raw.specialty), category: text(raw.category),
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((item): item is string => typeof item === 'string') : [],
    order_position: typeof raw.order_position === 'number' && Number.isFinite(raw.order_position) ? Math.max(1, Math.trunc(raw.order_position)) : 1,
    enabled: raw.enabled !== false, is_featured: raw.is_featured === true,
    social_links: { instagram: text(links.instagram), youtube: text(links.youtube), spotify: text(links.spotify) },
  };
}
function imageUrl(value: string): string | null {
  const input = value.trim();
  return /^\/(?!\/)/.test(input) && !input.includes('\\') ? input : safeHomeboundUrl(input);
}

export const BandManagement = () => {
  const { isAuthenticated } = useAuth();
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const { bandMembers, homeboundSettings, addBandMember, updateBandMember, deleteBandMember, toggleBandMemberEnabled, toggleBandMemberFeatured } = useData();
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [approvalReady, setApprovalReady] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const mutationLock = useRef(false);
  const [storedDraft, setStoredDraft, clearDraft] = useLocalStorage<BandDraft>('admin_band_member_form_draft', emptyDraft());
  const form = normalizeDraft(storedDraft);
  const content = readHomeboundContent(homeboundSettings?.page_content);
  const categoryOptions = getHomeboundCategoryOptions(content.categories, bandMembers);
  const blocked = busy !== null || imageBusy || !approvalReady || !isAuthenticated;

  useEffect(() => {
    let active = true;
    checkRequiresApproval().then(value => { if (active) { setRequiresApproval(value); setApprovalReady(true); } }).catch(() => {
      if (active) setStatus({ error: true, text: 'Could not verify publishing access. Reload this page before making changes.' });
    });
    return () => { active = false; };
    // Access is checked once on this mounted management page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (patch: Partial<BandDraft>) => setStoredDraft({ ...form, ...patch });
  const resetForm = () => { clearDraft(); setStoredDraft(emptyDraft(Math.max(0, ...bandMembers.map(member => member.order_position ?? 0)) + 1)); setFieldErrors([]); };
  const beginAdd = () => { resetForm(); setEditing(null); setIsAdding(true); setStatus(null); };
  const startEditing = (member: BandMember) => {
    const resolved = getHomeboundMemberCategory(member, content.categories);
    const category = content.categories.some(item => item.id === resolved) ? resolved : member.category;
    setStoredDraft(normalizeDraft({ ...member, category, enabled: member.enabled === true, is_featured: member.is_featured === true }));
    setEditing(member.id); setIsAdding(false); setFieldErrors([]); setStatus(null);
  };

  const approval = async (action: 'create' | 'update' | 'delete', changes: Partial<BandMember>, id?: number) => {
    const result = await submitForApproval('band_member', action, changes, id);
    if (!result.success) throw new Error(result.error || 'The approval request could not be submitted.');
  };
  const runMutation = async (key: string, action: () => Promise<void>, success: string) => {
    if (mutationLock.current || blocked) return false;
    mutationLock.current = true; setBusy(key); setStatus(null);
    const steps = savingProgress.withSteps(2, 'Saving band changes');
    try {
      steps.next(requiresApproval ? 'Submitting for approval' : 'Saving to database');
      await action(); steps.next('Saved');
      setStatus({ error: false, text: requiresApproval ? 'Request submitted for approval. The public page will update after approval.' : success });
      return true;
    } catch (error) {
      setStatus({ error: true, text: error instanceof Error ? error.message : 'The change could not be saved. Please try again.' });
      return false;
    } finally { mutationLock.current = false; setBusy(null); savingProgress.done(); }
  };
  const saveMember = async (id?: number) => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push('name');
    if (!form.role.trim()) errors.push('role');
    if (!form.category.trim()) errors.push('category');
    if (form.image.trim() && !imageUrl(form.image)) errors.push('photo URL');
    const socialLinks = getHomeboundSocialLinks({ social_links: form.social_links });
    for (const key of ['instagram', 'youtube', 'spotify'] as const) if (form.social_links[key].trim() && !socialLinks[key]) errors.push(`${key} URL`);
    if (errors.length) { setFieldErrors(errors); setStatus({ error: true, text: `Please check: ${errors.join(', ')}.` }); return; }
    setFieldErrors([]);
    const payload: Partial<BandMember> = {
      ...form, name: form.name.trim(), role: form.role.trim(), category: form.category.trim(),
      image: imageUrl(form.image) || '', description: form.description.trim(), specialty: form.specialty.trim(),
      achievements: form.achievements.map(value => value.trim()).filter(Boolean),
      social_links: { instagram: socialLinks.instagram || '', youtube: socialLinks.youtube || '', spotify: socialLinks.spotify || '' },
    };
    const saved = await runMutation(id ? `save-${id}` : 'create', async () => {
      if (requiresApproval) await approval(id ? 'update' : 'create', payload, id);
      else if (id) await updateBandMember(id, payload);
      else await addBandMember(payload);
    }, id ? 'Artist updated. Changes are saved to the public lineup.' : 'Artist added to the lineup.');
    if (saved) { setIsAdding(false); setEditing(null); resetForm(); }
  };
  const removeMember = async (member: BandMember) => {
    if (blocked || !window.confirm(`Delete ${member.name}? This removes the artist record and cannot be undone. You can hide the artist instead.`)) return;
    const saved = await runMutation(`delete-${member.id}`, async () => {
      if (requiresApproval) await approval('delete', {}, member.id);
      else await deleteBandMember(member.id);
    }, `${member.name} was deleted.`);
    if (saved && editing === member.id) { setEditing(null); resetForm(); }
  };
  const toggleMember = (member: BandMember, field: 'enabled' | 'is_featured') => runMutation(`${field}-${member.id}`, async () => {
    if (requiresApproval) await approval('update', { [field]: !member[field] }, member.id);
    else if (field === 'enabled') await toggleBandMemberEnabled(member.id);
    else await toggleBandMemberFeatured(member.id);
  }, field === 'enabled' ? `${member.name} is now ${member.enabled ? 'hidden' : 'visible'}.` : `${member.name}'s featured status was updated.`);
  const members = [...bandMembers].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.order_position ?? Number.MAX_SAFE_INTEGER) - (b.order_position ?? Number.MAX_SAFE_INTEGER)).filter(member => `${member.name} ${member.role} ${member.specialty}`.toLowerCase().includes(query.trim().toLowerCase()) && (visibility === 'all' || (visibility === 'visible' ? member.enabled : !member.enabled)) && (categoryFilter === 'all' || getHomeboundMemberCategory(member, content.categories) === categoryFilter));

  const renderForm = (mode: 'add' | 'edit', memberId?: number) => {
    const prefix = `band-${mode}-${memberId ?? 'new'}`;
    const textField = (key: 'name' | 'role' | 'specialty', label: string, required = false) => <div>
      <label className={labelCls} htmlFor={`${prefix}-${key}`}>{label}{required && <span className="text-rose-400"> *</span>}</label>
      <input id={`${prefix}-${key}`} value={form[key]} onChange={event => updateForm({ [key]: event.target.value })} required={required} aria-invalid={fieldErrors.includes(key)} className={inputCls} />
    </div>;
    return <fieldset disabled={busy !== null} className="band-profile-form space-y-5 min-w-0" aria-label={mode === 'add' ? 'New artist details' : 'Edit artist details'}>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {textField('name', 'Full name', true)}
          {textField('role', 'Role / position', true)}
          <div className="grid sm:grid-cols-2 gap-4">
            {textField('specialty', 'Specialty')}
            <div>
              <label className={labelCls} htmlFor={`${prefix}-category`}>Category <span className="text-rose-400">*</span></label>
              <select id={`${prefix}-category`} value={form.category} onChange={event => updateForm({ category: event.target.value })} required aria-invalid={fieldErrors.includes('category')} className={`${inputCls} [&>option]:bg-[#0a0a12]`}>
                <option value="">Select a category</option>
                {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}{option.legacy ? ' (unlisted)' : !option.enabled ? ' (hidden)' : ''}</option>)}
                {form.category && !categoryOptions.some(option => option.value === form.category) && <option value={form.category}>{form.category} (unlisted)</option>}
              </select>
              <Link to="/admin/homebound?edit=categories" className="inline-block mt-2 text-xs text-amber-300 underline underline-offset-4">Add or manage categories</Link>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2 gap-3"><label className={labelCls} htmlFor={`${prefix}-description`}>Biography</label><InlineDescriptionAI contextName={form.name} contextType="band member" onDescriptionGenerated={description => updateForm({ description })} /></div>
            <textarea id={`${prefix}-description`} value={form.description} onChange={event => updateForm({ description: event.target.value })} rows={4} className={`${inputCls} resize-y`} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={labelCls} htmlFor={`${prefix}-order`}>Display order</label><input id={`${prefix}-order`} type="number" min="1" value={form.order_position} onChange={event => updateForm({ order_position: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })} className={inputCls} /><p className="mt-2 text-xs text-gray-400">Featured artists appear first, then by display order.</p></div>
            <div className="flex items-center gap-5 pt-5"><label className="inline-flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.enabled} onChange={event => updateForm({ enabled: event.target.checked })} />Visible</label><label className="inline-flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.is_featured} onChange={event => updateForm({ is_featured: event.target.checked })} />Featured</label></div>
          </div>
          <div className="space-y-3"><p className={labelCls}>Social links (optional)</p>{(['instagram', 'youtube', 'spotify'] as const).map(key => <div key={key}><label className={labelCls} htmlFor={`${prefix}-${key}`}>{key === 'instagram' ? 'Instagram URL or handle' : key === 'youtube' ? 'YouTube URL' : 'Spotify URL'}</label><input id={`${prefix}-${key}`} type="text" value={form.social_links[key]} onChange={event => updateForm({ social_links: { ...form.social_links, [key]: event.target.value } })} className={inputCls} /></div>)}</div>
          <div className="space-y-2"><p className={labelCls}>Achievements (optional)</p>{form.achievements.map((achievement, index) => <div key={index} className="flex gap-2"><input aria-label={`Achievement ${index + 1}`} value={achievement} onChange={event => updateForm({ achievements: form.achievements.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className={inputCls} /><button type="button" aria-label={`Remove achievement ${index + 1}`} className={actionCls} onClick={() => updateForm({ achievements: form.achievements.filter((_, itemIndex) => itemIndex !== index) })}><X size={14} /></button></div>)}<button type="button" className={actionCls} onClick={() => updateForm({ achievements: [...form.achievements, ''] })}><Plus size={14} />Add achievement</button></div>
        </div>
        <div className="space-y-4"><p className={labelCls}>Profile photo (optional)</p><ImageUpload onImageSelect={image => updateForm({ image })} currentImage={form.image} bucket="band-images" folder="band" cropAspect={4 / 5} autoSave preserveExistingMedia onProcessingChange={setImageBusy} /><p className="text-xs text-gray-400">Upload or replace a portrait. Saved photos stay intact until you save the artist. Without a photo, the lineup shows the artist’s initials.</p><div><label className={labelCls} htmlFor={`${prefix}-photo-url`}>Photo URL</label><input id={`${prefix}-photo-url`} value={form.image} onChange={event => updateForm({ image: event.target.value })} className={inputCls} /></div>{form.image && <button type="button" className={actionCls} onClick={() => updateForm({ image: '' })}>Remove photo from this artist</button>}</div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10"><button type="button" className={actionCls} disabled={busy !== null || imageBusy} onClick={() => { setIsAdding(false); setEditing(null); resetForm(); }}><X size={14} />Cancel</button><button type="button" className={`${actionCls} !bg-amber-500 !text-black`} disabled={blocked} onClick={() => saveMember(memberId)}><Save size={14} />{busy ? 'Saving…' : requiresApproval ? 'Submit artist for approval' : mode === 'add' ? 'Add band member' : 'Save changes'}</button></div>
      {imageBusy && <p role="status" className="text-sm text-amber-300">Finish uploading or cropping the photo before saving.</p>}
    </fieldset>;
  };

  return <div className="band-admin">
    {!isAuthenticated && <p role="alert" className="rounded-xl bg-amber-500/10 p-4 text-amber-300">An admin session is required to manage the band.</p>}
    {status && <p role={status.error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${status.error ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>{status.text}</p>}
    <header className="admin-content-toolbar"><div><h2>Band profiles</h2><p>The musicians on your Home Bound page, in the same order visitors see them.</p></div><div><details className="admin-import-menu"><summary><Wand2 size={14} />Import</summary><button type="button" disabled={blocked} onClick={() => setIsBulkImporting(true)}>AI bulk import</button></details><button type="button" className="admin-primary-button" disabled={blocked} onClick={beginAdd}><Plus size={15} />New band member</button></div></header>
    <div className="admin-roster-summary"><span><strong>{bandMembers.length}</strong>Members</span><span><strong>{bandMembers.filter(member => member.enabled).length}</strong>On the page</span><span><strong>{bandMembers.filter(member => member.is_featured).length}</strong>Featured first</span><Link to="/admin/homebound?edit=categories">Edit categories<ArrowUpRight size={13} /></Link></div>
    <div className="admin-roster-filters"><label className="admin-roster-search"><Search size={15} /><span className="sr-only">Search band members</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a name, role or instrument…" /></label><label><span className="sr-only">Filter band visibility</span><select aria-label="Filter band visibility" value={visibility} onChange={event => setVisibility(event.target.value)}><option value="all">All profiles</option><option value="visible">On the page</option><option value="hidden">Hidden</option></select></label><label><span className="sr-only">Filter band category</span><select aria-label="Filter band category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{content.categories.map(category => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label></div>
    {isBulkImporting && <AIHomeBoundImport onCancel={() => setIsBulkImporting(false)} onCreateMember={async member => { if (!approvalReady || !isAuthenticated) throw new Error('Publishing access is not ready. Please try again.'); if (requiresApproval) await approval('create', member); else await addBandMember(member); }} onSaved={() => { setIsBulkImporting(false); setStatus({ error: false, text: requiresApproval ? 'Artist import requests submitted for approval.' : 'Artists imported. The lineup will refresh with the saved records.' }); }} />}
    {isAdding && <section className="band-profile-editor"><h3 className="mb-5 text-lg font-bold text-white">Add new artist</h3>{renderForm('add')}</section>}
    <div className="band-roster">{members.map(member => {
      const links = getHomeboundSocialLinks(member);
      const categoryId = getHomeboundMemberCategory(member, content.categories);
      const category = content.categories.find(item => item.id === categoryId);
      return <article key={member.id} className={`band-profile-card${editing === member.id ? ' is-editing' : ''}`}>
        {editing === member.id ? <div className="p-6"><h3 className="mb-5 text-lg font-bold text-white">Edit {member.name}</h3>{renderForm('edit', member.id)}</div> : <>
          <div className="band-profile-portrait">{imageUrl(member.image || '') ? <img src={imageUrl(member.image)!} alt={member.name} className="h-full w-full object-cover" /> : <Music size={45} className="text-emerald-300/50" />}<span className="absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">#{member.order_position ?? '—'}</span>{!member.enabled && <span className="absolute left-3 top-3 rounded-lg bg-rose-950/90 px-2 py-1 text-xs text-rose-200">Hidden</span>}</div>
          <div className="band-profile-info"><div><h3 className="text-lg font-bold text-white">{member.name}</h3><p className="text-sm text-amber-300">{member.role}</p></div><p className="text-xs text-gray-400">{category?.label || member.category}{category && !category.enabled ? ' · category hidden' : !category ? ' · unlisted category' : ''}{member.specialty ? ` · ${member.specialty}` : ''}</p>{member.description && <p className="line-clamp-2 text-sm text-gray-400">{member.description}</p>}<div className="flex flex-wrap gap-3">{links.instagram && <a href={links.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on Instagram`} className="text-pink-300"><Instagram size={18} /></a>}{links.youtube && <a href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on YouTube`} className="text-red-300"><Youtube size={18} /></a>}{links.spotify && <a href={links.spotify} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on Spotify`} className="text-emerald-300">Spotify</a>}</div>
            <div className="band-profile-actions"><button type="button" className={actionCls} disabled={blocked} aria-label={`${member.enabled ? 'Hide' : 'Show'} ${member.name}`} onClick={() => toggleMember(member, 'enabled')}>{member.enabled ? <Eye size={14} /> : <EyeOff size={14} />}{member.enabled ? 'Hide' : 'Show'}</button><button type="button" className={actionCls} disabled={blocked} aria-label={`${member.is_featured ? 'Unfeature' : 'Feature'} ${member.name}`} onClick={() => toggleMember(member, 'is_featured')}><Star size={14} fill={member.is_featured ? 'currentColor' : 'none'} /></button><button type="button" className={actionCls} disabled={blocked} aria-label={`Edit ${member.name}`} onClick={() => startEditing(member)}><Edit size={14} />Edit</button><button type="button" className={`${actionCls} !text-rose-300`} disabled={blocked} aria-label={`Delete ${member.name}`} onClick={() => removeMember(member)}><Trash2 size={14} /></button></div>
          </div>
        </>}
      </article>;
    })}</div>
    {members.length === 0 && bandMembers.length > 0 && <div className="admin-roster-empty"><Search size={25} /><h3>No band members match</h3><p>Try another name or change your filters.</p><button type="button" onClick={() => { setQuery(''); setVisibility('all'); setCategoryFilter('all'); }}>Clear filters</button></div>}
    {bandMembers.length === 0 && !isAdding && <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><Music size={35} className="mx-auto text-gray-500" /><h3 className="mt-4 text-lg text-white">No artists yet</h3><p className="my-3 text-sm text-gray-400">Add a singer, guitarist, beatboxer, or anyone in the band.</p><button type="button" className={actionCls} disabled={blocked} onClick={beginAdd}>Add first artist</button></div>}
  </div>;
};
