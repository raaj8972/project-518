import { parseEventDateTime } from './eventTime';

// Structured rules helpers (mirrored from admin logic)
export type RuleBlock = { kind: 'points'; style?: 'bullet' | 'number'; title?: string; items: string[] };
export type RuleSection = { heading?: string; blocks?: RuleBlock[] };
export type RuleSectionV1 = { heading?: string; subheading?: string; points?: string[] };
export const STRUCTURED_MARK = '__SR__';

export const isStructuredRules = (rules: string[] | null | undefined): boolean => 
  Array.isArray(rules) && rules.length === 1 && typeof rules[0] === 'string' && rules[0].startsWith(STRUCTURED_MARK);

export const normalizeV1toV2 = (list: RuleSectionV1[]): RuleSection[] => 
  (list || []).map((s) => ({ 
    heading: s.heading, 
    blocks: [ ...(s.points && s.points.length ? [{ kind: 'points', style: 'number', title: s.subheading, items: s.points }] as RuleBlock[] : []) ] 
  }));

export const unpackStructured = (rules: string[] | null | undefined): RuleSection[] => {
  try {
    if (!isStructuredRules(rules)) return [];
    const s = (rules as string[])[0].slice(STRUCTURED_MARK.length);
    const parsed = JSON.parse(s);
    if (parsed?.v === 2 && Array.isArray(parsed?.sections)) return parsed.sections as RuleSection[];
    if (Array.isArray(parsed?.sections)) return normalizeV1toV2(parsed.sections as RuleSectionV1[]);
    return [];
  } catch { return []; }
};

export const computeRulesCount = (rules: string[] | null | undefined): number => {
  if (!rules || rules.length === 0) return 0;
  try {
    if (isStructuredRules(rules)) {
      const sections = unpackStructured(rules);
      return sections.reduce((acc, sec) => {
        const blocks = sec.blocks || [];
        return acc + blocks.reduce((bacc, b) => bacc + (b.items ? b.items.length : 0), 0);
      }, 0);
    }
  } catch (e) {
    // fall through
  }
  return (rules || []).filter((r) => !!String(r).trim()).length;
};

// Countdown Helpers
export const getOpenAtMs = (e: any): number | null => {
  if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
  const ts = new Date(e.registration_opens_at).getTime();
  return Number.isNaN(ts) ? null : ts;
};

export const getSecondsToOpen = (e: any): number | null => {
  const openAt = getOpenAtMs(e);
  if (openAt == null) return null;
  const diff = openAt - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 1000);
};

export const isBeforeOpen = (e: any): boolean => {
  const openAt = getOpenAtMs(e);
  if (openAt == null) return false;
  return Date.now() < openAt;
};

export const canRegisterNow = (e: any): boolean => {
  if (e?.registration_open) return true;
  const openAt = getOpenAtMs(e);
  const OPEN_GRACE_MS = 1000;
  const isTimerOpenWithGrace = openAt != null ? Date.now() + OPEN_GRACE_MS >= openAt : false;
  
  if (e?.registration_timer_enabled && e?.registration_closes_at) {
    const closeTime = new Date(e.registration_closes_at).getTime();
    if (!isNaN(closeTime) && Date.now() >= closeTime) return false;
  }
  
  return isTimerOpenWithGrace;
};

export const getCountdown = (e: any): string | null => {
  if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
  const openAt = new Date(e.registration_opens_at).getTime();
  if (Number.isNaN(openAt)) return null;
  const now = Date.now();
  const diff = openAt - now;
  if (diff <= 0) return 'now';
  const d = Math.floor(diff / (24*60*60*1000));
  const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
  const m = Math.floor((diff % (60*60*1000)) / (60*1000));
  const s = Math.floor((diff % (60*1000)) / 1000);
  const parts = [] as string[];
  if (d) parts.push(`${d}d`);
  if (h || parts.length) parts.push(`${h}h`);
  if (m || parts.length) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
};

export const getClosingCountdown = (e: any): string | null => {
  if (!e?.registration_timer_enabled || !e?.registration_closes_at) return null;
  const closeAt = new Date(e.registration_closes_at).getTime();
  if (Number.isNaN(closeAt)) return null;
  const now = Date.now();
  const diff = closeAt - now;
  if (diff <= 0) return 'closed';
  const d = Math.floor(diff / (24*60*60*1000));
  const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
  const m = Math.floor((diff % (60*60*1000)) / (60*1000));
  const s = Math.floor((diff % (60*1000)) / 1000);
  const parts = [] as string[];
  if (d) parts.push(`${d}d`);
  if (h || parts.length) parts.push(`${h}h`);
  if (m || parts.length) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
};

export const getOpensAtTooltip = (e: any): string => {
  const iso = e?.registration_opens_at as string | null | undefined;
  if (!iso) return 'Opens at —';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Opens at —';
  const ist = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const local = d.toLocaleString();
  const utc = d.toUTCString();
  return `Opens at — IST: ${ist} • Local: ${local} • UTC: ${utc} • Note: countdown uses your device time`;
};

export const getClosesAtTooltip = (e: any): string => {
  const iso = e?.registration_closes_at as string | null | undefined;
  if (!iso) return 'Closes at —';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Closes at —';
  const ist = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const local = d.toLocaleString();
  const utc = d.toUTCString();
  return `Closes at — IST: ${ist} • Local: ${local} • UTC: ${utc} • Note: countdown uses your device time`;
};

export const COUNTDOWN_PALETTE = ['#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#fb923c', '#f97316', '#ea580c', '#f59e0b', '#d97706'];
export const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#','');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getCountdownStylesForSecs = (secs: number | null | undefined) => {
  const s = Math.max(1, Math.min(10, Number(secs) || 10));
  const idx = (10 - s) % COUNTDOWN_PALETTE.length;
  const color = COUNTDOWN_PALETTE[idx];
  const glow = hexToRgba(color, 0.45);
  const filter = `drop-shadow(0 10px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 22px ${glow})`;
  return { color, filter };
};

export const isLastTenSeconds = (e: any): boolean => {
  const secs = getSecondsToOpen(e);
  return typeof secs === 'number' && secs >= 1 && secs <= 10 && isBeforeOpen(e);
};

export const getFieldDisplay = (value: string | null | undefined): { text: string; isUnannounced: boolean } => {
  if (!value || !value.trim()) {
    return { text: '- Yet to be announced', isUnannounced: true };
  }
  const trimmed = value.trim();
  const placeholders = ['-', '—', 'tba', 't.b.a', 'to be announced', 'tbd', 'to be decided', 'na', 'n/a', 'not available'];
  if (placeholders.includes(trimmed.toLowerCase())) {
    return { text: '- Yet to be announced', isUnannounced: true };
  }
  return { text: trimmed, isUnannounced: false };
};

export const getCoordinators = (eventId: number, allCoordinators: any[]): any[] => {
  return (allCoordinators || []).filter((c: any) => c.event_id === eventId);
};

export const getSecondsToClose = (e: any): number | null => {
  if (!e?.registration_timer_enabled || !e?.registration_closes_at) return null;
  const ts = new Date(e.registration_closes_at).getTime();
  if (Number.isNaN(ts)) return null;
  const diff = ts - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 1000);
};

export const yearLabelFor = (raw: any): string | null => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const l = s.toLowerCase();
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n > 0 && n < 10) {
    const ord = (k: number) => k === 1 ? '1st' : k === 2 ? '2nd' : k === 3 ? '3rd' : `${k}th`;
    return `${ord(n)} yr`;
  }
  if (l.includes('intern')) return 'Intern';
  if (l === 'pg' || l === 'pgt' || l.includes('post') || l.includes('pg ')) return 'PG';
  if (l.startsWith('i') || l.includes('first')) return '1st yr';
  if (l.startsWith('ii') || l.includes('second') || l.includes('2nd')) return '2nd yr';
  if (l.startsWith('iii') || l.includes('third') || l.includes('3rd')) return '3rd yr';
  return s;
};
