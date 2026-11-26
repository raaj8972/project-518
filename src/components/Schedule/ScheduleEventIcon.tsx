import type { ReactNode } from 'react';

export default function ScheduleEventIcon({ type, title }: { type: string; title: string }) {
  const text = `${type} ${title}`.toLowerCase();
  let art: ReactNode;
  if (/band|music|artist|evening|live|concert|dj/.test(text)) {
    art = <><path d="M13 29V10l17-4v19M13 15l17-4" /><ellipse cx="8" cy="30" rx="5" ry="4" fill="currentColor" /><ellipse cx="25" cy="26" rx="5" ry="4" fill="currentColor" /></>;
  } else if (/game|sport|award|prize|final/.test(text)) {
    art = <><path d="M11 5h16v10c0 8-16 8-16 0V5Zm0 3H5v4c0 7 5 8 8 8m14-12h6v4c0 7-5 8-8 8M19 22v8m-7 3h14M15 30h8" /><path d="m19 9 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5Z" fill="currentColor" /></>;
  } else if (/brain|quiz|academic|seminar|workshop/.test(text)) {
    art = <><path d="M18 8c-4-6-10-2-9 2-7 0-7 9-3 11-4 6 4 12 8 8 0 6 5 7 5 1V10c0-4 5-6 7-2 6-1 9 6 5 10 7 4 4 12-2 12-1 6-10 6-10 0M9 10l4 4-3 5m-4 2h7l3 6m10-19-3 7 5 3-5 5m6 7-3-4" /></>;
  } else if (/culture|cultural|dance|drama|polemic/.test(text)) {
    art = <><path d="M4 6h30M6 7v25m26-25v25M5 10c8 0 11 7 11 12-6-1-8 4-8 10m25-22c-8 0-11 7-11 12 6-1 8 4 8 10M15 7v9m4-9v10m4-10v9M6 33h27" /><path d="M6 7h26v4c-7 0-9 2-13 2S12 11 6 11Z" fill="currentColor" fillOpacity=".4" /></>;
  } else {
    art = <><circle cx="19" cy="10" r="4" fill="currentColor" /><circle cx="8" cy="14" r="3" /><circle cx="30" cy="14" r="3" /><path d="M12 30v-7c0-8 14-8 14 0v7H12Zm-3-9c-6-1-7 4-7 8h7m20-8c6-1 7 4 7 8h-7M4 33h30" /><path d="m16 3 3 2 3-2-1 5h-4Z" fill="currentColor" /></>;
  }
  return <svg viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art}</svg>;
}
