import { useEffect, useMemo, useState } from 'react';
import type { Event } from '../types/data';
import { indiaDayKey, selectHomepageEvents } from '../utils/homepageContent';

export function useHomepageEvents(events: Event[], limit = 6) {
  const [today, setToday] = useState(() => indiaDayKey());
  useEffect(() => {
    const update = () => setToday(indiaDayKey());
    const interval = window.setInterval(update, 30000);
    const focus = () => { if (!document.hidden) update(); };
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', focus);
    return () => { clearInterval(interval); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', focus); };
  }, []);
  return useMemo(() => selectHomepageEvents(events, new Date(`${today}T12:00:00+05:30`), limit), [events, today, limit]);
}
