import React, { useId } from 'react';
import { ArrowTopRightIcon, StarIcon } from '@radix-ui/react-icons';
import { yearLabelFor } from '../../utils/eventUtils';
import { eventCategory } from '../../utils/eventPresentation';
import { BRAND_YEAR } from '../../constants/brand';

interface WinnersSectionProps {
  eventWinners: any[];
  events?: { id: string | number; title: string; category?: unknown }[];
  onOpenProfile?: (userId: string) => void;
  onOpenEvent?: (eventId: string | number) => void;
}

function HonoursCrest() {
  return <svg className="honours-crest" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M29 19h22v12c0 9-5 15-11 15S29 40 29 31V19ZM40 46v12m-9 5h18m-16-5h14M29 23h-9v5c0 8 5 12 12 12m19-17h9v5c0 8-5 12-12 12" /><path d="M22 63C9 53 7 36 15 23m-1 17-6-6m7 16-8-2m13 11-8 1m1-27 1-9m44 39c13-10 15-27 7-40m1 17 6-6m-7 16 8-2m-13 11 8 1m-1-27-1-9" /><path d="m40 25 2 4 4 .6-3 3 .7 4.4-3.7-2-3.7 2 .7-4.4-3-3 4-.6 2-4Z" /></svg>;
}

export const WinnersSection: React.FC<WinnersSectionProps> = ({ eventWinners, events = [], onOpenProfile, onOpenEvent }) => {
  const titleId = useId();
  const groups = new Map<string, { title: string; category?: string; eventId?: string | number; winners: any[] }>();
  for (const winner of eventWinners || []) {
    if (!String(winner.name || '').trim()) continue;
    const key = String(winner.event_id);
    const event = events.find(event => String(event.id) === key);
    if (!groups.has(key)) groups.set(key, { title: event?.title || winner.event_title || 'Event name unavailable', category: event ? eventCategory(event.category) : undefined, eventId: event?.id, winners: [] });
    groups.get(key)!.winners.push(winner);
  }
  if (!groups.size) return null;
  const rankLabel = (rank: number) => rank === 1 ? 'Winner' : rank === 2 ? 'Runner-up' : rank === 3 ? 'Third place' : 'Special mention';
  return <section className="arena-champions arena-honours" aria-labelledby={titleId}>
    <header className="honours-heading"><span className="honours-heading-rule" aria-hidden="true" /><HonoursCrest /><p className="honours-eyebrow">THE HONOURS / RICORRENZA {BRAND_YEAR}</p><h2 id={titleId}>Hall of <em>Fame</em></h2><p className="honours-intro">Celebrating the winners of the arena.</p><span className="honours-heading-diamond" aria-hidden="true" /></header>
    <div className={`honours-grid ${groups.size === 1 ? 'honours-grid--single' : ''}`}>
      {[...groups].map(([eventId, group], index) => {
        const ranks = [...new Set(group.winners.map(winner => Number(winner.position) || 4))].sort((a, b) => a - b);
        return <article className="honours-card" key={eventId} style={{ '--honours-index': Math.min(index, 5) } as React.CSSProperties}>
          <header className="honours-card-header"><div><p className="honours-eyebrow">{group.category || 'RICORRENZA'} <span aria-hidden="true">/</span> RESULTS</p><span className="honours-event-label">EVENT</span><h3>{group.title}</h3></div>{group.eventId !== undefined && onOpenEvent ? <button type="button" className="honours-event-link" onClick={() => onOpenEvent(group.eventId!)}>Event details<ArrowTopRightIcon /></button> : <StarIcon className="honours-event-star" aria-hidden="true" />}</header>
          <ol className="honours-placements" aria-label={`${group.title} winners`}>
            {ranks.map(rank => <li className={`honours-placement ${rank === 1 ? 'honours-placement--first' : ''}`} key={rank}><div className="honours-rank" aria-hidden="true">{rank < 4 ? <span>{String(rank).padStart(2, '0')}</span> : <StarIcon />}</div><div className="honours-placement-body"><p className="honours-placement-label">{rankLabel(rank)}</p>{group.winners.filter(winner => (Number(winner.position) || 4) === rank).map((winner, winnerIndex) => {
              const year = yearLabelFor(winner.registration_year || winner.year);
              return <div className="honours-person" key={winner.id || `${rank}-${winnerIndex}`}>
                {winner.user_id && onOpenProfile ? <button type="button" className="honours-name" onClick={() => onOpenProfile(winner.user_id)} aria-label={`View ${winner.name}'s profile`}>{winner.name}<ArrowTopRightIcon /></button> : <span className="honours-name">{winner.name}</span>}
                {year && <span className="honours-year">{year}</span>}
              </div>;
            })}</div>{rank === 1 && <span className="honours-laureate" aria-hidden="true"><HonoursCrest /></span>}</li>)}
          </ol>
          <footer className="honours-card-footer"><span>RICORRENZA {BRAND_YEAR}</span><span>HONOUR ROLL <span aria-hidden="true">/</span> {String(index + 1).padStart(2, '0')}</span></footer>
        </article>;
      })}
    </div>
    <p className="honours-closing"><span aria-hidden="true" />A place in the story. A name in the arena.<span aria-hidden="true" /></p>
  </section>;
};
