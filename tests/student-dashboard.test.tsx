// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Overview from '../src/pages/dashboard/Overview';
import Events from '../src/pages/dashboard/Events';
import StudentDashboardShell from '../src/components/dashboard/StudentDashboardShell';
import EntryPass from '../src/components/dashboard/EntryPass';
import WalletPassModal from '../src/components/dashboard/WalletPassModal';
import { preferredStudentPass, studentPassStatus, upcomingRegistrations, registrationStatus } from '../src/utils/studentDashboard';

const fixtures = vi.hoisted(() => ({ events: [
  { id: 1, title: 'Battle of Bands', category: 'Cultural', visible: true, registration_open: true },
  { id: 2, title: 'Clinical Quiz', category: { name: 'Academic' }, visible: true, registration_open: false },
  { id: 3, title: 'Unpublished event', category: 'Cultural', visible: false },
], openPass: vi.fn(), tools: { saved: new Set<string>(['2']), schedule: [], ready: true, error: null, busy: null, unread: 0, toggleSaved: vi.fn(), refresh: vi.fn() } }));
vi.mock('../src/context/StudentEventToolsContext', () => ({ useStudentEventTools: () => fixtures.tools }));
vi.mock('../src/context/StudentAuthContext', () => ({ useStudentAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('../src/context/EventsContext', () => ({ useEventsData: () => ({ events: fixtures.events, loading: false, isLoaded: true }) }));
vi.mock('../src/components/dashboard/StudentNoticePreview', () => ({ default: () => <div>Latest updates</div> }));
vi.mock('../src/components/dashboard/StudentStarsPreview', () => ({ default: () => <div>Community stars</div> }));
vi.mock('../src/components/CartDrawer', () => ({ CartButton: () => null }));
vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <svg data-pass-token={value} /> }));

let root: Root;
let host: HTMLDivElement;
const context = {
  profile: { full_name: 'Riya Sen', batch: '2nd Prof', avatar_url: null },
  registrations: [{ id: 'reg-1', event_id: 1, status: 'payment_pending', event: { title: 'Battle of Bands' } }],
  sportsRegistrations: [], entryPasses: [{ id: 'pass-1' }],
  xpData: { total_xp: 146, tier: 'Rising' }, dataLoading: false,
  pendingInvitesCount: 2, setSelectedPass: fixtures.openPass,
};
function Wrapper() { return <Outlet context={context} />; }
async function renderPage(page: React.ReactElement, path = '/dashboard') {
  await act(async () => root.render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/dashboard" element={<Wrapper />}><Route index element={page} /><Route path="events" element={page} /></Route></Routes></MemoryRouter>));
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

it('opens the issued pass, links to invitations and preserves pending payment on the home page', async () => {
  await renderPage(<Overview />);
  expect(host.querySelector('h1')?.textContent).toBe('Hey, Riya.');
  expect(host.textContent).toContain('payment pending');
  expect(host.textContent).toContain('2 team requests need your response');
  const open = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Open pass'))!;
  await act(async () => open.click());
  expect(fixtures.openPass).toHaveBeenCalledWith(context.entryPasses[0]);
  expect(host.querySelector('a[href="/dashboard/events?view=registrations"]')).not.toBeNull();
});

it('filters published event categories and keeps real registration status in the registrations tab', async () => {
  await renderPage(<Events />, '/dashboard/events');
  expect(host.textContent).toContain('Battle of Bands');
  expect(host.textContent).toContain('Clinical Quiz');
  expect(host.textContent).not.toContain('Unpublished event');
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Academic')!.click());
  expect(host.textContent).not.toContain('Battle of Bands');
  expect(host.textContent).toContain('Clinical Quiz');
  const input = host.querySelector('input')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'missing'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(host.textContent).toContain('No events match just yet');
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Clear filters')!.click());
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.startsWith('My registrations'))!.click());
  expect(host.textContent).toContain('payment pending');
  expect(host.querySelector('.sd-my-event .sd-status')?.textContent).toBe('payment pending');
  expect(host.querySelector('a[href="/events?event=1"]')).not.toBeNull();
});

it('uses the same five mobile destinations and closes the menu after keyboard cancellation', async () => {
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StudentDashboardShell profile={context.profile} xpData={context.xpData} pendingInvitesCount={2} signOut={vi.fn()}><h1>Student home</h1></StudentDashboardShell></MemoryRouter>));
  expect([...host.querySelectorAll('.sd-mobile-nav a')].map(link => link.textContent)).toEqual(['Home', 'Events', 'Entry pass', 'Community', 'Profile']);
  const menu = host.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')!;
  await act(async () => menu.click());
  expect(host.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  await act(async () => host.querySelector('dialog')!.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true })));
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(document.body.style.overflow).not.toBe('hidden');
});

it('keeps the QR payload unchanged in both pass views and displays used-pass status', async () => {
  const pass = { pass_token: 'fixture-entry-token', pass_type: 'general', participant_name: 'Riya Sen', created_at: '2026-11-22', is_used: true };
  await act(async () => root.render(<><EntryPass pass={pass} /><WalletPassModal pass={pass} onClose={vi.fn()} /></>));
  expect([...host.querySelectorAll('[data-pass-token]')].map(node => node.getAttribute('data-pass-token'))).toEqual(['fixture-entry-token', 'fixture-entry-token']);
  expect(host.textContent).toContain('Already checked in');
  expect(host.querySelector('[aria-label="Close entry pass"]')).not.toBeNull();
  expect(host.querySelector('a[href*="google.com/maps"]')?.getAttribute('rel')).toContain('noopener');
});

it('only schedules future approved entries and treats times in India consistently', () => {
  const now = Date.parse('2026-11-22T09:30:00+05:30');
  const entries = [
    { id: 'future', status: 'approved', event: { date: '2026-11-22', time: '10:00:00' } },
    { id: 'pending', status: 'pending', event: { date: '2026-11-23', time: '10:00' } },
    { id: 'past', status: 'approved', event: { date: '2026-11-22', time: '09:00' } },
    { id: 'deleted', status: 'approved', deleted_at: '2026-11-21', event: { date: '2026-11-23' } },
    { id: 'unknown', status: 'approved', event: { date: 'Coming soon' } },
    { id: 'tomorrow', status: 'approved', event: { date: '2026-11-23' } },
  ];
  expect(upcomingRegistrations(entries, now).map(entry => entry.id)).toEqual(['future', 'tomorrow']);
  expect(registrationStatus('rejected')).toEqual({ label: 'Not approved', tone: 'danger' });
  expect(registrationStatus('payment_pending').label).toBe('payment pending');
});


it('prioritises today’s unused entry pass over expired, used and future passes', () => {
  const now = new Date('2026-11-22T10:00:00+05:30');
  const passes = [
    { valid_date: '2026-11-21', is_used: false },
    { valid_date: '2026-11-22', is_used: true },
    { valid_date: '2026-11-23', is_used: false },
    { valid_date: '2026-11-22', is_used: false },
  ];
  expect(preferredStudentPass(passes, now)).toBe(passes[3]);
  expect(studentPassStatus(passes[0], now).label).toBe('Expired');
  expect(studentPassStatus(passes[1], now).label).toBe('Already checked in');
  expect(studentPassStatus(passes[2], now).label).toBe('Upcoming');
});


it('offers account-saved events and a working bookmark action without navigating away', async () => {
  await renderPage(<Events />, '/dashboard/events?view=saved');
  expect(host.textContent).toContain('Clinical Quiz');
  expect(host.textContent).not.toContain('Battle of Bands');
  const bookmark = host.querySelector<HTMLButtonElement>('[aria-label="Unsave Clinical Quiz"]')!;
  expect(bookmark.getAttribute('aria-pressed')).toBe('true');
  await act(async () => bookmark.click());
  expect(fixtures.tools.toggleSaved).toHaveBeenCalledWith('2');
});
