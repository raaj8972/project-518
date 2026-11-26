import { ChevronRightIcon, ExternalLinkIcon, SewingPinFilledIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router-dom';
import type { Event } from '../../types/data';
import { scheduleCategory, scheduleEventStatus, scheduleTime, type TimelineEvent } from '../../utils/schedulePresentation';
import { canRegisterNow } from '../../utils/eventUtils';
import ScheduleEventIcon from './ScheduleEventIcon';

export default function EventCard({ event, date, currentTime, linkedEvent }: {
  event: TimelineEvent;
  date: string;
  currentTime: Date;
  linkedEvent?: Event;
}) {
  const status = scheduleEventStatus(event, date, currentTime);
  const canRegister = linkedEvent && canRegisterNow(linkedEvent);
  const href = linkedEvent?.visible !== false && linkedEvent
    ? `/events?${canRegister ? 'register' : 'event'}=${encodeURIComponent(String(linkedEvent.id))}`
    : null;
  const content = <>
    <span className="rico-schedule-event__icon"><ScheduleEventIcon type={scheduleCategory(event)} title={event.title} /></span>
    <span className="rico-schedule-event__copy">
      <span className="rico-schedule-event__category">{status === 'live' ? <><i />Live now</> : status === 'ended' ? 'Ended' : scheduleCategory(event)}</span>
      <span className="rico-schedule-event__title">{event.title}</span>
      <span className="rico-schedule-event__venue"><SewingPinFilledIcon aria-hidden="true" />{event.venue || event.location || 'Venue to be announced'}</span>
    </span>
    {href && <ChevronRightIcon className="rico-schedule-event__arrow" aria-hidden="true" />}
  </>;
  const mapUrl = event.venue_location && /^https?:\/\//i.test(event.venue_location) ? event.venue_location : null;
  return <li className="rico-schedule-event" data-status={status}>
    <span className="rico-schedule-event__node" aria-hidden="true" />
    <div className="rico-schedule-event__time"><span>{scheduleTime(event, date)}</span><span className="sr-only">{status === 'tba' ? 'Timing to be announced' : status}</span></div>
    <div className="rico-schedule-event__body">
      {href ? <Link to={href} className="rico-schedule-event__main" aria-label={`${canRegister ? 'Register for' : 'View'} ${event.title}`}>{content}</Link> : <div className="rico-schedule-event__main">{content}</div>}
      {(event.description || event.speaker || mapUrl) && <details className="rico-schedule-event__details"><summary>Event details</summary>
        {event.description && <p>{event.description}</p>}{event.speaker && <p>With {event.speaker}</p>}
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer">Open venue map<ExternalLinkIcon aria-hidden="true" /></a>}
      </details>}
    </div>
  </li>;
}
