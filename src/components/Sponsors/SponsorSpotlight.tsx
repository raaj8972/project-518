'use client';

import { memo, useId } from 'react';

/** The mount stays on the stage; tracking changes only the head's angle. */
const SponsorSpotlight = memo(function SponsorSpotlight({ slot }: { slot: number }) {
  const id = useId();

  return (
    <div className={`partner-spotlight partner-spotlight--${slot}`} data-partner-light aria-hidden="true">
      <span className="partner-spotlight__mount" />
      <span className="partner-spotlight__head">
        <svg className="partner-spotlight__beam" viewBox="0 0 240 400" preserveAspectRatio="none" fill="none" focusable="false">
          <defs>
            <linearGradient id={`${id}-beam`} x1="120" y1="0" x2="120" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5f0ba" stopOpacity=".72" />
              <stop offset=".16" stopColor="#dce9a1" stopOpacity=".36" />
              <stop offset=".48" stopColor="#bccd82" stopOpacity=".15" />
              <stop offset="1" stopColor="#b3ce85" stopOpacity="0" />
            </linearGradient>
            <filter id={`${id}-soft`} x="-30%" y="-10%" width="160%" height="120%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <path d="M114 4h12l108 380H6L114 4Z" fill={`url(#${id}-beam)`} filter={`url(#${id}-soft)`} />
          <path d="M118 4h4l54 350H64L118 4Z" fill={`url(#${id}-beam)`} opacity=".32" filter={`url(#${id}-soft)`} />
        </svg>
        <img className="partner-spotlight__fixture" src="/images/partner-stage-lamp.webp" alt="" width="72" height="96" decoding="async" draggable="false" />
      </span>
    </div>
  );
});

export default SponsorSpotlight;
