import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

export function FestivalCrown({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 32 28" fill="none" aria-hidden="true"><path d="m4 8 6 6 6-10 6 10 6-6-3 15H7L4 8Z" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 25h16" stroke="currentColor" strokeWidth="1.6" /><circle cx="4" cy="7" r="2" fill="currentColor" /><circle cx="16" cy="3" r="2" fill="currentColor" /><circle cx="28" cy="7" r="2" fill="currentColor" /></svg>;
}

export function FestivalLaurel() {
  return <svg viewBox="0 0 48 66" fill="currentColor" aria-hidden="true"><path d="M39 62C15 54 9 33 18 8l1 1C13 34 20 52 40 60Z" />{[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${i < 2 ? 0 : (i - 1) * 3}, ${i * 10})`}><path d="M16 17C5 14 6 6 8 2c6 3 9 8 8 15Z" /><path d="M17 22c-1-11 6-15 10-16 0 8-3 13-10 16Z" /></g>)}</svg>;
}

export function FestivalSectionHeading({ kind }: { kind: 'events' | 'stars' }) {
  return <header className={`festival-spotlight-heading festival-spotlight-heading--${kind}`}>
    <p className="festival-spotlight-eyebrow">{kind === 'stars' ? 'R I C O' : 'Annual festival / IQ City'}</p>
    {kind === 'events' && <p className="festival-spotlight-brand">{BRAND_NAME} <span>{BRAND_YEAR}</span></p>}
    <div className="festival-spotlight-title-row"><i aria-hidden="true" /><h2 id={kind === 'stars' ? 'rico-stars-title' : 'featured-events-title'}>{kind === 'stars' ? 'RICO STARS' : 'FEATURED EVENTS'}</h2><i aria-hidden="true" /></div>
    <p className="festival-spotlight-caption">{kind === 'stars' ? 'Rankings, score, and rise to explore' : `Don’t miss these highlighted experiences at ${BRAND_NAME} ${BRAND_YEAR}`}</p>
  </header>;
}
