export interface CalendarEvent {
  id?: string | number;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
}

const escapeCalendarText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function eventCalendar(event: CalendarEvent): string {
  const date = event.date?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) {
    throw new Error('This event does not have a confirmed date yet.');
  }
  const end = new Date(`${date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ricorrenza//Events//EN', 'BEGIN:VEVENT',
    `UID:${encodeURIComponent(String(event.id ?? event.title))}@ricorrenza.fun`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `LOCATION:${escapeCalendarText(event.venue || 'Venue to be announced')}`,
    `DESCRIPTION:${escapeCalendarText([event.description, event.time && `Time: ${event.time}`].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}

export function downloadFile(contents: string | Blob, name: string, type = 'text/plain') {
  const url = URL.createObjectURL(contents instanceof Blob ? contents : new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function addEventToCalendar(event: CalendarEvent) {
  downloadFile(eventCalendar(event), `${event.title.replace(/[^a-z0-9]/gi, '-')}.ics`, 'text/calendar;charset=utf-8');
}

export async function shareEvent(event: CalendarEvent) {
  const url = new URL(`/events?event=${encodeURIComponent(String(event.id || ''))}`, window.location.origin).href;
  if (navigator.share) await navigator.share({ title: event.title, text: event.title, url });
  else { await navigator.clipboard.writeText(url); }
}
