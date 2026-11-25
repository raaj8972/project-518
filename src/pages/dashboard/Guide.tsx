import { useEffect } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { ArrowRightIcon, ReaderIcon } from '@radix-ui/react-icons';
import StudentRewardsGuide from '../../components/dashboard/StudentRewardsGuide';
import { STUDENT_GUIDE_STEPS } from '../../utils/studentGuide';
import { studentTier } from '../../utils/studentTiers';
export default function Guide() {
  const context = useOutletContext<{ xpData: { total_xp: number; tier: string; verified_events?: number; } | null; } | null>();
  const rewards = context?.xpData;
  const { hash } = useLocation();
  useEffect(() => { if (hash === '#points') document.getElementById('points')?.scrollIntoView({ block: 'start' }); }, [hash]);
  const eventsRemaining = Math.max(0, 2 - (rewards?.verified_events ?? 0));
  return <div className="sd-guide-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</p>
        <h1>Know your dashboard<span className="sd-heading-dot">.</span>
        </h1>
        <p>Where to find everything, what to do first, and how your points are earned.</p>
      </div>
      <Link className="sd-button" to="/dashboard?tour=1">
        <ReaderIcon /> Replay quick tour</Link>
    </div>
    {rewards && <section className="sd-panel sd-guide-progress">
      <h2>Your progress</h2>
      <p>
        <strong>
          {rewards.total_xp.toLocaleString('en-IN')} XP</strong> · {studentTier(rewards.tier).label} · {rewards.verified_events ?? 0} verified events</p>
      {rewards.tier === 'elite' ? <p>Elite unlocked. Keep participating to build your Rico Stars score.</p> : <p>To unlock Elite: {Math.max(0, 1000 - rewards.total_xp).toLocaleString('en-IN')} more XP and {eventsRemaining} more verified {eventsRemaining === 1 ? 'event' : 'events'}. Both requirements must be met.</p>}
    </section>}
    <section className="sd-panel sd-guide-start">
      <h2>First time here? Start with these three steps.</h2>
      <ol>
        <li>Check your name, batch, phone, and college IQMG number in <Link to="/dashboard/settings">My profile</Link>.</li>
        <li>Browse <Link to="/dashboard/events">Events</Link>, read the rules, and register or set up your team.</li>
        <li>Track approval in <Link to="/dashboard/events?view=registrations">My registrations</Link>. Open <Link to="/dashboard/passes">Entry pass</Link> when your pass is issued.</li>
      </ol>
    </section>
    <section className="sd-guide-map">
      <h2>Where everything lives</h2>
      <div>
        {STUDENT_GUIDE_STEPS.filter(step => step.id !== 'points').map(step =>
          <Link key={step.id} className="sd-panel" to={step.path}>
            <span>
              <strong>
                {step.title}
              </strong>
              <small>
                {step.location}
              </small>
              <p>
                {step.description}
              </p>
            </span>
            <ArrowRightIcon />
          </Link>)}
      </div>
    </section>
    <StudentRewardsGuide />
  </div>;
}
