import { getFieldDisplay, isStructuredRules, unpackStructured } from './eventUtils';

export const EVENT_POSTER_WIDTH = 1600;
export const EVENT_POSTER_HEIGHT = 1000;
export const EVENT_POSTER_ASPECT = EVENT_POSTER_WIDTH / EVENT_POSTER_HEIGHT;
export const EVENT_POSTER_GUIDE = '1600 × 1000 px · 8:5 landscape · PNG, JPG or WebP';
export const EVENT_CATEGORIES = ['Cultural', 'Academic'] as const;
export const EVENT_FILTERS = ['All', ...EVENT_CATEGORIES] as const;

export function eventCategory(value: unknown): string {
  const category = value && typeof value === 'object' && 'name' in value ? value.name : value;
  // Retired category labels stay visible under Cultural until an admin recategorises them.
  return typeof category === 'string' && /^academ/i.test(category.trim()) ? 'Academic' : 'Cultural';
}

export function filterEventCatalog<T extends { title?: string; venue?: string | null; category?: unknown; visible?: boolean | null }>(events: T[], query: string, category: string, visibility: string): T[] {
  const search = query.trim().toLocaleLowerCase();
  return events.filter(event => (!search || `${event.title || ''} ${event.venue || ''}`.toLocaleLowerCase().includes(search))
    && (category === 'All' || eventCategory(event.category) === category)
    && (visibility === 'all' || (visibility === 'hidden' ? event.visible === false : event.visible !== false)));
}

export function eventText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<\s*br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export function eventField(value: string | null | undefined): string {
  const field = getFieldDisplay(value);
  return field.isUnannounced ? 'To be announced' : field.text;
}

export function eventDate(value: string | null | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00+05:30`);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date);
  }
  return eventField(value);
}

export function eventTime(value: string | null | undefined): string {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
    const hour = Number(match[1]);
    return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'} IST`;
  }
  return eventField(value);
}

export function eventLink(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export interface PresentedRule { content: string; level: 'h1' | 'h2' | 'numbered' | 'bullet' | 'text'; index?: number }

export function presentRules(rules: unknown): PresentedRule[] {
  if (!Array.isArray(rules)) return [];
  let index = 0;
  if (isStructuredRules(rules)) {
    // Both rule editors exist in the admin: v2 objects and the older sections array.
    let sections = unpackStructured(rules);
    try {
      const decoded = JSON.parse(rules[0].slice('__SR__'.length));
      if (Array.isArray(decoded)) sections = decoded;
    } catch { return []; }
    return sections.filter(section => section && typeof section === 'object').flatMap(section => [
      ...(section.heading?.trim() ? [{ content: section.heading, level: 'h1' as const }] : []),
      ...(Array.isArray(section.blocks) ? section.blocks : []).filter(Boolean).flatMap(block => [
        ...(block.title?.trim() ? [{ content: block.title, level: 'h2' as const }] : []),
        ...((block as { content?: string }).content?.trim() ? [{ content: (block as { content?: string }).content || '', level: 'text' as const }] : []),
        ...(Array.isArray(block.items) ? block.items : []).filter(item => typeof item === 'string' && item.trim()).map(content => ({ content, level: (block.style === 'bullet' ? 'bullet' : 'numbered') as 'bullet' | 'numbered', index: ++index })),
      ]),
    ]);
  }
  return rules.filter(rule => typeof rule === 'string' && rule.trim()).map(content => ({ content, level: 'numbered', index: ++index }));
}
