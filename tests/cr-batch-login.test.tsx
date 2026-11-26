// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CRLogin } from '../src/pages/CRLogin';

const mocks = vi.hoisted(() => ({
  settings: { registration_participant_types: ['2021-2022'] } as any,
  homepageSettings: { brand_logo_url: 'https://cdn.example/crest.png', updated_at: '1' },
  verify: vi.fn(),
  navigate: vi.fn(),
  toast: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { verifyOtp: mocks.verify } } }));
vi.mock('../src/context/CoreDataContext', () => ({
  useCoreData: () => ({ siteSettings: mocks.settings, loading: false }),
  useOptionalCoreData: () => ({ homepageSettings: mocks.homepageSettings }),
}));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('react-hot-toast', () => ({ toast: { error: mocks.toast, success: mocks.toast } }));
vi.mock('react-router-dom', async original => ({
  ...await original<typeof import('react-router-dom')>(),
  useNavigate: () => mocks.navigate,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.settings = { registration_participant_types: ['2021-2022'] };
  mocks.verify.mockResolvedValue({ error: null });
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ token_hash: 'once' }) });
  vi.stubGlobal('fetch', mocks.fetch);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const mount = async () => act(async () => root.render(<MemoryRouter><CRLogin /></MemoryRouter>));

it('uses the configured full academic batch and PIN without email fields', async () => {
  await mount();
  expect(container.querySelector('input[type=email]')).toBeNull();
  expect(container.querySelector('select')?.textContent).toContain('2021-2022');
  await act(async () => {
    const select = container.querySelector('select')!;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, '2021-2022');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const input = container.querySelector<HTMLInputElement>('#cr-login-password')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '4826');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mocks.fetch).toHaveBeenCalledWith('/api/cr-login', expect.objectContaining({ body: JSON.stringify({ batch: '2021-2022', password: '4826' }) }));
  expect(mocks.verify).toHaveBeenCalledWith({ token_hash: 'once', type: 'magiclink' });
  expect(JSON.parse(sessionStorage.getItem('cr_session')!).batch).toBe('2021-2022');
  expect(mocks.navigate).toHaveBeenCalledWith('/cr/dashboard');
});

it('uses the same secondary batch settings as student registration', async () => {
  mocks.settings = { registration_participant_types: [], batch_options: ['2022-2023', '2023-2024'] };
  await mount();
  expect([...container.querySelectorAll('option')].map(option => option.value)).toEqual(['', '2022-2023', '2023-2024']);
  expect(mocks.toast).not.toHaveBeenCalled();
});

it('matches the StaffPortalLayout editorial design with role link, password visibility toggle, and inline alert', async () => {
  await mount();
  expect(container.querySelector('.staff-portal')).toBeTruthy();
  expect(container.querySelector('.staff-portal-back')?.getAttribute('href')).toBe('/login');
  expect(container.querySelector('.staff-portal-brand img')?.getAttribute('src')).toBe('https://cdn.example/crest.png?v=1');

  const passwordInput = container.querySelector<HTMLInputElement>('#cr-login-password')!;
  expect(passwordInput.type).toBe('password');
  expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');

  const toggleBtn = container.querySelector<HTMLButtonElement>('[aria-label="Show access code"]')!;
  await act(async () => toggleBtn.click());
  expect(passwordInput.type).toBe('text');
  expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');

  mocks.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid batch PIN' }) });
  await act(async () => {
    const select = container.querySelector('select')!;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, '2021-2022');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(passwordInput, 'wrong');
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Invalid batch PIN');
});
