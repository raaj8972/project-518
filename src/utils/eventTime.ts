// Centralized event & livestream time helpers
// Provides robust parsing (mirrors logic previously inline in Events.tsx) and live state computation

export interface LiveComputationOptions {
  now?: number;                 // override current timestamp (ms)
  leadMinutes?: number;         // window before start to treat as pre-live (for pills)
  registrationOpen?: boolean;   // manual override to force live state
}

// Parse combined event date/time (date: YYYY-MM-DD, time may be 24h or 12h with AM/PM, tolerates extra spaces).
export function parseEventDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  if (!dateStr || !timeStr) return null;
  const trimmedTime = timeStr.trim();
  if (/T/.test(trimmedTime)) { // already ISO-like
    const d = new Date(trimmedTime);
    return isNaN(d.getTime()) ? null : d;
  }
  let base = `${dateStr} ${trimmedTime}`.replace(/\s+/g,' ').trim();
  const ampmMatch = base.match(/(\bAM\b|\bPM\b)$/i);
  if (ampmMatch) base = base.replace(/(AM|PM)$/i, ' $1');
  const [dPart, tPart, ampm] = base.split(/\s+/);
  if (!dPart || !tPart) return null;
  const [year, month, day] = dPart.split('-').map(Number);
  if (!year || !month || !day) return null;
  let [hh, mm = '0', ss = '0'] = tPart.split(':');
  if (hh == null) return null;
  let hour = parseInt(hh, 10);
  const minute = parseInt(mm, 10) || 0;
  const second = parseInt(ss, 10) || 0;
  if (ampm || /AM|PM/i.test(trimmedTime)) {
    const mer = (ampm || trimmedTime.match(/AM|PM/i)?.[0] || '').toUpperCase();
    if (mer === 'PM' && hour < 12) hour += 12;
    if (mer === 'AM' && hour === 12) hour = 0;
  }
  const result = new Date(year, month - 1, day, hour, minute, second);
  return isNaN(result.getTime()) ? null : result;
}

export interface LiveStatus {
  isLive: boolean;          // true when live
  isPreLive: boolean;       // within lead window but not yet live
  deltaMs: number | null;   // start - now (negative if started)
  startDate?: Date | null;  // parsed start time
}

export function computeLiveStatus(dateStr: string | null | undefined, timeStr: string | null | undefined, opts: LiveComputationOptions = {}): LiveStatus {
  const startDate = parseEventDateTime(dateStr || undefined, timeStr || undefined);
  if (!startDate) return { isLive: false, isPreLive: false, deltaMs: null }; 
  const now = opts.now ?? Date.now();
  const startMs = startDate.getTime();
  const delta = startMs - now; // >0 future, <=0 started
  const registrationOpen = !!opts.registrationOpen;
  const isLive = delta <= 0 || registrationOpen; // registration open forces live
  const leadMs = (opts.leadMinutes ?? 60) * 60 * 1000;
  const isPreLive = !isLive && delta <= leadMs;
  return { isLive, isPreLive, deltaMs: delta, startDate };
}

// Format a short countdown label used for pills (e.g. "2h 5m", "8m", "4m 09s", "35s")
export function formatPreLiveCountdown(deltaMs: number): string {
  const secs = Math.max(0, Math.floor(deltaMs / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) { const h = Math.floor(m/60); const rm = m%60; return `${h}h ${rm}m`; }
  if (m >= 10) return `${m}m`;
  if (m >= 1) return `${m}m ${s}s`;
  return `${s}s`;
}
