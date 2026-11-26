// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ManagementProvider, useManagementData } from '../src/context/ManagementContext';

const mocks = vi.hoisted(() => ({ read: vi.fn(), batch: vi.fn(), privateRead: vi.fn(), realtime: vi.fn() }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: mocks.read, dualInsert: vi.fn(), dualUpdate: vi.fn(), dualDelete: vi.fn(), dualUpsert: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
vi.mock('../src/context/CoreDataContext', () => ({ useCoreData: () => ({ refreshTrigger: 0 }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: null, getValidToken: vi.fn() }) }));
vi.mock('../src/utils/dataUtils', () => ({ fetchSupabaseBatch: mocks.batch, fetchAllRegistrations: mocks.privateRead }));
vi.mock('../src/lib/adminService', () => ({ AdminService: {} }));
vi.mock('../src/hooks/useDomainRealtime', () => ({ useDomainRealtime: mocks.realtime }));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
function Probe() { const data = useManagementData(); return <output>{JSON.stringify({ loaded: data.isLoaded, sponsors: data.sponsors, error: data.sponsorshipError, settings: data.sponsorshipSettings })}</output>; }
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.read.mockReset(); mocks.batch.mockReset().mockResolvedValue({ data: [] }); mocks.privateRead.mockReset(); mocks.realtime.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('loads configured sponsorship contacts on the public route without reading private management data', async () => {
  mocks.read.mockImplementation(async ({ table }: { table: string }) => ({ data: table === 'sponsorship_settings' ? { id: 1, brochure_url: 'https://festival.example/brochure.pdf' } : [{ id: 4, enabled: true, title: 'Sponsorship team', content: 'team@festival.example' }] }));
  await act(async () => root.render(<ManagementProvider enabled includePrivate={false}><Probe /></ManagementProvider>));
  const result = JSON.parse(host.querySelector('output')!.textContent!);
  expect(result.loaded).toBe(true);
  expect(result.settings.contactSections[0].content).toBe('team@festival.example');
  expect(mocks.read).toHaveBeenCalledWith({ table: 'contact_sections', eq: ['sponsorship_settings_id', 1], order: ['order', { ascending: true }] });
  expect(mocks.privateRead).not.toHaveBeenCalled();
  expect(mocks.realtime.mock.calls.at(-1)?.[2]).toContain('contact_sections');
});

it('retains available brochure settings if the contact query is unavailable', async () => {
  mocks.read.mockImplementation(async ({ table }: { table: string }) => {
    if (table === 'contact_sections') throw new Error('Offline');
    return { data: { id: 1, brochure_url: 'https://festival.example/brochure.pdf' } };
  });
  await act(async () => root.render(<ManagementProvider enabled includePrivate={false}><Probe /></ManagementProvider>));
  expect(JSON.parse(host.querySelector('output')!.textContent!).settings).toMatchObject({ brochure_url: 'https://festival.example/brochure.pdf', contactSections: [] });
});

it('preserves the last sponsor and contact records when a refresh fails and clears the error on retry', async () => {
  mocks.batch.mockResolvedValue({data:[{id:14,name:'Saved partner'}],error:null});
  mocks.read.mockImplementation(async ({table}:{table:string})=>({data:table==='sponsorship_settings'?{id:1,page_title:'Partners'}:[{id:9,title:'Office'}]}));
  await act(async()=>root.render(<ManagementProvider enabled includePrivate={false}><Probe/></ManagementProvider>));
  const refresh=mocks.realtime.mock.calls.at(-1)![3];
  mocks.batch.mockResolvedValue({data:null,error:new Error('offline')});mocks.read.mockRejectedValue(new Error('offline'));
  await act(async()=>refresh());
  const failed=JSON.parse(host.querySelector('output')!.textContent!);
  expect(failed.sponsors).toEqual([{id:14,name:'Saved partner'}]);expect(failed.settings.contactSections[0].title).toBe('Office');expect(failed.error).toContain('last available records');
  mocks.batch.mockResolvedValue({data:[],error:null});mocks.read.mockResolvedValue({data:null});await act(async()=>refresh());
  expect(JSON.parse(host.querySelector('output')!.textContent!).error).toBeNull();
});
