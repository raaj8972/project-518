// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CRDashboard } from '../src/pages/CRDashboard';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  rpc: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  profiles: [
    {
      id: 'stu-1',
      full_name: 'Ananya Sen',
      username: 'ananya',
      phone: '9876543210',
      college: 'IQ City Medical College',
      batch: '2021-2022',
      is_approved: false,
      avatar_url: null,
      created_at: '2026-11-26T08:00:00Z',
    },
    {
      id: 'stu-2',
      full_name: 'Rohan Roy',
      username: 'rohan',
      phone: '9123456780',
      college: 'IQ City Medical College',
      batch: '2021-2022',
      is_approved: false,
      avatar_url: null,
      created_at: '2026-11-26T09:00:00Z',
    },
    {
      id: 'stu-3',
      full_name: 'Meera Das',
      username: 'meera',
      phone: '9000011111',
      college: 'IQ City Medical College',
      batch: '2021-2022',
      is_approved: true,
      avatar_url: null,
      created_at: '2026-11-26T07:00:00Z',
    },
  ],
}));

vi.mock('../src/context/CoreDataContext', () => ({
  useOptionalCoreData: () => ({
    homepageSettings: { brand_logo_url: 'https://cdn.example/crest.png', updated_at: '1' },
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock('react-router-dom', async original => ({
  ...await original<typeof import('react-router-dom')>(),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: {
              app_metadata: { role: 'cr', cr_batch: '2021-2022' },
            },
          },
        },
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async () => ({ data: mocks.profiles, error: null }),
      };
      return chain;
    },
    rpc: mocks.rpc,
  },
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.setItem(
    'cr_session',
    JSON.stringify({
      batch: '2021-2022',
      authenticated: true,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    })
  );
  mocks.rpc.mockResolvedValue({ error: null });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const mount = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <CRDashboard />
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const getButton = (text: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(btn => btn.textContent?.includes(text))!;

it('renders batch metrics, filters students via search, approves individually, and confirms bulk approval inline', async () => {
  await mount();

  expect(container.querySelector('.cr-dashboard')).toBeTruthy();
  expect(container.querySelector('.cr-brand img')?.getAttribute('src')).toBe('https://cdn.example/crest.png?v=1');
  expect(container.textContent).toContain('2021-2022 Verification Desk');
  expect(container.querySelectorAll('.cr-student-card').length).toBe(2);

  // Filter via search input
  const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'Ananya');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.querySelectorAll('.cr-student-card').length).toBe(1);

  await act(async () => getButton('Approve profile').click());
  expect(mocks.rpc).toHaveBeenCalledWith('approve_student_profile', {
    p_student_id: 'stu-1',
    p_batch: '2021-2022',
    p_password: '',
    p_is_approved: true,
  });

  // Clear search, confirm remaining pending student via inline 2-step bulk confirmation
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, '');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => getButton('Approve all shown').click());
  expect(container.querySelector('.cr-confirm-bar')).toBeTruthy();
  await act(async () => getButton('Confirm approve all').click());
  expect(mocks.rpc).toHaveBeenCalledWith('cr_approve_batch_profiles', {
    p_student_ids: ['stu-2'],
    p_is_approved: true,
  });

  // Switch to Approved tab
  await act(async () => getButton('Approved (').click());
  expect(container.querySelectorAll('.cr-student-card').length).toBe(3);
});
