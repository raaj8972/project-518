import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarIcon, CheckCircledIcon, ChevronRightIcon, ClockIcon, CopyIcon, DownloadIcon, EnvelopeClosedIcon, ExternalLinkIcon, FileTextIcon, InfoCircledIcon, Link2Icon, MagnifyingGlassIcon, Pencil2Icon, PlusIcon, ReloadIcon, SewingPinIcon, TrashIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import type { ScheduleDay, ScheduleEvent } from '../../types/data';
import { supabase } from '../../lib/supabase';
import { BRAND_YEAR } from '../../constants/brand';
import { scheduleDate, scheduleDayTitle, scheduleDayType, type ScheduleType } from '../../utils/schedulePresentation';
import { EventAdminDialog } from './events/EventAdminDialog';
import { AIScheduleScanner } from './schedule/AIScheduleScanner';
import { durationFromTime, editionDays, emptySlot, importSlotKey, linkedSlot, normalizeScheduleImport, slotDraft, slotPayload, validScheduleDate, venueConflicts, type ImportDay, type SlotDraft } from './schedule/scheduleEditor';
import '../../styles/EventsAdmin.css';
import '../../styles/ScheduleAdmin.css';

type DayDraft = { id?: number; date: string; day: string; title: string };
type SlotEditor = { id?: number; draft: SlotDraft };
type Feedback = { text: string; error?: boolean };
const editionName = (type: ScheduleType) => type === 'prelims' ? 'Prelims' : 'Mains';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The change could not be saved. Please try again.';

export const ScheduleManagement = () => {
  const { schedule = [], events = [], siteSettings, homepageSettings, loading, scheduleError, connectionStatus, refreshAll, addScheduleDay, updateScheduleDay, deleteScheduleDay, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, updateSiteSettings } = useData();
  const [edition, setEdition] = useState<ScheduleType>(siteSettings?.default_schedule_type || 'prelims');
  const editionChosen = useRef(false);
  const operationBusy = useRef(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dayEditor, setDayEditor] = useState<DayDraft | null>(null);
  const [editor, setEditor] = useState<SlotEditor | null>(null);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<{ kind: 'day' | 'slot'; id: number; title: string; count: number } | null>(null);
  const [scanner, setScanner] = useState(false);
  const [importing, setImporting] = useState<ImportDay[] | null>(null);
  const [broadcast, setBroadcast] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const days = useMemo(() => editionDays(schedule, edition), [schedule, edition]);
  const allSlots = days.flatMap(day => day.events);
  const categories = [...new Set(allSlots.map(slot => slot.type || 'General'))].sort();
  const conflicts = useMemo(() => venueConflicts(days), [days]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtering = !!normalizedQuery || category !== 'all';
  const shown = days.map(day => ({ ...day, events: day.events.filter(slot => (category === 'all' || (slot.type || 'General') === category) && (!normalizedQuery || [slot.title, slot.venue, slot.type, slot.time].some(value => value?.toLowerCase().includes(normalizedQuery)))) }));
  const eligible = filtering ? shown.filter(day => day.events.length) : shown;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const firstRelevant = filtering ? eligible[0] : eligible.find(row => validScheduleDate(row.date) && row.date >= today) || eligible.find(row => !validScheduleDate(row.date)) || eligible[0];
  const day = eligible.find(row => row.id === selectedDay) || firstRelevant;
  const rawDay = days.find(row => row.id === day?.id);
  const missingVenues = allSlots.filter(slot => !slot.venue?.trim() || /^(tba|tbd)$/i.test(slot.venue.trim())).length;
  const datesToConfirm = days.filter(row => !validScheduleDate(row.date)).length;
  const linkedCount = allSlots.filter(slot => slot.event_id != null).length;
  const disconnected = !!scheduleError || connectionStatus === 'offline' || connectionStatus === 'degraded';
  const pending = loading && !schedule.length;
  const currentDefault = siteSettings?.default_schedule_type || 'prelims';
  useEffect(() => { if (!editionChosen.current && siteSettings?.default_schedule_type) setEdition(siteSettings.default_schedule_type); }, [siteSettings?.default_schedule_type]);
  const chooseEdition = (value: ScheduleType) => { editionChosen.current = true; setEdition(value); setSelectedDay(null); setQuery(''); setCategory('all'); };
  const clearFilters = () => { setQuery(''); setCategory('all'); };
  const run = async (action: () => Promise<void>, success?: string) => {
    if (operationBusy.current) return;
    operationBusy.current = true; setBusy(true); setFormError(''); setFeedback(null);
    try { await action(); if (success) setFeedback({ text: success }); }
    catch (error) { const text = errorMessage(error); setFormError(text); setFeedback({ text, error: true }); }
    finally { operationBusy.current = false; setBusy(false); }
  };
  const openDay = (existing?: ScheduleDay) => { setFormError(''); setDayEditor(existing ? { id: existing.id, date: existing.date, day: existing.day, title: scheduleDayTitle(existing) } : { date: '', day: `Day ${days.length + 1}`, title: '' }); };
  const openSlot = (dayId: number, slot?: ScheduleEvent, duplicate = false) => { setFormError(''); setEditor({ id: duplicate ? undefined : slot?.id, draft: slot ? { ...slotDraft(slot), ...(duplicate ? { title: `${slot.title} (copy)` } : {}) } : emptySlot(dayId) }); };
  const saveDay = (event: FormEvent) => {
    event.preventDefault(); if (!dayEditor) return;
    void run(async () => {
      if (!validScheduleDate(dayEditor.date) || !dayEditor.day.trim()) throw new Error('Choose a valid date and add a day label.');
      if (days.some(row => row.date === dayEditor.date && row.id !== dayEditor.id)) throw new Error('This edition already has a day on that date. Edit the existing day instead.');
      const payload = { date: dayEditor.date, day: dayEditor.day.trim(), title: dayEditor.title.trim(), schedule_type: edition };
      if (dayEditor.id) await updateScheduleDay(dayEditor.id, payload);
      else { const saved = await addScheduleDay(payload); setSelectedDay(saved.id); }
      setDayEditor(null);
    }, dayEditor.id ? 'Day updated on the website.' : 'Day added to the programme.');
  };
  const saveSlot = (event: FormEvent) => {
    event.preventDefault(); if (!editor) return;
    void run(async () => {
      const payload = slotPayload(editor.draft);
      if (editor.id) await updateScheduleEvent(editor.id, payload); else await addScheduleEvent(editor.draft.schedule_day_id, payload);
      setSelectedDay(editor.draft.schedule_day_id); clearFilters(); setEditor(null);
    }, editor.id ? 'Event updated on the public schedule.' : 'Event added to the public schedule.');
  };
  const remove = () => { if (!deleting) return; void run(async () => { if (deleting.kind === 'day') await deleteScheduleDay(deleting.id); else await deleteScheduleEvent(deleting.id); setDeleting(null); }, 'Removed from the programme.'); };
  const scanComplete = (rows: unknown[], type: ScheduleType) => {
    try { const normalized = normalizeScheduleImport(rows, type); setScanner(false); setFormError(''); setImporting(normalized); }
    catch (error) { setFeedback({ text: errorMessage(error), error: true }); setScanner(false); }
  };
  const importSchedule = () => { if (!importing) return; void run(async () => {
    let added = 0, skipped = 0;
    const known = [...schedule];
    try {
      for (const scanned of importing) {
        let target = known.find(row => row.date === scanned.date && scheduleDayType(row) === scanned.schedule_type);
        if (!target) { const { events: _slots, ...payload } = scanned; const saved = await addScheduleDay(payload); target = { ...saved, events: [] }; known.push(target); }
        const keys = new Set(target.events.map(importSlotKey));
        for (const slot of scanned.events) {
          if (keys.has(importSlotKey(slot))) { skipped++; continue; }
          setImportStatus(`Saving event ${added + 1}: ${slot.title}`);
          await addScheduleEvent(target.id, slotPayload({ ...slot, schedule_day_id: target.id })); keys.add(importSlotKey(slot)); added++;
        }
      }
    } catch (error) { throw new Error(`${added} events saved before the import stopped. ${errorMessage(error)} Retry to continue; matching entries are skipped.`); }
    chooseEdition(importing[0].schedule_type); setImporting(null); setFeedback({ text: `${added} events imported. ${skipped} matching entries skipped.` });
  }); };
  const download = () => void run(async () => { const { downloadSchedulePdf } = await import('../../utils/schedulePdf'); await downloadSchedulePdf(days, edition, homepageSettings?.brand_year || BRAND_YEAR); }, 'Schedule PDF downloaded.');
  const field = (key: keyof SlotDraft, value: string) => setEditor(previous => previous && ({ ...previous, draft: { ...previous.draft, [key]: value, ...(key === 'time' ? { duration: durationFromTime(value) } : {}) } }));
  return <section className="schedule-admin" aria-label="Schedule management">
    <header className="schedule-admin-heading"><div><span className="schedule-admin-eyebrow">PROGRAMME PLANNER</span><h2>A little planning. A great festival.</h2><p>Put every event in its place. Keep your public timeline up to date.</p></div><div className="schedule-admin-heading__actions"><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setScanner(true)}><FileTextIcon />Import schedule</button><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={() => openDay()}><PlusIcon />Add day</button></div></header>
    <div className="schedule-admin-overview"><div><strong>{days.length.toString().padStart(2, '0')}</strong><span>Festival days</span></div><div><strong>{allSlots.length.toString().padStart(2, '0')}</strong><span>Scheduled events</span></div><div><strong>{new Set(allSlots.map(slot => slot.venue?.trim()).filter(Boolean)).size.toString().padStart(2, '0')}</strong><span>Venues</span></div><p><CheckCircledIcon /><span>One shared programme<small>Saved changes appear on the website.</small></span></p></div>
    {feedback && <div className={'schedule-admin-feedback' + (feedback.error ? ' is-error' : '')} role={feedback.error ? 'alert' : 'status'}>{feedback.error ? <InfoCircledIcon /> : <CheckCircledIcon />}<span>{feedback.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}>×</button></div>}
    {disconnected && <div className="schedule-admin-feedback is-error" role="alert"><InfoCircledIcon /><span>{scheduleError || 'Connection interrupted. Showing the last available programme.'}</span><button type="button" onClick={() => void run(async () => { await refreshAll(); })} disabled={busy}>Retry</button></div>}
    <div className="schedule-admin-editions"><div className="schedule-admin-edition-switch" role="group" aria-label="Programme edition">{(['prelims', 'mains'] as const).map(type => <button type="button" key={type} aria-pressed={edition === type} disabled={busy} onClick={() => chooseEdition(type)}>{editionName(type)}<span>{schedule.filter(row => scheduleDayType(row) === type).reduce((sum, row) => sum + row.events.length, 0)}</span></button>)}</div><div className="schedule-admin-default">{edition === currentDefault ? <span><CheckCircledIcon />Website opens with {editionName(edition)}</span> : <button type="button" className="event-admin-text" disabled={busy} onClick={() => void run(() => updateSiteSettings({ default_schedule_type: edition }), `${editionName(edition)} is now the website’s default schedule.`)}>Make {editionName(edition)} the website default<ChevronRightIcon /></button>}</div></div>
    <div className="schedule-admin-planner">
      <aside className="schedule-admin-days"><header><span>YOUR DAYS</span><button type="button" className="event-admin-icon" aria-label="Add schedule day" disabled={busy} onClick={() => openDay()}><PlusIcon /></button></header><nav aria-label="Festival days">{days.map((row, index) => <button type="button" key={row.id} aria-current={day?.id === row.id ? 'date' : undefined} onClick={() => { setSelectedDay(row.id); clearFilters(); }}><span className="schedule-admin-day-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{row.day || `Day ${index + 1}`}</strong><small>{scheduleDate(row.date, true)}<i />{row.events.length} events</small></span><ChevronRightIcon /></button>)}</nav>{!days.length && <p className="schedule-admin-days__empty">Add your first festival day to start planning.</p>}<div className="schedule-admin-days__footer"><ClockIcon /><span>All times are in IST<small>India Standard Time · UTC +5:30</small></span></div></aside>
      <div className="schedule-admin-agenda">
        <div className="schedule-admin-searchbar"><label><MagnifyingGlassIcon /><span className="sr-only">Search schedule</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an event, time or venue…" /></label><label><span className="sr-only">Filter by category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(type => <option key={type} value={type}>{type}</option>)}</select></label></div>
        {pending ? <div className="schedule-admin-skeleton" aria-busy="true" aria-label="Loading programme"><i /><i /><i /><i /></div> : day && rawDay ? <>
          <header className="schedule-admin-day-heading"><div><span>{editionName(edition)} / {day.day}</span><h3>{scheduleDate(day.date)}<small>{/^\d{4}-\d{2}-\d{2}$/.test(day.date) ? day.date.slice(0, 4) : ''}</small></h3><p>{scheduleDayTitle(day) || `${editionName(edition)} programme`}</p></div><div><button type="button" className="event-admin-icon" aria-label="Edit selected day" disabled={busy} onClick={() => openDay(rawDay)}><Pencil2Icon /></button><button type="button" className="event-admin-icon is-danger" aria-label="Delete selected day" disabled={busy} onClick={() => { setFormError(''); setDeleting({ kind: 'day', id: day.id, title: day.day, count: rawDay.events.length }); }}><TrashIcon /></button><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={() => openSlot(day.id)}><PlusIcon />Add event</button></div></header>
          <div className="schedule-admin-table-head" aria-hidden="true"><span>TIME · IST</span><span>EVENT DETAILS</span><span>VENUE</span><span>ACTIONS</span></div>
          <div className="schedule-admin-slots">{day.events.map((slot, index) => {
            const linked = events.find(event => String(event.id) === String(slot.event_id));
            return <article className="schedule-admin-slot" key={slot.id} aria-label={slot.title}><div className="schedule-admin-slot__time"><span className="schedule-admin-timeline-node" aria-hidden="true" /><strong>{slot.time || 'TBA'}</strong>{slot.duration && <small>{slot.duration}</small>}</div><div className="schedule-admin-slot__identity"><span className="schedule-admin-slot__category">{slot.type || 'General'}<span>{String(index + 1).padStart(2, '0')}</span></span><button type="button" disabled={busy} onClick={() => openSlot(day.id, slot)}>{slot.title}</button><span className={'schedule-admin-slot__link' + (linked ? ' is-linked' : '')}>{linked ? <><Link2Icon />Linked to event{linked.visible === false && ' · Hidden'}</> : slot.event_id ? 'Linked event unavailable' : 'Schedule entry'}</span>{conflicts.has(slot.id) && <small className="schedule-admin-conflict"><InfoCircledIcon />Venue overlaps with {conflicts.get(slot.id)!.join(', ')}</small>}</div><div className="schedule-admin-slot__venue"><SewingPinIcon /><span>{slot.venue || 'Venue to be announced'}</span></div><div className="schedule-admin-slot__actions"><button type="button" className="event-admin-icon" aria-label={`Edit ${slot.title}`} disabled={busy} onClick={() => openSlot(day.id, slot)}><Pencil2Icon /></button><button type="button" className="event-admin-icon" aria-label={`Duplicate ${slot.title}`} disabled={busy} onClick={() => openSlot(day.id, slot, true)}><CopyIcon /></button><button type="button" className="event-admin-icon is-danger" aria-label={`Remove ${slot.title}`} disabled={busy} onClick={() => { setFormError(''); setDeleting({ kind: 'slot', id: slot.id, title: slot.title, count: 0 }); }}><TrashIcon /></button></div></article>;
          })}</div>
          {!day.events.length && <div className="schedule-admin-empty"><CalendarIcon /><h3>This day is yours to plan</h3><p>Add a festival event or a programme entry, such as an opening ceremony.</p><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => openSlot(day.id)}>Add the first event<PlusIcon /></button></div>}
          {!!day.events.length && <button type="button" className="schedule-admin-add-row" disabled={busy} onClick={() => openSlot(day.id)}><PlusIcon />Add another event to {day.day}</button>}
          <footer className="schedule-admin-agenda__footer"><span>{day.events.length}{filtering ? ` matching events · ${shown.reduce((sum, row) => sum + row.events.length, 0)} across all days` : ` events on ${day.day}`}</span><span><CheckCircledIcon />Changes saved individually</span></footer>
        </> : <div className="schedule-admin-empty"><CalendarIcon /><h3>{filtering ? 'No matching events' : disconnected ? 'The programme could not load' : `Plan your ${editionName(edition).toLowerCase()} programme`}</h3><p>{filtering ? 'Try a different event name, venue or category.' : 'Start with a date, then add events and their timings.'}</p><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => filtering ? clearFilters() : disconnected ? void run(async () => { await refreshAll(); }) : openDay()}>{filtering ? 'Clear filters' : disconnected ? 'Retry loading' : 'Add your first day'}</button></div>}
      </div>
    </div>
    <div className="schedule-admin-bottom"><section className="schedule-admin-checks"><header><span className="schedule-admin-checks__icon"><CheckCircledIcon /></span><div><h3>Programme checks</h3><p>A quick look before the festival goes live.</p></div></header><div>{!!datesToConfirm && <span className="needs-attention"><CalendarIcon />{datesToConfirm} dates need a year</span>}<span className={conflicts.size ? 'needs-attention' : ''}>{conflicts.size ? <InfoCircledIcon /> : <CheckCircledIcon />}{conflicts.size ? `${conflicts.size} events with venue overlaps` : 'No timed venue overlaps'}</span><span className={missingVenues ? 'needs-attention' : ''}><SewingPinIcon />{missingVenues ? `${missingVenues} venues to confirm` : 'Venues filled in'}</span><span><Link2Icon />{linkedCount} of {allSlots.length} linked to event pages</span></div><p>Parallel events at different venues are fine. Link an event to give visitors access to its details and registration.</p></section><section className="schedule-admin-share"><span className="schedule-admin-eyebrow">READY TO SHARE?</span><h3>Keep everyone in the loop.</h3><p>Download the programme or email approved participants a link to both editions.</p><div><button type="button" className="event-admin-button is-secondary" disabled={busy || !allSlots.length} onClick={download}><DownloadIcon />Download PDF</button><button type="button" className="event-admin-button is-secondary" disabled={busy || !allSlots.length} onClick={() => setBroadcast(true)}><EnvelopeClosedIcon />Email participants</button></div><a href="/schedule" target="_blank" rel="noopener noreferrer">Open public schedule<ExternalLinkIcon /></a></section></div>
    {dayEditor && <EventAdminDialog title={dayEditor.id ? 'Edit festival day' : 'Add a festival day'} eyebrow={`${editionName(edition)} programme`} description="Set the date and the label visitors will see on the schedule." busy={busy} onClose={() => setDayEditor(null)} footer={<><span>Saved directly to the public programme</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setDayEditor(null)}>Cancel</button><button type="submit" form="schedule-day-form" className="event-admin-button is-primary" disabled={busy}>{busy ? 'Saving…' : 'Save day'}</button></div></>}><form id="schedule-day-form" className="event-admin-dialog__body schedule-admin-form" onSubmit={saveDay}><>{!validScheduleDate(dayEditor.date) && !!dayEditor.date && <p className="schedule-admin-date-notice"><InfoCircledIcon />Previously saved as “{dayEditor.date}”. Select a full date including the year.</p>}</><div className="schedule-admin-form__pair"><label className="event-editor-field"><span>Date *</span><input type="date" required value={dayEditor.date} onChange={event => setDayEditor({ ...dayEditor, date: event.target.value })} disabled={busy} /></label><label className="event-editor-field"><span>Day label *</span><input required value={dayEditor.day} placeholder="Day 1" onChange={event => setDayEditor({ ...dayEditor, day: event.target.value })} disabled={busy} /></label></div><label className="event-editor-field"><span>Day title</span><input value={dayEditor.title} placeholder="Opening day, cultural evening…" onChange={event => setDayEditor({ ...dayEditor, title: event.target.value })} disabled={busy} /><small>Optional context for the day's programme.</small></label>{formError && <p className="schedule-admin-form-error" role="alert">{formError}</p>}</form></EventAdminDialog>}
    {editor && <EventAdminDialog title={editor.id ? 'Edit scheduled event' : 'Add to the programme'} eyebrow={`${editionName(edition)} programme`} description="Link a published event or create a standalone schedule entry." busy={busy} onClose={() => setEditor(null)} footer={<><span>All times are in IST</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setEditor(null)}>Cancel</button><button type="submit" form="schedule-slot-form" className="event-admin-button is-primary" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</button></div></>}><form id="schedule-slot-form" className="event-admin-dialog__body schedule-admin-form" onSubmit={saveSlot}><label className="event-editor-field"><span>Link an event</span><select value={editor.draft.event_id} disabled={busy} onChange={event => setEditor({ ...editor, draft: linkedSlot(editor.draft, events.find(row => String(row.id) === event.target.value)) })}><option value="">Standalone schedule entry</option>{events.map(event => <option key={event.id} value={String(event.id)}>{event.title}{event.visible === false ? ' (hidden)' : ''}</option>)}{editor.draft.event_id && !events.some(event => String(event.id) === editor.draft.event_id) && <option value={editor.draft.event_id}>Previously linked event (unavailable)</option>}</select><small>Selecting an event fills its details. Schedule changes only update the programme entry.</small></label><label className="event-editor-field"><span>Event title *</span><input required value={editor.draft.title} disabled={busy} onChange={event => field('title', event.target.value)} placeholder="Name of the event or activity" /></label><div className="schedule-admin-form__pair"><label className="event-editor-field"><span>Schedule day</span><select value={editor.draft.schedule_day_id} disabled={busy} onChange={event => setEditor({ ...editor, draft: { ...editor.draft, schedule_day_id: Number(event.target.value) } })}>{days.map(row => <option key={row.id} value={row.id}>{row.day} · {scheduleDate(row.date)}</option>)}</select></label><label className="event-editor-field"><span>Time / time range *</span><input required value={editor.draft.time} disabled={busy} onChange={event => field('time', event.target.value)} placeholder="9:00 AM – 10:30 AM" /><small>Use AM/PM or 24-hour time. Use TBA if unconfirmed.</small></label></div><div className="schedule-admin-form__pair"><label className="event-editor-field"><span>Venue</span><input value={editor.draft.venue} disabled={busy} onChange={event => field('venue', event.target.value)} placeholder="Auditorium, seminar hall…" /></label><label className="event-editor-field"><span>Category</span><input list="schedule-categories" value={editor.draft.type} disabled={busy} onChange={event => field('type', event.target.value)} placeholder="Cultural, academic…" /><datalist id="schedule-categories">{[...new Set([...categories, ...events.map(event => event.category)])].filter(Boolean).map(value => <option key={value} value={value} />)}</datalist></label></div><label className="event-editor-field"><span>Duration</span><input value={editor.draft.duration} disabled={busy} onChange={event => field('duration', event.target.value)} placeholder="1 hour 30 min" /><small>Calculated from a time range. You can adjust it.</small></label>{formError && <p className="schedule-admin-form-error" role="alert">{formError}</p>}</form></EventAdminDialog>}
    {deleting && <EventAdminDialog title={deleting.kind === 'day' ? 'Delete this festival day?' : 'Remove this schedule entry?'} eyebrow="Programme planner" description={deleting.title} busy={busy} onClose={() => setDeleting(null)} footer={<><span>This action cannot be undone.</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="event-admin-button is-danger" disabled={busy} onClick={remove}><TrashIcon />{busy ? 'Removing…' : deleting.kind === 'day' ? 'Delete day' : 'Remove entry'}</button></div></>}><div className="event-admin-dialog__body"><p>{deleting.kind === 'day' ? `This removes the day and its ${deleting.count} schedule entries from the website. Linked event catalog pages remain available.` : 'This entry will be removed from the public programme. Its linked event catalog page remains available.'}</p>{formError && <p className="schedule-admin-form-error" role="alert">{formError}</p>}</div></EventAdminDialog>}
    {scanner && <EventAdminDialog title="Import a schedule" eyebrow="Programme planner" description="Extract dates, times and venues from an image or text. Review the results before saving." wide onClose={() => setScanner(false)}><div className="event-admin-dialog__body schedule-admin-scanner"><AIScheduleScanner onScanComplete={scanComplete} onCancel={() => setScanner(false)} /></div></EventAdminDialog>}
    {importing && <EventAdminDialog title="Review your import" eyebrow={`${editionName(importing[0].schedule_type)} programme`} description="Entries are added to matching dates in this edition. Exact title, time and venue matches are skipped." busy={busy} onClose={() => setImporting(null)} footer={<><span>{busy ? importStatus : `${importing.length} days · ${importing.reduce((sum, row) => sum + row.events.length, 0)} events`}</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setImporting(null)}>Cancel</button><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={importSchedule}>{busy ? 'Importing…' : 'Import events'}</button></div></>}><div className="event-admin-dialog__body schedule-admin-import">{formError && <p className="schedule-admin-form-error" role="alert">{formError}</p>}{importing.map(row => <section key={row.date}><h3>{row.day} · {scheduleDate(row.date)}</h3>{row.events.map((slot, index) => <p key={index}><span>{slot.time}</span><strong>{slot.title}<small>{slot.venue || 'Venue to be announced'}</small></strong></p>)}</section>)}</div></EventAdminDialog>}
    {broadcast && <ScheduleBroadcast onClose={() => setBroadcast(false)} onResult={text => setFeedback({ text })} />}
  </section>;
};

async function broadcastRequest(dryRun: boolean) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Please sign in again to manage schedule email.');
  const response = await fetch('/api/broadcast-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ dryRun }), signal: AbortSignal.timeout(120000) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The email service is unavailable. Please retry.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The email service could not complete this request.');
  return result as { total: number; pending: number; sent: number; failed: number; remaining: number; message?: string };
}
function ScheduleBroadcast({ onClose, onResult }: { onClose: () => void; onResult: (text: string) => void }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof broadcastRequest>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const load = async () => { setStats(null); setError(''); try { setStats(await broadcastRequest(true)); } catch (error) { setError(errorMessage(error)); } };
  useEffect(() => { let active = true; void broadcastRequest(true).then(result => { if (active) setStats(result); }).catch(error => { if (active) setError(errorMessage(error)); }); return () => { active = false; }; }, []);
  const send = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const result = await broadcastRequest(false); const text = `${result.sent || 0} emails sent. ${result.failed || 0} failed. ${result.remaining || 0} remaining.`; onResult(text); setStats({ ...result, pending: result.remaining || 0 }); }
    catch (error) { setError(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <EventAdminDialog title="Email the festival programme" eyebrow="Participant updates" description="Send approved participants a link to the current public schedule." busy={busy} onClose={onClose} footer={<><span>Up to 100 recipients per batch</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={onClose}>Close</button><button type="button" className="event-admin-button is-primary" disabled={busy || !stats?.pending} onClick={() => void send()}><EnvelopeClosedIcon />{busy ? 'Sending…' : 'Send next batch'}</button></div></>}><div className="event-admin-dialog__body schedule-admin-broadcast"><div><strong>{stats?.total ?? '—'}</strong><span>Approved recipients</span><strong>{stats?.pending ?? '—'}</strong><span>Awaiting this update</span></div><p>The email links to both editions and uses the current festival year. Recipients who received a schedule email in the last 24 hours are skipped.</p>{!stats && !error && <p role="status">Checking recipient totals…</p>}{stats && !stats.pending && <p role="status">{stats.total ? 'Everyone has received a schedule email in the last 24 hours.' : 'No approved recipients are available yet.'}</p>}{error && <p className="schedule-admin-form-error" role="alert">{error}<button type="button" className="event-admin-text" onClick={() => void load()}><ReloadIcon />Retry</button></p>}</div></EventAdminDialog>;
}
