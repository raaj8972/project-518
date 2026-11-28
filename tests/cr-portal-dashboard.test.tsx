// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CRDashboard } from '../src/pages/CRDashboard';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  rpc: vi.fn(),
  rangeSpy: vi.fn(),
  fromError: null as { message: string } | null,
  accessToken: null as string | null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  realtimeFilter: null as unknown,
  realtimeCallback: null as null | ((payload: unknown) => void),
  removeChannel: vi.fn(),
  profiles: [
    {
      id: 'stu-1',
      full_name: 'Ananya Sen',
      username: 'ananya',
      phone: '9876543210',
      college: 'IQ City Medical College',
      batch: '2021-2022',
      is_approved: false,
      avatar_url: 'https://lh3.googleusercontent.com/a/broken-test-avatar',
      created_at: '2026-11-26T08:00:00Z',
    },
    {
      id: 'stu-2',
      full_name: 'Rohan Roy',
      username: null,
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
  isRealtimeSupported: () => true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            ...(mocks.accessToken ? { access_token: mocks.accessToken } : {}),
            user: {
              app_metadata: { role: 'cr', cr_batch: '2021-2022' },
            },
          },
        },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: async () => ({ error: null }),
    },
    channel: () => {
      const ch: any = {
        on: (_type: string, filter: unknown, callback: (payload: unknown) => void) => {
          mocks.realtimeFilter = filter;
          mocks.realtimeCallback = callback;
          return ch;
        },
        subscribe: (onStatus?: (status: string) => void) => {
          onStatus?.('SUBSCRIBED');
          return ch;
        },
      };
      return ch;
    },
    removeChannel: mocks.removeChannel,
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async () => {
          mocks.rangeSpy();
          return mocks.fromError ? { data: null, error: mocks.fromError } : { data: mocks.profiles, error: null };
        },
      };
      return chain;
    },
    rpc: mocks.rpc,
  },
}));

let container: HTMLDivElement;
let root: Root;

const defaultProfiles = [
  {
    id: 'stu-1',
    full_name: 'Ananya Sen',
    username: 'ananya',
    phone: '9876543210',
    college: 'IQ City Medical College',
    batch: '2021-2022',
    is_approved: false,
    avatar_url: 'https://lh3.googleusercontent.com/a/broken-test-avatar',
    created_at: '2026-11-26T08:00:00Z',
  },
  {
    id: 'stu-2',
    full_name: 'Rohan Roy',
    username: null,
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
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fromError = null;
  mocks.realtimeFilter = null;
  mocks.realtimeCallback = null;
  mocks.accessToken = null;
  mocks.profiles = defaultProfiles.map(p => ({ ...p }));
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

  // Never render placeholder "@username" when username is null
  expect(container.textContent).not.toContain('@username');
  expect(container.textContent).toContain('@ananya');

  // Avatar load errors gracefully fall back to initials instead of a broken image icon
  const avatarImg = container.querySelector<HTMLImageElement>('.cr-avatar img')!;
  expect(avatarImg.getAttribute('referrerpolicy')).toBe('no-referrer');
  await act(async () => {
    avatarImg.dispatchEvent(new Event('error'));
  });
  expect(container.querySelector('.cr-avatar img')).toBeNull();
  expect(container.querySelector('.cr-avatar')?.textContent).toBe('AS');

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

it('falls back to individual approve_student_profile calls when cr_approve_batch_profiles is unavailable', async () => {
  mocks.rpc
    .mockResolvedValueOnce({
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.cr_approve_batch_profiles in the schema cache',
      },
    })
    .mockResolvedValue({ error: null });

  await mount();
  await act(async () => getButton('Approve all shown').click());
  await act(async () => getButton('Confirm approve all').click());

  expect(mocks.rpc).toHaveBeenCalledWith('cr_approve_batch_profiles', {
    p_student_ids: ['stu-1', 'stu-2'],
    p_is_approved: true,
  });
  expect(mocks.rpc).toHaveBeenCalledWith('approve_student_profile', {
    p_student_id: 'stu-1',
    p_batch: '2021-2022',
    p_password: '',
    p_is_approved: true,
  });
  expect(mocks.rpc).toHaveBeenCalledWith('approve_student_profile', {
    p_student_id: 'stu-2',
    p_batch: '2021-2022',
    p_password: '',
    p_is_approved: true,
  });
  expect(mocks.toastSuccess).toHaveBeenCalledWith('Approved 2 student profiles.');
});

it('supports selective multi-approve dock and renders retryable error banner if profile loading fails', async () => {
  mocks.fromError = { message: 'Temporary database issue' };
  await mount();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Temporary database issue');

  mocks.fromError = null;
  await act(async () => getButton('Try again').click());
  expect(container.querySelectorAll('.cr-student-card').length).toBe(2);

  const firstCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await act(async () => firstCheckbox.click());
  expect(container.querySelector('.cr-selection-dock')).toBeTruthy();

  await act(async () => getButton('Approve selected (1)').click());
  expect(mocks.rpc).toHaveBeenCalledWith('cr_approve_batch_profiles', {
    p_student_ids: ['stu-1'],
    p_is_approved: true,
  });
  expect(container.querySelector('.cr-selection-dock')).toBeNull();
});

it('applies batch-scoped Realtime payloads with zero extra queries and blocks cross-batch records', async () => {
  vi.useFakeTimers();
  try {
    await mount();
    expect(container.querySelector('.cr-sync-badge.is-live')?.textContent).toContain('Live');
    expect(mocks.realtimeFilter).toMatchObject({ table: 'profiles', filter: 'batch=eq.2021-2022' });
    expect(mocks.rangeSpy).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.cr-student-card').length).toBe(2);

    // Wait 2 minutes with Live active -> zero periodic polling queries
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(mocks.rangeSpy).toHaveBeenCalledTimes(1);

    // Cross-batch payload is ignored even if delivered
    await act(async () => {
      mocks.realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'stu-other',
          full_name: 'Outsider',
          username: 'outsider',
          phone: '9000000000',
          college: 'Other College',
          batch: '2022-2023',
          is_approved: false,
          avatar_url: null,
          created_at: '2026-11-27T10:00:00Z',
        },
      });
    });
    expect(container.textContent).not.toContain('Outsider');

    // Same-batch INSERT updates state directly with zero extra DB SELECTs
    await act(async () => {
      mocks.realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'stu-4',
          full_name: 'Kabir Bose',
          username: 'kabir',
          phone: '9988776655',
          college: 'IQ City Medical College',
          batch: '2021-2022',
          is_approved: false,
          avatar_url: null,
          created_at: '2026-11-27T10:00:00Z',
        },
      });
    });

    expect(mocks.rangeSpy).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.cr-student-card').length).toBe(3);
    expect(container.textContent).toContain('Kabir Bose');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('1 new student synced.');
  } finally {
    vi.useRealTimers();
  }
});

it('fetches batch IQMG numbers cleanly, filters by IQMG, and syncs new Realtime student IQMG incrementally', async () => {
  vi.useFakeTimers();
  mocks.accessToken = 'cr-jwt-fixture';
  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    expect(init?.headers).toEqual({ Authorization: 'Bearer cr-jwt-fixture' });
    if (url === '/api/cr-batch-iqmg') {
      return new Response(
        JSON.stringify({
          batch: '2021-2022',
          identities: {
            'stu-1': { iqmg_number: 'IQ-2021-01', status: 'verified' },
            'stu-2': { iqmg_number: null, status: 'correction_required' },
            'stu-3': { iqmg_number: 'IQ-2021-03', status: 'pending' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url === '/api/cr-batch-iqmg?userIds=stu-4') {
      return new Response(
        JSON.stringify({
          batch: '2021-2022',
          identities: {
            'stu-4': { iqmg_number: 'IQ-2021-04', status: 'pending' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchSpy);

  try {
    await mount();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/cr-batch-iqmg', expect.any(Object));
    expect(container.textContent).toContain('IQMG IQ-2021-01');
    expect(container.textContent).toContain('Roster');
    expect(container.textContent).toContain('IQMG: Correction needed');

    // Search by normalized IQMG number (ignores dashes)
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'IQ202101');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('.cr-student-card').length).toBe(1);
    expect(container.textContent).toContain('Ananya Sen');

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, '');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Realtime INSERT fetches only the newly added student's IQMG after debounce
    await act(async () => {
      mocks.realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          id: 'stu-4',
          full_name: 'Kabir Bose',
          username: 'kabir',
          phone: '9988776655',
          college: 'IQ City Medical College',
          batch: '2021-2022',
          is_approved: false,
          avatar_url: null,
          created_at: '2026-11-27T10:00:00Z',
        },
      });
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/cr-batch-iqmg?userIds=stu-4', expect.any(Object));
    expect(container.textContent).toContain('IQMG IQ-2021-04');
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});

it('lets CR edit a student IQMG number and request correction from the verification desk modal', async () => {
  mocks.accessToken = 'cr-jwt-fixture';
  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/cr-batch-iqmg') {
      return new Response(
        JSON.stringify({
          batch: '2021-2022',
          identities: {
            'stu-1': { iqmg_number: 'IQMG6738', status: 'pending', note: null },
            'stu-2': { iqmg_number: 'IQ-2021-02', status: 'pending', note: null },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url === '/api/cr-manage-iqmg' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body || '{}'));
      if (body.action === 'update') {
        return new Response(
          JSON.stringify({
            batch: '2021-2022',
            studentId: body.studentId,
            iqmg_number: 'IQ-2021-99',
            status: 'pending',
            note: 'Updated to IQ-2021-99 by Batch 2021-2022 CR: Typo fixed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          batch: '2021-2022',
          studentId: body.studentId,
          iqmg_number: null,
          status: 'correction_required',
          note: 'Correction requested by Batch 2021-2022 CR: Re-enter card number',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchSpy);

  try {
    await mount();
    expect(container.textContent).toContain('IQMG6738');
    expect(container.textContent).not.toContain('IQMG IQMG6738');
    const editBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Edit or correct IQMG for Ananya Sen"]')!;
    expect(editBtn).toBeTruthy();

    await act(async () => editBtn.click());
    const dialog = container.querySelector('dialog.cr-dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);

    const iqmgInput = dialog.querySelector<HTMLInputElement>('input[name="iqmg_number"]')!;
    expect(iqmgInput.getAttribute('placeholder')).toBe('e.g. IQMG6738');
    const noteInput = dialog.querySelector<HTMLTextAreaElement>('textarea[name="iqmg_note"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(iqmgInput, 'iq-2021-99');
      iqmgInput.dispatchEvent(new Event('input', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(noteInput, 'Typo fixed');
      noteInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('IQMG IQ-2021-99');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Updated IQMG number for Ananya Sen.');

    // Re-open to send correction popup request
    await act(async () => editBtn.click());
    const correctRadio = dialog.querySelector<HTMLInputElement>('input[type="radio"][value="correct"]')!;
    await act(async () => correctRadio.click());
    const reasonInput = dialog.querySelector<HTMLTextAreaElement>('textarea[name="iqmg_note"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(reasonInput, 'Re-enter card number');
      reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('IQMG: Correction needed');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Correction popup sent to Ananya Sen.');
  } finally {
    vi.unstubAllGlobals();
  }
});
