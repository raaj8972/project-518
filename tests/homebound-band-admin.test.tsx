// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BandMember } from '../src/types/data';
import { BandManagement } from '../src/components/admin/BandManagement';

const mocks = vi.hoisted(() => ({
  data: { bandMembers: [] as BandMember[], homeboundSettings: { page_content: {} as Record<string, unknown> }, addBandMember: vi.fn(), updateBandMember: vi.fn(), deleteBandMember: vi.fn(), toggleBandMemberEnabled: vi.fn(), toggleBandMemberFeatured: vi.fn() },
  requiresApproval: false, authenticated: true, submit: vi.fn(), photoProps: vi.fn(), bulkProps: vi.fn(),
}));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: mocks.authenticated }) }));
vi.mock('../src/hooks/useApprovals', () => ({ useApprovals: () => ({ checkRequiresApproval: async () => mocks.requiresApproval, submitForApproval: mocks.submit }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next() {}, done() {} }), done() {} }) }));
vi.mock('../src/components/admin/InlineDescriptionAI', () => ({ InlineDescriptionAI: () => null }));
vi.mock('../src/components/admin/homebound/AIHomeBoundImport', () => ({ AIHomeBoundImport: (props: { onCreateMember: (member: Partial<BandMember>) => Promise<void> }) => { mocks.bulkProps(props); return <div aria-label="AI import panel" />; } }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: (props: { preserveExistingMedia?: boolean; onImageSelect: (url: string) => void; onProcessingChange: (busy: boolean) => void }) => {
  mocks.photoProps(props);
  return <div><button type="button" onClick={() => props.onImageSelect('/new-portrait.webp')}>Upload test portrait</button><button type="button" onClick={() => props.onProcessingChange(true)}>Start photo upload</button><button type="button" onClick={() => props.onProcessingChange(false)}>Finish photo upload</button></div>;
} }));

const row = (patch: Partial<BandMember> = {}): BandMember => ({ id: 9, name: 'Existing Artist', role: 'Singer', category: 'Vocalist', specialty: '', description: '', image: '/published.webp', achievements: null, social_links: null, enabled: true, is_featured: null, order_position: null, created_at: null, updated_at: null, ...patch });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  mocks.data.bandMembers = []; mocks.requiresApproval = false; mocks.authenticated = true;
  mocks.data.homeboundSettings = { page_content: { categories: [
    { id: 'vocals', label: 'Vocals', icon: 'vocals', enabled: true, aliases: ['Vocalist', 'Vocals'] },
    { id: 'beatboxing', label: 'Beatboxing', icon: 'beatbox', enabled: true, aliases: ['Beatbox'] },
    { id: 'crew', label: 'Stage crew', icon: 'crew', enabled: false, aliases: ['Other'] },
  ] } };
  for (const method of [mocks.data.addBandMember, mocks.data.updateBandMember, mocks.data.deleteBandMember, mocks.data.toggleBandMemberEnabled, mocks.data.toggleBandMemberFeatured]) method.mockReset().mockResolvedValue(undefined);
  mocks.submit.mockReset().mockResolvedValue({ success: true }); mocks.photoProps.mockClear(); mocks.bulkProps.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); localStorage.clear(); });
async function render() { await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BandManagement /></MemoryRouter>)); }
const button = (name: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === name || node.textContent?.trim() === name)!;
async function click(name: string) { expect(button(name), name).toBeTruthy(); await act(async () => button(name).click()); }
const field = (suffix: string) => host.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[id$="-${suffix}"]`)!;
async function change(suffix: string, value: string) {
  const target = field(suffix); expect(target, suffix).toBeTruthy();
  const prototype = target.tagName === 'SELECT' ? HTMLSelectElement.prototype : target.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(target, value); target.dispatchEvent(new Event(target.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function newBeatboxer() { await click('Add artist'); await change('name', 'Ritvik S.'); await change('role', 'Beatboxer'); await change('category', 'beatboxing'); }

it('saves arbitrary configured categories and lets an artist be added without optional photo or biography', async () => {
  await render(); await newBeatboxer();
  expect([...field('category').querySelectorAll('option')].map(option => option.textContent)).toEqual(['Select a category', 'Vocals', 'Beatboxing', 'Stage crew (hidden)']);
  expect(host.querySelector('a[href="/admin/homebound?edit=categories"]')).not.toBeNull();
  await click('Add band member');
  expect(mocks.data.addBandMember).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ritvik S.', role: 'Beatboxer', category: 'beatboxing', image: '', description: '', specialty: '', achievements: [], enabled: true }));
  expect(host.querySelector('fieldset')).toBeNull();
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Artist added');
});

it('edits nullable legacy records, normalizes known aliases, and preserves saved media until a real save', async () => {
  mocks.data.bandMembers = [row()];
  await render(); await click('Edit Existing Artist');
  expect(field('category').value).toBe('vocals');
  expect(field('order').value).toBe('1');
  expect(field('instagram').value).toBe('');
  expect(mocks.photoProps.mock.lastCall?.[0].preserveExistingMedia).toBe(true);
  await change('category', 'beatboxing'); await change('role', 'Vocal percussion'); await click('Upload test portrait');
  await click('Save changes');
  expect(mocks.data.updateBandMember).toHaveBeenCalledWith(9, expect.objectContaining({ category: 'beatboxing', role: 'Vocal percussion', image: '/new-portrait.webp', achievements: [], social_links: { instagram: '', youtube: '', spotify: '' } }));
});

it('retains the form after a failed save and reports no false success', async () => {
  mocks.data.addBandMember.mockRejectedValueOnce(new Error('Database is unavailable'));
  await render(); await newBeatboxer(); await click('Add band member');
  expect(host.querySelector('[role="alert"]')?.textContent).toBe('Database is unavailable');
  expect(field('name').value).toBe('Ritvik S.');
  expect(field('category').value).toBe('beatboxing');
  expect(host.querySelector('[role="status"]')).toBeNull();
  await click('Add band member');
  expect(mocks.data.addBandMember).toHaveBeenCalledTimes(2);
  expect(host.querySelector('fieldset')).toBeNull();
});

it('blocks saves during photo processing and prevents duplicate writes while a save is pending', async () => {
  let finish!: () => void;
  mocks.data.addBandMember.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  await render(); await newBeatboxer(); await click('Start photo upload');
  expect(button('Add band member').disabled).toBe(true);
  await click('Add band member'); expect(mocks.data.addBandMember).not.toHaveBeenCalled();
  await click('Finish photo upload');
  await act(async () => { button('Add band member').click(); button('Add band member')?.click(); });
  expect(mocks.data.addBandMember).toHaveBeenCalledTimes(1);
  expect(button('Saving…').disabled).toBe(true);
  await act(async () => finish());
  expect(host.querySelector('fieldset')).toBeNull();
});

it('uses approval requests for hide/delete and treats rejected approval submissions as failures', async () => {
  mocks.requiresApproval = true; mocks.data.bandMembers = [row()];
  await render(); await click('Hide Existing Artist');
  expect(mocks.submit).toHaveBeenCalledWith('band_member', 'update', { enabled: false }, 9);
  expect(mocks.data.toggleBandMemberEnabled).not.toHaveBeenCalled();
  mocks.submit.mockResolvedValueOnce({ success: false, error: 'Approval queue could not be written' });
  await click('Delete Existing Artist');
  expect(mocks.submit).toHaveBeenCalledWith('band_member', 'delete', {}, 9);
  expect(mocks.data.deleteBandMember).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe('Approval queue could not be written');
  expect(host.textContent).toContain('Existing Artist');
});

it('preserves removed category assignments as editable unlisted choices', async () => {
  mocks.data.homeboundSettings = { page_content: { categories: [] } };
  mocks.data.bandMembers = [row({ category: 'Loop artist' })];
  await render(); await click('Edit Existing Artist');
  expect(field('category').value).toBe('Loop artist');
  expect(field('category').textContent).toContain('Loop artist (unlisted)');
  await click('Save changes');
  expect(mocks.data.updateBandMember).toHaveBeenCalledWith(9, expect.objectContaining({ category: 'Loop artist' }));
});

it('routes AI bulk imports through the same checked approval callback', async () => {
  mocks.requiresApproval = true;
  await render(); await click('AI bulk import');
  const create = mocks.bulkProps.mock.lastCall?.[0].onCreateMember;
  const payload = { name: 'Beatbox Guest', role: 'Beatboxer', category: 'beatboxing' };
  await act(async () => create(payload));
  expect(mocks.submit).toHaveBeenCalledWith('band_member', 'create', payload, undefined);
  expect(mocks.data.addBandMember).not.toHaveBeenCalled();
  mocks.submit.mockResolvedValueOnce({ success: false, error: 'Approval request failed' });
  await expect(create(payload)).rejects.toThrow('Approval request failed');
});
