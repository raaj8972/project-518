// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BandMember } from '../src/types/data';
import { AIHomeBoundImport } from '../src/components/admin/homebound/AIHomeBoundImport';

const mocks = vi.hoisted(() => ({
  data: { bandMembers: [] as BandMember[], homeboundSettings: { page_content: {} as Record<string, unknown> }, addBandMember: vi.fn() },
  scanData: [] as unknown[], images: [] as string[], scanProps: vi.fn(),
  create: vi.fn(), saved: vi.fn(), cancel: vi.fn(),
  upload: vi.fn(), publicUrl: vi.fn(), storageFrom: vi.fn(),
  toast: { error: vi.fn(), loading: vi.fn(), success: vi.fn() },
}));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('react-hot-toast', () => ({ toast: mocks.toast }));
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: mocks.storageFrom } } }));
vi.mock('../src/components/admin/AIChatScanner', () => ({ AIChatScanner: (props: { systemInstruction: string; onDataComplete: (data: unknown, images: string[]) => void }) => {
  mocks.scanProps(props);
  return <button type="button" onClick={() => props.onDataComplete(mocks.scanData, mocks.images)}>Read test roster</button>;
} }));

const artist = (name: string, extra: Record<string, unknown> = {}) => ({ name, role: 'Vocal percussionist', category: 'Beatboxing', description: null, specialty: null, is_featured: true, social_links: null, ...extra });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.data.bandMembers = [];
  mocks.data.homeboundSettings = { page_content: { categories: [
    { id: 'beatbox', label: 'Beatboxing', icon: 'beatbox', enabled: true, aliases: ['Beatboxing', 'Vocal percussion'] },
    { id: 'crew', label: 'Production', icon: 'crew', enabled: false, aliases: ['Other'] },
  ] } };
  mocks.scanData = [artist('Ritvik S.')]; mocks.images = [];
  mocks.create.mockReset().mockResolvedValue(undefined); mocks.data.addBandMember.mockReset().mockResolvedValue(undefined);
  mocks.saved.mockClear(); mocks.cancel.mockClear(); mocks.scanProps.mockClear();
  mocks.upload.mockReset().mockResolvedValue({ error: null });
  mocks.publicUrl.mockReset().mockReturnValue({ data: { publicUrl: 'https://media.example/band/portrait.jpg' } });
  mocks.storageFrom.mockReset().mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.publicUrl });
  for (const method of Object.values(mocks.toast)) method.mockReset();
  mocks.toast.loading.mockReturnValue('bulk-import-toast');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function render(callback = true) { await act(async () => root.render(<AIHomeBoundImport onCancel={mocks.cancel} onSaved={mocks.saved} onCreateMember={callback ? mocks.create : undefined} />)); }
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.getAttribute('aria-label') === name || element.textContent?.trim() === name)!;
async function click(name: string) { expect(button(name), name).toBeTruthy(); await act(async () => { button(name).click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
const artistNames = () => [...document.querySelectorAll<HTMLInputElement>('input[type="text"]')].filter(element => !element.hasAttribute('placeholder')).map(element => element.value).filter(value => !!value && value !== 'Vocal percussionist');

it('uses configured custom categories and passes only safe artist fields to the approval-aware creation callback', async () => {
  mocks.scanData = [artist('  Ritvik S.  ', { image_index: 0, social_links: { instagram: '@ritvik_beats', youtube: 'javascript:alert(1)', spotify: 'data:text/html,bad' } })];
  await render();
  expect(mocks.scanProps.mock.lastCall?.[0].systemInstruction).toContain('"id":"beatbox","label":"Beatboxing"');
  await click('Read test roster');
  const category = document.querySelector<HTMLSelectElement>('select')!;
  expect(category.value).toBe('beatbox');
  expect([...category.options].map(option => option.textContent)).toEqual(['Select a category', 'Beatboxing', 'Production (hidden)']);
  expect(document.querySelector('img')).toBeNull();
  expect(document.body.textContent).toContain('NO PHOTO');
  await click('Import All to Roster');
  expect(mocks.create).toHaveBeenCalledTimes(1);
  const payload = mocks.create.mock.calls[0][0];
  expect(payload).toEqual({ name: 'Ritvik S.', role: 'Vocal percussionist', category: 'beatbox', description: '', specialty: '', is_featured: true, social_links: { instagram: 'https://www.instagram.com/ritvik_beats/', youtube: '', spotify: '' }, image: '', achievements: [], enabled: true, order_position: 1 });
  expect(payload).not.toHaveProperty('image_index');
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.data.addBandMember).not.toHaveBeenCalled();
  expect(mocks.saved).toHaveBeenCalledTimes(1);
  expect(mocks.toast.success).toHaveBeenCalledTimes(1);
});

it('locks review edits and dismissal while saving and prevents duplicate writes on repeated clicks', async () => {
  let finish!: () => void;
  mocks.create.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  await render(); await click('Read test roster');
  await act(async () => { button('Import All to Roster').click(); button('Import All to Roster').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(button('Import All to Roster').disabled).toBe(true);
  expect(button('Cancel').disabled).toBe(true);
  expect(button('Start Over').disabled).toBe(true);
  const reviewControls = [...document.querySelectorAll('fieldset input, fieldset textarea, fieldset select, fieldset button')];
  expect(reviewControls.length).toBeGreaterThan(0);
  expect(reviewControls.every(control => control.matches(':disabled'))).toBe(true);
  await click('Cancel'); expect(mocks.cancel).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.saved).toHaveBeenCalledTimes(1);
});

it('keeps only unfinished artists after a partial failure so retry never recreates completed artists', async () => {
  mocks.scanData = [artist('First artist'), artist('Second artist'), artist('Third artist')];
  mocks.create.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Approval queue is offline'));
  await render(); await click('Read test roster'); await click('Import All to Roster');
  expect(mocks.create.mock.calls.map(call => call[0].name)).toEqual(['First artist', 'Second artist']);
  expect(mocks.saved).not.toHaveBeenCalled();
  expect(mocks.toast.success).not.toHaveBeenCalled();
  expect(mocks.toast.error.mock.lastCall?.[0]).toContain('1 completed. Remaining members are kept for retry.');
  expect(artistNames()).toContain('Second artist'); expect(artistNames()).toContain('Third artist'); expect(artistNames()).not.toContain('First artist');
  await click('Import All to Roster');
  expect(mocks.create.mock.calls.map(call => call[0].name)).toEqual(['First artist', 'Second artist', 'Second artist', 'Third artist']);
  expect(mocks.saved).toHaveBeenCalledTimes(1);
  expect(mocks.data.addBandMember).not.toHaveBeenCalled();
});

it('retains a pending artist when their photo upload fails and permits a safe retry', async () => {
  mocks.scanData = [artist('Photo Artist', { image_index: 0 })]; mocks.images = ['aGVsbG8='];
  mocks.upload.mockResolvedValueOnce({ error: { message: 'Storage is unavailable' } });
  await render(); await click('Read test roster'); await click('Import All to Roster');
  expect(mocks.storageFrom).toHaveBeenCalledWith('band-images');
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.saved).not.toHaveBeenCalled();
  expect(mocks.toast.success).not.toHaveBeenCalled();
  expect(mocks.toast.error.mock.lastCall?.[0]).toContain("Could not upload Photo Artist's photo. Storage is unavailable");
  expect(artistNames()).toContain('Photo Artist');
  expect(button('Import All to Roster').disabled).toBe(false);
  await click('Import All to Roster');
  expect(mocks.upload).toHaveBeenCalledTimes(2);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Photo Artist', image: 'https://media.example/band/portrait.jpg', category: 'beatbox' }));
  expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('image_index');
  expect(mocks.saved).toHaveBeenCalledTimes(1);
});

it('retains direct creation for standalone use and validates missing artist identity before writing', async () => {
  mocks.scanData = [artist('Missing role', { role: '' })];
  await render(false); await click('Read test roster'); await click('Import All to Roster');
  expect(mocks.data.addBandMember).not.toHaveBeenCalled();
  expect(mocks.toast.error).toHaveBeenCalledWith('Each member needs a name, role and category.');
  await click('Start Over');
  mocks.scanData = [artist('Standalone artist')];
  await click('Read test roster'); await click('Import All to Roster');
  expect(mocks.data.addBandMember).toHaveBeenCalledWith(expect.objectContaining({ name: 'Standalone artist', category: 'beatbox', image: '' }));
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.saved).toHaveBeenCalledTimes(1);
});

it('cycles previous and next through every photo and the no-photo slot without skipping, preserving full data URIs', async () => {
  mocks.scanData = [artist('Photo Artist', { image_index: 0 })];
  mocks.images = ['cGhvdG8tb25l', 'data:image/png;base64,cGhvdG8tdHdv', 'cGhvdG8tdGhyZWU='];
  await render(); await click('Read test roster');
  const expectSlot = (index: number) => {
    const image = document.querySelector<HTMLImageElement>('img[alt="Match"]');
    if (index === -1) { expect(image).toBeNull(); expect(document.body.textContent).toContain('NO PHOTO'); }
    else {
      const captured = mocks.images[index];
      expect(image?.getAttribute('src')).toBe(captured.startsWith('data:') ? captured : `data:image/jpeg;base64,${captured}`);
    }
  };
  expectSlot(0);
  for (const index of [-1, 2, 1, 0]) { await click('Previous photo for Photo Artist'); expectSlot(index); }
  for (const index of [1, 2, -1, 0]) { await click('Next photo for Photo Artist'); expectSlot(index); }
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
});
