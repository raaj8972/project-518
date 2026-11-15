// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Login } from '../src/pages/Login';

const mocks = vi.hoisted(() => ({ login: vi.fn(), google: vi.fn(), admins: vi.fn(), navigate: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ login: mocks.login, loginWithGoogle: mocks.google, isAuthenticated: false, loading: false }) }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: {} }) }));
vi.mock('../src/lib/adminService', () => ({ AdminService: { getAllAdmins: mocks.admins } }));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../src/components/BrandLogo3D', () => ({ default: () => null }));
vi.mock('../src/components/ui/LazyVideo', () => ({ LazyVideo: () => null }));
vi.mock('react-router-dom', async importOriginal => ({ ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));

let container: HTMLDivElement;
let root: Root;
const ownerEmail = 'ricorrenza.theiqcityfestival@gmail.com';
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/login');
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.admins.mockResolvedValue([]);
  mocks.login.mockResolvedValue({ success: false, error: 'Invalid credentials' });
  mocks.google.mockResolvedValue({ success: true });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function mount() { await act(async () => root.render(<MemoryRouter><Login /></MemoryRouter>)); }
function button(text: string) {
  const buttons = [...container.querySelectorAll('button')];
  return buttons.find(node => node.querySelector('strong')?.textContent === text)
    || buttons.find(node => node.textContent?.includes(text))!;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function input(id: string, value: string) {
  const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

it('starts with clean portal choices, then account types, and only then the sign-in fields', async () => {
  mocks.admins.mockRejectedValue(new Error('Unavailable'));
  await mount();
  expect(container.querySelector('#staff-email')).toBeNull();
  expect(container.querySelector('#staff-password')).toBeNull();
  expect([...container.querySelectorAll('.staff-login-role')]).toHaveLength(5);
  expect([...container.querySelectorAll('.staff-login-role[href]')].map(node => node.getAttribute('href'))).toEqual(['/security-login', '/coordinator', '/cr/login', '/council']);
  expect(mocks.admins).not.toHaveBeenCalled();
  await click('Admin');
  expect(container.querySelector('#staff-email')).toBeNull();
  expect([...container.querySelectorAll('.staff-login-role strong')].map(node => node.textContent)).toEqual(['Super Admin','Admin']);
  await click('Admin');
  expect(container.querySelector<HTMLInputElement>('#staff-email')?.value).toBe('');
  expect(document.activeElement?.id).toBe('staff-email');
});
it('opens the selected identity, focuses its password and clears credentials when resetting identity', async () => {
  await mount(); await click('Admin'); await click('Super Admin');
  expect(container.querySelector<HTMLInputElement>('#staff-email')?.value).toBe(ownerEmail);
  expect(document.activeElement?.id).toBe('staff-password');
  await input('staff-password', 'fixture-password'); await submit();
  expect(mocks.login).toHaveBeenCalledWith(ownerEmail, 'fixture-password', undefined, false);
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Invalid credentials');
  await click('Reset identity');
  expect(container.querySelector<HTMLInputElement>('#staff-password')?.value).toBe('');
  expect(container.querySelector<HTMLInputElement>('#staff-email')?.value).toBe('');
});
it('submits an authenticator code through the same login flow', async () => {
  mocks.login.mockResolvedValueOnce({ success: false, requiresTOTP: true, role: 'admin' }).mockResolvedValueOnce({ success: true });
  await mount(); await click('Admin'); await click('Admin'); await input('staff-email','admin@example.test'); await input('staff-password', 'fixture-password'); await submit();
  expect(container.querySelector('#staff-code')).not.toBeNull();
  expect(document.activeElement?.id).toBe('staff-code');
  await input('staff-code', '123456'); await submit();
  expect(mocks.login).toHaveBeenLastCalledWith('admin@example.test', 'fixture-password', '123456', false);
  expect(mocks.navigate).toHaveBeenCalledWith('/admin');
});
it('keeps the owner master-gate handoff', async () => {
  mocks.login.mockResolvedValue({ success: false, requiresTOTP: true, role: 'owner' });
  await mount(); await click('Admin'); await click('Super Admin'); await input('staff-password', 'fixture-password'); await submit();
  expect(mocks.navigate).toHaveBeenCalledWith('/master-node-access');
  expect(JSON.parse(sessionStorage.getItem('rico_fast_track_creds')!)).toEqual({ e: ownerEmail, p: 'fixture-password' });
});
it('consumes fast-track credentials once without using stale form state', async () => {
  window.history.replaceState({}, '', '/login?mode=master');
  sessionStorage.setItem('rico_master_gate_access', 'vault_v2_fixture');
  sessionStorage.setItem('rico_fast_track_creds', JSON.stringify({ e: 'fixture@example.com', p: 'fixture-password' }));
  mocks.login.mockResolvedValue({ success: true });
  await mount();
  expect(mocks.login).toHaveBeenCalledExactlyOnceWith('fixture@example.com', 'fixture-password', undefined, true);
  expect(sessionStorage.getItem('rico_fast_track_creds')).toBeNull();
});
it('supports Google sign-in and renders provider failures', async () => {
  mocks.google.mockRejectedValue(new Error('Provider unavailable'));
  await mount(); await click('Admin'); await click('Admin'); await click('Continue with Google');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Google sign-in failed');
  expect(button('Continue with Google').disabled).toBe(false);
  mocks.google.mockResolvedValue({ success: true });
  await click('Continue with Google');
  expect(mocks.navigate).toHaveBeenCalledWith('/admin');
});
it('sends recovery through the existing API and reports the result', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Verification code sent.' }) });
  vi.stubGlobal('fetch', fetch);
  await mount(); await click('Admin'); await click('Admin'); await click('Account recovery');
  expect(container.querySelector('dialog')?.open).toBe(true);
  await input('staff-recovery-email', 'fixture@example.com');
  await act(async () => container.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(fetch).toHaveBeenCalledWith('/api/request-password-reset', expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'fixture@example.com' }) }));
  expect(container.querySelector('dialog [role="status"]')?.textContent).toBe('Verification code sent.');
});

it('allows going back between steps and clears credentials before choosing another account type',async()=>{await mount();await click('Admin');await click('Super Admin');await input('staff-password','unsent-fixture');await click('Change account type');expect(container.querySelector('#staff-password')).toBeNull();await click('Admin');expect(container.querySelector<HTMLInputElement>('#staff-password')?.value).toBe('');expect(container.querySelector<HTMLInputElement>('#staff-email')?.value).toBe('');await click('Change account type');await click('All access options');expect(container.querySelector('.staff-login-entry-options')).not.toBeNull();expect(mocks.login).not.toHaveBeenCalled();});
