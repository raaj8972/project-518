import { useEffect, useState } from 'react';
import { ArrowRightIcon, CalendarIcon, ClockIcon, SewingPinIcon } from '@radix-ui/react-icons';
import { eventCategory, eventDate, eventField, eventText, eventTime } from '../../utils/eventPresentation';
import '../../styles/EventArena.css';

export function EventPoster({ event, index = 0, posterFit = 'cover' }: { event: any; index?: number; posterFit?: 'cover' | 'contain' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [event.image]);
  return <div className="arena-poster">
    <img className={`arena-poster-image arena-poster-image--${posterFit}`} src={!failed && event.image ? event.image : '/images/ricorrenza-emerald-environment.webp'} alt="" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
    <span className="arena-poster-shade" />
    <span className="arena-category-badge">{eventCategory(event.category)}</span>
    <span className="arena-poster-content">
      <span className="arena-poster-title">{event.title || 'Your event title'}</span>
      <span className="arena-poster-description">{eventText(event.description) || 'Your event description appears here.'}</span>
      <span className="arena-poster-meta"><CalendarIcon /><span>{eventDate(event.date)}</span>{event.time && <><span className="arena-meta-dot">·</span><ClockIcon /><span>{eventTime(event.time)}</span></>}</span>
      <span className="arena-poster-meta"><SewingPinIcon /><span>{eventField(event.venue)}</span></span>
    </span>
    <span className="arena-card-arrow" aria-hidden="true"><ArrowRightIcon /></span>
  </div>;
}
