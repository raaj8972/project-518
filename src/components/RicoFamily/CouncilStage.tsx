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
      const rig = element.querySelector<HTMLElement>('.council-light-rig');
      if (!rig) return;
      for (const person of visible) {
        const lamp = element.querySelector<HTMLElement>(`[data-light-member="${person.id}"]`);
        const target = element.querySelector<HTMLElement>(`[data-council-member="${person.id}"] .family-person-portrait`);
        if (!lamp || !target) continue;
        const portrait = target.getBoundingClientRect(), rail = rig.getBoundingClientRect();
        lamp.style.left = `${portrait.left + portrait.width / 2 - rail.left}px`;
        lamp.style.top = `${Math.max(0, portrait.top - rail.top - 86)}px`;
        const source = lamp.getBoundingClientRect();
        const distance = portrait.top + portrait.height * .45 - source.top - 12;
        lamp.style.setProperty('--council-light-angle', '0deg');
        lamp.style.setProperty('--family-beam-length', `${Math.max(130, distance + portrait.height * .65 - 20)}px`);
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
    {visible.length > 0 && <div className="council-light-rig" aria-label="Council stage lighting">
      {visible.map((person, index) => {
        const light = COUNCIL_LIGHTS.find(light => assignments[light.id] === person.id);
        return <div key={person.id} className="council-rig-light" data-light-member={person.id} data-council-light={light?.id || 'unassigned'} data-target-member={person.id} style={{ left: `${(index + .5) / visible.length * 100}%` }} aria-label={`${light?.label || 'Unassigned'} light: ${person.name}${light ? '' : ' (off)'}`}>
          <FamilySpotlight color={light?.id} active={Boolean(light)} />
        </div>;
      })}
    </div>}
    {visible.length ? <div className="family-council-roster" aria-label="Council profiles" style={{ '--council-columns': Math.min(4, visible.length) } as CSSProperties}>{visible.map(person => {
      const color = COUNCIL_LIGHTS.find(light => assignments[light.id] === person.id);
      return <div key={person.id} data-council-member={person.id} className={`council-stage-person ${color ? 'is-lit' : ''}`} style={{ '--council-person-light': color?.hex || '#b6cf75' } as CSSProperties}><FamilyPersonCard person={person} council /></div>;
    })}</div> : <div className="family-council-empty"><p>Council profiles will be announced soon.</p></div>}
    <div className="family-council-floor" aria-hidden="true" />
  </div>;
}
