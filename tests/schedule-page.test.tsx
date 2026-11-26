// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Schedule } from '../src/pages/Schedule';
import type { ScheduleDay, Event as FestivalEvent } from '../src/types/data';

const mocks = vi.hoisted(() => ({ data: { schedule: [] as ScheduleDay[], events: [] as FestivalEvent[], siteSettings: { default_schedule_type: 'mains' }, homepageSettings: { brand_year: 2027 }, loading: false, connectionStatus: 'ok', refreshAll: vi.fn() }, pdf: vi.fn() }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../src/utils/schedulePdf', () => ({ downloadSchedulePdf: mocks.pdf }));
const item = (id: number, title: string, time: string, type: string, event_id: string | null = null) => ({ id, title, time, type, event_id, duration: '60', venue: 'Published Hall', guest_artist_id: null, schedule_day_id: 1, created_at: null, updated_at: null });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2027-12-19T07:45:00Z'));
  mocks.data.schedule = [
    { id: 2, date: '2027-12-20', day: 'Day 2', title: '[MAINS] The grand finale', schedule_type: 'mains', events: [item(3, 'Band evening', '7:00 PM', 'music')], created_at: null, updated_at: null },
    { id: 1, date: '2027-12-19', day: 'Day 1', title: '[MAINS] Opening day', schedule_type: 'mains', events: [item(2, 'Evening drama', '6:00 PM', 'cultural', 'closed'), item(1, 'Campus quiz', '1:00 PM', 'academic', 'open')], created_at: null, updated_at: null },
    { id: 8, date: '2027-12-18', day: 'Prelims day', title: '[PRELIMS]', schedule_type: 'prelims', events: [item(8, 'Preliminary round', '2:00 PM', 'general')], created_at: null, updated_at: null },
  ];
  mocks.data.events = [{ id: 'open', registration_open: true, visible: true }, { id: 'closed', registration_open: false, visible: true }] as unknown as FestivalEvent[];
  mocks.data.siteSettings = { default_schedule_type: 'mains' }; mocks.data.loading = false; mocks.data.connectionStatus = 'ok';
  mocks.pdf.mockReset().mockResolvedValue(undefined); mocks.data.refreshAll.mockClear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
const render = async () => { await act(async () => root.render(<MemoryRouter><Schedule /></MemoryRouter>)); };
const button = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label || node.textContent?.trim().startsWith(label))!;
const click = async (label: string) => { await act(async () => button(label).click()); };
async function search(value: string) { const input = host.querySelector('input')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }

it('shows published days in order, derives live state from the day and keeps registration links honest', async () => {
  await render();
  expect([...host.querySelectorAll('.rico-schedule-event__title')].map(node => node.textContent)).toEqual(['Campus quiz', 'Evening drama', 'Band evening']);
  expect(host.querySelector('.rico-schedule-event')?.getAttribute('data-status')).toBe('live');
  expect(host.querySelector('a[aria-label="Register for Campus quiz"]')?.getAttribute('href')).toBe('/events?register=open');
  expect(host.querySelector('a[aria-label="View Evening drama"]')?.getAttribute('href')).toBe('/events?event=closed');
  expect(host.textContent).not.toContain('[MAINS]'); expect(host.textContent).not.toContain('Preliminary round');
  await click('Day 2'); expect(host.querySelector('#schedule-day-2')?.getAttribute('data-selected')).toBe('true');
});

it('selects the day with search results, clears no-result filters and preserves the visitor’s chosen edition on updates', async () => {
  await render(); await search('Band evening');
  expect(host.querySelector('#schedule-day-2')?.getAttribute('data-selected')).toBe('true');
  await search('does not exist'); expect(host.textContent).toContain('No matching events');
  await click('Clear filters'); expect(host.querySelectorAll('.rico-schedule-event')).toHaveLength(3);
  await click('Prelims'); expect(host.textContent).toContain('Preliminary round'); expect(host.textContent).not.toContain('Campus quiz');
  mocks.data.siteSettings = { default_schedule_type: 'mains' }; await render();
  expect(host.textContent).toContain('Preliminary round');
});

it('downloads all published days in the selected edition even during search, and supports retry after a failed PDF', async () => {
  await render(); await search('Band evening'); mocks.pdf.mockRejectedValueOnce(new Error('download failed'));
  await click('Download full schedule (PDF)');
  expect(mocks.pdf).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1, events: expect.arrayContaining([expect.objectContaining({ title: 'Campus quiz' })]) }), expect.objectContaining({ id: 2 })]), 'mains', 2027);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not download');
  await click('Download full schedule (PDF)'); expect(mocks.pdf).toHaveBeenCalledTimes(2); expect(host.querySelector('[role="alert"]')).toBeNull();
});

it('distinguishes loading, an unpublished schedule and connection failure without showing sample events', async () => {
  mocks.data.schedule = []; mocks.data.loading = true; await render(); expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
  mocks.data.loading = false; await render(); expect(host.textContent).toContain('The stage is being set');
  expect(button('Download full schedule').disabled).toBe(true);
  mocks.data.connectionStatus = 'offline'; await render(); expect(host.textContent).toContain('could not load');
  await click('Try again'); expect(mocks.data.refreshAll).toHaveBeenCalledOnce();
});
