// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { RegistrationManagement } from '../src/components/admin/RegistrationManagement';
import { AuditionManagement } from '../src/components/admin/AuditionManagement';
import { ParticipantWorkspaceNavigation } from '../src/components/admin/participants/ParticipantWorkspace';
import { getAdminSections } from '../src/constants/adminSections';
const mocks = vi.hoisted(() => ({ data: {} as any, result: {} as any, options: {} as any, status: vi.fn(), auditionStatus: vi.fn(), remove: vi.fn(), refresh: vi.fn(), push: vi.fn(), excel: vi.fn(), pdf: vi.fn(), read: vi.fn(), send: vi.fn(), navigate: vi.fn() }));
vi.mock('../src/components/PrivateMedia', () => ({ PrivateMediaImage: (props: any) => <img {...props} />, PrivateMediaLink: (props: any) => <a {...props} /> }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('../src/components/ToastProvider', () => ({ useToast: () => ({ push: mocks.push }) }));
vi.mock('../src/hooks/useRegistrations', () => ({ useRegistrations: (options: unknown) => { mocks.options = options; return mocks.result; } }));
vi.mock('../src/hooks/useRegistrationMutations', () => ({ useRegistrationMutations: () => ({ isMutating: false, updateStatus: mocks.status, deleteRegistration: mocks.remove, restoreRegistration: vi.fn(), permanentDelete: vi.fn(), bulkApprove: vi.fn(), bulkReject: vi.fn(), bulkDelete: vi.fn(), bulkRestore: vi.fn(), bulkPermanentDelete: vi.fn(), updateBatchGlobally: vi.fn() }) }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: mocks.read, dualUpdate: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: {} }), list: async () => ({ data: [] }) }) }, channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn() } }));
vi.mock('../src/utils/excelExport', () => ({ exportRegistrationsToExcel: mocks.excel, exportAuditionsToExcel: mocks.excel }));
vi.mock('../src/utils/pdfExport', () => ({ exportRegistrationsToPDF: mocks.pdf, exportRegistrationsByEvent: mocks.pdf, exportRegistrationsByStatus: mocks.pdf, exportEventSummaryPDF: mocks.pdf, exportAuditionsToPDF: mocks.pdf, exportAuditionsByStatus: mocks.pdf, preloadWatermark: vi.fn() }));
vi.mock('../src/services/adminDataService', () => ({ adminDataService: { sendApprovalEmail: mocks.send } }));
vi.mock('../src/services/eventWhatsAppGroups', () => ({ getAccessibleEventWhatsAppGroups: async () => ({}) }));
vi.mock('../src/components/shared/ParticipationVerification', () => ({ default: () => <details><summary>Verify event participation</summary></details> }));
vi.mock('../src/hooks/useFestivalDialog', () => ({ useFestivalDialog: () => ({ current: null }) }));
let root: Root, host: HTMLDivElement;
const registration = (id: string) => ({ id, full_name: `Meera ${id}`, email: `${id}@example.test`, phone: '9876540012', event_title: 'Acoustic evening', participant_type: '2024', status: 'pending', created_at: '2026-11-25T05:00:00Z', registration_date: '2026-11-25T05:00:00Z', is_team_registration: false });
const audition = (id: string, role = 'Guitar', status = 'pending') => ({ id, full_name: `Anirudh ${id}`, email: `${id}@example.test`, phone: '9876540023', participant_type: '2025', instrument_role: role, portfolio_link: null, experience_motivation: 'I play acoustic sets.', status, created_at: '2026-11-25T06:00:00Z' });
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks();
  mocks.read.mockResolvedValue({ data: [] }); mocks.send.mockResolvedValue({ success: true }); mocks.auditionStatus.mockResolvedValue(undefined); mocks.status.mockResolvedValue(undefined);
  mocks.data = { events: [{ id: 1, title: 'Acoustic evening' }], siteSettings: {}, adminUsers: [], eventCoordinators: [], isOwner: () => true, refreshAll: mocks.refresh, loading: false, auditions: [audition('A1'), audition('A2', 'Vocals', 'reviewed')], updateAuditionStatus: mocks.auditionStatus, deleteAudition: mocks.remove };
  mocks.result = { registrations: [registration('R1'), registration('R2')], count: 67, stats: { total: 127, pending: 39, approved: 81, rejected: 7, trash: 2 }, refresh: mocks.refresh, isLoading: false, error: null };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const render = async (children: React.ReactNode) => { await act(async () => root.render(<MemoryRouter>{children}</MemoryRouter>)); };
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === label || node.textContent?.trim() === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
async function change(field: HTMLInputElement | HTMLSelectElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }
it('groups auditions under registrations and shows only the assigned application tabs and form tools', async () => {
  expect(getAdminSections(true).find(section => section.id === 'auditions')?.parent).toBe('registrations');
  await render(<ParticipantWorkspaceNavigation activeTab="auditions" available={new Set(['auditions'])} onNavigate={mocks.navigate} />);
  expect(host.querySelector('h1')?.textContent).toContain('Registrations & auditions');
  expect(host.querySelector('nav [aria-current=page]')?.textContent).toBe('Band auditions'); expect(button('Form setup')).toBeUndefined(); expect(button('Event registrations')).toBeUndefined();
  await render(<ParticipantWorkspaceNavigation activeTab="registrations" available={new Set(['registrations', 'auditions', 'registration-modal'])} onNavigate={mocks.navigate} />);
  await click('Band auditions'); expect(mocks.navigate).toHaveBeenCalledWith('auditions'); await click('Form setup'); await click('Event registration form'); expect(mocks.navigate).toHaveBeenCalledWith('registration-modal'); expect(document.querySelector('.participants-menu__items')).toBeNull();
});
it('uses global counts, bounds selection to the page and resets pagination when filters change', async () => {
  await render(<RegistrationManagement />);
  expect([...host.querySelectorAll('.participants-metrics strong')].map(node => node.textContent)).toEqual(['127', '39', '81', '7']);
  await click('Next registration page'); expect(mocks.options.page).toBe(2);
  await act(async () => host.querySelector<HTMLInputElement>('[aria-label="Select Meera R1"]')!.click()); expect(host.querySelector('.participants-selection')?.textContent).toContain('1 selected');
  await change(host.querySelector<HTMLSelectElement>('.participants-filters select')!, 'Acoustic evening'); expect(mocks.options.page).toBe(1); expect(mocks.options.filters.event).toBe('Acoustic evening'); expect(host.querySelector('.participants-selection')).toBeNull();
  await click('Export'); await click('Excel spreadsheet'); expect(mocks.excel).toHaveBeenCalledWith(mocks.result.registrations, 'registrations.xlsx');
});
it('preserves application details and approval, and distinguishes loading, error and empty states', async () => {
  await render(<RegistrationManagement />); await click('View Meera R1'); expect(host.querySelector('.participants-detail')?.textContent).toContain('Registration Details'); await click('Approve Meera R1'); expect(mocks.status).toHaveBeenCalledWith('R1', 'approved'); expect(mocks.send).toHaveBeenCalled();
  mocks.result.isLoading = true; mocks.result.registrations = []; await render(<RegistrationManagement />); expect(host.querySelector('[aria-label="Loading registrations"]')).not.toBeNull(); expect(host.querySelector('.participants-empty')).toBeNull();
  mocks.result.isLoading = false; mocks.result.error = 'Connection unavailable'; await render(<RegistrationManagement />); expect(host.querySelector('[role=alert]')?.textContent).toContain('Connection unavailable'); expect(host.querySelector('.participants-empty')).toBeNull(); await click('Retry'); expect(mocks.refresh).toHaveBeenCalled();
  mocks.result.error = null; await render(<RegistrationManagement />); expect(host.querySelector('.participants-empty')?.textContent).toContain('The first entry starts here');
});
it('uses the existing audition review flow, retains details on failure and exports null portfolios safely', async () => {
  await render(<AuditionManagement />); await click('View Anirudh A1'); expect(host.querySelector('.participants-detail')?.textContent).toContain('I play acoustic sets.');
  mocks.auditionStatus.mockRejectedValueOnce(new Error('Please retry')); await click('Mark reviewed: Anirudh A1'); expect(mocks.auditionStatus).toHaveBeenCalledWith('A1', 'reviewed'); expect(host.querySelector('[role=alert]')?.textContent).toContain('Please retry'); expect(host.querySelector('.participants-detail')).not.toBeNull();
  await click('Mark reviewed: Anirudh A1'); expect(host.querySelector('[role=alert]')).toBeNull();
  await click('Export'); await click('Detailed PDF report'); expect(mocks.pdf).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'A1', portfolio_link: undefined })]), expect.anything());
});
it('combines audition filters, paginates the results and clamps after deletion', async () => {
  mocks.data.auditions = Array.from({ length: 43 }, (_, index) => audition(`A${index}`, index % 2 ? 'Vocals' : 'Guitar'));
  await render(<AuditionManagement />); expect(host.querySelectorAll('.participants-table > tbody > tr')).toHaveLength(20); await click('Next audition page'); await click('Next audition page'); expect(host.querySelectorAll('.participants-table > tbody > tr')).toHaveLength(3);
  mocks.data.auditions = mocks.data.auditions.slice(0, 22); await render(<AuditionManagement />); expect(host.querySelectorAll('.participants-table > tbody > tr')).toHaveLength(2);
  await change(host.querySelector<HTMLSelectElement>('.participants-filters select')!, 'Guitar'); expect(host.querySelectorAll('.participants-table > tbody > tr')).toHaveLength(11);
  await change(host.querySelector<HTMLInputElement>('input[type=search]')!, 'A20'); expect(host.querySelectorAll('.participants-table > tbody > tr')).toHaveLength(1); expect(host.querySelector('tbody')?.textContent).toContain('Anirudh A20');
});
it('keeps unavailable email history distinct from an unsent confirmation and opens column settings above report settings', async () => {
  mocks.result.registrations = [{ ...registration('R1'), status: 'approved' }];
  mocks.read.mockRejectedValue(new Error('Email log schema unavailable'));
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await render(<RegistrationManagement />);
    expect(host.querySelector('tbody')?.textContent).toContain('Email status unavailable'); expect(host.querySelector('tbody')?.textContent).not.toContain('Email not sent');
    await click('View Meera R1'); expect(host.querySelector('.participants-detail [role=alert]')?.textContent).toContain('Notification history could not load');
    await click('More'); await click('Report & registration settings'); await click('Select Columns');
    const dialogs = document.querySelectorAll('[role=dialog]'); expect(dialogs).toHaveLength(2); expect(dialogs[1].textContent).toContain('PDF report columns'); await click('Apply columns'); expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
  } finally { consoleError.mockRestore(); }
});
it('requires a custom message before sending, and dismisses an open menu with Escape', async () => {
  await render(<RegistrationManagement />); await act(async () => host.querySelector<HTMLInputElement>('[aria-label="Select Meera R1"]')!.click()); await click('Email selected');
  expect(button('Send email').disabled).toBe(true); expect(document.querySelector('[role=dialog]')?.textContent).toContain('Email 1 participant'); await click('Cancel');
  await click('Export'); expect(document.querySelector('.participants-menu__items')).not.toBeNull(); await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); expect(document.querySelector('.participants-menu__items')).toBeNull(); expect(document.activeElement?.textContent).toContain('Export');
});
