// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DashboardLayout from '../src/layouts/DashboardLayout';
import Settings from '../src/pages/dashboard/Settings';

const mocks = vi.hoisted(() => ({
  auth: {} as any,
  claim: vi.fn(),
  getIdentity: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../src/context/StudentAuthContext', () => ({ useStudentAuth: () => mocks.auth }));
vi.mock('../src/services/studentTeams', () => ({
  claimCollegeIdentity: mocks.claim,
  getCollegeIdentity: mocks.getIdentity,
}));
vi.mock('../src/hooks/useXPEngine', () => ({ useXPEngine: () => ({ awardXP: vi.fn() }) }));
vi.mock('../src/hooks/useDomainRealtime', () => ({ useDomainRealtime: () => undefined }));
vi.mock('../src/context/StudentEventToolsContext', () => ({ useStudentEventTools: () => undefined }));
vi.mock('../src/context/CoreDataContext', () => ({
  useCoreData: () => ({ siteSettings: { registration_participant_types: ['2024'] } }),
}));
vi.mock('../src/components/CartDrawer', () => ({ CartDrawer: () => null }));
vi.mock('../src/components/dashboard/StudentDashboardShell', () => ({
  default: ({ children }: any) => <div data-testid="student-shell">{children}</div>,
}));
vi.mock('../src/components/dashboard/WalletPassModal', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        order: () => query,
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    },
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} };
      return ch;
    },
    removeChannel: vi.fn(),
  },
}));

let host: HTMLDivElement;
let root: Root;

const renderRoute = async (path = '/dashboard/settings') => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<p>Student home</p>} />
            <Route path="settings" element={<Settings />} />
            <Route path="messages" element={<p>Technical help</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  vi.clearAllMocks();
  mocks.getIdentity.mockResolvedValue({
    user_id: 'stu-1',
    iqmg_number: null,
    status: 'correction_required',
    note: 'Correction requested by Batch 2021 CR: Use ID card IQMG',
    verified_at: null,
    updated_at: '2026-11-27T16:10:00Z',
  });
  mocks.claim.mockResolvedValue({
    user_id: 'stu-1',
    iqmg_number: 'IQMG-2021-88',
    status: 'pending',
    note: null,
    verified_at: null,
    updated_at: '2026-11-27T16:11:00Z',
  });
  mocks.update.mockResolvedValue({ error: null });
  mocks.refresh.mockResolvedValue(undefined);
  mocks.auth = {
    user: { id: 'stu-1' },
    profile: {
      id: 'stu-1',
      full_name: 'Ananya Sen',
      phone: '9876543210',
      batch: '2021',
      iqmg_number: 'IQMG-2021-01',
      iqmg_status: 'pending',
      iqmg_note: 'Updated to IQMG-2021-01 by Batch 2021 CR. Review it in My profile.',
      iqmg_updated_at: '2026-11-27T16:05:00Z',
      is_approved: true,
    },
    loading: false,
    isAuthenticated: true,
    isApproved: true,
    isProfileComplete: true,
    signOut: vi.fn(),
    updateProfile: mocks.update,
    refreshProfile: mocks.refresh,
  };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it('shows an IQMG update popup in student profile/dashboard and persists dismissal until a new change arrives', async () => {
  mocks.getIdentity.mockResolvedValue({
    user_id: 'stu-1',
    iqmg_number: 'IQMG-2021-01',
    status: 'pending',
    note: 'Updated to IQMG-2021-01 by Batch 2021 CR. Review it in My profile.',
    verified_at: null,
    updated_at: '2026-11-27T16:05:00Z',
  });

  await renderRoute('/dashboard/settings');

  const dialog = host.querySelector('dialog.sd-iqmg-dialog');
  expect(dialog).toBeTruthy();
  expect(dialog?.textContent).toContain('Your college IQMG was updated');
  expect(dialog?.textContent).toContain('Updated to IQMG-2021-01 by Batch 2021 CR');
  expect(dialog?.textContent).toContain('IQMG-2021-01');

  const dismissBtn = [...dialog!.querySelectorAll<HTMLButtonElement>('button')].find(b =>
    b.textContent?.includes('Keep & dismiss')
  )!;
  await act(async () => dismissBtn.click());
  expect(host.querySelector('dialog.sd-iqmg-dialog')).toBeNull();

  // Can re-open manually from My profile card
  const reopenBtn = [...host.querySelectorAll<HTMLButtonElement>('button')].find(b =>
    b.textContent?.includes('Open IQMG popup')
  )!;
  await act(async () => reopenBtn.click());
  expect(host.querySelector('dialog.sd-iqmg-dialog')).toBeTruthy();
});

it('prompts for IQMG correction inside popup when CR requests correction and saves the corrected value', async () => {
  mocks.auth.profile = {
    ...mocks.auth.profile,
    iqmg_number: null,
    iqmg_status: 'correction_required',
    iqmg_note: 'Correction requested by Batch 2021 CR: Use ID card IQMG',
    iqmg_updated_at: '2026-11-27T16:10:00Z',
  };
  mocks.auth.isProfileComplete = false;

  await renderRoute('/dashboard');

  const dialog = host.querySelector('dialog.sd-iqmg-dialog')!;
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('Action needed: Update your IQMG number');
  expect(dialog.textContent).toContain('Use ID card IQMG');

  const input = dialog.querySelector<HTMLInputElement>('input[name="iqmg_number"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'iqmg-2021-88');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const form = dialog.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  expect(mocks.claim).toHaveBeenCalledWith('IQMG-2021-88');
  expect(mocks.refresh).toHaveBeenCalled();
  expect(mocks.toastSuccess).toHaveBeenCalledWith('College IQMG number updated!');
  expect(host.querySelector('dialog.sd-iqmg-dialog')).toBeNull();
});
