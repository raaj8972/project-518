import { useSearchParams } from 'react-router-dom';
import { ChatBubbleIcon, DesktopIcon, ArrowRightIcon, CalendarIcon } from '@radix-ui/react-icons';
import { useEventsData } from '../../context/EventsContext';
import { ChatPanel } from '../../components/shared/ChatPanel';

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const { events, loading } = useEventsData();
  const kind = params.get('type') === 'technical' ? 'technical' : 'event';
  const eventId = params.get('event') || '';
  const visible = events.filter(event => event.visible !== false);
  const selected = events.find(event => String(event.id) === eventId);
  const chooseKind = (type: string) => setParams(type === 'technical' ? { type } : { type, ...(eventId ? { event: eventId } : {}) });
  return <div className="sd-help-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">THE RIGHT PEOPLE, ONE MESSAGE AWAY</p>
        <h1>How can we help<span className="sd-heading-dot">?</span>
        </h1>
        <p>Event questions go to your coordinator. App issues go directly to the technical team.</p>
      </div>
    </div>
    <div className="sd-support-types" aria-label="Choose a support team">
      <button aria-pressed={kind === 'event'} onClick={() => chooseKind('event')}>
        <CalendarIcon />
        <span>
          <strong>Event help</strong>
          <small>Rules, registration, timings, venue, and results</small>
          <b>Talk to the event coordinator <ArrowRightIcon />
          </b>
        </span>
      </button>
      <button aria-pressed={kind === 'technical'} onClick={() => chooseKind('technical')}>
        <DesktopIcon />
        <span>
          <strong>Technical help</strong>
          <small>App errors, entry pass problems, and other technical issues</small>
          <b>Talk to the technical team <ArrowRightIcon />
          </b>
        </span>
      </button>
    </div>
    {kind === 'event' && <div className="sd-support-event">
      <label htmlFor="support-event">Which event do you need help with?</label>
      <select id="support-event" value={eventId} onChange={event => setParams({ type: 'event', ...(event.target.value ? { event: event.target.value } : {}) })}>
        <option value="">
          {loading ? 'Loading events…' : 'Choose an event'}
        </option>
        {visible.map(event => <option key={event.id} value={String(event.id)}>
          {event.title}
        </option>)}{eventId && !visible.some(event => String(event.id) === eventId) && <option value={eventId}>
          {selected?.title || 'Your event conversation'}
        </option>}
      </select>
      <p>You can ask about an event before registering. Your message is routed to that event’s coordinator.</p>
    </div>}
    {kind === 'technical' || eventId ? <div className="sd-support-panel" key={`${kind}:${eventId}`}>
      <ChatPanel mode="student" eventId={kind === 'event' ? eventId : undefined} />
    </div> : <section className="sd-panel sd-empty">
      <span className="sd-empty-icon">
        <ChatBubbleIcon />
      </span>
      <h2>Choose an event to get started.</h2>
      <p>Keep each event’s questions in its own conversation so the right coordinator can help.</p>
    </section>}
  </div>;
}
