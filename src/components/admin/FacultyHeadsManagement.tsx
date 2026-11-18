import { useEffect, useState } from 'react';
import { PlusIcon, Pencil1Icon, TrashIcon, EyeOpenIcon, EyeClosedIcon } from '@radix-ui/react-icons';
import { AdminModal } from './layout/AdminModal';
import { PeopleProfileForm } from './PeopleProfileForm';
import { useData } from '../../context/DataContext';
import type { FacultyHead } from '../../types/data';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { instagramProfile, facebookProfile, personBatch, phoneProfile } from '../../utils/familyPeople';

const EMPTY = { name: '', title: '', image: '', phone: '', instagram: '', facebook: '', batch: '', order_position: 1, enabled: true };
export function FacultyHeadsManagement() {
  const { facultyHeads, addFacultyHead, updateFacultyHead, deleteFacultyHead, toggleFacultyHeadEnabled, sanitizeUrl } = useData();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const progress = useSavingProgress();
  const [requiresApproval, setRequiresApproval] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false), [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [error, setError] = useState('');
  const [form, setForm] = useLocalStorage('admin_faculty_head_form_draft', EMPTY);
  useEffect(() => { checkRequiresApproval().then(setRequiresApproval).catch(() => setError('Could not check permissions. Please reload.')); }, []);
  const reset = () => { setError(''); setForm({ ...EMPTY, order_position: Math.max(0, ...facultyHeads.map(person => person.order_position)) + 1 }); };
  const close = () => { if (busy || photoBusy) return; setAdding(false); setEditing(null); reset(); };
  const edit = (person: FacultyHead) => { setError(''); setEditing(person.id); setForm({ name: person.name, title: person.title || '', image: person.image || '', phone: person.phone || '', batch: personBatch(person), instagram: person.social_links?.instagram || '', facebook: person.social_links?.facebook || '', order_position: person.order_position, enabled: person.enabled }); };
  async function save() {
    if (busy || photoBusy || requiresApproval === null) return;
    if (!form.name.trim() || !form.image) { setError('Name and profile photo are required.'); return; }
    if (form.phone?.trim() && !phoneProfile(form.phone)) { setError('Enter a valid phone number with country code.'); return; }
    if (form.instagram?.trim() && !instagramProfile(form.instagram)) { setError('Enter a valid Instagram handle or profile URL.'); return; }
    if (form.facebook?.trim() && !facebookProfile(form.facebook)) { setError('Enter a valid Facebook username or profile URL.'); return; }
    setBusy(true); setError('');
    try {
      progress.withSteps(1, 'Saving faculty profile…');
      const existing = facultyHeads.find(person => person.id === editing);
      const payload = { name: form.name.trim(), title: form.title?.trim() || '', image: form.image, phone: form.phone?.trim() || null, order_position: form.order_position, enabled: form.enabled,
        social_links: { ...existing?.social_links, instagram: instagramProfile(form.instagram)?.url || '', facebook: facebookProfile(form.facebook) || '', batch: form.batch?.trim() || '' } };
      if (requiresApproval) {
        const result = await submitForApproval('faculty_head', editing === null ? 'create' : 'update', payload, editing ?? undefined);
        if (!result.success) throw new Error(result.error || 'Could not submit for approval.');
      } else if (editing === null) await addFacultyHead({ ...payload, description: '', achievements: [] });
      else await updateFacultyHead(editing, payload);
      setAdding(false); setEditing(null); reset(); localStorage.removeItem('admin_faculty_head_form_draft');
    } catch { setError('Could not save the profile. Your changes are still here; please try again.'); }
    finally { setBusy(false); progress.done(); }
  }
  async function action(person: FacultyHead, remove = false) {
    if (busy || requiresApproval === null || (remove && !confirm(`Delete ${person.name}?`))) return;
    setBusy(true); setError('');
    try {
      if (requiresApproval) {
        const result = await submitForApproval('faculty_head', remove ? 'delete' : 'update', remove ? {} : { enabled: !person.enabled }, person.id);
        if (!result.success) throw new Error(result.error);
      } else if (remove) await deleteFacultyHead(person.id);
      else await toggleFacultyHeadEnabled(person.id);
    } catch { setError('Could not update the profile. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="people-management">
    <header className="people-management-heading"><div><h2>Faculty</h2><p>Photos, positions and contact links for faculty leadership.</p></div><button type="button" className="people-button people-button-primary" onClick={() => { reset(); setAdding(true); }}><PlusIcon />Add Faculty Head</button></header>
    {requiresApproval && <p className="people-notice">Changes will be submitted for owner approval.</p>}
    {error && !adding && editing === null && <p role="alert" className="people-error">{error}</p>}
    <div className="people-roster">{[...facultyHeads].sort((a,b) => a.order_position - b.order_position).map(person => <article className={`people-roster-card ${person.enabled ? '' : 'is-hidden'}`} key={person.id}>
      <img src={sanitizeUrl?.(person.image) || person.image} alt={person.name} /><div className="people-roster-details"><span className="people-section-label">{person.enabled ? 'Visible' : 'Hidden'}</span><h3>{person.name}</h3><p>{person.title || 'Faculty'}</p>{personBatch(person) && <small>Batch {personBatch(person)}</small>}</div>
      <div className="people-roster-actions"><button type="button" disabled={busy} aria-label={person.enabled ? 'Hide from public' : 'Show to public'} onClick={() => action(person)}>{person.enabled ? <EyeOpenIcon /> : <EyeClosedIcon />}</button><button type="button" disabled={busy} aria-label="Edit faculty head" onClick={() => edit(person)}><Pencil1Icon /></button><button type="button" disabled={busy} aria-label="Delete faculty head" onClick={() => action(person,true)}><TrashIcon /></button></div>
    </article>)}</div>
    {!facultyHeads.length && <div className="people-empty"><h3>No faculty profiles yet</h3><p>Add a photo, name and position to get started.</p></div>}
    <AdminModal appearance="people" isOpen={adding || editing !== null} onClose={close} title={editing !== null ? 'Edit faculty profile' : 'Add faculty profile'} subtitle="Keep the details clear and the photo in focus."
      footer={<><button type="button" className="people-button people-button-secondary" disabled={busy || photoBusy} onClick={close}>Cancel</button><button type="button" className="people-button people-button-primary" disabled={busy || photoBusy || requiresApproval === null} onClick={save}>{busy ? 'Saving…' : 'Save Changes'}</button></>}>
      <fieldset disabled={busy} className="people-form-fieldset">{error && <p role="alert" className="people-error">{error}</p>}<PeopleProfileForm kind="faculty" form={form} onChange={patch => setForm({ ...form, ...patch })} onProcessingChange={setPhotoBusy} /></fieldset>
    </AdminModal>
  </div>;
}
