import { SITE_FEATURES } from '../../../constants/siteFeatures';
import { Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ClipboardList, Image, LayoutTemplate, Settings2, ShieldCheck, Users } from 'lucide-react';
import type { Registration } from '../../../types/data';
import { BRAND_YEAR } from '../../../constants/brand';
import { WEBSITE_PAGES, websitePageOrder } from '../../../constants/websitePages';
import { HomeIcon, CalendarIcon, ClockIcon, CameraIcon, SpeakerLoudIcon, PersonIcon, StarIcon } from '@radix-ui/react-icons';

interface Props {
  name?: string;
  eventsCount: number;
  registrations: Registration[];
  stats: { total: number; approved: number; pending: number };
  pendingAuditions: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  siteClosed: boolean;
  isTOTPEnabled: boolean;
  directory: { label: string; count: number; tab: string }[];
  diagnostics: ReactNode;
  navigationOrder?: unknown;
  festivalYear?: string | number;
}
const date = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
export function OwnerOverview({ name, eventsCount, registrations, stats, pendingAuditions, loading, error, refresh, siteClosed, isTOTPEnabled, directory, diagnostics, navigationOrder, festivalYear = BRAND_YEAR }: Props) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const queue = [{ label: 'Event registrations', note: 'Review applications and confirm participants', count: stats.pending, tab: 'registrations', icon: ClipboardList }, { label: 'Band auditions', note: 'Review the latest audition applications', count: pendingAuditions, tab: 'auditions', icon: Users }];
  const totalPending = queue.reduce((sum, item) => sum + item.count, 0);
  const metrics = [{ label: 'Festival events', value: eventsCount, detail: 'Manage your event programme', tab: 'events' }, { label: 'Registrations', value: stats.total, detail: 'All event applications', tab: 'registrations' }, { label: 'Approved', value: stats.approved, detail: 'Confirmed registrations', tab: 'registrations?status=approved' }, { label: 'Awaiting review', value: stats.pending, detail: 'Event applications to review', tab: 'registrations?status=pending' }];
  return <div className="owner-overview">
    <div className="owner-overview-heading"><div><p className="owner-eyebrow">YOUR FESTIVAL, AT A GLANCE</p><h1>{name ? `Welcome back, ${name.split(' ')[0]}.` : 'Welcome back.'}</h1><p>Here’s what needs your attention today.</p></div><time dateTime={new Date().toISOString()}>{date.format(new Date())}</time></div>
    <section className="admin-welcome-banner"><div><span>RICORRENZA / {festivalYear} EDITION</span><h2>A little behind the scenes.<br />A lot to look forward to.</h2><p>Your pages, people and festival programme. Everything you need to keep the website up to date, in one place.</p></div><div className="admin-welcome-actions"><Link to="/admin/homepage">Open website editor<ArrowUpRight size={15} /></Link><Link to="/admin/site-settings"><span className={`admin-site-dot${siteClosed ? ' is-closed' : ''}`} />{siteClosed ? 'Website access restricted' : 'Website open to visitors'}<ArrowUpRight size={11} /></Link></div></section>
    {error && <div className="owner-data-error" role="alert"><span>Registration data couldn’t load. Please try again.</span><button onClick={() => void refresh()}>Retry</button></div>}
    <section className="owner-metrics" aria-label="Festival numbers">{metrics.map((metric, index) => <Link key={metric.label} to={`/admin/${metric.tab}`}><div><span>{metric.label}</span><ArrowUpRight size={14} /></div><strong>{index > 0 && (loading || error) ? '—' : metric.value.toLocaleString('en-IN')}</strong><small>{index > 0 && loading ? 'Loading registrations…' : metric.detail}</small></Link>)}</section>
    <section className="admin-website-directory" aria-label="Website page directory"><div className="admin-dashboard-section-title"><div><h2>Your website, page by page</h2><p>Open a page or jump straight to the detail you want to change.</p></div><span>{WEBSITE_PAGES.length} PAGES</span></div><div className="admin-website-grid">{websitePageOrder(navigationOrder).map(id => {
      const page = WEBSITE_PAGES.find(item => item.id === id)!;
      const icons = { homepage: HomeIcon, events: CalendarIcon, schedule: ClockIcon, gallery: CameraIcon, homebound: SpeakerLoudIcon, 'rico-family': PersonIcon, sponsors: StarIcon };
      const Icon = icons[id as keyof typeof icons];
      const shortcuts: Record<string, { label: string; to: string }[]> = {
        homepage: [{ label: 'Page editor', to: 'homepage' }, { label: 'Artists', to: 'guest-artists' }, ...(SITE_FEATURES.chiefGuests ? [{ label: 'Chief guests', to: 'chief-guests' }] : [])],
        events: [{ label: 'Event details', to: 'events' }, { label: 'Categories', to: 'categories' }],
        schedule: [{ label: 'Dates & timings', to: 'schedule' }], gallery: [{ label: 'Photos & albums', to: 'gallery' }],
        homebound: [{ label: 'Page editor', to: 'homebound' }, { label: 'Band profiles', to: 'band' }, { label: 'Categories', to: 'homebound?edit=categories' }],
        'rico-family': [{ label: 'Faculty', to: 'rico-family?section=faculty' }, { label: 'Council', to: 'rico-family?section=council' }, { label: 'Teams', to: 'rico-family?section=members' }],
        sponsors: [{ label: 'Partner directory', to: 'sponsors' }],
      };
      return <article className="admin-website-card" key={id}><span><Icon /></span><div><header><Link to={`/admin/${id}`}>{page.name}</Link><code>{page.path}</code></header><p>{page.description}</p><nav aria-label={`${page.name} shortcuts`}>{shortcuts[id].map(tool => <Link key={tool.to} to={`/admin/${tool.to}`}>{tool.label}</Link>)}</nav></div><Link to={`/admin/${id}`} aria-label={`Edit ${page.name}`}><ArrowUpRight size={15} /></Link></article>;
    })}</div></section>
    <div className="owner-overview-columns">
      <section className="owner-panel owner-review-panel"><div className="owner-panel-heading"><div><h2>Needs your attention</h2><p>Start with the applications waiting for a decision.</p></div><span className={`owner-review-total${totalPending ? ' has-pending' : ''}`}>{loading ? 'Loading…' : error ? 'Data unavailable' : totalPending ? `${totalPending} pending` : <><Check size={12} />All caught up</>}</span></div><div className="owner-review-list">{queue.map(item => <Link key={item.tab} to={`/admin/${item.tab}${item.tab === 'registrations' ? '?status=pending' : ''}`}><span className="owner-task-icon"><item.icon size={19} strokeWidth={1.5} /></span><div><strong>{item.label}</strong><small>{item.note}</small></div><span className={`owner-task-count${item.count ? ' has-pending' : ''}`}>{item.tab === 'registrations' && (loading || error) ? '—' : item.count}</span><ChevronDown className="owner-row-arrow" size={15} /></Link>)}</div></section>
      <section className="owner-panel"><div className="owner-panel-heading"><div><h2>Quick access</h2><p>The tools you use most.</p></div><Settings2 size={17} /></div><div className="owner-quick-links">{[{ label: 'Edit website', note: 'Homepage & festival content', tab: 'homepage', icon: LayoutTemplate }, { label: 'Festival schedule', note: 'Programme & timings', tab: 'schedule', icon: CalendarDays }, { label: 'Admin accounts', note: 'Your team & permissions', tab: 'security?section=team', icon: Users }, { label: 'Gallery', note: 'Photos & festival memories', tab: 'gallery', icon: Image }].map(item => <Link key={item.tab} to={`/admin/${item.tab}`}><item.icon size={18} strokeWidth={1.5} /><span>{item.label}<small>{item.note}</small></span><ArrowUpRight size={14} /></Link>)}</div></section>
    </div>
    <section className="owner-panel owner-recent"><div className="owner-panel-heading"><div><h2>Recent registrations</h2><p>The latest participants joining your festival.</p></div><Link to="/admin/registrations">View all<ArrowRight size={14} /></Link></div>{loading ? <div className="admin-table-skeleton" role="status" aria-label="Loading recent registrations">{[0,1,2].map(index => <div key={index}><i /><i /><i /></div>)}</div> : error ? <div className="owner-empty"><ClipboardList size={26} /><p>Recent registrations are unavailable.</p><button onClick={() => void refresh()}>Try again</button></div> : registrations.length ? <div className="owner-table-scroll"><table><thead><tr><th>Participant</th><th>Event</th><th>Received</th><th>Status</th><th><span className="owner-visually-hidden">Action</span></th></tr></thead><tbody>{registrations.slice(0, 5).map(registration => <tr key={registration.id}><td><strong>{registration.full_name}</strong><small>{registration.college || 'Participant'}</small></td><td>{registration.event_title}</td><td>{registration.created_at && !Number.isNaN(Date.parse(registration.created_at)) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(registration.created_at)) : '—'}</td><td><span className={`owner-status owner-status-${registration.status}`}>{registration.status || 'pending'}</span></td><td><Link to={`/admin/registrations?${new URLSearchParams({ search: registration.email || registration.full_name, registration: String(registration.id) }).toString()}`} aria-label={`View registration for ${registration.full_name}`}><ArrowUpRight size={16} /></Link></td></tr>)}</tbody></table></div> : <div className="owner-empty"><ClipboardList size={28} strokeWidth={1.3} /><h3>No registrations yet</h3><p>New applications will appear here when participants sign up.</p><Link to="/admin/events">Manage event registrations<ArrowRight size={14} /></Link></div>}</section>
    <div className="owner-overview-columns owner-overview-bottom"><section className="owner-panel"><div className="owner-panel-heading"><div><h2>Festival directory</h2><p>Your people, partners and festival content.</p></div></div><div className="owner-directory">{directory.map(item => <Link to={`/admin/${item.tab}`} key={item.label}><span>{item.label}</span><strong>{item.count.toLocaleString('en-IN')}</strong><ArrowUpRight size={13} /></Link>)}</div></section><section className="owner-account-card"><ShieldCheck size={25} strokeWidth={1.4} /><h2>{isTOTPEnabled ? 'Your account is protected.' : 'Keep your workspace secure.'}</h2><p>{isTOTPEnabled ? 'Two-factor authentication is enabled for your owner account.' : 'Set up two-factor authentication for your owner account.'}</p><Link to="/admin/security?section=account">{isTOTPEnabled ? 'Manage account security' : 'Set up two-factor authentication'}<ArrowUpRight size={14} /></Link></section></div>
    <details className="owner-diagnostics" onToggle={event => setShowDiagnostics(event.currentTarget.open)}><summary><Settings2 size={15} /><span>System health & storage</span><small>Connection and storage details</small><ChevronDown size={14} /></summary>{showDiagnostics && <div className="owner-diagnostics-content"><Suspense fallback={<p>Loading system details…</p>}>{diagnostics}</Suspense></div>}</details>
  </div>;
}
