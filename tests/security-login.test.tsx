// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SecurityLogin from '../src/pages/SecurityLogin';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), verifyOtp: vi.fn(), navigate: vi.fn(), toast: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc: mocks.rpc, auth: { verifyOtp: mocks.verifyOtp } } }));
vi.mock('../src/context/CoreDataContext', () => ({ useOptionalCoreData: () => ({ homepageSettings: { brand_logo_url: 'https://cdn.example/crest.png', updated_at: '1' } }) }));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('react-hot-toast', () => ({ default: { success: mocks.toast } }));
vi.mock('react-router-dom', async importOriginal => ({ ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));
let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.verifyOtp.mockResolvedValue({ error: null });
  fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => root.render(<MemoryRouter><SecurityLogin /></MemoryRouter>)); }
async function input(id: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

it('allows manual entry when the directory fails and associates labels with inputs', async () => {
  mocks.rpc.mockRejectedValue(new Error('Offline'));
  await mount();
  expect(container.querySelector('label[for="security-username"]')?.textContent).toBe('Your name');
  expect(container.querySelector<HTMLInputElement>('#security-username')?.autocomplete).toBe('username');
  expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
});
it('loads the security identity selector and verifies the session before entering the dashboard', async () => {
  mocks.rpc.mockResolvedValue({ data: [{ username: 'gate1', full_name: 'Gate One' }], error: null });
  const user = { id: 'fixture', full_name: 'Gate One' };
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token_hash: 'fixture-token', user }) });
  await mount();
  expect(container.querySelector<HTMLSelectElement>('select')?.value).toBe('gate1');
  await input('security-password', 'fixture-password'); await submit();
  expect(fetchMock).toHaveBeenCalledWith('/api/security-login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'gate1', password: 'fixture-password' }) }));
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'fixture-token', type: 'magiclink' });
  expect(JSON.parse(localStorage.getItem('security_user')!)).toEqual(user);
  expect(mocks.navigate).toHaveBeenCalledWith('/security-dashboard');
});
it('shows an inline failure without storing a user or navigating', async () => {
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid credentials' }) });
  await mount(); await input('security-username', 'gate1'); await input('security-password', 'fixture-password'); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Invalid credentials');
  expect(mocks.verifyOtp).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  expect(localStorage.getItem('security_user')).toBeNull();
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
});
it('never stores the user if session verification fails', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token_hash: 'fixture-token', user: { full_name: 'Gate One' } }) });
  mocks.verifyOtp.mockResolvedValue({ error: new Error('Session verification failed') });
  await mount(); await input('security-username', 'gate1'); await input('security-password', 'fixture-password'); await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Session verification failed');
  expect(localStorage.getItem('security_user')).toBeNull(); expect(mocks.navigate).not.toHaveBeenCalled();
});
it('forwards an explicit verification type returned by the security login API', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ token_hash: 'signup-token', type: 'signup', user: { full_name: 'Gate One' } }) });
  await mount(); await input('security-username', 'gate1'); await input('security-password', 'fixture-password'); await submit();
  expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'signup-token', type: 'signup' });
});
