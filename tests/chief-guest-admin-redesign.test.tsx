// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChiefGuestManagement } from '../src/components/admin/ChiefGuestManagement';
const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn(), toggle: vi.fn() }));
const guest = { id: 1, name: 'Festival Guest', title: 'Cultural patron', description: 'Our distinguished guest.', image: '/portrait.webp', enabled: false, is_featured: false, order_position: 1, achievements: ['An award'], social_links: { instagram: 'https://instagram.com/guest' } };
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ chiefGuests: [guest], addChiefGuest: mocks.add, updateChiefGuest: mocks.update, deleteChiefGuest: mocks.remove, toggleChiefGuestEnabled: mocks.toggle }) }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({ onProcessingChange }: any) => <><button type="button" onClick={() => onProcessingChange(true)}>Start upload</button><button type="button" onClick={() => onProcessingChange(false)}>Finish upload</button></> }));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); mocks.update.mockResolvedValue(undefined);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const button = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label)!;
async function click(label: string) { await act(async () => button(label).click()); }
async function mount() { await act(async () => root.render(<ChiefGuestManagement />)); }
it('keeps the page focused on the roster until a profile is opened', async () => {
  await mount();
  expect(host.querySelector('form')).toBeNull();
  expect(host.querySelector('.chief-guest-roster')?.textContent).toContain('Festival Guest');
  await click('Edit profile');
  expect(host.querySelector('[aria-label="Chief guest editor"]')).not.toBeNull();
});
it('preserves hidden and featured states when saving an existing guest', async () => {
  await mount(); await click('Edit profile'); await click('Save profile');
  expect(mocks.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: guest.name, enabled: false, is_featured: false }));
  expect(host.querySelector('form')).toBeNull();
});
it('blocks saving an incomplete upload and keeps the draft available after a rejected save', async () => {
  mocks.update.mockRejectedValueOnce(new Error('Connection unavailable'));
  await mount(); await click('Edit profile'); await click('Start upload');
  expect(button('Save profile').disabled).toBe(true);
  await click('Save profile'); expect(mocks.update).not.toHaveBeenCalled();
  await click('Finish upload'); await click('Save profile');
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection unavailable');
  expect(host.querySelector('form')).not.toBeNull();
});
