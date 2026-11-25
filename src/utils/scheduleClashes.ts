export interface ScheduledEvent { id: string | number; title: string; date?: string | null; time?: string | null; venue?: string | null }
export interface ScheduleClash { key: string; event: ScheduledEvent; other: ScheduledEvent; definite: boolean }

function minutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2})(?::\d{2})?)?\s*(AM|PM)?\s*(?:IST)?$/i);
  if (!match || (!match[2] && !match[3])) return null;
  let h = Number(match[1]); const m = Number(match[2] || 0);
  if (m > 59 || h > 23 || (match[3] && (h < 1 || h > 12))) return null;
  if (match[3]) h = h % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + m;
}
export function eventWindow(event: ScheduledEvent) {
  if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return null;
  const day = Date.parse(`${event.date}T00:00:00Z`);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== event.date) return null;
  const parts = (event.time || '').split(/\s*[-–—]\s*|\s+to\s+/i);
  const start = minutes(parts[0]);
  if (start === null) return null;
  const end = parts.length === 2 ? minutes(parts[1]) : null;
  const startAt = day + start * 60000 - 19800000;
  return { start: startAt, end: end === null || end === start ? null : day + (end < start ? end + 1440 : end) * 60000 - 19800000 };
}
export function findScheduleClashes(candidates: ScheduledEvent[], existing: ScheduledEvent[]): ScheduleClash[] {
  const clashes: ScheduleClash[] = [];
  const seen = new Set<string>();
  for (let index = 0;index < candidates.length;index++) {
    const event = candidates[index]; const a = eventWindow(event);
    if (!a) continue;
    for (const other of [...existing, ...candidates.slice(0, index)]) {
      if (String(event.id) === String(other.id)) continue;
      const b = eventWindow(other); if (!b) continue;
      const bothEnds = a.end !== null && b.end !== null;
      const overlaps = bothEnds ? a.start < b.end! && b.start < a.end! : a.start === b.start || (a.end !== null && b.start >= a.start && b.start < a.end) || (b.end !== null && a.start >= b.start && a.start < b.end);
      const sameDayUncertain = !bothEnds && event.date === other.date
        && !(a.end !== null && a.end <= b.start) && !(b.end !== null && b.end <= a.start);
      if (!overlaps && !sameDayUncertain) continue;
      const key = JSON.stringify([event.id, event.date, event.time, other.id, other.date, other.time]);
      if (seen.has(key)) continue;
      seen.add(key); clashes.push({ key, event, other, definite: overlaps });
    }
  }
  return clashes;
}
