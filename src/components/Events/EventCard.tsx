import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircledIcon, ClockIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { EventPoster } from './EventPoster';
import { EventDetailsModal } from './EventDetailsModal';
import { canRegisterNow, getCountdown, getSecondsToClose, getSecondsToOpen } from '../../utils/eventUtils';
import { useSecondClock } from '../../hooks/useSecondClock';

interface EventCardProps {
  event: any; index: number; isOwner: boolean; isFlipped: boolean;
  onFlip: (id: number) => void; onRegister: (id: number) => void; onOpenRules: (id: number) => void;
  isRulesExpanded: boolean; onToggleRules: (id: number) => void;
  eventWinners: any[]; coordinators: any[]; posterFit: 'contain' | 'cover';
  updateEvent: (id: number, data: any) => Promise<void>;
  onOpenProfile?: (userId: string) => void;
  isInCart?: boolean; isRegistered?: boolean; isPaymentPending?: boolean;
}

export const EventCard = React.memo(function EventCard({ event, index, isOwner, isFlipped, onFlip, onRegister, onOpenRules, eventWinners, coordinators, posterFit, updateEvent, onOpenProfile, isRegistered = false, isPaymentPending = false }: EventCardProps) {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState({ x: '50vw', y: '50vh' });
  const opensIn = getSecondsToOpen(event);
  const closesIn = getSecondsToClose(event);
  useSecondClock((opensIn !== null && opensIn > 0) || (closesIn !== null && closesIn > 0));
  const open = canRegisterNow(event);
  const countdown = getCountdown(event);
  const label = isRegistered ? 'Registered' : isPaymentPending ? 'Payment pending' : opensIn && opensIn > 0 ? `Opens in ${countdown}` : open ? 'Registration open' : 'Registration closed';
  const StatusIcon = isRegistered ? CheckCircledIcon : isPaymentPending || (opensIn && opensIn > 0) ? ClockIcon : open ? ArrowRightIcon : LockClosedIcon;
  return <article id={`event-${event.id}`} className="arena-event" style={{ '--arena-index': Math.min(index, 5) } as React.CSSProperties}>
    <button type="button" className="arena-event-trigger" aria-label={`Open details for ${event.title}`} aria-haspopup="dialog" aria-expanded={isFlipped} onClick={e => {
      const rect = e.currentTarget.getBoundingClientRect();
      setOrigin({ x: `${e.detail ? e.clientX : rect.left + rect.width / 2}px`, y: `${e.detail ? e.clientY : rect.top + rect.height / 2}px` });
      onFlip(event.id);
    }}>
      <EventPoster event={event} index={index} posterFit={posterFit} />
    </button>
    <div className="arena-event-caption"><span className={open ? 'arena-status is-open' : 'arena-status'}><StatusIcon />{label}</span><span className="arena-card-hint">Enter arena <ArrowRightIcon /></span></div>
    {isFlipped && <EventDetailsModal event={event} coordinators={coordinators} eventWinners={eventWinners} origin={origin} onClose={() => onFlip(event.id)} onOpenRules={() => onOpenRules(event.id)} onRegister={() => {
      if (isRegistered || isPaymentPending) navigate('/dashboard/events');
      else onRegister(event.id);
    }} isRegistered={isRegistered} isPaymentPending={isPaymentPending} isOwner={isOwner} updateEvent={updateEvent} onOpenProfile={onOpenProfile} />}
  </article>;
});
