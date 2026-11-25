import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Image, Music2, Plus, RotateCcw, Save, Trash2, Users, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { ImageUpload } from '../ImageUpload';
import { instagramProfile } from '../../utils/familyPeople';
import { DEFAULT_HOMEBOUND_CONTENT, readHomeboundContent, type HomeboundCategoryConfig, type HomeboundIcon, type HomeboundPageContent } from '../../utils/homeboundContent';
import type { Json } from '../../types/supabase';
import '../../styles/HomeboundAdmin.css';

type Tab = 'content' | 'photos' | 'categories' | 'journey' | 'links';
type Draft = { content: HomeboundPageContent; instagram_url: string; instagram_enabled: boolean };
type TextKey = { [K in keyof HomeboundPageContent]: HomeboundPageContent[K] extends string ? K : never }[keyof HomeboundPageContent];
const TABS: { id: Tab; label: string }[] = [{ id: 'content', label: 'Page text' }, { id: 'photos', label: 'Photos & title' }, { id: 'categories', label: 'Categories' }, { id: 'journey', label: 'Our journey' }, { id: 'links', label: 'Links & buttons' }];
const ICONS: { value: HomeboundIcon; label: string }[] = [{ value: 'vocals', label: 'Microphone' }, { value: 'guitars', label: 'Guitar' }, { value: 'keys', label: 'Keys' }, { value: 'drums', label: 'Drums' }, { value: 'crew', label: 'Crew / sound' }, { value: 'beatbox', label: 'Beatboxing' }, { value: 'music', label: 'Music' }];
const SECTIONS: { key: keyof HomeboundPageContent['sections']; label: string }[] = [{ key: 'hero', label: 'Hero stage' }, { key: 'about', label: 'About section' }, { key: 'band', label: 'Band members' }, { key: 'journey', label: 'Journey section' }, { key: 'encore', label: 'Connect & audition buttons' }, { key: 'footer', label: 'Page footer' }];
const normalize = (value: string) => value.trim().toLocaleLowerCase();
const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniqueId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`}`;
const move = <T,>(items: T[], index: number, direction: number) => {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};
function validUrl(value: string, local = true) {
  if (!value.trim()) return true;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return false;
  if (local && /^\/(?!\/)/.test(value) && !value.includes('\\')) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
function validate(draft: Draft): string | null {
  const used = new Map<string, string>();
  const ids = new Set<string>();
  for (const category of draft.content.categories) {
    if (!category.label.trim() || !category.id.trim()) return 'Every category needs a name.';
    if (ids.has(category.id)) return 'Category IDs must be unique. Remove the duplicate category and add it again.';
    ids.add(category.id);
    for (const token of new Set([category.id, category.label, ...category.aliases].map(normalize).filter(Boolean))) {
      if (token === 'all' || token === normalize(draft.content.all_label)) return 'Choose a category name different from the All artists filter.';
      if (used.has(token) && used.get(token) !== category.id) return `The category name or alias “${token}” is already used. Use a different name or alias.`;
      used.set(token, category.id);
    }
  }
  const imageFields = ['hero_image', 'hero_wordmark_image', 'about_image'] as const;
  for (const key of imageFields) if (!validUrl(draft.content[key])) return 'Image links must use HTTPS, HTTP, or a local /images/ path.';
  for (const item of draft.content.journey_items) if (!validUrl(item.image)) return 'Journey image links must use HTTPS, HTTP, or a local /images/ path.';
  if (!validUrl(draft.content.gallery_url)) return 'Enter a valid gallery page link, such as /gallery.';
  if (draft.instagram_url.trim() && !instagramProfile(draft.instagram_url)) return 'Enter a valid Instagram profile URL or @handle.';
  return null;
}
function TextField({ label, value, onChange, help, multiline = false }: { label: string; value: string; onChange: (value: string) => void; help?: string; multiline?: boolean }) {
  const id = useId();
  return <div className="hb-admin-field"><label htmlFor={id}><span>{label}</span></label>{multiline ? <textarea id={id} aria-describedby={help ? `${id}-help` : undefined} value={value} onChange={event => onChange(event.target.value)} rows={4} /> : <input id={id} aria-describedby={help ? `${id}-help` : undefined} type="text" value={value} onChange={event => onChange(event.target.value)} />}{help && <small id={`${id}-help`}>{help}</small>}</div>;
}
function MediaField({ id, label, value, imageAlt, defaultImage, aspect, onChange, onAltChange, onBusy }: { id: string; label: string; value: string; imageAlt?: string; defaultImage?: string; aspect: number; onChange: (value: string) => void; onAltChange?: (value: string) => void; onBusy: (id: string, busy: boolean) => void }) {
  const reportBusy = useCallback((busy: boolean) => onBusy(id, busy), [id, onBusy]);
  return <section className="hb-admin-media" aria-label={label}>
    <div className="hb-admin-row"><h3><Image size={16} aria-hidden="true" />{label}</h3>{defaultImage && <button type="button" className="hb-admin-text-button" onClick={() => onChange(defaultImage)}>Use reference image</button>}</div>
    <ImageUpload bucket="band-images" folder="homebound" currentImage={value} onImageSelect={onChange} cropAspect={aspect} autoSave preserveExistingMedia onProcessingChange={reportBusy} />
    <TextField label={`${label} URL`} value={value} onChange={onChange} help="Upload a photo above, or paste an image link. Save the page to publish the change." />
    {onAltChange && <TextField label={`${label} description`} value={imageAlt || ''} onChange={onAltChange} help="Describe the image for people using a screen reader." />}
    {value && <button type="button" className="hb-admin-text-button hb-admin-danger" onClick={() => onChange('')}>Remove image</button>}
  </section>;
}

export const HomeBoundSettings = () => {
  const { homeboundSettings, updateHomeboundSettings } = useData();
  const savingProgress = useSavingProgress();
  const [params, setParams] = useSearchParams();
  const queryTab = params.get('edit');
  const makeDraft = (): Draft => ({ content: readHomeboundContent(homeboundSettings?.page_content), instagram_url: homeboundSettings?.instagram_url || '', instagram_enabled: homeboundSettings?.instagram_enabled !== false });
  const remote = makeDraft();
  const fingerprint = JSON.stringify(remote);
  const latestRemote = useRef(remote); latestRemote.current = remote;
  const [draft, setDraft] = useState<Draft>(makeDraft);
  const [tab, setTab] = useState<Tab>(() => TABS.some(item => item.id === queryTab) ? queryTab as Tab : 'content');
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newIcon, setNewIcon] = useState<HomeboundIcon>('music');
  const uploading = Object.values(uploads).some(Boolean);
  const busy = saving || uploading;
  useEffect(() => {
    if (dirtyRef.current || savingRef.current) { setRemoteChanged(true); return; }
    setDraft(latestRemote.current);
  }, [fingerprint]);
  useEffect(() => { if (TABS.some(item => item.id === queryTab)) setTab(queryTab as Tab); }, [queryTab]);
  const reportUpload = useCallback((id: string, active: boolean) => setUploads(previous => previous[id] === active ? previous : { ...previous, [id]: active }), []);
  const edit = (update: (previous: Draft) => Draft) => {
    dirtyRef.current = true; setDirty(true); setError(null); setStatus(''); setDraft(update);
  };
  const editContent = (update: (previous: HomeboundPageContent) => HomeboundPageContent) => edit(previous => ({ ...previous, content: update(previous.content) }));
  const editText = (key: TextKey, value: string) => editContent(previous => ({ ...previous, [key]: value, ...(key === 'hero_title' ? { hero_wordmark_enabled: false } : {}) }));
  const chooseTab = (value: Tab) => {
    setTab(value);
    const next = new URLSearchParams(params);
    next.set('edit', value);
    setParams(next, { replace: true });
  };
  const editCategory = (id: string, patch: Partial<HomeboundCategoryConfig>) => editContent(previous => ({ ...previous, categories: previous.categories.map(item => {
    if (item.id !== id) return item;
    const savedLabel = latestRemote.current.content.categories.find(saved => saved.id === id)?.label;
    const aliases = patch.label !== undefined && savedLabel && normalize(patch.label) !== normalize(savedLabel)
      ? [...new Set([...item.aliases, savedLabel])] : item.aliases;
    return { ...item, aliases, ...patch };
  }) }));
  const reset = () => {
    setDraft(latestRemote.current); dirtyRef.current = false; setDirty(false); setRemoteChanged(false); setError(null); setStatus('Changes cancelled. Saved settings restored.'); setNewCategory('');
  };
  const addCategory = () => {
    const label = newCategory.trim();
    if (!label) { setError('Enter a category name, such as Beatboxing.'); return; }
    const base = slug(label) || uniqueId('category');
    let id = base; let suffix = 2;
    while (draft.content.categories.some(item => item.id === id)) id = `${base}-${suffix++}`;
    const next = { ...draft, content: { ...draft.content, categories: [...draft.content.categories, { id, label, icon: newIcon, enabled: true, aliases: [] }] } };
    const problem = validate(next);
    if (problem) { setError(problem); return; }
    edit(() => next); setNewCategory('');
  };
  const save = async () => {
    if (savingRef.current || uploading) return;
    const problem = validate(draft);
    if (problem) { setError(problem); setStatus(''); return; }
    savingRef.current = true; setSaving(true); setError(null); setStatus('');
    const snapshot = structuredClone(draft);
    const steps = savingProgress.withSteps(3, 'Saving Homebound…');
    try {
      steps.next('Checking page settings');
      const content = { ...snapshot.content, categories: snapshot.content.categories.map(item => ({ ...item, label: item.label.trim(), aliases: [...new Set(item.aliases.map(alias => alias.trim()).filter(Boolean))] })) };
      steps.next('Publishing page settings');
      await updateHomeboundSettings({ page_content: content as unknown as Json, instagram_enabled: snapshot.instagram_enabled, instagram_url: snapshot.instagram_url.trim() ? instagramProfile(snapshot.instagram_url)!.url : null });
      setDraft({ ...snapshot, content }); dirtyRef.current = false; setDirty(false); setRemoteChanged(false); setStatus('Homebound settings saved. Your page now uses these changes.');
      steps.next('Saved');
    } catch (cause) {
      setError(`Could not save Homebound settings. ${cause instanceof Error ? cause.message : 'Please try again.'}`);
    } finally {
      steps.done(); savingRef.current = false; setSaving(false);
    }
  };
  const text = (key: TextKey, label: string, help?: string, multiline = false) => <TextField key={key} label={label} value={draft.content[key]} onChange={value => editText(key, value)} help={help} multiline={multiline} />;

  return <div className="hb-admin">
    <header className="hb-admin-header"><div><p className="hb-admin-eyebrow"><Music2 size={15} aria-hidden="true" />Homebound page editor</p><h2>Make the page your own.</h2><p>Change photos, writing, categories and the journey. Publish everything with one save.</p></div><div className="hb-admin-header-links"><Link to="/admin/band"><Users size={15} aria-hidden="true" />Manage band members</Link><Link to="/home-bound" target="_blank" rel="noopener noreferrer">View page<ExternalLink size={14} aria-hidden="true" /></Link></div></header>
    <div className="hb-admin-toolbar"><span className={dirty ? 'is-dirty' : ''}>{saving ? 'Saving page…' : uploading ? 'Photo upload in progress…' : dirty ? 'Unsaved changes' : 'All changes saved'}</span><div><button type="button" disabled={!dirty || busy} onClick={reset}><X size={14} aria-hidden="true" />Cancel changes</button><button className="hb-admin-primary" type="button" disabled={!dirty || busy} onClick={() => void save()}><Save size={15} aria-hidden="true" />{saving ? 'Saving…' : 'Save Homebound settings'}</button></div></div>
    {error && <p className="hb-admin-message is-error" role="alert">{error}</p>}
    {status && <p className="hb-admin-message is-success" role="status">{status}</p>}
    {remoteChanged && dirty && <p className="hb-admin-message">Saved content changed while you were editing. Your draft is kept here. Cancel changes to load the latest version, or save to publish your draft.</p>}
    <nav className="hb-admin-tabs" role="tablist" aria-label="Homebound settings sections">{TABS.map((item, index) => <button key={item.id} role="tab" id={`hb-admin-tab-${item.id}`} type="button" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`hb-admin-panel-${item.id}`} disabled={busy} onClick={() => chooseTab(item.id)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
      chooseTab(TABS[next].id);
      document.getElementById(`hb-admin-tab-${TABS[next].id}`)?.focus();
    }}>{item.label}</button>)}</nav>
    <fieldset className="hb-admin-editor" disabled={saving}><legend className="sr-only">Homebound settings</legend><div role="tabpanel" id={`hb-admin-panel-${tab}`} aria-labelledby={`hb-admin-tab-${tab}`}>
      {tab === 'content' && <div className="hb-admin-stack">
        <section className="hb-admin-panel"><div className="hb-admin-panel-heading"><h3>Show or hide sections</h3><p>Hidden sections stay saved so you can bring them back later.</p></div><div className="hb-admin-section-toggles">{SECTIONS.map(section => <label key={section.key}><input type="checkbox" checked={draft.content.sections[section.key]} onChange={event => editContent(previous => ({ ...previous, sections: { ...previous.sections, [section.key]: event.target.checked } }))} /><span>{section.label}</span></label>)}</div></section>
        <section className="hb-admin-panel"><h3>Hero stage</h3><div className="hb-admin-fields">{text('hero_title', 'Band title', 'Editing this text turns off image lettering so the new title appears on your page.')}{text('hero_subtitle', 'Hero subtitle')}</div></section>
        <section className="hb-admin-panel"><h3>About the band</h3><div className="hb-admin-fields">{text('about_heading', 'About heading')}{text('about_text', 'About description', 'Use {member_count} wherever the current number of published members should appear.', true)}</div></section>
        <section className="hb-admin-panel"><h3>Band lineup</h3><div className="hb-admin-fields">{text('band_heading', 'Band section heading')}{text('all_label', 'All artists filter label')}</div><p className="hb-admin-note">Artist photos, names, biographies, display order and visibility are managed in <Link to="/admin/band">Band Members</Link>.</p></section>
        <section className="hb-admin-panel"><h3>Footer</h3><div className="hb-admin-fields">{text('footer_text', 'Footer text')}{text('footer_subtitle', 'Footer subtitle')}</div></section>
        <section className="hb-admin-reset"><div><strong>Return to the reference design</strong><p>Reset page content, photos and category settings in this draft. Artists and Instagram settings stay as they are.</p></div><button type="button" disabled={busy} onClick={() => editContent(() => readHomeboundContent(DEFAULT_HOMEBOUND_CONTENT))}><RotateCcw size={14} aria-hidden="true" />Reset page draft</button></section>
      </div>}
      {tab === 'photos' && <div className="hb-admin-stack">
        <p className="hb-admin-note">Uploads are published when you save the page. Replacing a photo keeps the currently published file available.</p>
        <MediaField id="hero" label="Hero stage photo" value={draft.content.hero_image} imageAlt={draft.content.hero_image_alt} defaultImage={DEFAULT_HOMEBOUND_CONTENT.hero_image} aspect={2} onChange={value => editText('hero_image', value)} onAltChange={value => editText('hero_image_alt', value)} onBusy={reportUpload} />
        <MediaField id="about" label="About photo" value={draft.content.about_image} imageAlt={draft.content.about_image_alt} defaultImage={DEFAULT_HOMEBOUND_CONTENT.about_image} aspect={1.4} onChange={value => editText('about_image', value)} onAltChange={value => editText('about_image_alt', value)} onBusy={reportUpload} />
        <section className="hb-admin-panel"><h3>Title lettering</h3><label className="hb-admin-check"><input type="checkbox" checked={draft.content.hero_wordmark_enabled} onChange={event => editContent(previous => ({ ...previous, hero_wordmark_enabled: event.target.checked }))} /><span>Use title artwork instead of typed title</span></label><p className="hb-admin-note">The reference artwork says Homebound. Upload artwork with your new name, or turn this off to show the Band title text.</p></section>
        <MediaField id="wordmark" label="Title artwork" value={draft.content.hero_wordmark_image} defaultImage={DEFAULT_HOMEBOUND_CONTENT.hero_wordmark_image} aspect={3} onChange={value => editText('hero_wordmark_image', value)} onBusy={reportUpload} />
      </div>}
      {tab === 'categories' && <div className="hb-admin-stack">
        <section className="hb-admin-panel"><h3>Your band categories</h3><p className="hb-admin-note">Add anything you need: vocals, guitar, beatboxing or another role. Names and icons appear as filters on the public page. Renaming keeps artist assignments intact.</p><p className="hb-admin-note">Deleting a category removes its filter. Artists stay under All and can be reassigned in <Link to="/admin/band">Band Members</Link>. Hiding a category keeps it available in the artist editor.</p><div className="hb-admin-category-add"><TextField label="New category name" value={newCategory} onChange={setNewCategory} help="For example: Beatboxing" /><label className="hb-admin-field"><span>New category icon</span><select aria-label="New category icon" value={newIcon} onChange={event => setNewIcon(event.target.value as HomeboundIcon)}>{ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label><button type="button" className="hb-admin-primary" onClick={addCategory}><Plus size={15} aria-hidden="true" />Add category</button></div></section>
        {!draft.content.categories.length && <p className="hb-admin-message">No category filters. All published artists will still appear under All.</p>}
        {draft.content.categories.map((category, index) => <section className="hb-admin-panel hb-admin-category" key={category.id} aria-label={`Category ${category.label || index + 1}`}><div className="hb-admin-row"><h3>{index + 1}. {category.label || 'Unnamed category'}</h3><div className="hb-admin-item-actions"><button type="button" disabled={index === 0} onClick={() => editContent(previous => ({ ...previous, categories: move(previous.categories, index, -1) }))} aria-label={`Move ${category.label} up`}><ArrowUp size={15} /></button><button type="button" disabled={index === draft.content.categories.length - 1} onClick={() => editContent(previous => ({ ...previous, categories: move(previous.categories, index, 1) }))} aria-label={`Move ${category.label} down`}><ArrowDown size={15} /></button><button type="button" className="hb-admin-danger" onClick={() => editContent(previous => ({ ...previous, categories: previous.categories.filter(item => item.id !== category.id) }))} aria-label={`Delete ${category.label} category`}><Trash2 size={15} /></button></div></div><div className="hb-admin-fields hb-admin-fields--two"><TextField label={`${category.label || 'Category'} name`} value={category.label} onChange={value => editCategory(category.id, { label: value })} /><label className="hb-admin-field"><span>{category.label || 'Category'} icon</span><select aria-label={`${category.label || 'Category'} icon`} value={category.icon} onChange={event => editCategory(category.id, { icon: event.target.value as HomeboundIcon })}>{ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select></label><TextField label={`${category.label || 'Category'} aliases`} value={category.aliases.join(', ')} onChange={value => editCategory(category.id, { aliases: value.split(',').map(alias => alias.trim()) })} help="Older category names, separated by commas. For example Guitar, Bass." /><label className="hb-admin-check"><input type="checkbox" checked={category.enabled} onChange={event => editCategory(category.id, { enabled: event.target.checked })} /><span>Show {category.label || 'category'} filter</span></label></div></section>)}
      </div>}
      {tab === 'journey' && <div className="hb-admin-stack"><section className="hb-admin-panel"><h3>Tell your story</h3>{text('journey_heading', 'Journey section heading', 'Line breaks are supported.', true)}<p className="hb-admin-note">Add, reorder, hide or remove the photo cards. Removing a card does not delete the uploaded photo.</p></section>{draft.content.journey_items.map((item, index) => <section className="hb-admin-panel" key={item.id} aria-label={`Journey item ${index + 1}`}><div className="hb-admin-row"><h3>{index + 1}. {item.title || 'New moment'}</h3><div className="hb-admin-item-actions"><button type="button" disabled={index === 0 || uploading} aria-label={`Move journey item ${index + 1} up`} onClick={() => editContent(previous => ({ ...previous, journey_items: move(previous.journey_items, index, -1) }))}><ArrowUp size={15} /></button><button type="button" disabled={index === draft.content.journey_items.length - 1 || uploading} aria-label={`Move journey item ${index + 1} down`} onClick={() => editContent(previous => ({ ...previous, journey_items: move(previous.journey_items, index, 1) }))}><ArrowDown size={15} /></button><button type="button" disabled={uploading} className="hb-admin-danger" aria-label={`Delete journey item ${index + 1}`} onClick={() => editContent(previous => ({ ...previous, journey_items: previous.journey_items.filter(row => row.id !== item.id) }))}><Trash2 size={15} /></button></div></div><div className="hb-admin-fields hb-admin-fields--two"><TextField label={`Journey ${index + 1} title`} value={item.title} onChange={value => editContent(previous => ({ ...previous, journey_items: previous.journey_items.map(row => row.id === item.id ? { ...row, title: value } : row) }))} /><TextField label={`Journey ${index + 1} subtitle`} value={item.subtitle} onChange={value => editContent(previous => ({ ...previous, journey_items: previous.journey_items.map(row => row.id === item.id ? { ...row, subtitle: value } : row) }))} /></div><label className="hb-admin-check"><input type="checkbox" checked={item.enabled} onChange={event => editContent(previous => ({ ...previous, journey_items: previous.journey_items.map(row => row.id === item.id ? { ...row, enabled: event.target.checked } : row) }))} /><span>Show journey item {index + 1}</span></label><MediaField id={`journey-${item.id}`} label={`Journey ${index + 1} photo`} value={item.image} imageAlt={item.image_alt} aspect={1} onChange={value => editContent(previous => ({ ...previous, journey_items: previous.journey_items.map(row => row.id === item.id ? { ...row, image: value } : row) }))} onAltChange={value => editContent(previous => ({ ...previous, journey_items: previous.journey_items.map(row => row.id === item.id ? { ...row, image_alt: value } : row) }))} onBusy={reportUpload} /></section>)}<button type="button" className="hb-admin-add-card" disabled={uploading} onClick={() => editContent(previous => ({ ...previous, journey_items: [...previous.journey_items, { id: uniqueId('moment'), title: 'New moment', subtitle: '', image: '', image_alt: '', enabled: true }] }))}><Plus size={16} />Add journey item</button></div>}
      {tab === 'links' && <div className="hb-admin-stack"><section className="hb-admin-panel"><h3>Instagram</h3><label className="hb-admin-check"><input type="checkbox" checked={draft.instagram_enabled} onChange={event => edit(previous => ({ ...previous, instagram_enabled: event.target.checked }))} /><span>Show Instagram link</span></label><TextField label="Instagram profile URL or handle" value={draft.instagram_url} onChange={value => edit(previous => ({ ...previous, instagram_url: value }))} help="Use your profile URL or @handle. Leave blank to remove the link." /></section><section className="hb-admin-panel"><h3>Connect buttons</h3><div className="hb-admin-fields">{text('encore_text', 'Connect section text')}{text('listen_label', 'Listen button text')}{text('follow_label', 'Follow button text')}{text('audition_label', 'Audition button text')}</div><p className="hb-admin-note">The Listen button uses a published artist’s YouTube or Spotify link. Audition availability is managed in <Link to="/admin/form-settings">Application form settings</Link>; applications appear in <Link to="/admin/auditions">Auditions</Link>.</p></section><section className="hb-admin-panel"><h3>Gallery link</h3><div className="hb-admin-fields">{text('gallery_label', 'Gallery link text')}{text('gallery_url', 'Gallery link destination', 'For example /gallery or a full HTTPS link.')}</div></section></div>}
    </div></fieldset>
  </div>;
};
