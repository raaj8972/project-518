// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OwnerAdminLayout } from '../src/components/admin/layout/OwnerAdminLayout';
import { WebsitePreviewFrame } from '../src/components/admin/layout/WebsitePreviewFrame';
import { getAdminSections } from '../src/constants/adminSections';

let host: HTMLDivElement, root: Root;
const navigate = vi.fn();
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); navigate.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  document.body.dataset.dashboardTheme = 'dark';
  document.documentElement.dataset.theme = 'homebound';
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete document.body.dataset.dashboardTheme; });
async function mount() {
  await act(async () => root.render(<MemoryRouter initialEntries={['/admin']}><OwnerAdminLayout user={{ email: 'festival@example.test' }} isOwner isAdmin activeTab="overview" setActiveTab={navigate} visibleTabs={getAdminSections(true)} isSidebarOpen={false} setIsSidebarOpen={() => {}} onLogout={() => {}} onNavigateHome={() => {}} autoLogoutEnabled={false} setAutoLogoutEnabled={() => {}} isTOTPEnabled><p>Management tools</p></OwnerAdminLayout></MemoryRouter>));
}
function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
it('opens the admin in light mode even with an old dark preference, and keeps the public theme independent', async () => {
  localStorage.setItem('ricorrenza-dashboard-appearance', 'dark');
  await mount();
  expect(document.body.dataset.dashboardTheme).toBe('light');
  expect(document.body.dataset.adminWorkspace).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('homebound');
  expect(host.querySelector('[aria-label="Dashboard appearance"]')).toBeNull();
  expect(host.querySelector('#owner-nav-website')?.hasAttribute('hidden')).toBe(false);
  await act(async () => root.render(null));
  expect(document.body.dataset.adminWorkspace).toBeUndefined();
  expect(document.body.dataset.dashboardTheme).toBe('dark');
});
it('finds nested Home Bound controls directly from the sidebar without opening parent pages first', async () => {
  await mount();
  await act(async () => setInput(host.querySelector<HTMLInputElement>('.admin-nav-search input')!, 'band categories'));
  const result = [...host.querySelectorAll<HTMLButtonElement>('.admin-nav-results button')].find(button => button.textContent?.includes('Band categories'));
  expect(result).toBeDefined();
  await act(async () => result!.click());
  expect(navigate).toHaveBeenCalledWith('homebound?edit=categories');
});
it('does not reveal unassigned page tools through sidebar search', async () => {
  await act(async () => root.render(<MemoryRouter><OwnerAdminLayout user={{}} isOwner={false} isAdmin activeTab="events" setActiveTab={navigate} visibleTabs={getAdminSections(false).filter(tab => ['events', 'security'].includes(tab.id))} isSidebarOpen={false} setIsSidebarOpen={() => {}} onLogout={() => {}} onNavigateHome={() => {}} autoLogoutEnabled={false} setAutoLogoutEnabled={() => {}} isTOTPEnabled><p>Events editor</p></OwnerAdminLayout></MemoryRouter>));
  await act(async () => setInput(host.querySelector<HTMLInputElement>('.admin-nav-search input')!, 'artists'));
  expect(host.querySelectorAll('.admin-nav-results .owner-nav-link')).toHaveLength(0);
  expect(host.querySelector('.admin-nav-results')?.textContent).toContain('No matching section');
});
it('isolates real page previews from the admin light theme and updates unsaved content without navigation', async () => {
  function Preview({ text }: { text: string }) {
    const [mobile, setMobile] = useState(false);
    return <WebsitePreviewFrame title="/home-bound" mobile={mobile} onMobileChange={setMobile} dirty><h1>{text}</h1><a href="/home-bound">Public page</a></WebsitePreviewFrame>;
  }
  await act(async () => root.render(<Preview text="Saved band title" />));
  const frame = host.querySelector('iframe')!;
  await act(async () => frame.dispatchEvent(new Event('load')));
  expect(frame.contentDocument!.body.dataset.dashboardTheme).toBeUndefined();
  expect(frame.contentDocument!.body.classList.contains('theme-homebound')).toBe(true);
  expect(frame.contentDocument!.querySelector('h1')?.textContent).toBe('Saved band title');
  await act(async () => root.render(<Preview text="Unsaved new title" />));
  expect(frame.contentDocument!.querySelector('h1')?.textContent).toBe('Unsaved new title');
  expect(host.querySelector('iframe')).toBe(frame);
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  await act(async () => frame.contentDocument!.querySelector('a')!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Mobile preview"]')!.click());
  expect(frame.style.width).toBe('390px');
});
