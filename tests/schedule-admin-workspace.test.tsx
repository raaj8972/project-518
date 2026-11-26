// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScheduleManagement } from '../src/components/admin/ScheduleManagement';
const mocks = vi.hoisted(() => ({ data: {} as any, addDay: vi.fn(), updateDay: vi.fn(), removeDay: vi.fn(), addSlot: vi.fn(), updateSlot: vi.fn(), removeSlot: vi.fn(), settings: vi.fn(), refresh: vi.fn(), fetch: vi.fn() }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } } }));
vi.mock('../src/components/admin/schedule/AIScheduleScanner', () => ({ AIScheduleScanner: ({ onScanComplete }: any) => <button onClick={() => onScanComplete([{ date: '2027-01-08', title: 'Imported quiz', start_time: '9 AM', end_time: '10 AM', venue: 'Hall A' }], 'mains')}>Complete scan</button> }));
let host: HTMLDivElement, root: Root;
const slot = (id: number, title: string, time: string, venue = 'Hall A') => ({ id, title, time, venue, type: 'Academic', duration: '1 hour', event_id: null, schedule_day_id: 1 });
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.data = { schedule: [{ id: 1, date: '2027-01-08', day: 'Day 1', title: 'Opening day', schedule_type: 'mains', events: [slot(2, 'Campus debate', '11 AM – 12 PM'), slot(1, 'Campus quiz', '9 AM – 10 AM')] }, { id: 2, date: '2027-01-09', day: 'Day 2', title: 'Evening', schedule_type: 'mains', events: [{ ...slot(3, 'Band evening', '7 PM – 9 PM'), schedule_day_id: 2 }] }, { id: 8, date: '2026-12-19', day: 'Day 1', schedule_type: 'prelims', events: [slot(9, 'Prelims quiz', '9 AM')] }], events: [{ id: 'quiz-text-id', title: 'Linked quiz', time: '10 AM – 11 AM', venue: 'Main hall', category: 'Academic', visible: true }], siteSettings: { default_schedule_type: 'mains' }, homepageSettings: { brand_year: 2027 }, loading: false, connectionStatus: 'ok', addScheduleDay: mocks.addDay, updateScheduleDay: mocks.updateDay, deleteScheduleDay: mocks.removeDay, addScheduleEvent: mocks.addSlot, updateScheduleEvent: mocks.updateSlot, deleteScheduleEvent: mocks.removeSlot, updateSiteSettings: mocks.settings, refreshAll: mocks.refresh };
  mocks.addDay.mockResolvedValue({ id: 10, events: [] }); mocks.addSlot.mockResolvedValue(undefined); mocks.updateSlot.mockResolvedValue(undefined); mocks.settings.mockResolvedValue(undefined); mocks.updateDay.mockResolvedValue(undefined);
  mocks.fetch.mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ total: 7, pending: 5, sent: 0, failed: 0, remaining: 5 }) }); vi.stubGlobal('fetch', mocks.fetch);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const render = async () => { await act(async () => root.render(<ScheduleManagement />)); };
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const btn = (name: string, scope: ParentNode = document) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === name || button.textContent?.trim() === name)!;
async function click(name: string, scope?: ParentNode) { await act(async () => btn(name, scope).click()); }
async function change(label: string, value: string, scope: ParentNode = dialog()) { const field = [...scope.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)!.querySelector<HTMLInputElement>('input,select')!; await act(async () => { Object.getOwnPropertyDescriptor(field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(field, value); field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }
async function submit(id: string) { await act(async () => document.getElementById(id)!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

it('shows a compact chronological day, searches across days, and does not load email recipients on mount', async () => {
  await render(); expect([...host.querySelectorAll('.schedule-admin-slot')].map(row => row.getAttribute('aria-label'))).toEqual(['Campus quiz', 'Campus debate']); expect(mocks.fetch).not.toHaveBeenCalled();
  const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'Band evening'); search.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(host.querySelector('.schedule-admin-day-heading')?.textContent).toContain('January 9'); expect(host.querySelectorAll('.schedule-admin-slot')).toHaveLength(1);
});
it('links text event IDs, keeps a failed edit open, then saves the unchanged draft on retry', async () => {
  await render(); await click('Edit Campus quiz'); await change('Link an event', 'quiz-text-id'); mocks.updateSlot.mockRejectedValueOnce(new Error('Connection interrupted'));
  await submit('schedule-slot-form'); expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('Connection interrupted');
  await submit('schedule-slot-form'); expect(mocks.updateSlot).toHaveBeenLastCalledWith(1, expect.objectContaining({ event_id: 'quiz-text-id', title: 'Linked quiz', time: '10 AM – 11 AM', duration: '1 hour' })); expect(dialog()).toBeNull();
});
it('edits day metadata and never claims a failed default setting saved', async () => {
  await render(); await click('Edit selected day'); await change('Day title', 'Updated opening'); await submit('schedule-day-form'); expect(mocks.updateDay).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Updated opening', schedule_type: 'mains' }));
  await click('Prelims1'); mocks.settings.mockRejectedValueOnce(new Error('Permission denied')); await click('Make Prelims the website default'); expect(host.querySelector('[role="alert"]')?.textContent).toContain('Permission denied'); expect(mocks.settings).toHaveBeenCalledWith({ default_schedule_type: 'prelims' });
});
it('requires a review before deleting a day and makes the cascade visible', async () => {
  await render(); await click('Delete selected day'); expect(mocks.removeDay).not.toHaveBeenCalled(); expect(dialog().textContent).toContain('2 schedule entries');
  await click('Cancel', dialog()); expect(mocks.removeDay).not.toHaveBeenCalled(); await click('Delete selected day'); await click('Delete day', dialog()); expect(mocks.removeDay).toHaveBeenCalledWith(1);
});
it('reviews a flat AI import and creates new days with the correct edition and returned day ID', async () => {
  mocks.data.schedule = []; await render(); await click('Import schedule'); await click('Complete scan'); expect(mocks.addDay).not.toHaveBeenCalled(); expect(dialog().textContent).toContain('Imported quiz');
  await click('Import events', dialog()); expect(mocks.addDay).toHaveBeenCalledWith(expect.objectContaining({ date: '2027-01-08', schedule_type: 'mains' })); expect(mocks.addSlot).toHaveBeenCalledWith(10, expect.objectContaining({ title: 'Imported quiz', time: '9 AM – 10 AM' }));
});
it('previews the audience before an explicit email send and exposes partial schedule errors', async () => {
  await render(); await click('Email participants'); expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ dryRun: true });
  await click('Send next batch', dialog()); expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({ dryRun: false });
  await click('Close', dialog()); mocks.data.scheduleError = 'The schedule could not load completely.'; await render(); expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not load completely');
});
