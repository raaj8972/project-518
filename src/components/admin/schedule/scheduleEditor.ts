import type { Event, ScheduleDay, ScheduleEvent } from '../../../types/data';
import { eventWindow } from '../../../utils/scheduleClashes';
import { scheduleDayType, scheduleEventWindow, sortSchedule, type ScheduleType } from '../../../utils/schedulePresentation';

export type SlotDraft = { title: string; time: string; venue: string; type: string; duration: string; event_id: string; schedule_day_id: number };
export const emptySlot = (dayId: number): SlotDraft => ({ title: '', time: '', venue: '', type: '', duration: '', event_id: '', schedule_day_id: dayId });
export function slotDraft(event: ScheduleEvent): SlotDraft {
  return { title: event.title || '', time: event.time || '', venue: event.venue || '', type: event.type || '', duration: event.duration || '', event_id: event.event_id == null ? '' : String(event.event_id), schedule_day_id: event.schedule_day_id };
}
export function linkedSlot(draft: SlotDraft, event?: Event): SlotDraft {
  if (!event) return { ...draft, event_id: '' };
  const next = { ...draft, event_id: String(event.id), title: event.title, time: event.time || draft.time, venue: event.venue || '', type: event.category || '' };
  return { ...next, duration: durationFromTime(next.time) || draft.duration };
}
export function durationFromTime(time: string): string {
  const range = eventWindow({ id: 'duration', title: '', date: '2026-01-01', time });
  if (!range?.end) return '';
  const minutes = (range.end - range.start) / 60000;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return [hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}
export function validScheduleDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function slotPayload(draft: SlotDraft): Partial<ScheduleEvent> {
  if (!draft.title.trim() || !draft.time.trim()) throw new Error('Add an event title and time before saving.');
  if (!draft.schedule_day_id) throw new Error('Choose a schedule day.');
  return { title: draft.title.trim(), time: draft.time.trim(), venue: draft.venue.trim(), type: draft.type.trim(), duration: draft.duration.trim(), event_id: draft.event_id || null, ...(draft.event_id ? { guest_artist_id: null } : {}), schedule_day_id: draft.schedule_day_id };
}
export function venueConflicts(days: ScheduleDay[]) {
  const conflicts = new Map<number, string[]>();
  const slots = days.flatMap(day => day.events.map(event => ({ event, range: scheduleEventWindow(event, day.date) })));
  slots.forEach(({ event, range }, index) => {
    if (!range?.end || !event.venue?.trim() || /^(tba|tbd|unknown)$/i.test(event.venue.trim())) return;
    slots.slice(index + 1).forEach(({ event: other, range: second }) => {
      if (!second?.end || event.venue.trim().toLowerCase() !== other.venue?.trim().toLowerCase()) return;
      if (range.start < second.end && second.start < range.end!) {
        conflicts.set(event.id, [...(conflicts.get(event.id) || []), other.title]);
        conflicts.set(other.id, [...(conflicts.get(other.id) || []), event.title]);
      }
    });
  });
  return conflicts;
}

export type ImportDay = { date: string; day: string; title: string; schedule_type: ScheduleType; events: Omit<SlotDraft, 'schedule_day_id'>[] };
// Scanner responses may be flat timetable slots or nested days. Never invent dates.
export function normalizeScheduleImport(rows: unknown[], type: ScheduleType): ImportDay[] {
  const days = new Map<string, ImportDay>();
  for (const value of rows) {
    if (!value || typeof value !== 'object') throw new Error('The scan contains an invalid schedule entry.');
    const row = value as Record<string, unknown>;
    const date = String(row.date || '');
    if (!validScheduleDate(date)) throw new Error('Every imported day needs a valid date (YYYY-MM-DD). Review the scan and try again.');
    const nested = Array.isArray(row.events);
    const day = days.get(date) || { date, day: String(row.day || `Day ${days.size + 1}`), title: nested ? String(row.title || '') : '', schedule_type: type, events: [] };
    for (const item of nested ? row.events as unknown[] : [row]) {
      if (!item || typeof item !== 'object') throw new Error('The scan contains an invalid event.');
      const event = item as Record<string, unknown>;
      const time = String(event.time || [event.start_time, event.end_time].filter(Boolean).join(' – ') || 'TBA');
      const title = String(event.title || '').trim();
      if (!title) throw new Error('Every imported event needs a title.');
      day.events.push({ title, time, venue: String(event.venue || ''), type: String(event.type || event.category || ''), duration: String(event.duration || durationFromTime(time)), event_id: '' });
    }
    days.set(date, day);
  }
  if (!days.size) throw new Error('The scan has no schedule entries to import.');
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function importSlotKey(event: { title: string; time: string; venue?: string }) {
  return [event.title, event.time, event.venue || ''].map(value => value.trim().toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, '')).join('|');
}
export function editionDays(schedule: ScheduleDay[], type: ScheduleType) { return sortSchedule(schedule.filter(day => scheduleDayType(day) === type)); }
