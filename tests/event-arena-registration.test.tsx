// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RegistrationModal } from '../src/components/RegistrationModal';

const mocks = vi.hoisted(() => ({ event: { id: 9, title: 'Med Quiz', registration_open: true, registration_mode_locked: true, registration_default_mode: 'individual', date: '2026-11-23' } as any, add: vi.fn(), invite: vi.fn(), groups: [] as any[], members: [] as any[], student: { user: { id: 'student', email: 'student@example.test' }, profile: { full_name: 'Quiz Participant', phone: '9876543210', college: 'IQ City', batch: '2024' }, isAuthenticated: true, isProfileComplete: false } }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ events: [mocks.event], siteSettings: { registration_participant_types: ['2024'] }, addRegistration: mocks.add }) }));
vi.mock('../src/context/StudentAuthContext', () => ({ useStudentAuth: () => mocks.student }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: async () => ({ data: [] }) }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: (table: string) => {
  let fields = '';
  return { select(value: string) { fields = value; return this; }, eq() { return this; }, insert: mocks.invite, then(resolve: any) { resolve({ data: table === 'student_groups' ? mocks.groups : table === 'student_group_members' && fields.includes('profile:') ? mocks.members : [] }); } };
} } }));
vi.mock('../src/components/PaymentStep', () => ({ PaymentStep: () => <p data-payment>Payment confirmation</p> }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); Object.assign(mocks.event, { registration_open: true, registration_default_mode: 'individual', payment_enabled: false, team_min_members: 2, team_max_members: 4 }); mocks.groups = []; mocks.members = []; mocks.invite.mockReset(); mocks.invite.mockResolvedValue({ error: null }); mocks.add.mockReset(); mocks.add.mockResolvedValue({ id: 'RICO1' });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; }); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const render = async () => act(async () => root.render(<RegistrationModal isOpen onClose={() => {}} eventId={9} eventTitle="Med Quiz" />));
it('keeps the existing profile-prefilled registration connected to the new modal', async () => {
  await render();
  expect(document.querySelector('.arena-registration-panel')?.getAttribute('aria-labelledby')).toBeTruthy();
  await act(async () => (document.querySelector('[data-arena-submit]') as HTMLButtonElement).click());
  expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ event_id: 9, user_id: 'student', full_name: 'Quiz Participant', status: 'pending' }));
  expect(document.querySelector('.arena-registration-panel')?.textContent).toContain('Registration Complete');
});
it('blocks a submit if registration closes while the form is open', async () => {
  await render(); mocks.event.registration_open = false; await render();
  await act(async () => (document.querySelector('[data-arena-submit]') as HTMLButtonElement).click());
  expect(mocks.add).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Registration is currently closed');
});
it('loads a saved team without writing entries, then follows the pending-payment flow on confirmation', async () => {
  Object.assign(mocks.event, { registration_default_mode: 'team', payment_enabled: true, payment_amount: 350, coordinator_upi_id: 'coordinator@example' });
  mocks.groups = [{ id: 'group-1', name: 'Stage Crew', owner_id: 'student' }];
  mocks.members = [{ id: 'member-1', user_id: 'teammate', status: 'accepted', profile: { full_name: 'Team Participant', username: 'team_participant', batch: '2024' } }];
  await render();
  const group = document.querySelector('button[aria-label="Use saved team Stage Crew"]') as HTMLButtonElement;
  expect(group).toBeTruthy();
  await act(async () => group.click());
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.invite).not.toHaveBeenCalled();
  expect([...document.querySelectorAll('input')].some(input => input.value === 'Stage Crew')).toBe(true);
  await act(async () => (document.querySelector('[data-arena-submit]') as HTMLButtonElement).click());
  expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ is_team_registration: true, total_members: 2, status: 'payment_pending' }));
  expect(document.querySelector('[data-payment]')).toBeTruthy();
});
