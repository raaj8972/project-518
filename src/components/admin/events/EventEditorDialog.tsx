import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, CalendarIcon, CheckIcon, FileTextIcon, ImageIcon, LayersIcon, PersonIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { ImageUpload } from '../../ImageUpload';
import { VideoUpload } from '../../VideoUpload';
import { InlineDescriptionAI } from '../InlineDescriptionAI';
import { EVENT_CATEGORIES, EVENT_POSTER_ASPECT, EVENT_POSTER_GUIDE } from '../../../utils/eventPresentation';
import type { RuleSection } from '../../../utils/eventUtils';
import { EventAdminDialog } from './EventAdminDialog';
import { EVENT_EDITOR_SECTIONS, draftKey, restoreEventDraft, validateEventDraft, type EventEditorDraft, type EventEditorSection, type EventFields } from './eventEditor';

export function EditorField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="event-editor-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function EditorToggle({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="event-editor-toggle"><span><strong>{title}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" aria-label={title} checked={value} onChange={event => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}
function FieldGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="event-editor-group"><header><h3>{title}</h3>{description && <p>{description}</p>}</header>{children}</section>;
}
function StringList({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return <div className="event-editor-list">{values.map((value, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><EditorField label={`${label} ${index + 1}`}><input value={value} onChange={event => onChange(values.map((item, pos) => pos === index ? event.target.value : item))} /></EditorField><button type="button" className="event-admin-icon is-danger" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => onChange(values.filter((_, pos) => pos !== index))}><TrashIcon /></button></div>)}<button type="button" className="event-admin-button is-secondary" onClick={() => onChange([...values, ''])}><PlusIcon />Add {label.toLowerCase()}</button></div>;
}

function StructuredRules({ sections, setSections }: { sections: RuleSection[]; setSections: (sections: RuleSection[]) => void }) {
  const edit = (index: number, patch: Partial<RuleSection>) => setSections(sections.map((section, pos) => pos === index ? { ...section, ...patch } : section));
  return <div className="event-editor-rule-sections">{sections.map((section, index) => <section key={index}>
    <header><EditorField label={`Section ${index + 1} heading`}><input value={section.heading || ''} placeholder="e.g. Eligibility" onChange={event => edit(index, { heading: event.target.value })} /></EditorField><button type="button" className="event-admin-icon is-danger" aria-label={`Remove section ${index + 1}`} onClick={() => setSections(sections.filter((_, pos) => pos !== index))}><TrashIcon /></button></header>
    {(section.blocks || []).map((block, pos) => <div className="event-editor-rule-block" key={pos}>
      <div className="event-editor-grid"><EditorField label={`Section ${index + 1} block ${pos + 1} title`}><input value={block.title || ''} onChange={event => edit(index, { blocks: section.blocks?.map((item, p) => p === pos ? { ...item, title: event.target.value } : item) })} /></EditorField><EditorField label={`Section ${index + 1} block ${pos + 1} list style`}><select value={block.style} onChange={event => edit(index, { blocks: section.blocks?.map((item, p) => p === pos ? { ...item, style: event.target.value as 'bullet' | 'number' } : item) })}><option value="number">Numbered list</option><option value="bullet">Bullet list</option></select></EditorField></div>
      <StringList label={`Section ${index + 1} block ${pos + 1} point`} values={block.items || []} onChange={items => edit(index, { blocks: section.blocks?.map((item, p) => p === pos ? { ...item, items } : item) })} />
      <button type="button" className="event-admin-text is-danger" onClick={() => edit(index, { blocks: section.blocks?.filter((_, p) => p !== pos) })}>Remove block {pos + 1}</button>
    </div>)}
    <button type="button" className="event-admin-text" onClick={() => edit(index, { blocks: [...(section.blocks || []), { kind: 'points', style: 'number', title: '', items: [''] }] })}><PlusIcon />Add a block</button>
  </section>)}<button type="button" className="event-admin-button is-secondary" onClick={() => setSections([...sections, { heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: [''] }] }])}><PlusIcon />Add rule section</button></div>;
}

const icons = { details: FileTextIcon, schedule: CalendarIcon, registration: LayersIcon, rules: FileTextIcon, media: ImageIcon, people: PersonIcon, publishing: CheckIcon };
export function EventEditorDialog({ initial, eventId, participantTypes = [], onClose, onSave }: { initial: EventEditorDraft; eventId?: number; participantTypes?: string[]; onClose: () => void; onSave: (draft: EventEditorDraft) => Promise<void> }) {
  const [draft, setDraft] = useState(() => {
    try { return restoreEventDraft(JSON.parse(localStorage.getItem(draftKey(eventId)) || 'null'), initial); } catch { return initial; }
  });
  const [section, setSection] = useState<EventEditorSection>('details');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [newType, setNewType] = useState('');
  const savingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const f = draft.fields;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const busy = saving || imageBusy || videoBusy;
  const index = EVENT_EDITOR_SECTIONS.findIndex(item => item.id === section);
  const selected = EVENT_EDITOR_SECTIONS[index];
  const setField = <K extends keyof EventFields>(key: K, value: EventFields[K]) => { setError(''); setDraft(previous => ({ ...previous, fields: { ...previous.fields, [key]: value } })); };
  const imageProcessing = useCallback((value: boolean) => setImageBusy(value), []);
  const videoProcessing = useCallback((value: boolean) => setVideoBusy(value), []);
  const selectSection = (next: EventEditorSection) => { if (imageBusy || videoBusy) return; setSection(next); contentRef.current?.scrollTo?.({ top: 0 }); };
  useEffect(() => {
    try { if (dirty) localStorage.setItem(draftKey(eventId), JSON.stringify({ ...draft, notify: false })); else localStorage.removeItem(draftKey(eventId)); } catch { /* Keep editing if local storage is unavailable. */ }
  }, [draft, dirty, eventId]);
  const save = async () => {
    if (busy || savingRef.current) return;
    const problem = validateEventDraft(draft);
    if (problem) { selectSection(problem.section); setError(problem.message); return; }
    savingRef.current = true; setSaving(true); setError('');
    try { await onSave(draft); try { localStorage.removeItem(draftKey(eventId)); } catch { /* The event is saved even when local storage is unavailable. */ } }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The event could not save. Your draft is kept.'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const addType = () => {
    const value = newType.trim();
    if (value && !f.registration_participant_types.some(type => type.toLowerCase() === value.toLowerCase())) setField('registration_participant_types', [...f.registration_participant_types, value]);
    setNewType('');
  };
  return <EventAdminDialog title={eventId != null ? 'Edit event' : 'Add event'} description={eventId != null ? initial.fields.title : 'Build an event, then publish when you are ready.'} onClose={onClose} busy={busy} wide footer={<>
    <span className="event-editor-draft-status">{busy ? saving ? 'Saving event…' : 'Finish the media upload to continue.' : dirty ? 'Draft saved on this device' : 'Your event workspace'}</span>
    <div><button type="button" className="event-admin-button is-quiet" disabled={busy} onClick={onClose}>Close</button>{index > 0 && <button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => selectSection(EVENT_EDITOR_SECTIONS[index - 1].id)}><ArrowLeftIcon />Back</button>}{index < EVENT_EDITOR_SECTIONS.length - 1 && <button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => selectSection(EVENT_EDITOR_SECTIONS[index + 1].id)}>Continue<ArrowRightIcon /></button>}<button type="submit" form={formId} className="event-admin-button is-primary" disabled={busy}><CheckIcon />{saving ? 'Saving…' : eventId != null ? 'Save changes' : 'Create event'}</button></div>
  </>}>
    <div className="event-editor-layout">
      <nav className="event-editor-nav" aria-label="Event editor sections">{EVENT_EDITOR_SECTIONS.map((item, pos) => { const Icon = icons[item.id]; return <button key={item.id} type="button" disabled={busy} aria-current={section === item.id ? 'step' : undefined} onClick={() => selectSection(item.id)}><span>{String(pos + 1).padStart(2, '0')}</span><Icon /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>; })}
        <div className="event-editor-nav__note"><span>{f.visible ? 'Public event' : 'Hidden event'}</span><p>{f.featured ? 'Featured on the homepage' : 'Choose homepage featuring in Publishing.'}</p><button type="button" className="event-admin-text" disabled={busy || !dirty} onClick={() => { setDraft(initial); setError(''); }}>Discard draft changes</button></div>
      </nav>
      <div ref={contentRef} className="event-editor-content">
        <div className="event-editor-section-heading"><span>{String(index + 1).padStart(2, '0')} / {String(EVENT_EDITOR_SECTIONS.length).padStart(2, '0')}</span><h3>{selected.label}</h3><p>{selected.hint}</p></div>
        {error && <div className="event-admin-feedback is-error" role="alert">{error}</div>}
        <form id={formId} onSubmit={event => { event.preventDefault(); void save(); }} noValidate><fieldset disabled={saving}>
          {section === 'details' && <>
            <FieldGroup title="Make it recognisable" description="The event name and description appear on the website and in participant updates.">
              <EditorField label="Event title"><input value={f.title} onChange={event => setField('title', event.target.value)} placeholder="e.g. Battle of the Bands" autoComplete="off" /></EditorField>
              <div className="event-editor-grid"><EditorField label="Category"><select value={f.category} onChange={event => setField('category', event.target.value)}>{EVENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></EditorField><EditorField label="Who can participate?" hint="A short description; detailed eligibility is set in Registration."><input value={f.participants} onChange={event => setField('participants', event.target.value)} placeholder="e.g. All undergraduate students" /></EditorField></div>
              <div><EditorField label="Description"><textarea value={f.description} rows={6} onChange={event => setField('description', event.target.value)} placeholder="Explain the event, the experience and what participants should know." /></EditorField><InlineDescriptionAI contextName={f.title} contextType="event" onDescriptionGenerated={value => setField('description', value)} className="event-editor-ai" /></div>
            </FieldGroup>
            <FieldGroup title="Event highlights" description="Short points that help participants see what makes this event special."><StringList label="Highlight" values={f.highlights} onChange={values => setField('highlights', values)} /></FieldGroup>
          </>}
          {section === 'schedule' && <>
            <FieldGroup title="When and where" description="Leave undecided details empty. The website will show that they are to be announced."><div className="event-editor-grid"><EditorField label="Event date"><input type="date" value={f.date} onChange={event => setField('date', event.target.value)} /></EditorField><EditorField label="Event time (IST)" hint="A start time or a range, such as 4:00 PM – 6:00 PM."><input value={f.time} onChange={event => setField('time', event.target.value)} placeholder="4:00 PM – 6:00 PM" /></EditorField></div><EditorField label="Venue"><input value={f.venue} onChange={event => setField('venue', event.target.value)} placeholder="e.g. Main auditorium" /></EditorField></FieldGroup>
            <FieldGroup title="Livestream" description="Add the public stream link if the event will be broadcast."><EditorField label="Watch live URL"><input type="url" value={f.watch_live_url} onChange={event => setField('watch_live_url', event.target.value)} placeholder="https://…" /></EditorField></FieldGroup>
          </>}
          {section === 'registration' && <>
            <FieldGroup title="Registration availability"><EditorToggle title="Accept registrations" hint="Turn off to stop new entries for this event." value={f.registration_open} onChange={value => setField('registration_open', value)} /><EditorToggle title="Schedule registration window" hint="Choose the opening and optional closing time. All dates below use India time." value={f.registration_timer_enabled} onChange={value => setField('registration_timer_enabled', value)} />
              {f.registration_timer_enabled && <div className="event-editor-grid"><EditorField label="Registration opens (IST)"><input type="datetime-local" value={f.registration_opens_at} onChange={event => setField('registration_opens_at', event.target.value)} /></EditorField><EditorField label="Registration closes (IST)"><input type="datetime-local" value={f.registration_closes_at} onChange={event => setField('registration_closes_at', event.target.value)} /></EditorField></div>}
              <EditorField label="Total participant limit" hint="Leave empty for no overall limit."><input type="number" min="1" value={f.max_participants} onChange={event => setField('max_participants', event.target.value)} placeholder="No limit" /></EditorField>
            </FieldGroup>
            <FieldGroup title="Individual or team entry"><EditorField label="Default registration mode"><select value={f.registration_default_mode} onChange={event => setField('registration_default_mode', event.target.value as 'individual' | 'team')}><option value="individual">Individual</option><option value="team">Team</option></select></EditorField><EditorToggle title="Lock registration mode" hint="Participants must use the mode selected above." value={f.registration_mode_locked} onChange={value => setField('registration_mode_locked', value)} />
              <EditorToggle title="Require an exact team size" value={!!f.team_required_size} onChange={value => setField('team_required_size', value ? '2' : '')} />
              {f.team_required_size ? <EditorField label="Required team size"><input type="number" min="2" max="50" value={f.team_required_size} onChange={event => setField('team_required_size', event.target.value)} /></EditorField> : <div className="event-editor-grid"><EditorField label="Minimum team members"><input type="number" min="2" max="50" value={f.team_min_members} onChange={event => setField('team_min_members', event.target.value)} placeholder="2" /></EditorField><EditorField label="Maximum team members"><input type="number" min="2" max="50" value={f.team_max_members} onChange={event => setField('team_max_members', event.target.value)} placeholder="50" /></EditorField></div>}
            </FieldGroup>
            <FieldGroup title="Participant types and quotas" description="Leave the list empty to allow all participant types. A blank quota means no type-specific limit; 0 closes entry for that type.">
              {!!participantTypes.length && <div className="event-editor-type-choices" role="group" aria-label="Available participant types">{participantTypes.map(type => <button type="button" key={type} aria-pressed={f.registration_participant_types.includes(type)} onClick={() => { const selected = f.registration_participant_types.includes(type); setField('registration_participant_types', selected ? f.registration_participant_types.filter(item => item !== type) : [...f.registration_participant_types, type]); }}>{type}</button>)}<button type="button" className="event-admin-text" onClick={() => setField('registration_participant_types', participantTypes)}>Select all</button><button type="button" className="event-admin-text" onClick={() => setDraft(previous => ({ ...previous, fields: { ...previous.fields, registration_participant_types: [], registration_participant_quotas: {} } }))}>Allow all types</button></div>}
              {f.registration_participant_types.map(type => <div key={type} className="event-editor-quota"><strong>{type}</strong><EditorField label={`${type} quota`}><input type="number" min="0" placeholder="No limit" value={f.registration_participant_quotas[type] ?? ''} onChange={event => { const quotas = { ...f.registration_participant_quotas }; if (event.target.value === '') delete quotas[type]; else quotas[type] = Number(event.target.value); setField('registration_participant_quotas', quotas); }} /></EditorField><button type="button" className="event-admin-icon is-danger" aria-label={`Remove participant type ${type}`} onClick={() => { setDraft(previous => ({ ...previous, fields: { ...previous.fields, registration_participant_types: previous.fields.registration_participant_types.filter(item => item !== type), registration_participant_quotas: Object.fromEntries(Object.entries(previous.fields.registration_participant_quotas).filter(([key]) => key !== type)) } })); }}><TrashIcon /></button></div>)}
              <div className="event-editor-inline"><EditorField label="New participant type"><input value={newType} onChange={event => setNewType(event.target.value)} placeholder="e.g. MBBS 2025" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addType(); } }} /></EditorField><button type="button" className="event-admin-button is-secondary" onClick={addType}><PlusIcon />Add type</button></div>
            </FieldGroup>
            <FieldGroup title="Participant photograph"><EditorToggle title="Require a registration photo" hint="Ask participants to attach a photo to their entry." value={f.registration_photo_required} onChange={value => setField('registration_photo_required', value)} />{f.registration_photo_required && <EditorField label="Photo field label"><input value={f.registration_photo_label} onChange={event => setField('registration_photo_label', event.target.value)} placeholder="Participant photo" /></EditorField>}</FieldGroup>
          </>}
          {section === 'rules' && <>
            <FieldGroup title="The rulebook"><EditorToggle title="Organise rules into sections" hint="Use headings and numbered or bullet lists for a longer rulebook." value={draft.structured} onChange={value => setDraft(previous => ({ ...previous, structured: value, sections: value && !previous.sections.length ? [{ heading: '', blocks: [{ kind: 'points', style: 'number', items: previous.fields.rules.length ? previous.fields.rules : [''] }] }] : previous.sections, fields: { ...previous.fields, rules: value ? previous.fields.rules : previous.sections.flatMap(item => (item.blocks || []).flatMap(block => block.items || [])) } }))} />
              {draft.structured ? <StructuredRules sections={draft.sections} setSections={sections => setDraft(previous => ({ ...previous, sections }))} /> : <StringList label="Rule" values={f.rules} onChange={rules => setField('rules', rules)} />}
            </FieldGroup><FieldGroup title="Supporting document"><EditorField label="Rules PDF or document URL"><input type="url" value={f.rules_link} onChange={event => setField('rules_link', event.target.value)} placeholder="https://…" /></EditorField></FieldGroup>
          </>}
          {section === 'media' && <>
            <FieldGroup title="Event poster" description={`${EVENT_POSTER_GUIDE}. Choose artwork without a title; the website adds the event text.`}><ImageUpload bucket="event-images" folder="events" currentImage={f.image} onImageSelect={value => setField('image', value)} cropAspect={EVENT_POSTER_ASPECT} preserveExistingMedia autoSave onProcessingChange={imageProcessing} /><EditorField label="Or use a poster URL"><input type="url" value={f.image} onChange={event => setField('image', event.target.value)} placeholder="https://…" /></EditorField></FieldGroup>
            <FieldGroup title="Motion poster" description="An optional short video for this event."><VideoUpload bucket="event-videos" folder="events" currentVideo={f.motion_poster_url} onVideoSelect={value => setField('motion_poster_url', value)} preserveExistingMedia onProcessingChange={videoProcessing} /><EditorField label="Or use a video URL"><input type="url" value={f.motion_poster_url} onChange={event => setField('motion_poster_url', event.target.value)} placeholder="https://…" /></EditorField><EditorToggle title="Autoplay motion poster" hint="The video plays muted where motion posters are supported." value={f.motion_poster_autoplay} onChange={value => setField('motion_poster_autoplay', value)} /></FieldGroup>
          </>}
          {section === 'people' && <>
            <FieldGroup title="Event coordinators" description="Contacts are displayed in this order. Changes are saved with the event.">
              {draft.coordinators.map((coord, pos) => <div className="event-editor-coordinator" key={coord.key}><span>{String(pos + 1).padStart(2, '0')}</span><div className="event-editor-grid"><EditorField label={`Coordinator ${pos + 1} name`}><input value={coord.name} onChange={event => setDraft(previous => ({ ...previous, coordinators: previous.coordinators.map(item => item.key === coord.key ? { ...item, name: event.target.value } : item) }))} /></EditorField><EditorField label={`Coordinator ${pos + 1} phone`}><input type="tel" value={coord.phone} onChange={event => setDraft(previous => ({ ...previous, coordinators: previous.coordinators.map(item => item.key === coord.key ? { ...item, phone: event.target.value } : item) }))} /></EditorField></div><div className="event-editor-coordinator__actions">{([-1, 1] as const).map(delta => <button key={delta} type="button" className="event-admin-icon" disabled={pos + delta < 0 || pos + delta >= draft.coordinators.length} aria-label={`Move coordinator ${pos + 1} ${delta === -1 ? 'up' : 'down'}`} onClick={() => setDraft(previous => { const rows = [...previous.coordinators]; [rows[pos], rows[pos + delta]] = [rows[pos + delta], rows[pos]]; return { ...previous, coordinators: rows }; })}>{delta === -1 ? <ArrowUpIcon /> : <ArrowDownIcon />}</button>)}<button type="button" className="event-admin-icon is-danger" aria-label={`Remove coordinator ${pos + 1}`} onClick={() => setDraft(previous => ({ ...previous, coordinators: previous.coordinators.filter(item => item.key !== coord.key) }))}><TrashIcon /></button></div></div>)}
              <button type="button" className="event-admin-button is-secondary" onClick={() => setDraft(previous => ({ ...previous, coordinators: [...previous.coordinators, { key: crypto.randomUUID(), name: '', phone: '' }] }))}><PlusIcon />Add coordinator</button>
            </FieldGroup><FieldGroup title="Participant WhatsApp group" description="This group is shared through the approved participant flow."><EditorField label="WhatsApp group invite URL"><input type="url" value={f.whatsapp_group_link} onChange={event => setField('whatsapp_group_link', event.target.value)} placeholder="https://chat.whatsapp.com/…" /></EditorField></FieldGroup>
          </>}
          {section === 'publishing' && <>
            <FieldGroup title="Where this event appears"><EditorToggle title="Show on the public website" hint="Hidden events stay in the admin catalog." value={f.visible} onChange={value => setField('visible', value)} /><EditorToggle title="Feature on the homepage" hint="Highlight this event on the homepage while it is visible and current." value={f.featured} onChange={value => setField('featured', value)} />{f.featured && !f.visible && <p className="event-admin-hint">This event will appear in homepage highlights after it is made public.</p>}</FieldGroup>
            {eventId != null && <FieldGroup title="Keep participants informed"><EditorToggle title="Email approved participants after saving" hint="Send a schedule or rules update when these details change." value={draft.notify} onChange={notify => setDraft(previous => ({ ...previous, notify }))} />{draft.notify && <EditorField label="Message for participants"><textarea rows={3} value={draft.note} onChange={event => setDraft(previous => ({ ...previous, note: event.target.value }))} placeholder="Explain what changed and what they need to do." /></EditorField>}</FieldGroup>}
            <div className="event-editor-checklist"><h4>Before you publish</h4><p><CheckIcon />{f.title.trim() && f.description.trim() ? 'Event details are filled in' : 'Add a title and description'}</p><p><ImageIcon />{f.image ? 'Poster is selected' : 'A poster can be added later'}</p><p><CalendarIcon />{f.date && f.time && f.venue ? 'Date, time and venue are set' : 'Undecided schedule details will show as to be announced'}</p><p><PersonIcon />{draft.coordinators.filter(item => item.name.trim()).length} coordinator contacts</p></div>
          </>}
        </fieldset></form>
      </div>
    </div>
  </EventAdminDialog>;
}
