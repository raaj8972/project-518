import { useStudentEventTools } from '../../context/StudentEventToolsContext';
import EventWhatsAppGroup from '../../components/shared/EventWhatsAppGroup';
import { findScheduleClashes } from '../../utils/scheduleClashes';
import { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, ArrowTopRightIcon, BackpackIcon, BookmarkIcon, BookmarkFilledIcon, BellIcon, CalendarIcon, Cross2Icon, MagnifyingGlassIcon, PinRightIcon, Share1Icon } from '@radix-ui/react-icons';
import { toast } from 'react-hot-toast';
import { useEventsData } from '../../context/EventsContext';
import { addEventToCalendar, shareEvent } from '../../utils/eventActions';
import { EVENT_FILTERS, eventCategory, eventDate, eventField, filterEventCatalog } from '../../utils/eventPresentation';
import { canRegisterNow } from '../../utils/eventUtils';
import { registrationStatus, registrationTitle, registrationWhen, type StudentRegistration } from '../../utils/studentDashboard';

export default function Events() {
  const tools = useStudentEventTools();
  const { registrations, dataLoading } = useOutletContext<{ registrations: StudentRegistration[]; dataLoading: boolean }>();
  const { events, loading, isLoaded } = useEventsData();
  const [params, setParams] = useSearchParams();
  const registeredView = params.get('view') === 'registrations';
  const savedView = params.get('view') === 'saved';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const visibleEvents = filterEventCatalog(events, query, category, 'visible').filter(event => !savedView || tools?.saved.has(String(event.id)));
  const activeRegistrations = registrations.filter(reg => !reg.deleted_at);
  const filteredRegistrations = activeRegistrations.filter(reg => registrationTitle(reg).toLowerCase().includes(query.toLowerCase().trim()) && (statusFilter === 'All' || (statusFilter === 'pending' ? registrationStatus(reg.status).tone === 'pending' : reg.status === statusFilter)));
  const registeredIds = new Set(activeRegistrations.filter(reg => reg.status !== 'rejected').map(reg => String(reg.event_id)));
  const busy = registeredView ? dataLoading : loading || !isLoaded || (savedView && !!tools && !tools.ready && !tools.error);
  return <div className="sd-events-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">FIND YOUR STAGE</p>
        <h1>There’s something for you<span className="sd-heading-dot">.</span>
        </h1>
        <p>Discover what’s happening. Be part of it.</p>
      </div>
      <Link to="/dashboard/teams" className="sd-button sd-button-secondary">
        <BackpackIcon /> My teams <ArrowTopRightIcon />
      </Link>
    </div>
    <div className="sd-events-toolbar">
      <nav className="sd-tabs" aria-label="Event views">
        <button aria-current={!registeredView && !savedView ? 'page' : undefined} onClick={() => setParams({})}>Discover</button>
        <button aria-current={registeredView ? 'page' : undefined} onClick={() => setParams({ view: 'registrations' })}>My registrations <span>
          {dataLoading ? '—' : activeRegistrations.length}
        </span>
        </button>
        <button aria-current={savedView ? 'page' : undefined} onClick={() => setParams({ view: 'saved' })}><BookmarkIcon /> Saved{tools?.ready && <span>{tools.saved.size}</span>}</button>
        <Link to="/dashboard/active-events">Results & rounds <ArrowTopRightIcon />
        </Link>
      </nav>
      <div className="sd-search">
        <MagnifyingGlassIcon />
        <label className="sr-only" htmlFor="student-event-search">Search events</label>
        <input id="student-event-search" type="search" placeholder="Search events…" value={query} onChange={event => setQuery(event.target.value)} />
        {query && <button aria-label="Clear search" onClick={() => setQuery('')}>
          <Cross2Icon />
        </button>}
      </div>
    </div>
    {tools?.error && <div className="sd-error" role="alert"><span>{tools.error}</span><button onClick={() => void tools.refresh()}>Try again</button></div>}
    <Link to="/dashboard/notifications" className="sd-reminders-link"><BellIcon /> Manage your event reminders <ArrowRightIcon /></Link>
    <div className="sd-filter-row">
      <div className="sd-chips" aria-label={registeredView ? 'Filter by registration status' : 'Filter by category'}>
        {(registeredView ? ['All', 'approved', 'pending', 'rejected'] : EVENT_FILTERS).map(filter => <button key={filter} aria-pressed={(registeredView ? statusFilter : category) === filter} onClick={() => registeredView ? setStatusFilter(filter) : setCategory(filter)}>
          {filter === 'All' ? 'All' : registeredView ? filter === 'pending' ? 'Pending' : registrationStatus(filter).label : filter}
        </button>)}
      </div>
      <span className="sd-result-count">
        {busy ? 'Loading…' : `${registeredView ? filteredRegistrations.length : visibleEvents.length} ${registeredView ? 'entries' : 'events'}`}
      </span>
    </div>
    {busy ? <div className="sd-event-grid" aria-label="Loading events">
      {[0, 1, 2, 3].map(index => <div key={index} className="sd-skeleton sd-skeleton-event" />)}
    </div> : registeredView ? filteredRegistrations.length ? <div className="sd-my-events">
      {filteredRegistrations.map(reg => {
        const status = registrationStatus(reg.status);
        const event = { ...reg.event, id: reg.event_id, title: registrationTitle(reg) };
        return <article className="sd-my-event sd-panel" key={reg.id}>
          <div className="sd-my-event-heading">
            <span className="sd-event-thumb">
              {reg.event?.image ? <img src={reg.event.image} alt="" /> : <CalendarIcon />}
            </span>
            <div>
              <h2>
                {registrationTitle(reg)}
              </h2>
              <p>
                {reg.teams?.name || reg.team_name ? `Team: ${reg.teams?.name || reg.team_name}` : 'Individual entry'}
              </p>
            </div>
            <span className={`sd-status sd-status-${status.tone}`}>
              {status.label}
            </span>
          </div>
          <EventWhatsAppGroup eventId={reg.event_id!} eventTitle={registrationTitle(reg)} eligible={reg.status === 'approved' && reg.is_active === true} approved />
          <p className="sd-event-when">
            <CalendarIcon />
            {registrationWhen(reg)}
          </p>
          <p className="sd-event-when">
            <PinRightIcon />
            {eventField(reg.event?.venue)}
          </p>
          <div className="sd-my-event-actions">
            <Link to={`/events?event=${encodeURIComponent(String(reg.event_id))}`}>Event details <ArrowRightIcon />
            </Link>
            <button onClick={() => { try { addEventToCalendar(event); } catch (error) { toast.error((error as Error).message); } }}>
              <CalendarIcon /> Add to calendar</button>
            <button onClick={() => void shareEvent(event).then(() => { if (!navigator.share) toast.success('Event link copied'); }).catch(error => { if (error.name !== 'AbortError') toast.error('Could not share this event'); })}>
              <Share1Icon /> Share</button>
          </div>
        </article>;
      })}
    </div> : <div className="sd-panel sd-empty">
      <span className="sd-empty-icon">
        <CalendarIcon />
      </span>
      <h2>
        {query || statusFilter !== 'All' ? 'No matching registrations.' : 'Your first event is waiting.'}
      </h2>
      <p>
        {query || statusFilter !== 'All' ? 'Try another search or clear your filters.' : 'Browse the events and choose where you want to take part.'}
      </p>
      <button className="sd-button" onClick={() => { setQuery(''); setStatusFilter('All'); setParams({}); }}>Discover events <ArrowRightIcon />
      </button>
    </div> : visibleEvents.length ? <div className="sd-event-grid">
      {visibleEvents.map(event => <article className="sd-catalog-event" key={event.id}>
        <Link to={`/events?event=${encodeURIComponent(String(event.id))}`} className="sd-catalog-art" aria-label={`View ${event.title}`}>
          {event.image ? <img src={event.image} alt="" loading="lazy" /> : <div className="sd-art-placeholder">
            <CalendarIcon />
            <span>
              {eventCategory(event.category)}
            </span>
          </div>}<span className="sd-event-category">
            {eventCategory(event.category)}
          </span>
        </Link>
        <button className="sd-save-event" aria-label={`${tools?.saved.has(String(event.id)) ? 'Unsave' : 'Save'} ${event.title}`} aria-pressed={tools?.saved.has(String(event.id)) || false} disabled={!tools?.ready || !!tools?.busy} onClick={() => void tools?.toggleSaved(String(event.id))}>{tools?.saved.has(String(event.id)) ? <BookmarkFilledIcon /> : <BookmarkIcon />}</button>
        <div className="sd-catalog-body">
          <p className="sd-catalog-date">
            <CalendarIcon />
            {eventDate(event.date)}
          </p>
          <h2>
            <Link to={`/events?event=${encodeURIComponent(String(event.id))}`}>
              {event.title}
            </Link>
          </h2>
          <p className="sd-catalog-venue">
            {eventField(event.venue)}
          </p>
          {tools?.ready && findScheduleClashes([event], tools.schedule).length > 0 && <p className="sd-clash-hint">Check your schedule: a clash with another entry is possible.</p>}
          <div className="sd-catalog-bottom">
            <span className={`sd-status ${registeredIds.has(String(event.id)) ? 'sd-status-success' : canRegisterNow(event) ? 'sd-status-success' : 'sd-status-neutral'}`}>
              {registeredIds.has(String(event.id)) ? 'Already registered' : canRegisterNow(event) ? 'Registration open' : 'Registration closed'}
            </span>
            <Link to={`/events?event=${encodeURIComponent(String(event.id))}`} aria-label={`Details for ${event.title}`}>Details <ArrowTopRightIcon />
            </Link>
          </div>
        </div>
      </article>)}
    </div> : <div className="sd-panel sd-empty">
      <span className="sd-empty-icon">
        <MagnifyingGlassIcon />
      </span>
      <h2>
        {query || category !== 'All' ? 'No events match just yet.' : savedView ? 'Your shortlist starts here.' : 'The lineup is on its way.'}
      </h2>
      <p>
        {query || category !== 'All' ? 'Try another name or explore all categories.' : savedView ? 'Tap the bookmark on an event to save it to your account.' : 'Published events will appear here when the festival team adds them.'}
      </p>
      {(query || category !== 'All') && <button className="sd-button sd-button-secondary" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button>}
    </div>}
  </div>;
}
