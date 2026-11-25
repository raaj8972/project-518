// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CoreDataProvider, useCoreData } from '../src/context/CoreDataContext';

const mocks = vi.hoisted(() => ({ read: vi.fn(), upsert: vi.fn(), update: vi.fn(), model: {} as Record<string, unknown> }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: mocks.read, dualUpsert: mocks.upsert, dualUpdate: mocks.update, dualInsert: vi.fn(), dualDelete: vi.fn(), invalidateTableCache: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ SUPABASE_HOST: 'fixture', supabase: { channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn() } }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../src/services/publicSecuritySettings', () => ({ getPublicSecuritySettings: async () => null }));
vi.mock('../src/utils/preloadBrand', () => ({ preloadBrandAssets: vi.fn() }));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, api: ReturnType<typeof useCoreData>;
function Probe() { api = useCoreData(); return <output>{api.homepageSettings?.brand_year}</output>; }
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.model = { id: 1, brand_year: 2026, hero_title: 'Festival', sponsor_logos: [{ id: 'one', sponsor_id: 1, period: 'current', enabled: true }] };
  mocks.read.mockReset().mockImplementation(async ({ table }: { table: string }) => ({ data: table === 'homepage_settings' ? mocks.model : null }));
  mocks.upsert.mockReset().mockImplementation(async (_table, row) => { mocks.model = { ...mocks.model, ...row }; });
  mocks.update.mockReset().mockImplementation(async (_table, _id, row) => { mocks.model = { ...mocks.model, ...row }; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function mount() { await act(async () => root.render(<CoreDataProvider pathname="/sponsors"><Probe /></CoreDataProvider>)); }

it('saves the brand year and archived placements together using the latest stored settings', async () => {
  await mount(); await act(async () => api.updateHomepageSettings({ brand_year: 2027 }));
  expect(mocks.read).toHaveBeenCalledWith(expect.objectContaining({ table: 'homepage_settings', forceRefresh: true }));
  expect(mocks.upsert).toHaveBeenCalledWith('homepage_settings', { id: 1, brand_year: 2027, sponsor_logos: [expect.objectContaining({ period: 'previous', edition_year: 2026, enabled: true })] });
  expect(host.textContent).toBe('2027'); expect(mocks.upsert).toHaveBeenCalledOnce();
});

it('does not publish a partial year change if the latest placements cannot be read', async () => {
  await mount(); mocks.read.mockRejectedValueOnce(new Error('Offline'));
  await expect(act(async () => api.updateHomepageSettings({ brand_year: 2027 }))).rejects.toThrow('Offline');
  expect(mocks.upsert).not.toHaveBeenCalled(); expect(mocks.model.brand_year).toBe(2026);
});

it('uses an existing-row update for sponsor-only changes and package visibility', async () => {
  await mount(); await act(async () => api.updateHomepageSettings({ featured_partners_enabled: false }));
  expect(mocks.update).toHaveBeenCalledWith('homepage_settings', 1, { featured_partners_enabled: false });
  expect(mocks.upsert).not.toHaveBeenCalled();
  mocks.read.mockResolvedValueOnce({ data: { enabled: true } }); await act(async () => api.toggleSponsorshipPackageEnabled(3));
  expect(mocks.update).toHaveBeenCalledWith('sponsorship_packages', 3, { enabled: false });
});
