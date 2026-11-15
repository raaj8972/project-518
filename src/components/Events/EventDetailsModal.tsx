import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightIcon, CalendarIcon, ClockIcon, Cross2Icon, ExternalLinkIcon, FileTextIcon, PersonIcon, SewingPinIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../hooks/useFestivalDialog';
import { eventCategory, eventDate, eventField, eventLink, eventText, eventTime, presentRules } from '../../utils/eventPresentation';
import { canRegisterNow, getClosingCountdown, getCountdown, isBeforeOpen, yearLabelFor } from '../../utils/eventUtils';

interface Props {
  event: any; coordinators: any[]; eventWinners: any[]; origin: { x: string; y: string };
  onClose: () => void; onOpenRules: () => void; onRegister: () => void;
  isRegistered: boolean; isPaymentPending: boolean; isOwner: boolean;
  updateEvent: (id: number, data: any) => Promise<void>;
  onOpenProfile?: (userId: string) => void;
}

export function EventDetailsModal({ event, coordinators, eventWinners, origin, onClose, onOpenRules, onRegister, isRegistered, isPaymentPending, isOwner, updateEvent, onOpenProfile }: Props) {
  const titleId = useId();
  const dialogRef = useFestivalDialog(true, onClose);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const rules = presentRules(event.rules);
  const rulesLink = eventLink(event.rules_link || event.rules_url || event.rules_file_url || event.rules_drive_link);
  const liveLink = eventLink(event.watch_live_url);
  const groupLink = eventLink(event.whatsapp_group_link);
  const valid = (value: unknown) => typeof value === 'string' && !['', '0', '-', '—', 'Ø', '∅'].includes(value.trim());
  const staff = (coordinators.length ? coordinators : [{ name: event.coordinator_name, phone: event.coordinator_phone }]).filter(person => valid(person.name) || valid(person.phone));
  const winners = eventWinners.filter(winner => String(winner.event_id) === String(event.id)).sort((a, b) => Number(a.position) - Number(b.position));
  const canRegister = canRegisterNow(event);
  const beforeOpen = isBeforeOpen(event);
  const countdown = beforeOpen ? getCountdown(event) : getClosingCountdown(event);
  const fee = event.payment_enabled && Number(event.payment_amount) > 0 ? `₹${Number(event.payment_amount).toLocaleString('en-IN')}` : 'Free entry';
  const poster = !failed && event.image ? event.image : '/images/ricorrenza-emerald-environment.webp';
  return createPortal(<div className="arena-dialog-layer arena-detail-layer" style={{ '--arena-origin-x': origin.x, '--arena-origin-y': origin.y } as React.CSSProperties}>
    <div className="arena-dialog-backdrop" onClick={onClose} />
    <div className="arena-web-shot" aria-hidden="true"><i /><i /><i /><span /></div>
    <div ref={dialogRef} tabIndex={-1} className="arena-dialog arena-details" role="dialog" aria-modal="true" aria-labelledby={titleId} data-lenis-prevent>
      <button type="button" className="arena-close" aria-label="Close event details" onClick={onClose}><Cross2Icon /></button>
      <div className="arena-details-visual">
        {event.motion_poster_url ? <video aria-label={`${event.title} motion poster`} className="arena-detail-poster" src={event.motion_poster_url} poster={poster} autoPlay={event.motion_poster_autoplay === true && !window.matchMedia('(prefers-reduced-motion: reduce)').matches} muted loop playsInline controls preload="metadata" /> : <img className="arena-detail-poster" src={poster} alt={`${event.title} poster`} onError={() => setFailed(true)} />}
        <div className="arena-details-visual-copy"><span className="arena-eyebrow">RICORRENZA / THE ARENA</span><span className="arena-category-badge">{eventCategory(event.category)}</span><span className="arena-details-visual-title">{event.title}</span></div>
      </div>
      <div className="arena-details-body">
        <div className="arena-details-heading"><p className="arena-eyebrow">{eventCategory(event.category)} <span /> {fee}</p><h2 id={titleId}>{event.title}</h2></div>
        <dl className="arena-logistics">
          <div><CalendarIcon /><dt>Date</dt><dd>{eventDate(event.date)}</dd></div>
          <div><ClockIcon /><dt>Time</dt><dd>{eventTime(event.time)}</dd></div>
          <div><SewingPinIcon /><dt>Venue</dt><dd>{eventField(event.venue)}</dd></div>
        </dl>
        {event.description && <section className="arena-detail-section"><h3>About the event</h3><p className="arena-description">{eventText(event.description)}</p></section>}
        {(event.participants || event.team_max_members > 1) && <div className="arena-format"><PersonIcon /><span>{eventText(event.participants) || (event.team_max_members > 1 ? `Team event · ${event.team_min_members || 1}–${event.team_max_members} members` : 'Individual event')}</span></div>}
        {event.highlights?.length > 0 && <div className="arena-highlights">{event.highlights.filter(Boolean).map((highlight: string, index: number) => <span key={index}>{highlight}</span>)}</div>}
        <button type="button" className="arena-rules-link" onClick={onOpenRules}><FileTextIcon /><span><strong>Rules & guidelines</strong><small>{rules.length ? `${rules.filter(rule => !['h1', 'h2'].includes(rule.level)).length} guidelines · Read before registering` : 'View event guidelines & rulebook'}</small></span><ArrowRightIcon /></button>
        {rulesLink && <a className="arena-inline-link" href={rulesLink} target="_blank" rel="noopener noreferrer">Open official rulebook <ExternalLinkIcon /></a>}
        <section className="arena-detail-section arena-coordinators"><h3>Event coordinators</h3>{staff.length ? staff.map((person, index) => <div className="arena-coordinator" key={person.id || index}><span className="arena-coordinator-initial" aria-hidden="true">{valid(person.name) ? person.name.trim().slice(0, 1).toUpperCase() : 'C'}</span><span><strong>{valid(person.name) ? person.name : 'Event coordinator'}</strong>{valid(person.phone) && <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>{person.phone}</a>}</span></div>) : <p className="arena-muted">Coordinator details will be announced soon.</p>}</section>
        {winners.length > 0 && <section className="arena-detail-section"><h3>Event winners</h3><div className="arena-event-winners">{winners.map(winner => <div key={winner.id}><span>{Number(winner.position) === 1 ? '1st' : Number(winner.position) === 2 ? '2nd' : Number(winner.position) === 3 ? '3rd' : 'Mention'}</span>{winner.user_id && onOpenProfile ? <button onClick={() => onOpenProfile(winner.user_id)}>{winner.name}</button> : <strong>{winner.name}</strong>}<small>{yearLabelFor(winner.registration_year || winner.year)}</small></div>)}</div></section>}
        {(liveLink || groupLink) && <div className="arena-extra-links">{liveLink && <a href={liveLink} target="_blank" rel="noopener noreferrer">Watch live <ExternalLinkIcon /></a>}{groupLink && <a href={groupLink} target="_blank" rel="noopener noreferrer">Event WhatsApp group <ExternalLinkIcon /></a>}</div>}
        {isOwner && <div className="arena-owner-controls"><label><input type="checkbox" checked={!!event.registration_open} disabled={saving} onChange={async e => {
          const checked = e.target.checked; setSaving(true); setError('');
          try { await updateEvent(event.id, { registration_open: checked }); } catch { setError('Could not update registration. Please try again.'); } finally { setSaving(false); }
        }} />{saving ? 'Saving…' : 'Admin: open registration'}</label>{error && <p role="alert">{error}</p>}</div>}
      </div>
      <footer className="arena-details-footer"><div><span className="arena-registration-label">{isRegistered ? 'YOUR ENTRY IS SAVED' : isPaymentPending ? 'COMPLETE YOUR ENTRY' : 'YOUR NEXT MOMENT STARTS HERE'}</span><p>{isRegistered ? 'View your entry in your dashboard.' : isPaymentPending ? 'Complete payment from your dashboard.' : beforeOpen && countdown ? `Registration opens in ${countdown}` : canRegister && countdown && countdown !== 'closed' ? `Closes in ${countdown}` : canRegister ? `${fee} · Registration available` : 'Registration is currently closed.'}</p></div><button type="button" className="arena-gold-button" disabled={!canRegister && !isRegistered && !isPaymentPending} onClick={onRegister}>{isRegistered ? 'View registration' : isPaymentPending ? 'Complete payment' : canRegister ? 'Register now' : 'Registration closed'}<ArrowRightIcon /></button></footer>
    </div>
  </div>, document.body);
}
