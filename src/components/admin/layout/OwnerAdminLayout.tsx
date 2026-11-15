import { WebsitePageNavigation } from './WebsitePageNavigation';
import { websitePageForSection, websitePageOrder, websitePageTools } from '../../../constants/websitePages';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, ChevronDown, ChevronRight, ExternalLink, LogOut, Menu, Search, ShieldCheck, X } from 'lucide-react';
import type { AdminLayoutProps, TabType } from './AdminLayout';
import { BRAND_NAME, BRAND_YEAR } from '../../../constants/brand';
import '../../../styles/OwnerWorkspace.css';
import { sectionParents } from '../../../constants/adminSections';
import { DashboardThemeToggle } from './DashboardThemeToggle';
import '@fontsource-variable/geist';
import '../../../styles/OwnerStudio.css';

const groupNames: Record<string, string> = { WEBSITE: 'Website pages', DASHBOARD: 'Workspace', FESTIVAL: 'Festival & events', REGISTRATIONS: 'Registrations & passes', CONTENT: 'Website & content', 'SPORTS LEAGUE': 'Sports & tournaments', PEOPLE: 'People & teams', SYSTEM: 'Settings & access' };
const groupOrder = ['DASHBOARD', 'WEBSITE', 'FESTIVAL', 'REGISTRATIONS', 'CONTENT', 'SPORTS LEAGUE', 'PEOPLE', 'SYSTEM'];
const clearNames: Record<string, string> = { 'student-system': 'Students', registrations: 'Event registrations', 'reg-photos': 'Registration photos', 'registration-modal': 'Registration form', 'sports-registration-model': 'Sports registration form', 'annual-registration-model': 'Annual registration form', 'annual-registrations': 'Annual registrations', 'sports-announcements': 'Sports announcements', 'security': 'Passwords & Access', 'coordinator-passwords': 'Coordinator access' };
export const ownerSectionName = (tab: { id: string; name: string }) => clearNames[tab.id] || tab.name;

export function OwnerAdminLayout({ user, isOwner, activeTab, setActiveTab, visibleTabs, isSidebarOpen, setIsSidebarOpen, onLogout, onNavigateHome, badges = {}, children, autoLogoutEnabled, setAutoLogoutEnabled, isTOTPEnabled, homepageSettings, siteSettings }: AdminLayoutProps) {
  const workspaceLabel = isOwner ? 'Owner workspace' : 'Admin workspace';
  const active = visibleTabs.find(tab => tab.id === activeTab);
  const parentId = (id: string) => visibleTabs.find(tab => tab.id === id)?.parent || sectionParents[id as TabType];
  const availableTabs = visibleTabs.filter(tab => !tab.unavailableReason);
  const rootId = active && parentId(active.id) && availableTabs.some(tab => tab.id === parentId(active.id)) ? parentId(active.id)! : activeTab;
  const root = availableTabs.find(tab => tab.id === rootId);
  const activeGroup = root?.group || active?.group;
  const pageOrder = websitePageOrder(siteSettings?.navigation_order);
  const primaryTabs = availableTabs.filter(tab => !parentId(tab.id) || !availableTabs.some(parent => parent.id === parentId(tab.id)));
  const relatedTabs = availableTabs.filter(tab => (tab.id === rootId || parentId(tab.id) === rootId) && !(rootId === 'homepage' && ['hero-media','about','social','roadmap'].includes(tab.id)));
  const [openGroups, setOpenGroups] = useState<string[]>(['DASHBOARD', active?.group || 'DASHBOARD']);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const go = (id: string) => { const section = id === 'hero-media' ? 'media' : id; const target = ['hero-media','about','social','roadmap'].includes(id) && availableTabs.some(tab => tab.id === 'homepage') ? `homepage?edit=${section}` : id; setActiveTab(target as TabType); setIsSidebarOpen(false); dialog.current?.close(); setQuery(''); };
  const openSearch = () => { setQuery(''); dialog.current?.showModal(); searchInput.current?.focus(); };
  useEffect(() => {
    const group = activeGroup;
    if (group) setOpenGroups([...new Set(['DASHBOARD', group])]);
    setIsSidebarOpen(false);
  }, [activeTab, activeGroup, setIsSidebarOpen]);
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
  const subpages: Record<string, { section: string; name: string }[]> = {
    'rico-family': [{ section: 'faculty', name: 'Faculty' }, { section: 'council', name: 'Council members' }, { section: 'committees', name: 'Committees' }, { section: 'heads', name: 'Committee heads' }, { section: 'members', name: 'Team members' }],
    'student-system': [{ section: 'verifications', name: 'Student ID approvals' }, { section: 'settings', name: 'Student profile settings' }, { section: 'auth', name: 'Student login settings' }],
    security: [{ section: 'account', name: 'My account & 2FA' }, { section: 'team', name: 'Admin accounts' }, { section: 'coordinators', name: 'Coordinator access' }, { section: 'sessions', name: 'Sessions & devices' }],
  };
  const searchTargets = query.trim() ? [...new Map(availableTabs.flatMap(tab => {
    const page = websitePageForSection(tab.id as TabType);
    const tools = page && page.id === tab.id ? websitePageTools(page, new Set(availableTabs.map(item => item.id))).filter(tool => tool.href !== `/admin/${tab.id}`).map(tool => ({ ...tab,id:tool.href.replace('/admin/',''),name:`${page.name} · ${tool.label}` })) : [];
    return [tab,...(subpages[tab.id] || []).map(item => ({...tab,id:`${tab.id}?section=${item.section}`,name:item.name})),...tools];
  }).map(tab => [tab.id,tab])).values()] : primaryTabs;
  const filtered = searchTargets.filter(tab => `${ownerSectionName(tab)} ${tab.name} ${groupNames[tab.group] || tab.group || ''} ${tab.id.replace(/-/g, ' ')} ${websitePageForSection(tab.id as TabType)?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const initials = (user?.user_metadata?.full_name || user?.email || 'Owner').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const logo = homepageSettings?.brand_logo_url || '/favicon.svg';
  const title = active ? ownerSectionName(active) : 'Overview';
  const websitePage = websitePageForSection(activeTab);

  return <div className="owner-workspace owner-workspace--studio">
    {isSidebarOpen && <button className="owner-nav-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation" />}
    <aside ref={sidebar} className={`owner-sidebar${isSidebarOpen ? ' is-open' : ''}`} aria-label={`${workspaceLabel} navigation`}>
      <div className="owner-brand"><img src={logo} alt="" width="32" height="32" /><div><strong>{BRAND_NAME}<span>{BRAND_YEAR}</span></strong><small>MANAGEMENT STUDIO</small></div><button className="owner-mobile-close" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)}><X size={19} /></button></div>
      <div className="owner-account"><span className="owner-account-icon">{initials}</span><div><strong>{workspaceLabel}</strong><small title={user?.email}>{user?.email || 'Festival owner'}</small></div></div>
      <button className="owner-sidebar-search" onClick={openSearch}><Search size={16} /><span>Find a section</span><kbd>⌘ K</kbd></button>
      <nav ref={navRef} className="owner-nav" data-lenis-prevent>
        {[...groupOrder, ...new Set(primaryTabs.map(tab => tab.group || 'Other').filter(group => !groupOrder.includes(group)))].map(group => {
          const items = primaryTabs.filter(tab => (tab.group || 'Other') === group);
          if (group === 'WEBSITE') items.sort((a,b) => (pageOrder.indexOf(a.id) < 0 ? 99 : pageOrder.indexOf(a.id)) - (pageOrder.indexOf(b.id) < 0 ? 99 : pageOrder.indexOf(b.id)));
          if (!items.length) return null;
          const expanded = openGroups.includes(group);
          const pending = items.reduce((sum, tab) => sum + (badges[tab.id] || 0), 0);
          const panelId = `owner-nav-${group.toLowerCase().replace(/\s+/g, '-')}`;
          return <div className="owner-nav-group" key={group}>
            <button className="owner-group-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpenGroups(previous => expanded ? previous.filter(item => item !== group) : [...previous, group])}><span>{groupNames[group] || group}</span>{pending > 0 && <span className="owner-group-count">{pending}</span>}<ChevronDown size={13} className={expanded ? 'is-expanded' : ''} /></button>
            <div id={panelId} hidden={!expanded}>{items.map(tab => <button key={tab.id} className={`owner-nav-link${rootId === tab.id ? ' is-active' : ''}`} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => go(tab.id)}><tab.icon size={17} strokeWidth={1.6} /><span>{ownerSectionName(tab)}</span>{badges[tab.id] > 0 && <span className="owner-nav-count">{badges[tab.id]}</span>}</button>)}</div>
          </div>;
        })}
      </nav>
      <div className="owner-sidebar-bottom"><button onClick={onNavigateHome}><ExternalLink size={15} />View website<ArrowUpRight size={13} /></button><label><input type="checkbox" checked={autoLogoutEnabled} onChange={event => setAutoLogoutEnabled(event.target.checked)} /><span>Auto sign-out when inactive</span></label><button onClick={onLogout} className="owner-sign-out"><LogOut size={15} />Sign out</button></div>
    </aside>
    <div className="owner-workspace-main">
      <header className="owner-topbar"><div className="owner-breadcrumb"><button ref={menuButton} className="owner-menu" aria-label="Open navigation" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(true)}><Menu size={21} /></button><span>{workspaceLabel}</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="owner-topbar-actions"><DashboardThemeToggle /><button onClick={openSearch} className="owner-topbar-search" aria-label="Search sections"><Search size={17} /><span>Search sections</span><kbd>⌘ K</kbd></button>{visibleTabs.some(tab => tab.id === 'notifications') && <button className="owner-icon-button" aria-label="Open notifications" onClick={() => go('notifications')}><Bell size={18} /></button>}<button className="owner-profile" aria-label="Open account security" onClick={() => go('security?section=account')}>{initials}</button></div></header>
      <main className="owner-page" id="owner-main-content">
        <WebsitePageNavigation activeTab={activeTab} available={new Set(availableTabs.map(tab => tab.id))} />
        {!websitePage && relatedTabs.length > 1 && <nav className="owner-section-tabs" aria-label={`${root ? ownerSectionName(root) : title} sections`}>{relatedTabs.map(tab => <button key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => go(tab.id)}><tab.icon size={14} />{tab.id === rootId && rootId === 'homepage' ? 'Page editor' : ownerSectionName(tab)}</button>)}</nav>}
        {['security', 'support-chat', 'face-indexing'].includes(activeTab) && <div className="owner-section-heading"><p>{groupNames[active?.group] || 'Management'}</p><h1>{title}</h1></div>}
        {children}
      </main>
      <footer className="owner-workspace-footer"><span>{BRAND_NAME} {BRAND_YEAR} · {workspaceLabel}</span><button onClick={() => go('security?section=account')}><ShieldCheck size={13} />{isTOTPEnabled ? 'Two-factor authentication on' : 'Account security'}<ChevronRight size={12} /></button></footer>
    </div>
    <dialog ref={dialog} className="owner-search-dialog" aria-labelledby="owner-search-heading" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="owner-search-heading"><h2 id="owner-search-heading">Find a section</h2><button aria-label="Close section search" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
      <div className="owner-search-field"><Search size={18} /><input ref={searchInput} aria-label={`Search all ${isOwner ? 'owner' : 'admin'} sections`} placeholder="Try registrations, events or security…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="owner-search-results">{filtered.length ? filtered.map(tab => <button key={tab.id} onClick={() => go(tab.id)}><tab.icon size={18} /><span>{ownerSectionName(tab)}<small>{groupNames[tab.group] || tab.group}</small></span><ArrowUpRight size={15} /></button>) : <p>No sections match “{query}”. Try a different name.</p>}</div>
    </dialog>
  </div>;
}
