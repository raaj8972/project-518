import { Link } from 'react-router-dom';
import { ArrowRightIcon, StarIcon } from '@radix-ui/react-icons';
import { STUDENT_TIERS } from '../../utils/studentTiers';
import { XP_GUIDE_RULES, RPOINT_GUIDE_RULES } from '../../utils/studentGuide';

export default function StudentRewardsGuide() {
  return <section id="points" className="sd-rewards-guide">
    <div className="sd-section-heading">
      <h2>
        <StarIcon /> How to earn XP and R Points</h2>
    </div>
    <p className="sd-guide-intro">Two totals, two purposes: XP tracks your personal progress. R Points decide your Rico Stars performance rank.</p>
    <section className="sd-panel">
      <h3>1. Earn XP through real activity</h3>
      <div className="sd-guide-table-wrap">
        <table>
          <thead>
            <tr>
              <th>What to do</th>
              <th>XP</th>
              <th>When it counts</th>
            </tr>
          </thead>
          <tbody>
            {XP_GUIDE_RULES.map(rule => <tr key={rule.action}>
              <th scope="row">
                {rule.action}
              </th>
              <td>+{rule.points}
              </td>
              <td>
                {rule.detail}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="sd-guide-note">Profile XP is once per account. Your verified XP carries with your account; R Points are counted separately for each festival edition. Likes, unlikes, shoutouts, and repeated registrations do not earn XP.</p>
    </section>
    <section className="sd-panel">
      <h3>2. Move up to Elite</h3>
      <ol className="sd-guide-tiers">
        {STUDENT_TIERS.map(tier => <li key={tier.id} style={{ borderColor: tier.color }}>
          <strong>
            {tier.label}
          </strong>
          <span>
            {tier.minimumXP.toLocaleString('en-IN')} XP{tier.id === 'elite' ? ' + 2 verified events' : ''}
          </span>
        </li>)}
      </ol>
      <p className="sd-guide-note">Your tier updates after participation and results are verified. An event qualification also proves participation. XP alone does not unlock Elite until you have two verified event participations.</p>
    </section>
    <section className="sd-panel">
      <h3>3. Build your Rico Stars score</h3>
      <div className="sd-guide-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Achievement</th>
              <th>R Points</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            {RPOINT_GUIDE_RULES.map(rule => <tr key={rule.action}>
              <th scope="row">
                {rule.action}
              </th>
              <td>
                {rule.points}
              </td>
              <td>
                {rule.detail}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="sd-guide-example">
        <strong>Example:</strong> verified participation (20) + one non-final qualification (10) + final qualification (20) + first place (50) = <strong>100 R Points</strong> for that event, plus <strong>200 XP</strong> for participation and the two qualified rounds.</p>
      <ul className="sd-guide-rules">
        <li>Your best three event scores count towards the leaderboard. XP can grow across all verified events.</li>
        <li>Equal scores share a rank. Students without performance points are shown as not ranked yet.</li>
        <li>Likes are separate recognition under Crowd Favourite, with no competitive points.</li>
        <li>Rejected, cancelled, deleted, and duplicate entries do not multiply scores. Coordinator corrections update the verified totals.</li>
        <li>Choose a past edition in Community to see its performance leaderboard. A new festival edition starts a fresh competition.</li>
      </ul>
      <Link to="/dashboard/community" className="sd-button sd-button-secondary">See the leaderboard <ArrowRightIcon />
      </Link>
    </section>
    <div className="sd-guide-tip">
      <strong>Expecting points?</strong>
      <p>Check that your entry is approved and your coordinator has verified participation or recorded the round result. Use <Link to="/dashboard/messages?type=event">Event help</Link> for result corrections, or <Link to="/dashboard/messages?type=technical">Technical help</Link> if your dashboard will not refresh.</p>
    </div>
  </section>;
}
