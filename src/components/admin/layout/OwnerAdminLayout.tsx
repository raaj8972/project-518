import { SITE_FEATURES } from '../../../constants/siteFeatures';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowTopRightIcon, BellIcon, CheckCircledIcon, ChevronDownIcon, ChevronRightIcon, Cross2Icon, ExitIcon, ExternalLinkIcon, HamburgerMenuIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { WebsitePageNavigation } from './WebsitePageNavigation';
import { AdminLightAppearance } from './AdminLightAppearance';
import { ParticipantWorkspaceNavigation, participantSections } from '../participants/ParticipantWorkspace';
import { websitePageForSection, websitePageOrder, websitePageTools } from '../../../constants/websitePages';
import { sectionParents } from '../../../constants/adminSections';
import { BRAND_NAME, BRAND_YEAR } from '../../../constants/brand';
import { BrandMark } from '../../BrandMark';
import type { AdminLayoutProps, TabType } from './AdminLayout';
import '@fontsource-variable/geist';
import '../../../styles/OwnerWorkspace.css';
import '../../../styles/OwnerStudio.css';
import '../../../styles/AdminWorkspace.css';

const groupNames: Record<string, string> = { WEBSITE: 'Website pages', DASHBOARD: 'Workspace', FESTIVAL: 'Festival & events', REGISTRATIONS: 'Participants', CONTENT: 'Website content', 'SPORTS LEAGUE': 'Sports & tournaments', PEOPLE: 'People & teams', SYSTEM: 'Settings & access' };
const groupOrder = ['WEBSITE', 'REGISTRATIONS', 'DASHBOARD', 'FESTIVAL', 'CONTENT', 'SPORTS LEAGUE', 'PEOPLE', 'SYSTEM'];
const clearNames: Record<string, string> = { 'student-system': 'Students', 'student-passes': 'Entry Pass', registrations: 'Registrations & auditions', auditions: 'Band auditions', 'registration-modal': 'Registration form', 'sports-registration-model': 'Sports registration form', 'annual-registration-model': 'Annual registration form', 'annual-registrations': 'Annual registrations', 'sports-announcements': 'Sports announcements', security: 'Passwords & Access', 'coordinator-passwords': 'Coordinator access' };
export const ownerSectionName = (tab: { id: string; name: string }) => clearNames[tab.id] || tab.name;
const subpages: Record<string, { section: string; name: string }[]> = {
  homepage: [...(SITE_FEATURES.homepageBackgroundEditor ? [{ section: 'media', name: 'Background video & images' }] : []), { section: 'content', name: 'Festival title & introduction' }, { section: 'branding', name: 'Logo & festival year' }, { section: 'about', name: 'About the festival' }, { section: 'social', name: 'Social links' }, { section: 'roadmap', name: 'Roadmap & milestones' }],
  homebound: [{ section: 'content', name: 'Page text & visibility' }, { section: 'photos', name: 'Photos & title artwork' }, { section: 'categories', name: 'Band categories' }, { section: 'journey', name: 'Band journey' }, { section: 'links', name: 'Band links & buttons' }],
  'rico-family': [{ section: 'faculty', name: 'Faculty' }, { section: 'council', name: 'Council members' }, { section: 'committees', name: 'Committees' }, { section: 'heads', name: 'Committee heads' }, { section: 'members', name: 'Team members' }],
  'student-system': [{ section: 'verifications', name: 'Student ID approvals' }, { section: 'iqmg', name: 'College ID roster' }],
  security: [{ section: 'account', name: 'My account & 2FA' }, { section: 'team', name: 'Admin accounts' }, { section: 'coordinators', name: 'Coordinator access' }, { section: 'sessions', name: 'Sessions & devices' }],
};

export function OwnerAdminLayout({ user, isOwner, activeTab, setActiveTab, visibleTabs, isSidebarOpen, setIsSidebarOpen, onLogout, onNavigateHome, badges = {}, children, autoLogoutEnabled, setAutoLogoutEnabled, isTOTPEnabled, homepageSettings, siteSettings }: AdminLayoutProps) {
  const location = useLocation();
  const workspaceLabel = isOwner ? 'Owner workspace' : 'Admin workspace';
  const active = visibleTabs.find(tab => tab.id === activeTab);
  const parentId = (id: string) => visibleTabs.find(tab => tab.id === id)?.parent || sectionParents[id as TabType];
  const availableTabs = visibleTabs.filter(tab => !tab.unavailableReason);
  const available = new Set<string>(availableTabs.map(tab => tab.id));
  const rootId = active && parentId(active.id) && available.has(parentId(active.id)!) ? parentId(active.id)! : activeTab;
  const root = availableTabs.find(tab => tab.id === rootId);
  const primaryTabs = availableTabs.filter(tab => !parentId(tab.id) || !available.has(parentId(tab.id)!));
  const relatedTabs = availableTabs.filter(tab => tab.id === rootId || parentId(tab.id) === rootId);
  const pageOrder = websitePageOrder(siteSettings?.navigation_order);
  const [openGroups, setOpenGroups] = useState<string[]>(['WEBSITE', ...(activeTab === 'overview' ? [] : [active?.group || 'DASHBOARD'])]);
  const [query, setQuery] = useState('');
  const [navQuery, setNavQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const go = (id: string) => {
    const section = id === 'hero-media' ? (SITE_FEATURES.homepageBackgroundEditor ? 'media' : 'content') : id;
    const target = ['hero-media', 'about', 'social', 'roadmap'].includes(id) && available.has('homepage') ? `homepage?edit=${section}` : id;
    setActiveTab(target as TabType); setIsSidebarOpen(false); dialog.current?.close(); setQuery(''); setNavQuery('');
  };
  const openSearch = () => { setQuery(''); dialog.current?.showModal(); searchInput.current?.focus(); };
  useEffect(() => {
    const group = root?.group || active?.group;
    if (group && activeTab !== 'overview') setOpenGroups(previous => [...new Set([...previous, group])]);
    setIsSidebarOpen(false);
    main.current?.scrollTo?.({ top: 0 });
  }, [location.pathname, root?.group, active?.group, activeTab, setIsSidebarOpen]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
      if (event.key === 'Escape' && isSidebarOpen) { setIsSidebarOpen(false); menuButton.current?.focus(); }
      if (event.key === 'Tab' && isSidebarOpen) {
        const focusable = [...(sidebar.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href]') || [])].filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !sidebar.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [setIsSidebarOpen, isSidebarOpen]);
  useEffect(() => { if (isSidebarOpen) navRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [isSidebarOpen]);
  const searchTargets = [...new Map(availableTabs.filter(tab => tab.id !== 'hero-media' || SITE_FEATURES.homepageBackgroundEditor).flatMap(tab => {
    const page = websitePageForSection(tab.id as TabType);
    const tools = page && page.id === tab.id ? websitePageTools(page, available).filter(tool => tool.href !== `/admin/${tab.id}`).map(tool => ({ ...tab, id: tool.href.replace('/admin/', ''), name: `${page.name} · ${tool.label}` })) : [];
    const sections = (subpages[tab.id] || []).filter(item => tab.id !== 'homepage' || !['media', 'about', 'social', 'roadmap'].includes(item.section) || available.has(item.section === 'media' ? 'hero-media' : item.section));
    return [tab, ...sections.map(item => ({ ...tab, id: `${tab.id}?${['homepage', 'homebound'].includes(tab.id) ? 'edit' : 'section'}=${item.section}`, name: item.name })), ...tools];
  }).map(tab => [tab.id, tab])).values()];
  const matches = (tab: typeof searchTargets[number], value: string) => `${ownerSectionName(tab)} ${tab.name} ${tab.id === 'registrations' ? 'event registrations' : ''} ${groupNames[tab.group] || ''} ${tab.id.replace(/-/g, ' ')} ${websitePageForSection(tab.id.split('?')[0] as TabType)?.name || ''}`.toLowerCase().includes(value.trim().toLowerCase());
  const filtered = (query.trim() ? searchTargets : primaryTabs).filter(tab => matches(tab, query));
  const initials = (user?.user_metadata?.full_name || user?.email || 'Admin').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const participantWorkspace = participantSections.has(activeTab);
  const title = participantWorkspace ? 'Registrations & auditions' : active ? ownerSectionName(active) : 'Overview';
  const websitePage = websitePageForSection(activeTab);
  const year = homepageSettings?.brand_year || BRAND_YEAR;
  const standaloneHeading = !websitePage && activeTab !== 'overview' && !participantWorkspace;

  return <div className="owner-workspace owner-workspace--studio admin-workspace">
    <AdminLightAppearance />
    <a className="admin-skip-link" href="#owner-main-content">Skip to content</a>
    {isSidebarOpen && <button className="owner-nav-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}
    <aside ref={sidebar} id="admin-sidebar" className={`owner-sidebar${isSidebarOpen ? ' is-open' : ''}`} aria-label={`${workspaceLabel} navigation`}>
      <div className="owner-brand"><BrandMark settings={homepageSettings} allowCachedWhileLoading width={36} height={36} alt="" /><div><strong>{BRAND_NAME}<span>{year}</span></strong><small>FESTIVAL MANAGEMENT</small></div><button className="owner-mobile-close" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)}><Cross2Icon /></button></div>
      <div className="owner-account"><span className="owner-account-icon">{initials}</span><div><strong>{workspaceLabel}</strong><small title={user?.email}>{user?.email || 'Festival management'}</small></div><span className="admin-account-dot" title="Signed in" /></div>
      <label className="admin-nav-search"><MagnifyingGlassIcon /><span className="sr-only">Filter navigation</span><input type="search" value={navQuery} onChange={event => setNavQuery(event.target.value)} placeholder="Find anything…" /><kbd>⌘ K</kbd></label>
      <nav ref={navRef} className="owner-nav" data-lenis-prevent aria-label="Management sections">
        {!navQuery && available.has('overview') && <button className={`owner-nav-link admin-pinned-overview${activeTab === 'overview' ? ' is-active' : ''}`} aria-current={activeTab === 'overview' ? 'page' : undefined} onClick={() => go('overview')}>{(() => { const Icon = availableTabs.find(tab => tab.id === 'overview')!.icon; return <Icon size={18} strokeWidth={1.7} />; })()}<span>Overview</span>{activeTab === 'overview' && <ChevronRightIcon />}</button>}
        {navQuery.trim() ? <div className="admin-nav-results"><span>SEARCH RESULTS</span>{searchTargets.filter(tab => matches(tab, navQuery)).map(tab => <button key={tab.id} className="owner-nav-link" onClick={() => go(tab.id)}><tab.icon size={17} /><span>{ownerSectionName(tab)}</span><ChevronRightIcon /></button>)}{!searchTargets.some(tab => matches(tab, navQuery)) && <p>No matching section. Try “band”, “artists” or “photos”.</p>}</div> : [...groupOrder, ...new Set(primaryTabs.map(tab => tab.group || 'Other').filter(group => !groupOrder.includes(group)))].map(group => {
          const items = primaryTabs.filter(tab => tab.id !== 'overview' && (tab.group || 'Other') === group);
          if (group === 'WEBSITE') items.sort((a, b) => (pageOrder.indexOf(a.id) < 0 ? 99 : pageOrder.indexOf(a.id)) - (pageOrder.indexOf(b.id) < 0 ? 99 : pageOrder.indexOf(b.id)));
          if (!items.length) return null;
          const expanded = openGroups.includes(group);
          const panelId = `owner-nav-${group.toLowerCase().replace(/\s+/g, '-')}`;
          return <div className="owner-nav-group" key={group}>
            <button className="owner-group-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpenGroups(previous => expanded ? previous.filter(item => item !== group) : [...previous, group])}><span>{groupNames[group] || group}</span><ChevronDownIcon className={expanded ? 'is-expanded' : ''} /></button>
            <div id={panelId} hidden={!expanded}>{items.map(tab => {
              const childTools = availableTabs.filter(child => parentId(child.id) === tab.id && !['hero-media', 'about', 'social', 'roadmap'].includes(child.id));
              return <div key={tab.id}><button className={`owner-nav-link${rootId === tab.id ? ' is-active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => go(tab.id)}><tab.icon size={18} strokeWidth={1.7} /><span>{ownerSectionName(tab)}</span>{badges[tab.id] > 0 ? <span className="owner-nav-count">{badges[tab.id]}</span> : rootId === tab.id && <ChevronRightIcon />}</button>{childTools.length > 0 && rootId === tab.id && <div className="admin-nav-children">{childTools.map(child => <button key={child.id} className="admin-nav-child" aria-current={activeTab === child.id ? 'page' : undefined} onClick={() => go(child.id)}>{ownerSectionName(child)}{badges[child.id] > 0 && <small>{badges[child.id]}</small>}</button>)}</div>}</div>;
            })}</div>
          </div>;
        })}
      </nav>
      <div className="owner-sidebar-bottom"><button onClick={onNavigateHome}><ExternalLinkIcon />View website<ArrowTopRightIcon /></button><label><input type="checkbox" checked={autoLogoutEnabled} onChange={event => setAutoLogoutEnabled(event.target.checked)} /><span>Auto sign-out when inactive</span></label><button onClick={onLogout} className="owner-sign-out"><ExitIcon />Sign out</button></div>
    </aside>
    <div className="owner-workspace-main">
      <header className="owner-topbar"><div className="owner-breadcrumb"><button ref={menuButton} className="owner-menu" aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(true)}><HamburgerMenuIcon /></button><span>Festival workspace</span><ChevronRightIcon /><strong>{title}</strong></div><div className="owner-topbar-actions"><button onClick={openSearch} className="owner-topbar-search" aria-label="Search sections"><MagnifyingGlassIcon /><span>Search workspace</span><kbd>⌘ K</kbd></button><button className="admin-view-site" onClick={onNavigateHome}>View website<ArrowTopRightIcon /></button>{available.has('notifications') && <button className="owner-icon-button" aria-label="Open notifications" onClick={() => go('notifications')}><BellIcon /></button>}{available.has('security') && <button className="owner-profile" aria-label="Open account security" onClick={() => go('security?section=account')}>{initials}</button>}</div></header>
      <main ref={main} className="owner-page" id="owner-main-content" tabIndex={-1}>
        <WebsitePageNavigation activeTab={activeTab} available={available} />
        {participantWorkspace && <ParticipantWorkspaceNavigation activeTab={activeTab} available={available} onNavigate={go} badges={badges} />}
        {!websitePage && !participantWorkspace && relatedTabs.length > 1 && <nav className="owner-section-tabs" aria-label={`${root ? ownerSectionName(root) : title} sections`}>{relatedTabs.map(tab => <button key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => go(tab.id)}><tab.icon size={15} />{ownerSectionName(tab)}</button>)}</nav>}
        {standaloneHeading && <div className="owner-section-heading"><p>{groupNames[active?.group] || 'Management'}</p><h1>{title}</h1></div>}
        <div className={`admin-panel-content${websitePage ? ' admin-panel-content--website' : ''}`} data-section={activeTab}>{children}</div>
      </main>
      <footer className="owner-workspace-footer"><span>{BRAND_NAME} {year}<span className="admin-footer-dot">·</span>Festival management</span>{available.has('security') && <button onClick={() => go('security?section=account')}><CheckCircledIcon />{isTOTPEnabled ? 'Two-factor authentication on' : 'Account security'}<ChevronRightIcon /></button>}</footer>
    </div>
    <dialog ref={dialog} className="owner-search-dialog" aria-labelledby="owner-search-heading" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="owner-search-heading"><h2 id="owner-search-heading">Where would you like to go?</h2><button aria-label="Close section search" onClick={() => dialog.current?.close()}><Cross2Icon /></button></div>
      <div className="owner-search-field"><MagnifyingGlassIcon /><input ref={searchInput} aria-label={`Search all ${isOwner ? 'owner' : 'admin'} sections`} placeholder="Search pages, artists, band, registrations…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="owner-search-results">{filtered.length ? filtered.map(tab => <button key={tab.id} onClick={() => go(tab.id)}><tab.icon size={19} /><span>{ownerSectionName(tab)}<small>{groupNames[tab.group] || tab.group}</small></span><ArrowTopRightIcon /></button>) : <p>No sections match “{query}”. Try a different name.</p>}</div>
      <div className="admin-search-footer"><span>Pages and controls you have access to</span><kbd>esc to close</kbd></div>
    </dialog>
  </div>;
}
