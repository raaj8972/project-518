import { memo, useEffect, useRef, type CSSProperties } from 'react';
import { useCinematicIntroActive, useStaticExperience } from '../../../hooks/useStaticExperience';
import './FestivalAtmosphere.css';

// Fixed positions keep the scene stable across renders and viewport changes.
const fireflies = Array.from({ length: 20 }, (_, index) => ({
  '--fly-x': `${(index * 37 + 7) % 100}%`,
  '--fly-y': `${(index * 23 + 11) % 88}%`,
  '--fly-drift': `${index % 2 ? -26 : 34}px`,
  '--fly-size': `${index % 3 === 0 ? 3 : 2}px`,
  '--fly-duration': `${12 + index % 7 * 2}s`,
  '--fly-delay': `${-index * 2.7}s`,
}) as CSSProperties);

/** Composited weather sits above the scenery and below all copy and controls. */
export const FestivalAtmosphere = memo(function FestivalAtmosphere() {
  const host = useRef<HTMLDivElement>(null);
  const staticExperience = useStaticExperience();
  const introActive = useCinematicIntroActive();

  useEffect(() => {
    const element = host.current;
    const section = element?.closest('section');
    if (!element || !section) return;
    let inView = true;
    const update = () => {
      element.dataset.running = String(inView && !document.hidden && !introActive && !staticExperience);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer?.observe(section);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [introActive, staticExperience]);

  return (
    <div ref={host} className="festival-weather" data-running="false" data-static={staticExperience} aria-hidden="true">
      <div className="festival-weather__clouds festival-weather__clouds--far" />
      <div className="festival-weather__clouds festival-weather__clouds--near" />
      <div className="festival-weather__storm festival-weather__storm--west">
        <svg viewBox="0 0 240 480" fill="none" focusable="false">
          <path className="festival-weather__bolt-halo" d="M131 0 112 56 132 91 90 145 109 179 66 237 85 270 42 348 63 378 27 465" />
          <path d="M131 0 112 56 132 91 90 145 109 179 66 237 85 270 42 348 63 378 27 465" />
          <path className="festival-weather__bolt-branch" d="m90 145 63 25 12 44 43 31m-142-8-31 15-8 45m58-27 38 17 9 42" />
        </svg>
      </div>
      <div className="festival-weather__storm festival-weather__storm--east">
        <svg viewBox="0 0 240 480" fill="none" focusable="false">
          <path className="festival-weather__bolt-halo" d="m108 0 24 68-31 39 37 54-23 49 44 56-13 42 39 64-16 46 36 62" />
          <path d="m108 0 24 68-31 39 37 54-23 49 44 56-13 42 39 64-16 46 36 62" />
          <path className="festival-weather__bolt-branch" d="m138 161 48 14 7 37 33 23m-111-25-47 32-3 32-32 24m113 10-39 38 4 35" />
        </svg>
      </div>
      <div className="festival-weather__mist festival-weather__mist--back" />
      <div className="festival-weather__mist festival-weather__mist--front" />
      <div className="festival-weather__fireflies">
        {fireflies.map((style, index) => <span key={index} style={style} />)}
      </div>
    </div>
  );
});
