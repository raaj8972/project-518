import { useId, type ReactNode } from 'react';
import type { ProfileCropKind } from '../../utils/imageCrop';

const RIM = 'M18 2H82Q90 2 92 10Q99 13 99 21V100Q99 108 92 111Q89 119 81 119H19Q10 119 8 112Q1 109 1 101V21Q1 13 8 10Q10 2 18 2Z';
export function PortraitFrame({ kind, children }: { kind: ProfileCropKind; children: ReactNode }) {
  const id = useId();
  const framed = kind === 'head' || kind === 'council';
  return <div className={`family-person-photo ${framed ? 'family-person-photo--rim' : ''}`}>
    <div className="family-person-portrait" style={framed ? { clipPath: `url(#${id}-clip)` } : undefined}>{children}</div>
    {framed && <>
      <svg className="family-portrait-rim" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-clip`} clipPathUnits="objectBoundingBox"><path d={RIM} transform="scale(.01 .008333333333)" /></clipPath>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--council-person-light, #b5ff51)" /><stop offset=".5" stopColor="#d8e86d" /><stop offset="1" stopColor="#c99b42" /></linearGradient>
        </defs>
        <path className="family-rim-base" d={RIM} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.7" />
        <path className="family-rim-trail" d={RIM} fill="none" stroke="#c9ff78" strokeWidth="5" pathLength="360" strokeDasharray="65 295" />
        <path className="family-rim-travel" d={RIM} fill="none" stroke="#ecffb0" strokeWidth="2" pathLength="360" strokeDasharray="35 325" />
      </svg>
      <span className="family-person-head-badge">{kind === 'council' ? 'Council' : 'Head'}</span>
    </>}
  </div>;
}
