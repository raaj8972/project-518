// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CoordinatorLogin } from '../src/pages/CoordinatorLogin';
const mocks = vi.hoisted(() => ({ events: [] as any[], loading: false, verifyOtp: vi.fn(), navigate: vi.fn(), push: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { verifyOtp: mocks.verifyOtp } } }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ events: mocks.events, loading: mocks.loading }) }));
vi.mock('../src/components/ToastProvider', () => ({ useToast: () => ({ push: mocks.push }) }));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('react-router-dom', async importOriginal => ({ ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.events = [{ id: 1, title: 'Stage One', visible: true }, { id: 2, title: 'Stage Two' }, { id: 3, title: 'Hidden', visible: false }];
  mocks.loading = false;
  mocks.verifyOtp.mockResolvedValue({ data: { session: { access_token: 'verified-token' } }, error: null });
  fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => root.render(<MemoryRouter><CoordinatorLogin /></MemoryRouter>)); }
async function choose(value: string) { await act(async () => { const select = container.querySelector('select')!; select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function code(value: string) { await act(async () => {
  const input = container.querySelector<HTMLInputElement>('#coordinator-code')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}); }
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

it('offers only visible events and clears the previous event code when selection changes', async () => {
  await mount();
  expect([...container.querySelectorAll('option')].map(option => option.value)).toEqual(['', '1', '2']);
  await choose('1'); await code('fixture-code'); await choose('2');
  expect(container.querySelector<HTMLInputElement>('#coordinator-code')?.value).toBe('');
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
});
it('distinguishes loading and empty event lists', async () => {
  mocks.events = []; mocks.loading = true; await mount();
  expect(container.querySelector('[role="status"]')?.textContent).toContain('Fetching');
  mocks.loading = false; await mount();
  expect(container.querySelector('[role="status"]')?.textContent).toContain('No events');
  expect(container.querySelector('select')?.disabled).toBe(true);
});
it('creates the existing 12-hour event session only after authentication succeeds', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token_hash: 'fixture-hash' }) });
  await mount(); await choose('1'); await code('fixture-code');
  const start = Date.now(); await submit();
  expect(fetchMock).toHaveBeenCalledWith('/api/coordinator-login', expect.objectContaining({ body: JSON.stringify({ eventId: 1, password: 'fixture-code' }) }));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'fixture-hash', type: 'magiclink' });
  const session = JSON.parse(sessionStorage.getItem('coordinator_session')!);
  expect(session).toMatchObject({ eventId: 1, eventTitle: 'Stage One', token: 'verified-token' });
  expect(Date.parse(session.expiresAt) - start).toBeGreaterThanOrEqual(12 * 60 * 60 * 1000);
  expect(mocks.navigate).toHaveBeenCalledWith('/coordinator/dashboard');
});
it('reports a rejected code inline without creating a session', async () => {
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid access code' }) });
  await mount(); await choose('1'); await code('fixture-code'); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Invalid access code');
  expect(sessionStorage.getItem('coordinator_session')).toBeNull();
  expect(mocks.verifyOtp).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
});
