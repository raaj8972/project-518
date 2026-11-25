// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ParticipationVerification from '../src/components/shared/ParticipationVerification';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../src/context/EventsContext', () => ({ useEventsData: () => ({ events: [{ id: 'dance', title: 'Dance' }] }) }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  from: mocks.from, rpc: mocks.rpc,
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));
let root: Root, host: HTMLDivElement;
function result(data: unknown) {
  const query: any = { then: (resolve: any) => Promise.resolve({ data, error: null }).then(resolve) };
  for (const name of ['select', 'eq', 'is', 'in', 'order']) query[name] = () => query;
  return query;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.from.mockImplementation(table => result(table === 'registrations' ? [
    { id: 'entry-a', user_id: 'student-a', full_name: 'A Participant' },
    { id: 'entry-b', user_id: 'student-b', full_name: 'B Finalist' },
  ] : table === 'registration_rounds' ? [{ registration_id: 'entry-b' }] : []));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function open() {
  await act(async () => root.render(<ParticipationVerification eventId="dance" />));
  await act(async () => { const details = host.querySelector('details')!; details.open = true; details.dispatchEvent(new Event('toggle')); });
}
it('lets staff verify and undo attendance, while a qualified result remains authoritative', async () => {
  await open();
  const button = host.querySelector('li button') as HTMLButtonElement;
  expect(button.textContent).toBe('Verify participation');
  expect((host.querySelectorAll('li button')[1] as HTMLButtonElement).disabled).toBe(true);
  expect(host.textContent).toContain('Verified by result');
  await act(async () => button.click());
  expect(mocks.rpc).toHaveBeenLastCalledWith('verify_student_participation', { p_registration_id: 'entry-a', p_verified: true });
  expect(button.textContent).toBe('Undo verification');
  await act(async () => button.click());
  expect(mocks.rpc).toHaveBeenLastCalledWith('verify_student_participation', { p_registration_id: 'entry-a', p_verified: false });
});
it('shows a failed verification without pretending the participant earned points', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'Not assigned to this event' } });
  await open();
  await act(async () => (host.querySelector('li button') as HTMLButtonElement).click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Check your event access');
  expect(host.querySelector('li button')?.textContent).toBe('Verify participation');
});
