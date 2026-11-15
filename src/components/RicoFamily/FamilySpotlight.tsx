import { memo, useId, type CSSProperties } from 'react';
import { COUNCIL_LIGHTS, type CouncilLightColor } from '../../utils/councilLighting';

export const FamilySpotlight = memo(function FamilySpotlight({ soft = false, color, active = true }: { soft?: boolean; color?: CouncilLightColor; active?: boolean }) {
  const id = useId();
  const light = COUNCIL_LIGHTS.find(light => light.id === color);
  const tone = light?.hex || '#fff6cf';
  return <span className={`family-spotlight ${soft ? 'family-spotlight--soft' : ''} ${active ? '' : 'family-spotlight--off'}`} style={{ '--family-light-color': tone, '--family-lamp-hue': light?.hue || '0deg' } as CSSProperties} aria-hidden="true">
    <span className="family-spotlight-mount" />
    <span className="family-spotlight-head">
    <svg className="family-spotlight-beam" viewBox="0 0 180 230" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-volume`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={tone} stopOpacity=".7" />
          <stop offset=".22" stopColor={tone} stopOpacity=".3" />
          <stop offset=".72" stopColor={tone} stopOpacity=".14" />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-diffuse`} x="-30%" y="-15%" width="160%" height="130%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <path d="M80 0H100L178 225H2Z" fill={`url(#${id}-volume)`} filter={`url(#${id}-diffuse)`} />
      <path d="M86 0H94L135 205H45Z" fill={`url(#${id}-volume)`} opacity=".28" filter={`url(#${id}-diffuse)`} />
    </svg>
    <img className="family-spotlight-fixture" src="/images/partner-stage-lamp.webp" alt="" width="36" height="48" loading="lazy" decoding="async" draggable="false" />
    <span className="family-spotlight-lens" />
    </span>
  </span>;
});
