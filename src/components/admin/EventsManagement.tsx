import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, DotsHorizontalIcon, EnvelopeClosedIcon, ExternalLinkIcon, EyeNoneIcon, EyeOpenIcon, FileTextIcon, ImageIcon, MagnifyingGlassIcon, Pencil2Icon, PlusIcon, StarFilledIcon, StarIcon, TrashIcon } from '@radix-ui/react-icons';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { getEventWhatsAppGroup } from '../../services/eventWhatsAppGroups';
import { supabase } from '../../lib/supabase';
import { canRegisterNow } from '../../utils/eventUtils';
import { EVENT_CATEGORIES, EVENT_POSTER_GUIDE, eventCategory, eventDate, eventLink, eventTime, filterEventCatalog } from '../../utils/eventPresentation';
import { BRAND_YEAR } from '../../constants/brand';
import type { Event } from '../../types/data';
import EventWinnersEditor from './EventWinnersEditor';
import { AIEventScanner } from './events/AIEventScanner';
import { EventAdminDialog } from './events/EventAdminDialog';
import { EventEditorDialog } from './events/EventEditorDialog';
import { EventEmailBranding } from './events/EventEmailBranding';
import { EventNotificationDialog, type EventMailDraft } from './events/EventNotificationDialog';
import { draftKey, makeEventDraft, notificationRules, serializeEventDraft, validateEventDraft, type EventEditorDraft } from './events/eventEditor';
import { persistEventDraft, type EventSaveProgress } from './events/eventPersistence';
import { sendEventUpdate } from './events/sendEventUpdate';
import '../../styles/EventsAdmin.css';

interface EditorSession { key: string; id?: number; initial: EventEditorDraft; original?: Event; progress: EventSaveProgress }
const progressKey = (id?: number) => 'admin_event_save_progress_' + (id ?? 'new');
const messageOf = (reason: unknown) => reason instanceof Error ? reason.message : 'The action could not complete. Please try again.';

export const EventsManagement = () => {
  const { events = [], eventCoordinators = [], eventWinners = [], homepageSettings, siteSettings, loading, eventsError, connectionStatus, refreshAll,
    addEventWithCoordinators, updateEvent, deleteEvent, reorderEvents, addEventCoordinator, updateEventCoordinator, deleteEventCoordinator, addNotification } = useData();
  const { checkRequiresApproval, submitForApproval } = useApprovals();
  const savingProgress = useSavingProgress();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [visibility, setVisibility] = useState('all');
  const [registration, setRegistration] = useState('all');
  const [editor, setEditor] = useState<EditorSession | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notifyEvent, setNotifyEvent] = useState<Event | null>(null);
  const [winnersEvent, setWinnersEvent] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<Event | null>(null);
  const [order, setOrder] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [, setClock] = useState(0);
  const operation = useRef(false);
  const dragIndex = useRef<number | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setClock(value => value + 1), 30_000); return () => window.clearInterval(timer); }, []);
  const filtered = useMemo(() => filterEventCatalog(events, query, category, visibility), [events, query, category, visibility]);
  const shown = filtered.filter(event => registration === 'all' || (registration === 'open' ? canRegisterNow(event) : registration === 'featured' ? event.featured : !canRegisterNow(event)));
  const totalRegistrations = events.reduce((sum, event) => sum + Math.max(0, Number(event.current_registrations) || 0), 0);
  const configuredTypes = (siteSettings as unknown as { registration_participant_types?: unknown })?.registration_participant_types;
  const participantTypes = Array.isArray(configuredTypes) ? configuredTypes.filter((type): type is string => typeof type === 'string' && !!type.trim() && !type.toLowerCase().includes('select') && !type.trim().startsWith('.')) : [];
  const showFeedback = (text: string, error = false) => setFeedback({ text, error });
  const run = async (action: () => Promise<void>, id?: number) => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setBusyId(id ?? null); setFeedback(null);
    try { await action(); } catch (reason) { showFeedback(messageOf(reason), true); }
    finally { operation.current = false; setBusy(false); setBusyId(null); }
  };
  const loadProgress = (id: number | undefined, initial: EventEditorDraft): EventSaveProgress => {
    try { const stored = JSON.parse(localStorage.getItem(progressKey(id)) || 'null'); if (stored && stored.id != null && Array.isArray(stored.coordinators) && (id == null || stored.id === id)) return stored; } catch { /* Start from the published event when a checkpoint is unavailable. */ }
    return { id, coordinators: initial.coordinators.map(coord => ({ ...coord })) };
  };
  const openEditor = async (event?: Event) => {
    if (operation.current) return;
    await run(async () => {
      if (!event) {
        const unfinished = loadProgress(undefined, makeEventDraft());
        if (unfinished.id != null && unfinished.payload) {
          const saved = events.find(row => row.id === unfinished.id) || { ...JSON.parse(unfinished.payload), id: unfinished.id } as Event;
          const localDraft = localStorage.getItem(draftKey());
          if (localDraft) localStorage.setItem(draftKey(saved.id), localDraft);
          localStorage.setItem(progressKey(saved.id), JSON.stringify(unfinished)); localStorage.removeItem(progressKey()); localStorage.removeItem(draftKey());
          event = saved;
        }
      }
      const group = event ? await getEventWhatsAppGroup(event.id) : '';
      const initial = makeEventDraft(event, event ? eventCoordinators.filter(coord => coord.event_id === event!.id) : [], group || '');
      setEditor({ key: crypto.randomUUID(), id: event?.id, initial, original: event, progress: loadProgress(event?.id, initial) });
    }, event?.id);
  };
  const approvedWrite = async (event: Event, patch: Partial<Event>) => {
    if (await checkRequiresApproval()) {
      const result = await submitForApproval('event', 'update', patch, event.id);
      if (!result.success) throw new Error(result.error || 'The update could not be submitted.');
      showFeedback('Event update submitted for owner approval.');
    } else { await updateEvent(event.id, patch); showFeedback('Event updated.'); }
  };
  const toggleRegistration = (event: Event) => run(() => approvedWrite(event, { registration_open: !canRegisterNow(event), registration_timer_enabled: false }), event.id);
  const saveEditor = async (draft: EventEditorDraft) => {
    if (!editor) return;
    const problem = validateEventDraft(draft); if (problem) throw new Error(problem.message);
    const checkpoint = () => { try { localStorage.setItem(progressKey(editor.id), JSON.stringify(editor.progress)); } catch { /* Saving still works when local storage is disabled. */ } };
    const payload = serializeEventDraft(draft);
    const coords = draft.coordinators.filter(coord => coord.name.trim());
    const steps = savingProgress.withSteps(2, 'Saving event…');
    try {
      steps?.next?.('Saving event details');
      if (await checkRequiresApproval()) {
        const result = await submitForApproval('event', editor.id == null ? 'create' : 'update', { ...payload, coordinators: coords.map((coord, index) => ({ id: coord.id, name: coord.name.trim(), phone: coord.phone.trim() || null, order_position: index + 1 })) }, editor.id);
        if (!result.success) throw new Error(result.error || 'The event could not be submitted for approval.');
        showFeedback('Event submitted for owner approval.');
      } else {
        const saved = await persistEventDraft(draft, { create: addEventWithCoordinators, update: updateEvent, addCoordinator: addEventCoordinator, updateCoordinator: updateEventCoordinator, deleteCoordinator: deleteEventCoordinator }, editor.progress, checkpoint);
        steps?.next?.('Finishing event setup');
        const original = editor.original;
        const scheduleChanged = original && ['date', 'time', 'venue'].some(key => String((original as unknown as Record<string, unknown>)[key] || '') !== String((payload as Record<string, unknown>)[key] || ''));
        const rulesChanged = original && JSON.stringify(original.rules || []) !== JSON.stringify(payload.rules || []);
        showFeedback('Event saved successfully.');
        if (draft.notify && (scheduleChanged || rulesChanged)) {
          try { const message = await sendEventUpdate({ id: saved.id, title: payload.title, date: payload.date, time: payload.time, venue: payload.venue }, { type: scheduleChanged && rulesChanged ? 'combined' : rulesChanged ? 'rules' : 'schedule', message: draft.note, rules: notificationRules(payload.rules) }); showFeedback('Event saved. ' + message); }
          catch (reason) { showFeedback('Event saved. Emails could not send: ' + messageOf(reason) + ' Use Notify participants to retry.', true); }
        }
        if (scheduleChanged) void addNotification?.({ title: 'Schedule updated: ' + payload.title, message: [payload.date || 'Date to be announced', payload.time || 'Time to be announced', payload.venue || 'Venue to be announced'].join(' · '), type: 'urgent', visible: true, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3 * 86400_000).toISOString(), priority: 10, link_url: '/events?event=' + saved.id }).catch(() => {});
      }
      try { localStorage.removeItem(progressKey(editor.id)); localStorage.removeItem(draftKey(editor.id)); } catch { /* Optional draft cleanup. */ }
      setEditor(null);
    } catch (reason) { throw new Error((editor.progress.payload ? 'Event details are saved. Remaining coordinator changes are kept for retry. ' : '') + messageOf(reason)); }
    finally { savingProgress.done(); }
  };
  const removeEvent = async () => {
    if (!deleting) return;
    await run(async () => {
      if (await checkRequiresApproval()) { const result = await submitForApproval('event', 'delete', {}, deleting.id); if (!result.success) throw new Error(result.error); showFeedback('Deletion submitted for owner approval.'); }
      else { await deleteEvent(deleting.id); showFeedback('Event deleted.'); }
      setDeleting(null);
    }, deleting.id);
  };
  const move = (index: number, delta: number) => setOrder(previous => { if (!previous || index + delta < 0 || index + delta >= previous.length) return previous; const next = [...previous]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  const saveOrder = async () => { if (!order) return; await run(async () => { const ok = await reorderEvents(order); if (!ok) throw new Error('The event order could not save. Your arrangement is kept for retry.'); setOrder(null); showFeedback('Public event order saved.'); }); };
  const importEvents = async (rows: Record<string, unknown>[], images: string[]) => {
    setScannerOpen(false);
    await run(async () => {
      const progress = savingProgress.withSteps(rows.length, 'Importing events…');
      let saved = 0;
      try {
        const needsApproval = await checkRequiresApproval();
        for (const row of rows) {
          try {
            const draft = makeEventDraft(row as unknown as Event);
            draft.fields.date = /^\d{4}-\d{2}-\d{2}$/.test(String(row.date)) ? String(row.date) : '';
            if (!eventLink(draft.fields.image)) draft.fields.image = '';
            const problem = validateEventDraft(draft); if (problem) throw new Error(problem.message);
            if (typeof row.image_index === 'number' && images[row.image_index]) {
              const response = await fetch(images[row.image_index]); const blob = await response.blob();
              const file = new File([blob], 'event-poster-' + Date.now() + '.jpg', { type: blob.type || 'image/jpeg' });
              const path = 'events/' + crypto.randomUUID() + '.jpg';
              const upload = await supabase.storage.from('event-images').upload(path, file, { upsert: false }); if (upload.error) throw upload.error;
              draft.fields.image = supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl;
            } else if (!eventLink(draft.fields.image)) draft.fields.image = '';
            const payload = serializeEventDraft(draft);
            const contacts = Array.isArray(row.coordinators) ? row.coordinators : [];
            if (needsApproval) { const result = await submitForApproval('event', 'create', { ...payload, coordinators: contacts }); if (!result.success) throw new Error(result.error); }
            else await addEventWithCoordinators({ ...payload, current_registrations: 0 } as Partial<Event>, contacts as { name: string; phone?: string }[]);
            saved++;
          } catch { /* Report partial import counts and keep the catalog usable. */ }
          progress?.next?.('Processed ' + String(row.title || 'event'));
        }
        showFeedback(saved + ' of ' + rows.length + ' events imported' + (saved < rows.length ? '. Some events need valid details before they can be imported.' : '.'), saved < rows.length);
      } finally { savingProgress.done(); }
    });
  };
  const clearFilters = () => { setQuery(''); setCategory('All'); setVisibility('all'); setRegistration('all'); };
  return <section className="events-admin-workspace" aria-label="Events management">
    <header className="events-admin-heading"><div><span>WEBSITE / EVENTS</span><h2>Your event lineup</h2><p>Plan the details. Open registrations. Keep your participants in the loop.</p></div><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={() => void openEditor()}><PlusIcon />Add event</button></header>
    <div className="events-admin-summary"><span><strong>{events.length}</strong>All events</span><span><strong>{events.filter(event => event.visible !== false).length}</strong>Published</span><span><strong>{events.filter(event => event.featured && event.visible !== false).length}</strong>Homepage highlights</span><span><strong>{totalRegistrations}</strong>Registrations</span></div>
    <div className="events-admin-tools"><div><button type="button" className="event-admin-button is-secondary" disabled={busy || events.length < 2} onClick={() => setOrder(events.map(event => event.id))}><LayersReorder />Reorder events</button><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setScannerOpen(true)}><FileTextIcon />Import with AI</button></div><button type="button" className="event-admin-button is-quiet" disabled={busy} onClick={() => setBrandOpen(true)}><EnvelopeClosedIcon />Email branding</button></div>
    {eventsError && <div className="event-admin-feedback is-error" role="alert">{eventsError} <button type="button" className="event-admin-text" disabled={busy} onClick={() => void refreshAll()}>Retry loading</button></div>}
    {feedback && <div className={'event-admin-feedback' + (feedback.error ? ' is-error' : '')} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</div>}
    <div className="events-admin-catalog"><header><label className="events-admin-search"><MagnifyingGlassIcon /><span className="sr-only">Search events</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search event name or venue…" /></label><label className="events-admin-filter"><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="All">All categories</option>{EVENT_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label><label className="events-admin-filter"><span>Publication</span><select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="all">All events</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label><label className="events-admin-filter"><span>Registration</span><select value={registration} onChange={event => setRegistration(event.target.value)}><option value="all">All statuses</option><option value="open">Open now</option><option value="closed">Closed / scheduled</option><option value="featured">Homepage highlights</option></select></label></header>
      <div className="events-admin-result-count"><span role="status">{shown.length} of {events.length} events</span>{(query || category !== 'All' || visibility !== 'all' || registration !== 'all') && <button type="button" className="event-admin-text" onClick={clearFilters}>Clear filters</button>}</div>
      <div className="events-admin-table-heading" aria-hidden="true"><span>Event</span><span>Schedule & venue</span><span>Registrations</span><span>Status</span><span /></div>
      {loading && !events.length ? <div className="events-admin-loading" role="status">{[0, 1, 2].map(item => <div key={item}><i /><span /><span /></div>)}<span className="sr-only">Loading events…</span></div> : shown.map(event => {
        const open = canRegisterNow(event);
        const scheduled = event.registration_timer_enabled && event.registration_opens_at && Date.parse(event.registration_opens_at) > Date.now();
        const winnerCount = eventWinners.filter(winner => winner.event_id === event.id).length;
        return <article className="events-admin-row" key={event.id} aria-label={event.title}>
          <div className="events-admin-row__identity"><span className="events-admin-row__poster">{eventLink(event.image) || event.image?.startsWith('/') ? <img src={event.image} alt="" loading="lazy" onError={change => { change.currentTarget.hidden = true; }} /> : <ImageIcon />}</span><div><span>{eventCategory(event.category)}{event.featured && <small><StarFilledIcon />Homepage</small>}</span><button type="button" disabled={busy} onClick={() => void openEditor(event)}>{event.title}</button><p>{event.date ? (event as unknown as { registration_default_mode?: string }).registration_default_mode === 'team' ? 'Team event' : 'Individual entry' : 'Schedule to be announced'}</p></div></div>
          <div className="events-admin-row__schedule"><span>{eventDate(event.date)}</span><small>{eventTime(event.time)}</small><small>{event.venue || 'Venue to be announced'}</small></div>
          <div className="events-admin-row__registrations"><strong>{Math.max(0, Number(event.current_registrations) || 0)}{event.max_participants ? <small> / {event.max_participants}</small> : null}</strong><span>{open ? 'Accepting entries' : scheduled ? 'Opening scheduled' : 'Not accepting entries'}</span></div>
          <div className="events-admin-row__status"><span className={'event-admin-badge' + (event.visible !== false ? ' is-positive' : '')}>{event.visible !== false ? 'Published' : 'Hidden'}</span><small>{open ? 'Registration open' : scheduled ? 'Registration scheduled' : 'Registration closed'}</small></div>
          <div className="events-admin-row__actions"><button type="button" className="event-admin-icon" aria-label={'Edit ' + event.title} disabled={busy} onClick={() => void openEditor(event)}>{busyId === event.id ? <span className="event-admin-busy-dot" /> : <Pencil2Icon />}</button><details className="event-admin-row-menu"><summary aria-label={'More actions for ' + event.title}><DotsHorizontalIcon /></summary><div onClick={change => { if ((change.target as HTMLElement).closest('button, a')) change.currentTarget.parentElement?.removeAttribute('open'); }}>
            <button type="button" disabled={busy} onClick={() => void run(() => approvedWrite(event, { featured: !event.featured }), event.id)}>{event.featured ? <StarFilledIcon /> : <StarIcon />}{event.featured ? 'Remove homepage highlight' : 'Feature on homepage'}</button>
            <button type="button" disabled={busy} onClick={() => void run(() => approvedWrite(event, { visible: event.visible === false }), event.id)}>{event.visible === false ? <EyeOpenIcon /> : <EyeNoneIcon />}{event.visible === false ? 'Publish event' : 'Hide event'}</button>
            <button type="button" disabled={busy} onClick={() => void toggleRegistration(event)}><CalendarIcon />{open ? 'Close registration' : 'Open registration now'}</button>
            <button type="button" disabled={busy} onClick={() => setNotifyEvent(event)}><EnvelopeClosedIcon />Notify participants</button>
            <button type="button" disabled={busy} onClick={() => setWinnersEvent(event)}><StarIcon />Manage winners ({winnerCount})</button>
            {event.visible !== false && <a href={'/events?event=' + encodeURIComponent(String(event.id))} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon />View public event</a>}
            <button type="button" className="is-danger" disabled={busy} onClick={() => setDeleting(event)}><TrashIcon />Delete event</button>
          </div></details></div>
        </article>;
      })}
      {!loading && !shown.length && <div className="events-admin-empty"><CalendarIcon /><h3>{events.length ? 'No matching events' : eventsError || connectionStatus === 'offline' || connectionStatus === 'degraded' ? 'Events could not load' : 'Your lineup starts here'}</h3><p>{events.length ? 'Try another name, category or publication status.' : 'Create an event with its rules, poster and registration details.'}</p><button type="button" className="event-admin-button is-secondary" onClick={() => events.length ? clearFilters() : eventsError || connectionStatus !== 'ok' ? void refreshAll() : void openEditor()}>{events.length ? 'Clear filters' : eventsError || connectionStatus !== 'ok' ? 'Retry' : 'Add your first event'}</button></div>}
    </div>
    <details className="events-admin-guide"><summary>Poster and publishing guide</summary><p>{EVENT_POSTER_GUIDE}. The public card adds titles and a dark fade automatically. Homepage highlights follow the Featured setting, and past or hidden events are excluded.</p></details>
    {editor && <EventEditorDialog key={editor.key} initial={editor.initial} eventId={editor.id} participantTypes={participantTypes} onClose={() => setEditor(null)} onSave={saveEditor} />}
    {brandOpen && <EventEmailBranding logo={homepageSettings?.brand_logo_url} year={homepageSettings?.brand_year || BRAND_YEAR} onClose={() => setBrandOpen(false)} />}
    {scannerOpen && <AIEventScanner onScanComplete={importEvents} onCancel={() => setScannerOpen(false)} />}
    {notifyEvent && <EventNotificationDialog event={notifyEvent} onClose={() => setNotifyEvent(null)} onSend={(draft: EventMailDraft) => sendEventUpdate(notifyEvent, draft)} />}
    {winnersEvent && <EventAdminDialog title="Event winners" description={winnersEvent.title} onClose={() => setWinnersEvent(null)}><div className="event-admin-dialog__body event-admin-winners"><EventWinnersEditor eventId={winnersEvent.id} /></div></EventAdminDialog>}
    {deleting && <EventAdminDialog title="Delete event?" description={deleting.title} onClose={() => setDeleting(null)} busy={busy} footer={<><span>This removes the event from the website.</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="event-admin-button is-danger" disabled={busy} onClick={() => void removeEvent()}><TrashIcon />{busy ? 'Deleting…' : 'Delete event'}</button></div></>}><div className="event-admin-dialog__body"><p>This event and its publication details will be removed. This action cannot be undone.</p>{feedback?.error && <p className="event-admin-feedback is-error" role="alert">{feedback.text}</p>}</div></EventAdminDialog>}
    {order && <EventAdminDialog title="Arrange the event lineup" description="This order is used in the public event catalog. Homepage highlights also follow their dates." onClose={() => setOrder(null)} busy={busy} footer={<><span>{order.length} events</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={() => setOrder(null)}>Cancel</button><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={() => void saveOrder()}>{busy ? 'Saving…' : 'Save order'}</button></div></>}><div className="event-admin-dialog__body event-admin-order">{feedback?.error && <p className="event-admin-feedback is-error" role="alert">{feedback.text}</p>}{order.map((id, index) => { const event = events.find(row => row.id === id); return event && <div key={id} draggable={!busy} onDragStart={() => { dragIndex.current = index; }} onDragEnd={() => { dragIndex.current = null; }} onDragOver={change => { change.preventDefault(); if (dragIndex.current == null || dragIndex.current === index || busy) return; const next = [...order]; const [item] = next.splice(dragIndex.current, 1); next.splice(index, 0, item); dragIndex.current = index; setOrder(next); }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{event.title}<small>{eventCategory(event.category)}</small></strong><button type="button" className="event-admin-icon" aria-label={'Move ' + event.title + ' up'} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUpIcon /></button><button type="button" className="event-admin-icon" aria-label={'Move ' + event.title + ' down'} disabled={busy || index === order.length - 1} onClick={() => move(index, 1)}><ArrowDownIcon /></button></div>; })}</div></EventAdminDialog>}
  </section>;
};
function LayersReorder() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /><path d="m11 2 3 2-3 2M5 10l-3 2 3 2" /></svg>; }
