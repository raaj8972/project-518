import { expect, it } from 'vitest';
import type { ScheduleDay } from '../src/types/data';
import { scheduleDate, scheduleDayTitle, scheduleEventStatus, scheduleTime, sortSchedule, type TimelineEvent } from '../src/utils/schedulePresentation';

const event = (id: number, time = '1:00 PM', duration = '120'): TimelineEvent => ({ id, time, duration, title: `Published event ${id}`, type: 'cultural', venue: 'Patanjali Hall', event_id: null, guest_artist_id: null, schedule_day_id: 1, created_at: null, updated_at: null });
const day = (id: number, date: string, events: TimelineEvent[]): ScheduleDay => ({ id, date, day: `Day ${id}`, title: '[MAINS] Opening day', events, created_at: null, updated_at: null });

it('uses the parent day and India time for live badges, including an explicit end time and overnight events', () => {
  const row = event(1, '1:00 PM – 3:00 PM', '60');
  expect(scheduleEventStatus(row, '2027-12-19', new Date('2027-12-19T07:29:00Z'))).toBe('upcoming');
  expect(scheduleEventStatus(row, '2027-12-19', new Date('2027-12-19T07:30:00Z'))).toBe('live');
  expect(scheduleEventStatus(row, '2027-12-19', new Date('2027-12-19T09:29:00Z'))).toBe('live');
  expect(scheduleEventStatus(row, '2027-12-19', new Date('2027-12-19T09:30:00Z'))).toBe('ended');
  expect(scheduleEventStatus(event(2, '11:30 PM - 1:00 AM'), '2027-12-19', new Date('2027-12-19T19:00:00Z'))).toBe('live');
});

it('honours saved durations, preserves unannounced timings and does not invent a date', () => {
  expect(scheduleTime(event(1), '2027-12-19')).toBe('1:00 PM – 3:00 PM');
  expect(scheduleTime(event(1, '14:30', '90'), '2027-12-19')).toBe('2:30 PM – 4:00 PM');
  expect(scheduleEventStatus(event(2, 'TBA'), '2027-12-19', new Date())).toBe('tba');
  expect(scheduleTime(event(2, ''), '2027-12-19')).toBe('Time to be announced');
  expect(scheduleDate('')).toBe('Date to be announced');
  expect(scheduleDate('2027-12-19')).toBe('December 19');
  expect(scheduleDayTitle(day(1, '2027-12-19', []))).toBe('Opening day');
});

it('orders dates and actual start times without mutating live data, with unannounced times last', () => {
  const rows = [day(2, '2027-12-20', []), day(1, '2027-12-19', [event(1, '7 PM'), event(2, 'TBA'), event(3, '1 PM')])];
  const sorted = sortSchedule(rows);
  expect(sorted.map(row => row.id)).toEqual([1, 2]);
  expect(sorted[0].events.map(row => row.id)).toEqual([3, 1, 2]);
  expect(rows[1].events.map(row => row.id)).toEqual([1, 2, 3]);
});
