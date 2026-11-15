import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { CoreTeamMember } from '../../types/data';
import { COUNCIL_LIGHTS, councilLightAssignments } from '../../utils/councilLighting';
import { FamilyPersonCard } from './FamilyPersonCard';
import { FamilySpotlight } from './FamilySpotlight';

export function CouncilStage({ people }: { people: CoreTeamMember[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const assignments = councilLightAssignments(people);
  const visible = people.filter(person => person.enabled);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      for (const light of COUNCIL_LIGHTS) {
        const lamp = element.querySelector<HTMLElement>(`[data-council-light="${light.id}"]`);
        const target = element.querySelector<HTMLElement>(`[data-council-member="${assignments[light.id]}"] .family-person-portrait`);
        if (!lamp || !target) continue;
        const source = lamp.getBoundingClientRect(), portrait = target.getBoundingClientRect();
        const dx = portrait.left + portrait.width / 2 - source.left - source.width / 2;
        const dy = portrait.top + portrait.height * .45 - source.top - 12;
        lamp.style.setProperty('--council-light-angle', `${-Math.atan2(dx, Math.max(1, dy)) * 180 / Math.PI}deg`);
        lamp.style.setProperty('--family-beam-length', `${Math.max(130, Math.hypot(dx, dy) + portrait.height * .65 - 20)}px`);
        lamp.style.setProperty('--family-beam-width', `${Math.max(120, portrait.width * 1.65)}px`);
      }
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [people]);

  return <div ref={stage} className="family-council-panel">
    <p className="family-council-eyebrow">Student council</p>
    <div className="family-council-truss" aria-hidden="true" />
    <div className="council-light-rig" aria-label="Council stage lighting">
      {COUNCIL_LIGHTS.map(light => {
        const target = visible.find(person => person.id === assignments[light.id]);
        return <div key={light.id} className="council-rig-light" data-council-light={light.id} data-target-member={target?.id || ''} aria-label={`${light.label} light: ${target?.name || 'off'}`}>
          <FamilySpotlight color={light.id} active={Boolean(target)} />
        </div>;
      })}
    </div>
    {visible.length ? <div className="family-council-roster" aria-label="Council profiles" style={{ '--council-columns': Math.min(4, visible.length) } as CSSProperties}>{visible.map(person => {
      const color = COUNCIL_LIGHTS.find(light => assignments[light.id] === person.id);
      return <div key={person.id} data-council-member={person.id} className={`council-stage-person ${color ? 'is-lit' : ''}`} style={{ '--council-person-light': color?.hex || 'transparent' } as CSSProperties}><FamilyPersonCard person={person} council /></div>;
    })}</div> : <div className="family-council-empty"><p>Council profiles will be announced soon.</p></div>}
    <div className="family-council-floor" aria-hidden="true" />
  </div>;
}
