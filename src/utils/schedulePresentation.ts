import type { ScheduleDay, ScheduleEvent } from '../types/data';
import { eventWindow } from './scheduleClashes';

export type ScheduleType = 'prelims' | 'mains';
export type TimelineEvent = ScheduleEvent & {
  category?: string;
  description?: string;
  location?: string;
  venue_location?: string;
  speaker?: string;
};
export type TimelineDay = Omit<ScheduleDay, 'events'> & { events: TimelineEvent[] };
export type TimelineStatus = 'live' | 'upcoming' | 'ended' | 'tba';

export function scheduleDayType(day: ScheduleDay): ScheduleType {
  return day.schedule_type ?? (day.title?.includes('[MAINS]') ? 'mains' : 'prelims');
}

export function scheduleDayTitle(day: ScheduleDay): string {
  return (day.title || '').replace(/\[(?:MAINS|PRELIMS)\]/gi, '').trim();
}

export function scheduleDate(date: string, short = false): string {
  const parsed = new Date(`${date}T12:00:00+05:30`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return date || 'Date to be announced';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: short ? 'short' : 'long', day: 'numeric' }).format(parsed);
}

export function scheduleEventWindow(event: TimelineEvent, date: string) {
  const range = eventWindow({ ...event, date });
  if (!range) return null;
  const rawDuration = String(event.duration || '').trim();
  const hours = rawDuration.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minutes = rawDuration.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
  const duration = hours || minutes ? Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0) : /^\d+$/.test(rawDuration) ? Number(rawDuration) : NaN;
  return { start: range.start, end: range.end ?? range.start + (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60_000 };
}

export function scheduleEventStatus(event: TimelineEvent, date: string, now: Date): TimelineStatus {
  const range = scheduleEventWindow(event, date);
  if (!range) return 'tba';
  return now.getTime() < range.start ? 'upcoming' : now.getTime() < range.end ? 'live' : 'ended';
}

export function scheduleTime(event: TimelineEvent, date: string): string {
  const range = scheduleEventWindow(event, date);
  if (!range) return event.time?.trim() || 'Time to be announced';
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formatter.format(range.start)} – ${formatter.format(range.end)}`;
}

export function scheduleCategory(event: TimelineEvent): string {
  return (event.category || event.type || 'Event').replace(/_/g, ' ');
}

export function sortSchedule(days: ScheduleDay[]): TimelineDay[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id).map(day => ({
    ...day,
    events: [...(day.events || [])].sort((a, b) => (scheduleEventWindow(a, day.date)?.start ?? Infinity) - (scheduleEventWindow(b, day.date)?.start ?? Infinity) || a.id - b.id),
  }));
}
