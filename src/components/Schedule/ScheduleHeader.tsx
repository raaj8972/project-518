export default function ScheduleHeader({ days }: { days: number }) {
  return <header className="rico-schedule-hero">
    <picture className="rico-schedule-hero__art" aria-hidden="true">
      <source media="(max-width: 640px)" srcSet="/images/schedule/emerald-timeline-mobile.webp" />
      <img src="/images/schedule/emerald-timeline.webp" alt="" width="1920" height="640" decoding="async" />
    </picture>
    <div className="rico-schedule-hero__copy">
      <p className="rico-schedule-eyebrow"><span />Event timeline<span /></p>
      <h1>RICO SCHEDULE</h1>
      <p className="rico-schedule-hero__intro">Your guide to {days ? `${days} ${days === 1 ? 'day' : 'days'} of ` : ''}events, competitions, and epic evenings at Ricorrenza.</p>
    </div>
  </header>;
}
