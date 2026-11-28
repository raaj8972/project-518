import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { CopyIcon, PlusIcon, CheckIcon, Cross2Icon, ReaderIcon } from '@radix-ui/react-icons';
import { useEventCart } from '../../context/EventCartContext';
import { useDomainRealtime } from '../../hooks/useDomainRealtime';
import TeamGuideOverlay, { TEAM_GUIDE_STEPS } from '../../components/dashboard/TeamGuideOverlay';
import * as api from '../../services/studentTeams';
import '../../styles/StudentTeams.css';
interface Context {
  user: { id: string };
  setPendingInvitesCount: (count: number) => void;
}
export const Teams = () => {
  const { user, setPendingInvitesCount } = useOutletContext<Context>();
  const [params, setParams] = useSearchParams();
  const { cartCount, openDrawer } = useEventCart();
  const [data, setData] = useState<api.TeamWorkspace>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState(params.get('tab') === 'requests' ? 'requests' : 'teams');
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [iqmg, setIQMG] = useState('');
  const [student, setStudent] = useState<api.IQMGStudent | null>();
  const [code, setCode] = useState('');
  const [foundTeam, setFoundTeam] = useState<api.TeamLookup | null>();
  const request = useRef(0);
  const actionBusy = useRef(false);

  const load = useCallback(async () => {
    const version = ++request.current;
    try {
      const next = await api.getTeamWorkspace();
      if (version !== request.current) return;
      setData(next);
      setError('');
      setPendingInvitesCount(next.requests.filter(item => item.incoming).length);
      setSelectedTeam(previous => next.teams.some(team => team.id === previous && team.owner_id === user.id)
        ? previous : next.teams.find(team => team.owner_id === user.id)?.id || '');
    } catch (error: any) {
      if (version === request.current) setError(error.message || 'Teams could not load');
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [user.id, setPendingInvitesCount]);
  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);
  useDomainRealtime(`iqmg-team-workspace-${user.id}`, true,
    ['student_groups', 'student_group_members', 'student_team_requests', 'student_iqmg_identities'], load);
  useEffect(() => {
    if (params.get('create') === '1') {
      setCreate(true);
      setTab('teams');
      const next = new URLSearchParams(params);
      next.delete('create');
      setParams(next, { replace: true });
    }
    if (params.get('tab') === 'requests') setTab('requests');
  }, [params, setParams]);

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setBusy(id);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await load();
    } catch (error: any) {
      setError(error.message || 'Please try again.');
    } finally {
      actionBusy.current = false;
      setBusy('');
    }
  };
  const verified = data?.identity?.status === 'verified';
  const owned = data?.teams.filter(team => team.owner_id === user.id) || [];
  const incoming = data?.requests.filter(item => item.incoming) || [];
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Team ID copied. Share it only with people you want to join.');
    } catch {
      setError('Could not copy. Select and copy the Team ID shown on the card.');
    }
  };
  return <div className="st-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">FIND YOUR CREW</p>
        <h1>My teams<span className="sd-heading-dot">.</span>
        </h1>
        <p>Invite with IQMG. Join with Team ID. Membership always needs acceptance.</p>
      </div>
      <TeamGuideOverlay userId={user.id} />
    </div>
    {params.get('from') === 'cart' && cartCount > 0 && <div className="event-cart-return">
      <div>
        <strong>Your event cart is saved.</strong>
        <p>Get the required members accepted, then return to register.</p>
      </div>
      <button onClick={openDrawer}>Return to event cart</button>
    </div>}
    {error && <div className="sd-error" role="alert">
      <span>
        {error}
      </span>
      <button onClick={() => void load()}>Try again</button>
    </div>}{message && <p className="st-message" role="status">
      {message}
    </p>}
    {!loading && !verified && <div className="st-identity">
      <h2>Verify your college IQMG first</h2>
      <p>
        {data?.identity?.iqmg_number ? `${data.identity.iqmg_number} · ${data.identity.status === 'correction_required' ? 'correction required' : 'waiting for verification against the college PDF roster'}` : 'Add the IQMG number printed on your college ID.'} Once verified, you can create teams, invite students and request to join.</p>
      <Link className="sd-button" to="/dashboard/settings">Open My profile</Link>
    </div>}
    <nav className="sd-tabs" aria-label="Team views">
      <button aria-current={tab === 'teams' ? 'page' : undefined} onClick={() => setTab('teams')}>My teams ({data?.teams.length || 0})</button>
      <button aria-current={tab === 'requests' ? 'page' : undefined} onClick={() => setTab('requests')}>Requests {incoming.length > 0 && <span>
        {incoming.length}
      </span>}
      </button>
    </nav>
    {loading ? <p role="status">Loading teams…</p> : tab === 'teams' ? <>
      <div className="st-actions">
        <button className="sd-button" disabled={!verified || !!busy} onClick={() => setCreate(value => !value)}>
          <PlusIcon /> Create a team</button>
      </div>
      {create && <form className="sd-panel st-form" onSubmit={event => {
        event.preventDefault();
        void run('create', async () => {
          const team = await api.createStudentTeam(name);
          setSelectedTeam(team.id);
          setName('');
          setCreate(false);
        }, 'Team created. Copy its Team ID or invite a friend by IQMG.');
      }}>
        <h2>Create your team</h2>
        <label>Team name<input disabled={!!busy} value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={70} required placeholder="For example, Campus Crew" />
        </label>
        <p>Your unique Team ID is generated automatically. Nobody joins until the right person accepts a request.</p>
        <button className="sd-button" disabled={!verified || !!busy}>
          {busy === 'create' ? 'Creating…' : 'Create team'}
        </button>
        <button className="sd-button sd-button-secondary" type="button" onClick={() => setCreate(false)}>Cancel</button>
      </form>}
      <div className="st-two-columns">
        <section className="sd-panel st-form">
          <h2>Invite a student by IQMG</h2>
          <p>Only the captain sends invitations. Enter the full college number, then confirm the name and batch.</p>
          <label>Your team<select disabled={!!busy} value={selectedTeam} onChange={event => setSelectedTeam(event.target.value)}>
            <option value="">Select a team you captain</option>
            {owned.map(team =>
              <option key={team.id} value={team.id}>
                {team.name}
              </option>)}
          </select>
          </label>
          <form onSubmit={event => { event.preventDefault(); void run('lookup-student', async () => setStudent(await api.findIQMGStudent(iqmg)), ''); }}>
            <label>Student IQMG number<input disabled={!!busy} value={iqmg} onChange={event => { setIQMG(event.target.value.toUpperCase()); setStudent(undefined); }} placeholder="e.g. IQMG6738" required autoComplete="off" />
            </label>
            <button className="sd-button sd-button-secondary" disabled={!verified || !selectedTeam || !!busy}>Find student</button>
          </form>
          {student === null && <p>No verified student was found for this exact IQMG number.</p>}{student && <div className="st-result">
            <strong>
              {student.full_name}
            </strong>
            <small>
              {student.batch || 'Student'} · {/^iqmg/i.test(student.iqmg_number) ? student.iqmg_number : `IQMG ${student.iqmg_number}`}
            </small>
            <button className="sd-button" disabled={!!busy} onClick={() => void run('invite', async () => { await api.inviteIQMGStudent(selectedTeam, student.iqmg_number); setStudent(undefined); setIQMG(''); }, 'Invitation sent. The student must accept before joining.')}>Send invitation</button>
          </div>}
        </section>
        <section className="sd-panel st-form">
          <h2>Request to join a team</h2>
          <p>Ask the captain for the Team ID. Finding a team never adds you automatically.</p>
          <form onSubmit={event => { event.preventDefault(); void run('lookup-team', async () => setFoundTeam(await api.findStudentTeam(code)), ''); }}>
            <label>Team ID<input disabled={!!busy} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setFoundTeam(undefined); }} placeholder="TEAM-XXXXXXXXXX" required autoComplete="off" />
            </label>
            <button className="sd-button sd-button-secondary" disabled={!verified || !!busy}>Find team</button>
          </form>
          {foundTeam === null && <p>No team was found. Check the full Team ID with the captain.</p>}{foundTeam && <div className="st-result">
            <strong>
              {foundTeam.name}
            </strong>
            <small>
              {foundTeam.team_code} · Captain: {foundTeam.captain_name} · {foundTeam.member_count} accepted participants</small>
            <button className="sd-button" disabled={!!busy} onClick={() => void run('join', async () => { await api.requestTeamJoin(foundTeam.id); setFoundTeam(undefined); setCode(''); }, 'Join request sent. The captain must approve it.')}>Request to join</button>
          </div>}
        </section>
      </div>
      {data?.teams.length ? <div className="st-team-list">
        {data.teams.map(team =>
          <article className="sd-panel" key={team.id}>
            <header>
              <div>
                <h2>
                  {team.name}
                </h2>
                <p>Captain: {team.captain_name} · {team.members.length} accepted participants</p>
              </div>
              <button className="sd-button sd-button-secondary" onClick={() => void copy(team.team_code)} aria-label={`Copy Team ID for ${team.name}`}>
                <CopyIcon /> {team.team_code}
              </button>
            </header>
            <ul className="st-roster">
              {team.members.map(member =>
                <li key={member.user_id}>
                  <span className="sd-avatar">
                    {member.avatar_url ? <img src={member.avatar_url} alt="" /> : member.full_name.slice(0, 1)}
                  </span>
                  <span>
                    <strong>
                      {member.full_name}{member.user_id === user.id ? ' · You' : ''}
                    </strong>
                    <small>
                      {member.captain ? 'Captain' : member.batch || 'Member'}
                    </small>
                  </span>
                  {!member.captain && (team.owner_id === user.id || member.user_id === user.id) && <button disabled={!!busy} onClick={() => void run(`remove-${member.user_id}`, () => api.removeTeamMember(team.id, member.user_id), 'Membership removed. Existing event entries are unchanged.')}>
                    {member.user_id === user.id ? 'Leave' : 'Remove'}
                  </button>}
                </li>)}
            </ul>
            {team.owner_id === user.id && <button className="st-danger" disabled={!!busy} onClick={() => { if (window.confirm(`Delete ${team.name}? This removes the team and its pending requests; existing event registrations remain.`)) void run(`delete-${team.id}`, () => api.deleteStudentTeam(team.id), 'Team deleted.'); }}>Delete team</button>}
          </article>)}
      </div> : <div className="sd-panel sd-empty">
        <h2>Your team starts here.</h2>
        <p>Create a team or ask a captain for their Team ID.</p>
      </div>}
    </> : <section className="st-request-list">
      {data?.requests.length ? data.requests.map(item =>
        <article className="sd-panel" key={item.id}>
          <div>
            <span className="sd-eyebrow">
              {item.incoming ? 'ACTION NEEDED' : 'WAITING FOR A RESPONSE'}
            </span>
            <h2>
              {item.team_name}
            </h2>
            <p>
              {item.kind === 'invite' ? `${item.captain_name} invited ${item.incoming ? 'you' : item.student_name}` : `${item.student_name} requested to join`}
            </p>
            <small>
              {item.team_code} · Expires {new Date(item.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</small>
          </div>
          <div className="st-request-actions">
            {item.incoming ? <>
              <button className="sd-button" disabled={!!busy} onClick={() => void run(item.id, () => api.respondTeamRequest(item.id, true), item.kind === 'invite' ? 'You joined the team.' : 'Join request approved.')}>
                <CheckIcon /> {item.kind === 'invite' ? 'Accept invitation' : 'Approve request'}
              </button>
              <button className="sd-button sd-button-secondary" disabled={!!busy} onClick={() => void run(item.id, () => api.respondTeamRequest(item.id, false), 'Request declined.')}>
                <Cross2Icon /> Decline</button>
            </> : <button className="sd-button sd-button-secondary" disabled={!!busy} onClick={() => void run(item.id, () => api.cancelTeamRequest(item.id), 'Request cancelled.')}>Cancel request</button>}
          </div>
        </article>) : <div className="sd-panel sd-empty">
        <h2>No pending requests.</h2>
        <p>Invitations and team join requests will appear here.</p>
      </div>}
    </section>}
    <details className="sd-panel st-help">
      <summary>
        <ReaderIcon /> IQMG, Team IDs and approvals explained</summary>
      {TEAM_GUIDE_STEPS.map((item, index) =>
        <section key={item.title}>
          <h2>
            {index + 1}. {item.title}
          </h2>
          <p>
            {item.text}
          </p>
        </section>)}<p>Changing a team does not edit already submitted event registrations. Ask the event coordinator for event-entry corrections. Requests are limited to prevent spam; a declined request cannot be resent for 24 hours.</p>
    </details>
  </div>;
};

export default Teams;
