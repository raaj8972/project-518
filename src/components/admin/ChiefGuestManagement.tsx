import { useId, useRef, useState, type FormEvent } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, Cross2Icon, EyeNoneIcon, EyeOpenIcon, MagnifyingGlassIcon, Pencil2Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';

type GuestDraft = { name: string; title: string; image: string; specialty: string; description: string; achievementsRaw: string; social_links: { instagram: string; youtube: string; spotify: string } };
const emptyDraft = (): GuestDraft => ({ name: '', title: '', image: '', specialty: '', description: '', achievementsRaw: '', social_links: { instagram: '', youtube: '', spotify: '' } });

export function ChiefGuestManagement() {
  const { chiefGuests, addChiefGuest, updateChiefGuest, deleteChiefGuest, toggleChiefGuestEnabled } = useData();
  const [form, setForm] = useState<GuestDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const editor = useRef<HTMLElement>(null);
  const id = useId();
  const ordered = [...chiefGuests].sort((a, b) => (a.order_position ?? 0) - (b.order_position ?? 0));
  const filtered = ordered.filter(guest => `${guest.name} ${guest.title} ${guest.specialty || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const blocked = busy || uploading;
  const reset = () => { setForm(emptyDraft()); setEditingId(null); setOpen(false); };
  const startEdit = (guestId?: number) => {
    const guest = chiefGuests.find(item => item.id === guestId);
    setEditingId(guest?.id ?? null);
    setForm(guest ? { name: guest.name || '', title: guest.title || '', image: guest.image || '', specialty: guest.specialty || '', description: guest.description || '', achievementsRaw: (guest.achievements || []).join('\n'), social_links: { instagram: guest.social_links?.instagram || '', youtube: guest.social_links?.youtube || '', spotify: guest.social_links?.spotify || '' } } : emptyDraft());
    setOpen(true); setMessage(null);
    requestAnimationFrame(() => { editor.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' }); editor.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }); });
  };
  const run = async (action: () => Promise<void>, text: string) => {
    if (lock.current || uploading) return false;
    lock.current = true; setBusy(true); setMessage(null);
    try { await action(); setMessage({ error: false, text }); return true; }
    catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : 'Could not save the change. Please try again.' }); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    if (![form.name, form.title, form.image, form.description].every(value => value.trim())) { setMessage({ error: true, text: 'Add a name, title, portrait and biography before saving.' }); return; }
    const current = chiefGuests.find(guest => guest.id === editingId);
    const payload = { name: form.name.trim(), title: form.title.trim(), image: form.image, specialty: form.specialty.trim() || null, description: form.description.trim(), achievements: form.achievementsRaw.split('\n').map(item => item.trim()).filter(Boolean), social_links: form.social_links, enabled: current?.enabled ?? true, is_featured: current?.is_featured ?? true };
    const saved = await run(async () => { if (editingId !== null) await updateChiefGuest(editingId, payload); else await addChiefGuest(payload); }, editingId !== null ? 'Chief guest profile updated.' : 'Chief guest added to your homepage.');
    if (saved) reset();
  };
  const move = (guestId: number, direction: number) => {
    const index = ordered.findIndex(guest => guest.id === guestId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered]; [next[index], next[target]] = [next[target], next[index]];
    void run(async () => { await Promise.all(next.map((guest, position) => updateChiefGuest(guest.id, { order_position: position + 1 }))); }, 'Homepage display order saved.');
  };
  const remove = (guestId: number, name: string) => {
    if (!window.confirm(`Delete ${name} from chief guests?`)) return;
    void run(async () => { await deleteChiefGuest(guestId); if (editingId === guestId) reset(); }, 'Chief guest removed.');
  };
  const field = (key: 'name' | 'title' | 'specialty', label: string, required = false) => <div className="admin-profile-field"><label htmlFor={`${id}-${key}`}>{label}{required && ' *'}</label><input id={`${id}-${key}`} required={required} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></div>;

  return <section className="chief-guest-admin" aria-label="Chief guest profiles">
    <header className="admin-content-toolbar"><div><h2>Chief guest profiles</h2><p>Introduce your distinguished guests on the homepage. Profile order here is the order on your website.</p></div><button type="button" className="admin-primary-button" disabled={blocked} onClick={() => startEdit()}><PlusIcon />Add chief guest</button></header>
    {message && <div className={`admin-profile-feedback${message.error ? ' is-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}<button type="button" aria-label="Dismiss chief guest message" onClick={() => setMessage(null)}><Cross2Icon /></button></div>}
    {open && <section ref={editor} className="admin-profile-editor" aria-label="Chief guest editor"><header><div><span>HOMEPAGE / CHIEF GUEST</span><h3>{editingId !== null ? 'Edit guest profile' : 'Introduce a chief guest'}</h3></div><button type="button" className="artist-icon-button" aria-label="Close chief guest editor" disabled={blocked} onClick={reset}><Cross2Icon /></button></header><form onSubmit={event => void save(event)}><fieldset disabled={busy}><div className="admin-profile-columns"><div className="admin-profile-fields"><div className="admin-profile-field-pair">{field('name', 'Full name', true)}{field('title', 'Title / designation', true)}</div>{field('specialty', 'Specialty')}<div className="admin-profile-field"><label htmlFor={`${id}-bio`}>Biography *</label><textarea id={`${id}-bio`} rows={5} required value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /><small>The introduction and full biography shown on the public profile.</small></div><details className="admin-profile-details"><summary>Highlights & social links<span>Optional</span></summary><div className="admin-profile-field"><label htmlFor={`${id}-highlights`}>Achievements</label><textarea id={`${id}-highlights`} rows={3} value={form.achievementsRaw} onChange={event => setForm(previous => ({ ...previous, achievementsRaw: event.target.value }))} /><small>One achievement per line.</small></div>{(['instagram', 'youtube', 'spotify'] as const).map(key => <div className="admin-profile-field" key={key}><label htmlFor={`${id}-${key}`}>{key === 'instagram' ? 'Instagram' : key === 'youtube' ? 'YouTube' : 'Spotify'} URL</label><input id={`${id}-${key}`} type="url" value={form.social_links[key]} onChange={event => setForm(previous => ({ ...previous, social_links: { ...previous.social_links, [key]: event.target.value } }))} /></div>)}</details></div><aside className="admin-profile-photo"><label>Guest portrait *</label><ImageUpload currentImage={form.image} onImageSelect={image => setForm(previous => ({ ...previous, image }))} bucket="guest-artist-images" folder="chief" cropAspect={4 / 5} autoSave preserveExistingMedia onProcessingChange={setUploading} /><p>Use a clear portrait. Your published photo stays available until this profile is saved.</p></aside></div></fieldset><footer><span>{uploading ? 'Uploading portrait…' : 'Changes appear on the homepage after saving.'}</span><div><button type="button" className="admin-secondary-button" disabled={blocked} onClick={reset}>Cancel</button><button type="submit" className="admin-primary-button" disabled={blocked}><CheckIcon />{busy ? 'Saving…' : 'Save profile'}</button></div></footer></form></section>}
    <div className="admin-roster-summary"><span><strong>{chiefGuests.length}</strong>Chief guests</span><span><strong>{chiefGuests.filter(guest => guest.enabled).length}</strong>On the homepage</span><span><strong>{chiefGuests.filter(guest => !guest.enabled).length}</strong>Hidden</span></div>
    {chiefGuests.length > 0 && <div className="admin-roster-filters"><label className="admin-roster-search"><MagnifyingGlassIcon /><span className="sr-only">Search chief guests</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a guest or designation…" /></label></div>}
    <div className="chief-guest-roster">{filtered.map(guest => <article className="chief-guest-card" key={guest.id}><div className="chief-guest-photo">{guest.image ? <img src={guest.image} alt={guest.name} loading="lazy" /> : <span>{guest.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>}<small>{String(guest.order_position || 1).padStart(2, '0')}</small></div><div className="chief-guest-info"><span className={`admin-profile-visibility${guest.enabled ? ' is-visible' : ''}`}>{guest.enabled ? 'On homepage' : 'Hidden'}</span><h3>{guest.name}</h3><p>{guest.title}</p>{guest.specialty && <small>{guest.specialty}</small>}<p className="chief-guest-bio">{guest.description}</p><footer><button type="button" disabled={blocked} onClick={() => startEdit(guest.id)}><Pencil2Icon />Edit profile</button><button type="button" disabled={blocked} aria-label={`${guest.enabled ? 'Hide' : 'Show'} ${guest.name}`} onClick={() => void run(() => toggleChiefGuestEnabled(guest.id), 'Chief guest visibility updated.')}>{guest.enabled ? <EyeOpenIcon /> : <EyeNoneIcon />}</button><button type="button" disabled={blocked || ordered[0]?.id === guest.id} aria-label={`Move ${guest.name} up`} onClick={() => move(guest.id, -1)}><ArrowUpIcon /></button><button type="button" disabled={blocked || ordered[ordered.length - 1]?.id === guest.id} aria-label={`Move ${guest.name} down`} onClick={() => move(guest.id, 1)}><ArrowDownIcon /></button><button type="button" disabled={blocked} aria-label={`Delete ${guest.name}`} onClick={() => remove(guest.id, guest.name)}><TrashIcon /></button></footer></div></article>)}</div>
    {!filtered.length && <div className="admin-roster-empty"><MagnifyingGlassIcon /><h3>{chiefGuests.length ? 'No guests match your search' : 'Make your guests feel welcome.'}</h3><p>{chiefGuests.length ? 'Try another name or designation.' : 'Add a portrait and introduction to bring your first chief guest onto the homepage.'}</p><button type="button" disabled={blocked} onClick={() => chiefGuests.length ? setQuery('') : startEdit()}>{chiefGuests.length ? 'Clear search' : 'Add your first chief guest'}</button></div>}
  </section>;
}
