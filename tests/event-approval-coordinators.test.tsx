// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApprovals } from '../src/hooks/useApprovals';
const mocks = vi.hoisted(() => ({ approval: null as any, insert: vi.fn(), update: vi.fn(), read: vi.fn(), remove: vi.fn() }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('../src/lib/dualDb', () => ({ dualInsert: mocks.insert, dualUpdate: mocks.update, dualRead: mocks.read, dualDelete: mocks.remove, dualUpsert: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { channel: () => { const channel = { on: () => channel, subscribe: (callback: (status: string) => void) => { callback('SUBSCRIBED'); return channel; } }; return channel; }, removeChannel: vi.fn(), from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [mocks.approval], error: null }) }) }) }) } }));
let host: HTMLDivElement, root: Root;
let result: Awaited<ReturnType<ReturnType<typeof useApprovals>['approveChange']>>;
function Probe() { const state = useApprovals(); return <button type="button" onClick={async () => { result = await state.approveChange('pending-1'); }}>Approve</button>; }
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.insert.mockReset().mockResolvedValue({ id: 50 }); mocks.update.mockReset().mockResolvedValue(undefined); mocks.remove.mockReset().mockResolvedValue(undefined); mocks.read.mockReset().mockResolvedValue({ data: [] });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const approve = async () => { await act(async () => root.render(<Probe />)); await act(async () => host.querySelector('button')!.click()); };
it('creates approved event contacts separately so coordinator metadata is never sent as an events column', async () => {
  mocks.approval = { id: 'pending-1', entity_type: 'event', action_type: 'create', entity_id: null, changes: { title: 'Pending event', coordinators: [{ name: 'First contact', phone: '100' }, { name: 'Second contact', phone: '200' }] } };
  await approve(); expect(result.success).toBe(true);
  expect(mocks.insert).toHaveBeenCalledWith('events', { title: 'Pending event' });
  expect(mocks.insert).toHaveBeenCalledWith('event_coordinators', expect.objectContaining({ event_id: 50, name: 'Second contact', order_position: 2 }));
  expect(mocks.update).toHaveBeenCalledWith('pending_approvals', 'pending-1', expect.objectContaining({ status: 'approved' }));
});
it('applies approved contact edits and removals only within the target event', async () => {
  mocks.approval = { id: 'pending-1', entity_type: 'event', action_type: 'update', entity_id: 15, changes: { title: 'Updated event', coordinators: [{ id: 9, name: 'Edited contact', phone: '100' }] } };
  mocks.read.mockResolvedValue({ data: [{ id: 9 }, { id: 10 }] });
  await approve(); expect(result.success).toBe(true);
  expect(mocks.read).toHaveBeenCalledWith(expect.objectContaining({ table: 'event_coordinators', eq: ['event_id', 15] }));
  expect(mocks.update).toHaveBeenCalledWith('events', 15, { title: 'Updated event' });
  expect(mocks.update).toHaveBeenCalledWith('event_coordinators', 9, expect.objectContaining({ event_id: 15, name: 'Edited contact' }));
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('event_coordinators', 10);
});
