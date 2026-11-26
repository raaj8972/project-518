// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BarChart3, Calendar, Settings, Users } from 'lucide-react';
import { OwnerAdminLayout } from '../src/components/admin/layout/OwnerAdminLayout';
import { OwnerOverview } from '../src/components/admin/dashboard/OwnerOverview';
import type { TabType } from '../src/components/admin/layout/AdminLayout';
import type { Registration } from '../src/types/data';
const tabs = [
  { id:'overview', name:'Overview', group:'DASHBOARD', icon:BarChart3 },
  { id:'events', name:'Events', group:'FESTIVAL', icon:Calendar },
  { id:'registrations', name:'Event Reg', group:'REGISTRATIONS', icon:Users },
  { id:'security', name:'Security', group:'SYSTEM', icon:Settings },
];
let container: HTMLDivElement;
let root: Root;
const logout = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  container = document.createElement('div'); document.body.append(container); root=createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const getButton = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === label || button.getAttribute('aria-label') === label)!;
async function click(label: string) { await act(async () => getButton(label).click()); }
function Workspace() {
  const [activeTab,setActiveTab]=useState<TabType>('overview');
  const [isSidebarOpen,setIsSidebarOpen]=useState(false);
  return <OwnerAdminLayout user={{email:'owner@example.test'}} isOwner isAdmin activeTab={activeTab} setActiveTab={setActiveTab} visibleTabs={tabs} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={logout} onNavigateHome={() => {}} badges={{registrations:9}} autoLogoutEnabled={false} setAutoLogoutEnabled={() => {}} isTOTPEnabled><p>Current content: {activeTab}</p></OwnerAdminLayout>;
}
async function mountWorkspace() { await act(async () => root.render(<MemoryRouter><Workspace /></MemoryRouter>)); }
it('groups navigation and retains all sections without a long expanded menu', async () => {
  await mountWorkspace();
  expect(container.querySelector('#owner-nav-festival')?.hasAttribute('hidden')).toBe(true);
  await click('Festival & events');
  await click('Events');
  expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('Events');
  expect(container.querySelector('#owner-main-content')?.textContent).toContain('Current content: events');
  expect(container.querySelectorAll('.owner-nav-link')).toHaveLength(tabs.length);
  expect(container.querySelector('.owner-nav-count')?.textContent).toBe('9');
});
it('finds collapsed sections by their clear names and navigates from search', async () => {
  await mountWorkspace(); await click('Search sections');
  expect(container.querySelector('dialog')?.open).toBe(true);
  const input=container.querySelector<HTMLInputElement>('[aria-label="Search all owner sections"]')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'event registrations'); input.dispatchEvent(new Event('input',{bubbles:true})); });
  const results=container.querySelectorAll<HTMLButtonElement>('.owner-search-results button');
  expect(results).toHaveLength(1);
  await act(async () => results[0].click());
  expect(container.querySelector('dialog')?.open).toBe(false);
  expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('Registrations & auditions');
  expect(container.querySelector('#owner-nav-registrations')?.hasAttribute('hidden')).toBe(false);
});
it('closes mobile navigation after selection and preserves sign-out', async () => {
  await mountWorkspace(); await click('Open navigation');
  expect(container.querySelector('.owner-sidebar.is-open')).not.toBeNull();
  await click('Festival & events'); await click('Events');
  expect(container.querySelector('.owner-sidebar.is-open')).toBeNull();
  await click('Sign out'); expect(logout).toHaveBeenCalledTimes(1);
});
const overviewProps = {
  eventsCount:12, registrations:[{ id:'fixture',full_name:'Test Participant',college:'Test College',event_title:'Music',created_at:'2026-11-07T06:00:00Z',status:'approved' } as Registration], stats:{total:127,approved:118,pending:9}, pendingAuditions:3,pendingMemberships:2,loading:false,error:null,refresh:vi.fn(),siteClosed:false,isTOTPEnabled:true,directory:[],diagnostics:<div>System diagnostics</div>,
};
it('uses global registration totals, shows actionable queues and defers diagnostics', async () => {
  await act(async () => root.render(<MemoryRouter><OwnerOverview {...overviewProps} /></MemoryRouter>));
  expect([...container.querySelectorAll('.owner-metrics strong')].map(node=>node.textContent)).toEqual(['12','127','118','9']);
  expect(container.querySelector('.owner-review-total')?.textContent).toBe('14 pending');
  expect(container.querySelector('a[href="/admin/owner-approvals"]')).toBeNull();
  expect(container.querySelector('.owner-diagnostics-content')).toBeNull();
  expect(container.querySelector('tbody')?.textContent).toContain('Test Participant');
});
it('distinguishes loading and empty states from zero pending applications', async () => {
  await act(async () => root.render(<MemoryRouter><OwnerOverview {...overviewProps} loading registrations={[]} /></MemoryRouter>));
  expect(container.querySelector('[aria-label="Loading recent registrations"]')).not.toBeNull();
  expect(container.querySelectorAll('.owner-metrics strong')[1].textContent).toBe('—');
  await act(async () => root.render(<MemoryRouter><OwnerOverview {...overviewProps} registrations={[]} stats={{total:0,approved:0,pending:0}} pendingAuditions={0} pendingMemberships={0} /></MemoryRouter>));
  expect(container.querySelector('.owner-empty')?.textContent).toContain('No registrations yet');
  expect(container.querySelector('.owner-review-total')?.textContent).toContain('All caught up');
});
