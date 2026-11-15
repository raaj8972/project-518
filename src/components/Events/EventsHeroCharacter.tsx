import { useId } from 'react';

/** Display the original reference pixels through a silhouette, without its page UI. */
export function EventsHeroCharacter({ placement = 'hero' }: { placement?: 'hero' | 'menu' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`arena-hero-character arena-hero-character--${placement}`} viewBox="570 0 516 455" aria-hidden="true" focusable="false" data-events-reference-character>
    <defs>
      <clipPath id={`${id}-silhouette`} clipPathUnits="userSpaceOnUse">
        <path d="M759 21 C809 11 854 30 893 49 L927 82 L954 115 L974 148 C1015 140 1053 145 1086 161 L1086 455 L580 455 C608 427 614 381 634 344 C654 308 681 282 703 257 C682 250 663 243 657 232 C664 213 686 198 704 181 C713 150 717 100 724 54 Z" />
      </clipPath>
      <clipPath id={`${id}-header-repair`} clipPathUnits="userSpaceOnUse">
        <rect x="570" y="83" width="516" height="372" />
      </clipPath>
      <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.72" stopColor="white" />
        <stop offset="1" stopColor="black" />
      </linearGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="570" y="0" width="516" height="455">
        <rect x="570" y="0" width="516" height="455" fill={`url(#${id}-fade)`} />
      </mask>
    </defs>
    <g clipPath={`url(#${id}-silhouette)`} mask={`url(#${id}-mask)`}>
      <image href="/images/events-reference-source.png" x="0" y="0" width="1086" height="1448" />
      {/* Skip the source masthead rule, keeping the rest of the face continuous. */}
      <g clipPath={`url(#${id}-header-repair)`}>
        <image href="/images/events-reference-source.png" x="0" y="-5" width="1086" height="1448" />
      </g>
    </g>
  </svg>;
}
