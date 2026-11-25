import { useStudentEventTools } from '../../context/StudentEventToolsContext';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRightIcon, ArrowTopRightIcon, BackpackIcon, CalendarIcon, CheckCircledIcon,
  ChevronRightIcon, ClockIcon, ReaderIcon, StarIcon, ViewGridIcon,
} from '@radix-ui/react-icons';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import { SITE_FEATURES } from '../../constants/siteFeatures';
import StudentNoticePreview from '../../components/dashboard/StudentNoticePreview';
import StudentStarsPreview from '../../components/dashboard/StudentStarsPreview';
import { preferredStudentPass, studentPassStatus, registrationStatus, registrationTitle, registrationWhen, upcomingRegistrations, type StudentRegistration } from '../../utils/studentDashboard';

interface DashboardContext {
  profile: { full_name: string | null; batch: string | null; iqmg_status?: string | null } | null;
  registrations: StudentRegistration[];
  sportsRegistrations: StudentRegistration[];
  entryPasses: Array<{ id: string; day_number?: number; valid_date?: string; is_used?: boolean; scanned_at?: string }>;
  xpData: { total_xp: number; tier: string } | null;
  dataLoading: boolean;
  pendingInvitesCount: number;
  setSelectedPass: (pass: unknown) => void;
}

export default function Overview() {
  const tools = useStudentEventTools();
  const { profile, registrations, sportsRegistrations, entryPasses, xpData, dataLoading, pendingInvitesCount, setSelectedPass } = useOutletContext<DashboardContext>();
  const pass = preferredStudentPass(entryPasses);
  const passStatus = pass ? studentPassStatus(pass) : null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Ricoian';
  const allRegistrations = [...registrations, ...(SITE_FEATURES.sports ? sportsRegistrations : [])].filter(reg => !reg.deleted_at);
  const upcoming = upcomingRegistrations(allRegistrations).slice(0, 3);
  const approved = allRegistrations.filter(reg => reg.status === 'approved').length;
  const pending = allRegistrations.filter(reg => registrationStatus(reg.status).tone === 'pending').length;
  return <div className="sd-overview">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">YOUR FESTIVAL STARTS HERE</p>
        <h1>Hey, {firstName}<span className="sd-heading-dot">.</span>
        </h1>
        <p>Good to have you here. Make this one memorable.</p>
      </div>
      <Link to="/dashboard/settings" className="sd-student-badge">
        <CheckCircledIcon /> {profile?.iqmg_status === 'verified' ? 'IQMG verified' : 'Approved student account'}{profile?.batch && <span>
          {profile.batch}
        </span>}
      </Link>
    </div>
    <div className="sd-guide-home"><span><strong>New here, or need a refresher?</strong><small>Find your way around and see how to earn XP, Elite status, and Rico Stars points.</small></span><div><Link to="/dashboard?tour=1">Quick tour <ArrowRightIcon /></Link><Link to="/dashboard/guide#points">How to earn points <StarIcon /></Link></div></div>
    <div className="sd-home-top">
      <section className="sd-festival-banner">
        <div className="sd-banner-copy">
          <span className="sd-edition">
            <span /> THE {BRAND_YEAR} EDITION</span>
          <h2>Your people.<br />Your moment.</h2>
          <p>Find your stage at {BRAND_NAME}.</p>
          <Link to="/dashboard/events" className="sd-button sd-button-light">Explore events <ArrowTopRightIcon />
          </Link>
        </div>
        <span className="sd-banner-caption">IQ CITY MEDICAL COLLEGE · DURGAPUR</span>
      </section>
      <section className="sd-pass-card">
        <div className="sd-pass-card-top">
          <span className="sd-eyebrow">FESTIVAL ACCESS</span>
          <ViewGridIcon />
        </div>
        <h2>Your entry pass</h2>
        <p>
          {dataLoading ? 'Checking your passes…' : passStatus?.tone === 'success' ? 'One less thing to think about. Your pass is ready.' : pass ? 'Check the date and status before you head to the gate.' : 'Your approved festival passes will live right here.'}
        </p>
        <div className="sd-pass-rule">
          <span />
          <span />
        </div>
        <div className="sd-pass-card-bottom">
          <span className={`sd-status ${passStatus ? `sd-status-${passStatus.tone}` : 'sd-status-neutral'}`}>
            <span />
            {dataLoading ? 'Loading' : passStatus ? passStatus.label : 'No active pass yet'}
          </span>
          {entryPasses.length ? <button className="sd-pass-action" disabled={dataLoading} onClick={() => setSelectedPass(pass)}>Open pass <ArrowRightIcon />
          </button> : <Link className="sd-pass-action" to="/dashboard/passes">Pass details <ArrowRightIcon />
          </Link>}
        </div>
      </section>
    </div>
    <div className="sd-stats-strip" aria-label="Your festival activity">
      {[{ value: allRegistrations.length, label: 'Registrations', icon: CalendarIcon }, { value: approved, label: 'Approved entries', icon: CheckCircledIcon }, { value: pending, label: 'Pending review', icon: ClockIcon }, { value: xpData?.total_xp ?? 0, label: 'Experience points', icon: StarIcon }].map(stat => <div key={stat.label}>
        <stat.icon />
        <span>
          <strong>
            {dataLoading ? <span className="sd-skeleton sd-skeleton-number" /> : stat.value.toLocaleString('en-IN')}
          </strong>
          <small>
            {stat.label}
          </small>
        </span>
      </div>)}
    </div>
    {pendingInvitesCount > 0 && <Link className="sd-invite-banner" to="/dashboard/teams?tab=requests">
      <BackpackIcon />
      <span>
        <strong>Your team needs a response.</strong> {pendingInvitesCount} team {pendingInvitesCount === 1 ? 'request needs' : 'requests need'} your response.</span>
      <ArrowRightIcon />
    </Link>}
    <div className="sd-home-columns">
      <div className="sd-home-primary">
        <section className="sd-panel">
          <div className="sd-section-heading">
            <h2>
              <CalendarIcon /> My registrations</h2>
            <Link to="/dashboard/events?view=registrations">View all <ArrowRightIcon />
            </Link>
          </div>
          {dataLoading ? <div className="sd-skeleton sd-skeleton-block" aria-label="Loading registrations" /> : allRegistrations.length ? <div className="sd-registration-list">
            {allRegistrations.slice(0, 3).map(reg => {
              const status = registrationStatus(reg.status); return <Link key={reg.id} to={sportsRegistrations.includes(reg) ? '/dashboard/sports' : '/dashboard/events?view=registrations'} className="sd-registration-row">
                <span className="sd-event-thumb">
                  {reg.event?.image || reg.event?.image_url ? <img src={reg.event.image || reg.event.image_url} alt="" loading="lazy" /> : <CalendarIcon />}
                </span>
                <span className="sd-registration-name">
                  <strong>
                    {registrationTitle(reg)}
                  </strong>
                  <small>
                    {reg.teams?.name || reg.team_name ? `Team: ${reg.teams?.name || reg.team_name}` : 'Individual entry'}
                  </small>
                </span>
                <span className={`sd-status sd-status-${status.tone}`}>
                  {status.label}
                </span>
                <ChevronRightIcon />
              </Link>;
            })}
          </div> : <div className="sd-empty">
            <span className="sd-empty-icon">
              <CalendarIcon />
            </span>
            <h3>Your next great story starts here.</h3>
            <p>Pick an event, bring your talent, and make it official.</p>
            <Link to="/dashboard/events" className="sd-button">Find your event <ArrowRightIcon />
            </Link>
          </div>}
        </section>
        <section className="sd-panel">
          <div className="sd-section-heading">
            <h2>
              <ClockIcon /> Coming up for you</h2>
            <Link to="/dashboard/active-events">Results & rounds <ArrowRightIcon />
            </Link>
          </div>
          {dataLoading ? <div className="sd-skeleton sd-skeleton-row" aria-label="Loading schedule" /> : upcoming.length ? <div className="sd-schedule">
            {upcoming.map(reg => <Link key={reg.id} to={sportsRegistrations.includes(reg) ? '/dashboard/sports' : `/events?event=${encodeURIComponent(String(reg.event_id))}`}>
              <span className="sd-schedule-mark">
                <CalendarIcon />
              </span>
              <span>
                <strong>
                  {registrationTitle(reg)}
                </strong>
                <small>
                  {registrationWhen(reg)}
                </small>
                <small>
                  {reg.event?.venue || 'Venue to be announced'}
                </small>
              </span>
              <ArrowTopRightIcon />
            </Link>)}
          </div> : <div className="sd-inline-empty">
            <ClockIcon />
            <div>
              <strong>A little breathing room.</strong>
              <p>Your approved events with confirmed dates will appear here.</p>
            </div>
          </div>}
        </section>
        <StudentNoticePreview eventIds={registrations.map(reg => String(reg.event_id))} />
      </div>
      <div className="sd-home-secondary">
        <section className="sd-panel sd-shortcuts">
          <p className="sd-eyebrow">MAKE YOURSELF AT HOME</p>
          {[{ title: 'Saved events', sub: tools?.ready ? `${tools.saved.size} events on your shortlist` : 'Keep a shortlist of your favourites', path: '/dashboard/events?view=saved', icon: StarIcon }, { title: 'Notifications', sub: tools?.unread ? `${tools.unread} updates waiting for you` : 'Invites, reminders, and entry updates', path: '/dashboard/notifications', icon: ReaderIcon }, { title: 'My teams', sub: 'Your crew, all in one place', path: '/dashboard/teams', icon: BackpackIcon }, { title: 'Shoutouts', sub: 'Send some love to your festival crew', path: '/dashboard/vibes', icon: StarIcon }, { title: 'Help & support', sub: 'A question? We’re here.', path: '/dashboard/messages', icon: ReaderIcon }].map(item => <Link key={item.path} to={item.path}>
            <span className="sd-shortcut-icon">
              <item.icon />
            </span>
            <span>
              <strong>
                {item.title}
              </strong>
              <small>
                {item.sub}
              </small>
            </span>
            <ChevronRightIcon />
          </Link>)}
        </section>
        <StudentStarsPreview />
        <div className="sd-little-note">
          <span>Show up. Join in. Belong.</span>
          <p>This is your space to make the most of {BRAND_NAME} {BRAND_YEAR}.</p>
        </div>
      </div>
    </div>
  </div>;
}
