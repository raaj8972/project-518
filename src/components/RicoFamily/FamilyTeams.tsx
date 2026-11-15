import { useState } from 'react';
import type { CoreCommittee, CoreTeamMember } from '../../types/data';
import { isCouncilPerson } from '../../utils/familyPeople';
import { CommitteeSection, FamilyPeopleGroup } from './CommitteeSection';
import { CouncilStage } from './CouncilStage';
import '../../styles/FamilyTeams.css';

export function FamilyTeams({ committees, members, loading = false }: { committees: CoreCommittee[]; members: CoreTeamMember[]; loading?: boolean }) {
  const enabled = committees.filter(committee => committee.enabled).sort((a, b) => a.order_position - b.order_position);
  const council = members.filter(isCouncilPerson).sort((a, b) => a.order_position - b.order_position);
  const [openId, setOpenId] = useState<number | null | undefined>(undefined);
  const activeId = openId === undefined ? enabled[0]?.id : openId;
  const unassigned = members.filter(member => member.enabled && !isCouncilPerson(member) && member.committee_id == null);

  return <div className="family-teams">
    <section className="family-teams-section family-council-section" aria-labelledby="family-council-title">
      <div className="family-section-heading"><span aria-hidden="true" /><h2 id="family-council-title">The Council</h2><span aria-hidden="true" /></div>
      <CouncilStage people={council} />
    </section>
    <section className="family-teams-section" aria-labelledby="family-committees-title">
      <div className="family-section-heading"><span aria-hidden="true" /><h2 id="family-committees-title">Core Committee</h2><span aria-hidden="true" /></div>
      {loading ? <div className="family-teams-loading" role="status" aria-label="Loading committees"><div /><div /><div /></div> : <>
        <div className="family-committees-list">{enabled.map(committee => <CommitteeSection key={committee.id} committee={committee}
          members={members.filter(member => member.enabled && member.committee_id === committee.id)}
          isOpen={activeId === committee.id} onToggle={() => setOpenId(activeId === committee.id ? null : committee.id)} />)}</div>
        {unassigned.length > 0 && <div className="family-council-panel family-unassigned"><h3 className="family-group-label">Core team</h3><FamilyPeopleGroup people={unassigned} label="Core team" /></div>}
        {!enabled.length && !unassigned.length && <p className="family-empty">Our committees will be announced soon.</p>}
      </>}
    </section>
  </div>;
}
