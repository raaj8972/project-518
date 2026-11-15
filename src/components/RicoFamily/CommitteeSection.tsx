import { useId, type CSSProperties } from 'react';
import { CameraIcon, ChevronDownIcon, CodeIcon, GearIcon, SpeakerLoudIcon, StarIcon, PersonIcon } from '@radix-ui/react-icons';
import type { CoreCommittee } from '../../types/data';
import { isCouncilPerson, splitFamilyPeople, type FamilyPerson } from '../../utils/familyPeople';
import { FamilyPersonCard } from './FamilyPersonCard';
import { FamilyMembersCarousel } from './FamilyMembersCarousel';

export function FamilyPeopleGroup({ people, label }: { people: FamilyPerson[]; label: string }) {
  const { heads, members } = splitFamilyPeople(people);
  const groupStyle = {
    '--family-head-count': Math.min(heads.length, 3),
    '--family-head-column': `${Math.min(heads.length, 3) * 120 + Math.max(0, Math.min(heads.length, 3) - 1) * 12}px`,
  } as CSSProperties;
  return <div className={`family-group ${heads.length && members.length ? 'family-group--split' : ''}`} style={groupStyle}>
    {heads.length > 0 && <section className="family-group-heads" aria-label={`${label} heads`}>
      <h4 className="family-sr-only">{heads.length === 1 ? 'Head' : 'Heads'}</h4>
      <div className="family-heads-grid">{heads.map(head => <FamilyPersonCard key={head.id} person={head} head />)}</div>
    </section>}
    {members.length > 0 && <section className="family-group-members" aria-label={`${label} team members`}>
      <FamilyMembersCarousel members={members} label={`${label} members`} />
    </section>}
    {!heads.length && !members.length && <p className="family-empty">The team will be announced soon.</p>}
  </div>;
}

function committeeIcon(name: string) {
  if (/tech|web|app|it\b/i.test(name)) return CodeIcon;
  if (/media|design|photo/i.test(name)) return CameraIcon;
  if (/pr\b|outreach|sponsor|public/i.test(name)) return SpeakerLoudIcon;
  if (/operation|logistic/i.test(name)) return GearIcon;
  if (/sport|cultur|event/i.test(name)) return StarIcon;
  return PersonIcon;
}

export function CommitteeSection({ committee, members, isOpen, onToggle }: {
  committee: CoreCommittee;
  members: FamilyPerson[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const Icon = committeeIcon(committee.name);
  const people = members.filter(person => !isCouncilPerson(person));
  return <article className={`family-committee ${isOpen ? 'is-open' : ''}`}>
    <h3><button type="button" id={`${id}-heading`} className="family-committee-toggle" aria-expanded={isOpen} aria-controls={`${id}-panel`} onClick={onToggle}>
      <span className="family-committee-icon"><Icon aria-hidden="true" /></span>
      <span className="family-committee-title"><span>{committee.name}</span>{committee.description && <small title={committee.description}>{committee.description}</small>}</span>
      <ChevronDownIcon className="family-committee-chevron" aria-hidden="true" />
    </button></h3>
    <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-heading`} hidden={!isOpen}>
      {isOpen && <FamilyPeopleGroup people={people} label={committee.name} />}
    </div>
  </article>;
}
