import { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useApprovals } from '../../hooks/useApprovals';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { COUNCIL_LIGHTS, councilLightAssignments, councilLightingChanges, type CouncilLightAssignments, type CouncilLightColor } from '../../utils/councilLighting';
import { isCouncilPerson } from '../../utils/familyPeople';
import { CouncilStage } from '../RicoFamily/CouncilStage';
import '../../styles/FamilyTeams.css';

export function CouncilLightingManagement() {
  const { coreTeamMembers = [], updateCoreTeamMember } = useData();
  const { checkRequiresApproval, submitForApproval } = useApprovals();
  const savingProgress = useSavingProgress();
  const [requiresApproval, setRequiresApproval] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<CouncilLightAssignments | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  useEffect(() => { checkRequiresApproval().then(setRequiresApproval).catch(() => setMessage({ error: true, text: 'Could not check permissions. Please reload.' })); }, []);
  const people = coreTeamMembers.filter(isCouncilPerson).sort((a, b) => a.order_position - b.order_position || a.id - b.id);
  const saved = councilLightAssignments(people);
  const selected = draft || saved;
  const dirty = COUNCIL_LIGHTS.some(light => selected[light.id] !== saved[light.id]);
  const select = (color: CouncilLightColor, id: number | null) => {
    const next = { ...selected, [color]: id };
    if (id !== null) for (const other of COUNCIL_LIGHTS) if (other.id !== color && next[other.id] === id) next[other.id] = null;
    setDraft(next); setMessage(null);
  };
  const preview = people.map(person => ({ ...person, color: COUNCIL_LIGHTS.find(light => selected[light.id] === person.id)?.id || null }));

  async function save() {
    if (busy || !dirty || requiresApproval === null) return;
    setBusy(true); setMessage(null);
    try {
      const changes = councilLightingChanges(people, selected);
      const steps = savingProgress.withSteps(Math.max(1, changes.length), 'Saving council lights…');
      for (const change of changes) {
        steps.next('Saving light assignment');
        if (requiresApproval) {
          const result = await submitForApproval('core_team_member', 'update', { color: change.color }, change.id);
          if (!result.success) throw new Error(result.error || 'Could not submit the lighting change.');
        } else await updateCoreTeamMember(change.id, { color: change.color });
      }
      setDraft(null);
      setMessage({ error: false, text: requiresApproval ? 'Lighting changes submitted for owner approval.' : 'Council lighting saved.' });
    } catch (error) { setMessage({ error: true, text: `${error instanceof Error ? error.message : 'Could not save the lights.'} Your selections are still here; retry to finish saving.` }); }
    finally { setBusy(false); savingProgress.done(); }
  }

  return <section className="council-lighting-editor" aria-label="Council light controls">
    <header><div><h3>Council lighting</h3><p>Four stage lights. Choose which council member receives red, blue, green or yellow.</p></div></header>
    <fieldset disabled={busy || requiresApproval === null} className="council-light-controls">
      {COUNCIL_LIGHTS.map(light => <div key={light.id} className="council-light-control">
        <label htmlFor={`council-light-${light.id}`}><span style={{ background: light.hex }} />{light.label} light</label>
        <select id={`council-light-${light.id}`} value={selected[light.id] ?? ''} onChange={event => select(light.id, event.target.value ? Number(event.target.value) : null)}>
          <option value="">Off / no member</option>
          {people.map(person => <option key={person.id} value={person.id}>{person.name}{person.enabled ? '' : ' (hidden)'}</option>)}
        </select>
      </div>)}
    </fieldset>
    <p className="council-light-hint">Each member receives one light. Selecting a member already assigned to another color moves their assignment. Hidden members receive no light on the public page.</p>
    <details className="council-light-preview"><summary>Preview council lighting</summary><div className="rico-family-page"><div className="family-teams"><CouncilStage people={preview} /></div></div></details>
    {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-red-300 text-sm' : 'text-emerald-300 text-sm'}>{message.text}</p>}
    <footer><button type="button" disabled={busy || !dirty} onClick={() => { setDraft(null); setMessage(null); }}>Discard light changes</button><button type="button" disabled={busy || !dirty || requiresApproval === null} onClick={save}>{busy ? 'Saving…' : 'Save council lights'}</button></footer>
  </section>;
}
