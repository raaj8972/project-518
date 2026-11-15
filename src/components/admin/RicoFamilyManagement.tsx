import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Crown, Shield, Layers } from 'lucide-react';
import { FacultyHeadsManagement } from './FacultyHeadsManagement';
import { CouncilManagement } from './CouncilManagement';
import { CommitteesManagement } from './CommitteesManagement';
import { TeamMembersManagement } from './TeamMembersManagement';
import { useData } from '../../context/DataContext';

type Section = 'faculty' | 'council' | 'committees' | 'heads' | 'members';

const SECTIONS: { id: Section; label: string; subtitle: string; icon: React.ElementType; color: string; gradient: string }[] = [
  { id: 'faculty', label: 'FACULTY', subtitle: 'Faculty leadership profiles & information', icon: Crown, color: 'amber', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'council', label: 'THE COUNCIL', subtitle: 'Council heads and members, with photos, names and Instagram', icon: Shield, color: 'red', gradient: 'from-red-500 to-rose-500' },
  { id: 'committees', label: 'DEPARTMENTS', subtitle: 'Create departments, choose their display order, and show or hide them on the page', icon: Layers, color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'heads', label: 'COMMITTEE HEADS', subtitle: 'Add 2–3 heads per committee; heads appear together', icon: Crown, color: 'violet', gradient: 'from-violet-500 to-purple-500' },
  { id: 'members', label: 'TEAM MEMBERS', subtitle: 'Photo, name and Instagram profiles in each committee’s member carousel', icon: Users, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
];

export const RicoFamilyManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const openSection: Section = SECTIONS.some(section => section.id === requested) ? requested as Section : 'faculty';
  const selectSection = (section: Section) => setParams(previous => { const next = new URLSearchParams(previous); next.set('section', section); return next; });
  const { facultyHeads, coreTeamMembers, coreCommittees } = useData() as any;

  const councilCount = (coreTeamMembers || []).filter((m: any) => m.is_council || m.isCouncil).length;
  const headsCount = (coreTeamMembers || []).filter((m: any) => m.is_head && !m.is_council && !m.isCouncil).length;
  const membersCount = (coreTeamMembers || []).filter((m: any) => !m.is_head && !m.is_council && !m.isCouncil).length;

  const counts: Record<Section, number> = {
    faculty: (facultyHeads || []).length,
    council: councilCount,
    committees: (coreCommittees || []).length,
    heads: headsCount,
    members: membersCount,
  };

  const selected = SECTIONS.find(section => section.id === openSection)!;
  return <div className="owner-people">
    <header className="owner-management-heading"><h1>People & teams</h1><p>Manage faculty, council, committees and team members.</p></header>
    <nav className="owner-people-tabs" aria-label="People sections">
      {SECTIONS.map(section => <button key={section.id} aria-current={openSection === section.id ? 'page' : undefined} onClick={() => selectSection(section.id)}><section.icon size={17} /><span>{section.label.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())}</span><strong>{counts[section.id]}</strong></button>)}
    </nav>
    <section className="owner-management-panel" aria-label={selected.subtitle}>
      <p className="owner-section-description">{selected.subtitle}</p>
      {openSection === 'faculty' && <FacultyHeadsManagement />}
      {openSection === 'council' && <CouncilManagement />}
      {openSection === 'committees' && <CommitteesManagement />}
      {openSection === 'heads' && <TeamMembersManagement key="heads" isHeadMode />}
      {openSection === 'members' && <TeamMembersManagement key="members" isHeadMode={false} />}
    </section>
  </div>;
};
