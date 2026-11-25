import StudentDashboardTour from './StudentDashboardTour';
import { studentTier } from '../../utils/studentTiers';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ArrowTopRightIcon, BellIcon, CalendarIcon, ChatBubbleIcon, ChevronRightIcon,
  Cross2Icon, DashboardIcon, ExitIcon, HamburgerMenuIcon, PersonIcon,
  ReaderIcon, StarIcon, StarFilledIcon, VideoIcon, ViewGridIcon, BackpackIcon,
} from '@radix-ui/react-icons';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import { SITE_FEATURES } from '../../constants/siteFeatures';
import { CartButton } from '../CartDrawer';

const navigation = [
  { label: 'Home', path: '/dashboard', icon: DashboardIcon },
  { label: 'Events', path: '/dashboard/events', icon: CalendarIcon },
  { label: 'Entry pass', path: '/dashboard/passes', icon: ViewGridIcon },
  { label: 'My teams', path: '/dashboard/teams', icon: BackpackIcon },
  { label: 'Community', path: '/dashboard/community', icon: StarIcon },
];
const moreNavigation = [
  { label: 'Guide & points', path: '/dashboard/guide', icon: ReaderIcon },
  { label: 'Results & rounds', path: '/dashboard/active-events', icon: ReaderIcon },
  { label: 'Shoutouts', path: '/dashboard/vibes', icon: VideoIcon },
  { label: 'Notifications', path: '/dashboard/notifications', icon: BellIcon },
  { label: 'Notice board', path: '/dashboard/announcements', icon: BellIcon },
  { label: 'Help & support', path: '/dashboard/messages', icon: ChatBubbleIcon },
  ...(SITE_FEATURES.sports ? [{ label: 'Sports events', path: '/dashboard/sports', icon: CalendarIcon }] : []),
];
const mobileNavigation = [navigation[0], navigation[1], navigation[2], navigation[4], { label: 'Profile', path: '/dashboard/settings', icon: PersonIcon }];

interface Props {
  studentId?: string;
  profile: { full_name: string | null; avatar_url: string | null; batch: string | null } | null;
  xpData: { total_xp: number; tier: string } | null;
  pendingInvitesCount: number;
  unreadCount?: number;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}

export default function StudentDashboardShell({ studentId, profile, xpData, pendingInvitesCount, unreadCount = 0, signOut, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (menuOpen) {
      dialog.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { dialog.close(); document.body.style.overflow = previous; menuTrigger.current?.focus(); };
    }
    dialog.close();
  }, [menuOpen]);
  const xpTier = studentTier(xpData?.tier);
  const initials = (profile?.full_name || 'Student').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('');
  const avatar = <span className="sd-avatar">
    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
  </span>;
  const renderLink = (item: typeof navigation[number]) => (
    <NavLink key={item.path} to={item.path} end={item.path === '/dashboard'} className={({ isActive }) => `sd-nav-link${isActive ? ' is-active' : ''}`}>
      <item.icon aria-hidden="true" />
      <span>
        {item.label}
      </span>
      {item.path.endsWith('/teams') && pendingInvitesCount > 0 && <span className="sd-count">
        {pendingInvitesCount}
      </span>}
    </NavLink>
  );

  return (
    <div className="student-dashboard">
      <StudentDashboardTour userId={studentId} />
      <a className="sd-skip" href="#student-main">Skip to content</a>
      <header className="sd-topbar">
        <div className="sd-brand-group">
          <button ref={menuTrigger} className="sd-icon-button sd-menu-trigger" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="student-menu" onClick={() => setMenuOpen(true)}>
            <HamburgerMenuIcon />
          </button>
          <NavLink to="/dashboard" className="sd-brand">
            <img src="/images/ricorrenza-medical-mark.svg" alt="" />
            <span>
              {BRAND_NAME}<small>IQ CITY MEDICAL COLLEGE <b> / {BRAND_YEAR}
              </b>
              </small>
            </span>
          </NavLink>
          <span className="sd-portal-label">Student space</span>
        </div>
        <div className="sd-header-actions">
          <NavLink to="/" className="sd-site-link">Festival website <ArrowTopRightIcon />
          </NavLink>
          <CartButton />
          <NavLink to="/dashboard/notifications" className="sd-icon-button sd-inbox-bell" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
            <BellIcon />{unreadCount > 0 && <span className="sd-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </NavLink>
          <NavLink to="/dashboard/settings" className="sd-profile-link" aria-label="My profile">
            {avatar}
          </NavLink>
        </div>
      </header>
      <div className="sd-workspace">
        <aside className="sd-sidebar" aria-label="Student navigation">
          <div className="sd-sidebar-main">
            <p className="sd-eyebrow">Your festival, organised.</p>
            <nav aria-label="Main">
              {navigation.map(renderLink)}
            </nav>
            <div className="sd-nav-divider" />
            <p className="sd-nav-label">Stay connected</p>
            <nav aria-label="More features">
              {moreNavigation.map(renderLink)}
            </nav>
          </div>
          <div className="sd-sidebar-bottom">
            <NavLink className="sd-sidebar-profile" to="/dashboard/settings">
              {avatar}<span>
                <strong>
                  {profile?.full_name || 'Student'}
                </strong>
                <small>
                  {profile?.batch || 'My profile'}
                </small>
              </span>
              <ChevronRightIcon />
            </NavLink>
            {xpData && <div className="sd-xp-line">
              <span className={`sd-tier-pill${xpTier.id === 'elite' ? ' is-elite' : ''}`} aria-label={`${xpTier.label} tier`}>{xpTier.id === 'elite' ? <StarFilledIcon /> : <StarIcon />}{xpTier.label}</span><span>
                {xpData.total_xp.toLocaleString('en-IN')} XP</span>
            </div>}
            <button className="sd-signout" onClick={() => void signOut()}>
              <ExitIcon /> Sign out</button>
          </div>
        </aside>
        <main id="student-main" className="sd-main" tabIndex={-1}>
          {children}<footer className="sd-footer">
            <span>
              {BRAND_NAME} {BRAND_YEAR}
            </span>
            <NavLink to="/dashboard/messages">Need a hand? Talk to the team <ArrowTopRightIcon />
            </NavLink>
          </footer>
        </main>
      </div>
      <nav className="sd-mobile-nav" aria-label="Mobile navigation">
        {mobileNavigation.map(renderLink)}
      </nav>
      <dialog ref={drawerRef} id="student-menu" className="sd-menu" aria-labelledby="student-menu-title" onCancel={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <div className="sd-menu-heading">
          <div>
            <p className="sd-eyebrow">STUDENT SPACE</p>
            <h2 id="student-menu-title">Make it your festival.</h2>
          </div>
          <button className="sd-icon-button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <Cross2Icon />
          </button>
        </div>
        <nav aria-label="All student features">
          {[...navigation, ...moreNavigation, { label: 'My profile', path: '/dashboard/settings', icon: PersonIcon }].map(renderLink)}
        </nav>
        <button className="sd-signout" onClick={() => void signOut()}>
          <ExitIcon /> Sign out</button>
      </dialog>
    </div>
  );
}
