import type { Event } from '../../types/data';
import { scheduleDate, scheduleDayTitle, type TimelineDay } from '../../utils/schedulePresentation';
import EventCard from './EventCard';

export default function DailyScheduleSection({ day, idx, now, selected, eventLookup }: {
  day: TimelineDay;
  idx: number;
  now: Date;
  selected: boolean;
  eventLookup: Map<string, Event>;
}) {
  return <section id={`schedule-day-${day.id}`} className="rico-schedule-day" data-selected={selected} aria-labelledby={`schedule-day-heading-${day.id}`}>
    <svg className="rico-schedule-day__frame" viewBox="0 0 760 450" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 29 25 6H62L69 1H685L694 9H732L758 31V424L735 448H25L2 424Z" />
      <path d="M7 42V31L28 11H65L73 6H682M8 418l24 24H730l22-23V35l-21-21h-38M12 29v14m-5-4 26-25M748 418l-22 20" />
    </svg>
    <header className={`rico-schedule-day__header rico-schedule-day__header--${idx % 2 ? 'portal' : 'flag'}`}>
      <span className="rico-schedule-day__badge">{day.day || `Day ${idx + 1}`}</span>
      <div><h2 id={`schedule-day-heading-${day.id}`}>{scheduleDate(day.date)}</h2><p>{scheduleDayTitle(day) || (idx === 0 ? 'Opening day' : 'The festival continues')}</p></div>
    </header>
    {day.events.length ? <ol className="rico-schedule-day__events">{day.events.map(event => <EventCard key={event.id} event={event} date={day.date} currentTime={now} linkedEvent={event.event_id ? eventLookup.get(String(event.event_id)) : undefined} />)}</ol>
      : <p className="rico-schedule-day__empty">No events to display for this day yet.</p>}
  </section>;
}
