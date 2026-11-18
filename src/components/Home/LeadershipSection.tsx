import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BackpackIcon, PersonIcon } from '@radix-ui/react-icons';
import LeadershipStage from './LeadershipStage';
import LeadershipEyes from './LeadershipEyes';
import '../../styles/HomeLeadership.css';

interface Person {
  id: number;
  name: string;
  image: string;
  title?: string | null;
  role?: string | null;
  enabled: boolean;
  committee_id?: string | number | null;
  order_position: number;
  is_head?: boolean;
  is_council?: boolean;
}
type LeadershipType = 'faculty' | 'committee';
interface LeadershipSectionProps {
  homepageSettings: { show_faculty_heads?: boolean | null; show_committee_heads?: boolean | null; leadership_carousel_speed_ms?: number | null } | null;
  coreCommittees: { id: number | string; name: string }[];
  enabledFacultyHeads: Person[];
  sortedFacultyHeads: Person[];
  sortedCommitteeHeads: Person[];
  facultyPaused: boolean;
  committeePaused: boolean;
  setFacultyPaused: (value: boolean) => void;
  setCommitteePaused: (value: boolean) => void;
  setSelectedType: (type: LeadershipType | null) => void;
  setSelectedIndex: (index: number | null) => void;
  setSelectedPerson: (person: Person | null) => void;
  setFacultyModalOpen: (open: boolean) => void;
}

function Laurel({ flipped = false }: { flipped?: boolean }) {
  return <svg className={`home-leadership__laurel ${flipped ? 'is-flipped' : ''}`} viewBox="0 0 40 80" fill="currentColor" aria-hidden="true">
    <path d="M32 74C5 57 6 25 27 7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    {Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 7) * Math.PI * .75 + Math.PI * .63;
      return <g key={index} transform={`translate(${35 + Math.cos(angle) * 23} ${39 + Math.sin(angle) * 34}) rotate(${index * 14 - 45})`}><ellipse cx="-4" cy="0" rx="2.6" ry="6" /><ellipse cx="3" cy="-3" rx="2.2" ry="5.4" transform="rotate(65 3 -3)" /></g>;
    })}
  </svg>;
}

export default function LeadershipSection({
  homepageSettings, coreCommittees, sortedFacultyHeads, sortedCommitteeHeads,
  facultyPaused, committeePaused, setFacultyPaused, setCommitteePaused,
  setSelectedType, setSelectedIndex, setSelectedPerson, setFacultyModalOpen,
}: LeadershipSectionProps) {
  const [selectedTab, setSelectedTab] = useState<LeadershipType>('faculty');
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = [
    { type: 'faculty' as const, label: 'Faculty Heads', people: sortedFacultyHeads, enabled: homepageSettings?.show_faculty_heads },
    { type: 'committee' as const, label: 'Committee & Council', people: sortedCommitteeHeads, enabled: homepageSettings?.show_committee_heads },
  ].filter(tab => tab.enabled && tab.people.length > 0);
  const current = tabs.find(tab => tab.type === selectedTab) ?? tabs[0];
  if (!current) return null;

  const openProfile = (person: Person, index: number) => {
    setSelectedType(current.type); setSelectedIndex(index); setSelectedPerson(person);
    setFacultyModalOpen(true); setFacultyPaused(true); setCommitteePaused(true);
  };

  return <section className="home-leadership" aria-labelledby={`${id}-heading`}>
    <div className="home-leadership__environment" aria-hidden="true"><LeadershipEyes /></div>
    <div className="home-leadership__content">
      <header className="home-leadership__heading">
        <p className="home-leadership__eyebrow"><span />The inner circle<span /></p>
        <div className="home-leadership__title"><Laurel /><h2 id={`${id}-heading`}>Our Leadership</h2><Laurel flipped /></div>
        <p className="home-leadership__subtitle">Meet the visionary minds and dedicated leaders behind <strong>RICORRENZA.</strong></p>
      </header>
      <div className="home-leadership__tabs" role="tablist" aria-label="Leadership groups">
        {tabs.map((tab, index) => <button key={tab.type} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab"
          id={`${id}-tab-${tab.type}`} aria-controls={`${id}-panel`} aria-selected={current.type === tab.type} tabIndex={current.type === tab.type ? 0 : -1}
          onClick={() => setSelectedTab(tab.type)} onKeyDown={event => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault(); setSelectedTab(tabs[next].type); tabRefs.current[next]?.focus();
          }}>{tab.type === 'faculty' ? <BackpackIcon /> : <PersonIcon />}<span>{tab.label}</span></button>)}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${current.type}`}>
        <LeadershipStage key={current.type} items={current.people} label={current.label}
          intervalMs={homepageSettings?.leadership_carousel_speed_ms ?? 3200} paused={current.type === 'faculty' ? facultyPaused : committeePaused}
          onSelect={openProfile} renderItem={person => {
            const committee = coreCommittees.find(item => item.id === person.committee_id);
            const developer = /lead (?:web )?developer|principal developer|principal engineer/i.test(person.role ?? '') && /web/i.test(committee?.name ?? '');
            const name = developer && /raaj/i.test(person.name) ? 'RAAJ' : person.name;
            const role = current.type === 'faculty' ? person.title : developer ? 'Founder of Website' : person.role;
            return <div className="leadership-portrait"><div className="leadership-portrait__inner">
              <img className="leadership-portrait__image" src={person.image} alt={person.name} loading="lazy" decoding="async" draggable={false} />
              <span className="leadership-portrait__badge">{current.type === 'faculty' ? 'Faculty' : person.is_council ? 'Council' : 'Head'}</span>
              <div className="leadership-portrait__details">
                {current.type === 'faculty' && <img className="leadership-portrait__medical" src="/images/ricorrenza-medical-mark.svg" alt="" aria-hidden="true" />}
                <h3>{name}</h3><span className="leadership-portrait__divider" />{role && <p>{role}</p>}
                <span className="leadership-portrait__laurels" aria-hidden="true"><Laurel /><Laurel flipped /></span>
              </div>
            </div><svg className="leadership-portrait__rim" viewBox="0 0 320 380" preserveAspectRatio="none" aria-hidden="true">
              <path d="M36 3H284L301 22L317 350L296 377H24L3 350L19 22Z" /><path d="M40 10H280L294 26L309 347L292 369H28L11 347L26 26Z" />
            </svg><span className="leadership-portrait__spark leadership-portrait__spark--top" /><span className="leadership-portrait__spark leadership-portrait__spark--bottom" /></div>;
          }} />
      </div>
      <Link className="home-leadership__family-link" to="/rico-family">Meet the entire Rico Family <ArrowRightIcon /></Link>
    </div>
  </section>;
}
