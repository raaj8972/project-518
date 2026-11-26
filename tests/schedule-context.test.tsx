// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ trigger: 0, read: vi.fn(), insert: vi.fn(), fetchEvents: vi.fn(), refresh: null as null | (() => Promise<void>) }));
vi.mock('../src/context/CoreDataContext', () => ({ useCoreData: () => ({ refreshTrigger: mocks.trigger }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../src/lib/dualDb', () => ({ dualRead: mocks.read, dualInsert: mocks.insert, dualUpdate: vi.fn(), dualDelete: vi.fn(), dualUpsert: vi.fn(), invalidateTableCache: vi.fn() }));
vi.mock('../src/utils/dataUtils', () => ({ fetchAllEvents: mocks.fetchEvents }));
vi.mock('../src/hooks/useDomainRealtime', () => ({ useDomainRealtime: (_name: string, _enabled: boolean, _tables: string[], refresh: () => Promise<void>) => { mocks.refresh = refresh; } }));
import { EventsProvider, useEventsData } from '../src/context/EventsContext';
it('keeps the persisted edition and last complete programme when one schedule query fails', async () => {
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
 mocks.fetchEvents.mockResolvedValue({ data: [], error: null });
 mocks.read.mockImplementation(async ({ table }: { table: string }) => ({ data: table === 'schedule_days' ? [{ id: 1, date: '2027-01-08', day: 'Day 1', title: 'Opening', schedule_type: 'mains' }] : table === 'schedule_events' ? [{ id: 1, schedule_day_id: 1, title: 'Quiz', time: '9 AM', type: 'Academic' }] : [] }));
 let value: ReturnType<typeof useEventsData>;
 function Probe() { value = useEventsData(); return <p>{value.scheduleError || 'ok'}</p>; }
 const host = document.createElement('div'), root = createRoot(host);
 await act(async () => root.render(<EventsProvider><Probe /></EventsProvider>));
 expect(value!.schedule[0]).toMatchObject({ schedule_type: 'mains', events: [expect.objectContaining({ title: 'Quiz' })] });
 mocks.read.mockImplementation(async ({ table }: { table: string }) => { if (table === 'schedule_events') throw new Error('offline'); return { data: [] }; });
 await act(async () => mocks.refresh!());
 expect(value!.scheduleError).toContain('could not load completely'); expect(value!.schedule[0].events).toHaveLength(1);
 mocks.fetchEvents.mockResolvedValueOnce({ data: null, error: new Error('Events offline') });
 await act(async () => mocks.refresh!()); expect(value!.eventsError).toContain('could not load');
 await act(async () => root.unmount());
});
