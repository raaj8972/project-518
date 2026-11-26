import type { Event, EventCoordinator } from '../../../types/data';
import { eventCategory, eventLink, presentRules } from '../../../utils/eventPresentation';
import { isStructuredRules, unpackStructured, type RuleSection } from '../../../utils/eventUtils';

export const EVENT_EDITOR_SECTIONS = [
  { id: 'details', label: 'Event details', hint: 'Name, description & highlights' },
  { id: 'schedule', label: 'Schedule & venue', hint: 'When and where it happens' },
  { id: 'registration', label: 'Registration', hint: 'Entry, teams & participant limits' },
  { id: 'rules', label: 'Rules & guidelines', hint: 'Rulebook and supporting links' },
  { id: 'media', label: 'Poster & video', hint: 'Artwork and motion posters' },
  { id: 'people', label: 'Coordinators', hint: 'Contacts and participant group' },
  { id: 'publishing', label: 'Publishing', hint: 'Visibility, featuring & updates' },
] as const;
export type EventEditorSection = typeof EVENT_EDITOR_SECTIONS[number]['id'];
export interface CoordinatorDraft { key: string; id?: number; name: string; phone: string; order_position?: number }
export interface EventFields {
  title: string; category: string; description: string; participants: string; highlights: string[];
  date: string; time: string; venue: string; watch_live_url: string;
  image: string; motion_poster_url: string; motion_poster_autoplay: boolean;
  registration_open: boolean; registration_timer_enabled: boolean; registration_opens_at: string; registration_closes_at: string;
  registration_default_mode: 'individual' | 'team'; registration_mode_locked: boolean;
  team_required_size: string; team_min_members: string; team_max_members: string; max_participants: string;
  registration_participant_types: string[]; registration_participant_quotas: Record<string, number>;
  registration_photo_required: boolean; registration_photo_label: string;
  rules: string[]; rules_link: string; whatsapp_group_link: string; visible: boolean; featured: boolean;
}
export interface EventEditorDraft { fields: EventFields; structured: boolean; sections: RuleSection[]; coordinators: CoordinatorDraft[]; notify: boolean; note: string }
export type EditableEvent = Event & Partial<Omit<EventFields, 'registration_opens_at' | 'registration_closes_at' | 'team_required_size' | 'team_min_members' | 'team_max_members' | 'max_participants'>> & {
  registration_closes_at?: string | null; team_required_size?: number | null;
};
const text = (value: unknown) => typeof value === 'string' ? value : '';
const strings = (value: unknown) => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
const amount = (value: unknown) => value == null || value === '' ? '' : Number.isFinite(Number(value)) ? String(value) : '';
const normalizeSections = (value: unknown): RuleSection[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object').map(item => ({ heading: text(item.heading), blocks: Array.isArray(item.blocks) ? item.blocks.filter((block: unknown) => block && typeof block === 'object').map((block: { title?: unknown; style?: unknown; items?: unknown }) => ({ ...block, kind: 'points' as const, title: text(block.title), style: block.style === 'bullet' ? 'bullet' as const : 'number' as const, items: strings(block.items) })) : [] })) : [];
export const draftKey = (id?: number) => `admin_event_editor_${id ?? 'new'}`;

export function toIndiaInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (key: string) => parts.find(part => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function makeEventDraft(source?: Event, coordinators: EventCoordinator[] = [], group = ''): EventEditorDraft {
  const row = (source || {}) as Record<string, unknown>;
  return { fields: {
    title: text(row.title), category: eventCategory(row.category), description: text(row.description), participants: text(row.participants), highlights: strings(row.highlights),
    date: text(row.date), time: text(row.time), venue: text(row.venue), watch_live_url: text(row.watch_live_url),
    image: text(row.image), motion_poster_url: text(row.motion_poster_url), motion_poster_autoplay: row.motion_poster_autoplay === true,
    registration_open: row.registration_open !== false, registration_timer_enabled: row.registration_timer_enabled === true,
    registration_opens_at: toIndiaInput(row.registration_opens_at), registration_closes_at: toIndiaInput(row.registration_closes_at),
    registration_default_mode: row.registration_default_mode === 'team' ? 'team' : 'individual', registration_mode_locked: row.registration_mode_locked === true,
    team_required_size: amount(row.team_required_size), team_min_members: amount(row.team_min_members), team_max_members: amount(row.team_max_members), max_participants: amount(row.max_participants),
    registration_participant_types: strings(row.registration_participant_types), registration_participant_quotas: row.registration_participant_quotas && typeof row.registration_participant_quotas === 'object' && !Array.isArray(row.registration_participant_quotas) ? row.registration_participant_quotas as Record<string, number> : {},
    registration_photo_required: row.registration_photo_required === true, registration_photo_label: text(row.registration_photo_label),
    rules: strings(row.rules), rules_link: text(row.rules_link), whatsapp_group_link: group, visible: row.visible !== false, featured: row.featured === true,
  }, structured: isStructuredRules(strings(row.rules)), sections: normalizeSections(unpackStructured(strings(row.rules))),
    coordinators: [...coordinators].sort((a, b) => a.order_position - b.order_position).map(item => ({ key: `saved-${item.id}`, id: item.id, name: item.name || '', phone: item.phone || '', order_position: item.order_position })), notify: false, note: '' };
}

export function restoreEventDraft(value: unknown, baseline: EventEditorDraft): EventEditorDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return baseline;
  const saved = value as Partial<EventEditorDraft>;
  const fields = { ...baseline.fields };
  if (saved.fields && typeof saved.fields === 'object') for (const key of Object.keys(fields) as (keyof EventFields)[]) {
    const next = saved.fields[key];
    if ((typeof next === 'string' || typeof next === 'boolean') && typeof next === typeof fields[key]) (fields as unknown as Record<string, unknown>)[key] = next;
    if (Array.isArray(fields[key]) && Array.isArray(next)) (fields as unknown as Record<string, unknown>)[key] = strings(next);
    if (key === 'registration_participant_quotas' && next && typeof next === 'object' && !Array.isArray(next)) fields.registration_participant_quotas = Object.fromEntries(Object.entries(next).filter(([, val]) => Number.isInteger(val) && Number(val) >= 0));
  }
  const sections = Array.isArray(saved.sections) ? normalizeSections(saved.sections) : baseline.sections;
  const coords = Array.isArray(saved.coordinators) ? saved.coordinators.filter(item => item && typeof item.key === 'string' && typeof item.name === 'string' && typeof item.phone === 'string') : baseline.coordinators;
  return { ...baseline, fields, structured: typeof saved.structured === 'boolean' ? saved.structured : baseline.structured, sections, coordinators: coords, notify: false, note: text(saved.note) };
}

export function serializeEventDraft(draft: EventEditorDraft) {
  const { fields: f } = draft;
  const optionalNumber = (value: string) => value.trim() === '' ? null : Number(value);
  const sections = draft.sections.map(section => ({ heading: section.heading?.trim() || '', blocks: (section.blocks || []).map(block => ({ ...block, title: block.title?.trim() || '', items: (block.items || []).map(item => item.trim()).filter(Boolean) })).filter(block => block.title || block.items.length) })).filter(section => section.heading || section.blocks.length);
  const unchangedStructured = draft.structured && isStructuredRules(f.rules) && JSON.stringify(draft.sections) === JSON.stringify(normalizeSections(unpackStructured(f.rules)));
  const rules = unchangedStructured ? f.rules : draft.structured ? ['__SR__' + JSON.stringify({ v: 2, sections })] : f.rules.map(rule => rule.trim()).filter(Boolean);
  return { ...f, title: f.title.trim(), category: eventCategory(f.category), description: f.description.trim(),
    date: f.date.trim(), time: f.time.trim(), venue: f.venue.trim(), participants: f.participants.trim(), highlights: f.highlights.map(item => item.trim()).filter(Boolean), rules,
    rules_link: f.rules_link.trim() || null, watch_live_url: f.watch_live_url.trim() || null, whatsapp_group_link: f.whatsapp_group_link.trim(),
    motion_poster_url: f.motion_poster_url.trim() || null,
    registration_opens_at: f.registration_opens_at ? new Date(`${f.registration_opens_at}+05:30`).toISOString() : null,
    registration_closes_at: f.registration_closes_at ? new Date(`${f.registration_closes_at}+05:30`).toISOString() : null,
    team_required_size: optionalNumber(f.team_required_size), team_min_members: optionalNumber(f.team_min_members), team_max_members: optionalNumber(f.team_max_members), max_participants: optionalNumber(f.max_participants),
    registration_photo_label: f.registration_photo_label.trim() || null,
    registration_participant_quotas: Object.fromEntries(f.registration_participant_types.filter(type => f.registration_participant_quotas[type] != null && Number(f.registration_participant_quotas[type]) >= 0).map(type => [type, Number(f.registration_participant_quotas[type])])),
  };
}
export function validateEventDraft(draft: EventEditorDraft): { section: EventEditorSection; message: string } | null {
  const f = draft.fields;
  if (!f.title.trim()) return { section: 'details', message: 'Enter an event title.' };
  if (!f.description.replace(/<[^>]+>/g, '').trim()) return { section: 'details', message: 'Add a description so participants know what to expect.' };
  for (const [key, section, label] of [['rules_link', 'rules', 'Rules link'], ['watch_live_url', 'schedule', 'Livestream link'], ['whatsapp_group_link', 'people', 'WhatsApp group link'], ['image', 'media', 'Poster URL'], ['motion_poster_url', 'media', 'Video URL']] as const) {
    if (f[key] && !eventLink(f[key]) && !((key === 'image' || key === 'motion_poster_url') && /^\/(?!\/)/.test(f[key]))) return { section, message: `${label} must be a valid http or https URL.` };
  }
  if (f.registration_timer_enabled && !f.registration_opens_at) return { section: 'registration', message: 'Choose when scheduled registration opens, or turn off the timer.' };
  for (const value of [f.registration_opens_at, f.registration_closes_at]) if (value && !Number.isFinite(Date.parse(`${value}+05:30`))) return { section: 'registration', message: 'Choose a valid registration date and time.' };
  if (f.registration_opens_at && f.registration_closes_at && f.registration_closes_at <= f.registration_opens_at) return { section: 'registration', message: 'Registration must close after it opens.' };
  for (const key of ['team_required_size', 'team_min_members', 'team_max_members', 'max_participants'] as const) if (f[key] && (!Number.isInteger(Number(f[key])) || Number(f[key]) < (key === 'max_participants' ? 1 : 2) || (key !== 'max_participants' && Number(f[key]) > 50))) return { section: 'registration', message: key === 'max_participants' ? 'Participant limit must be a positive whole number.' : 'Team sizes must be whole numbers from 2 to 50.' };
  if (f.team_min_members && f.team_max_members && Number(f.team_min_members) > Number(f.team_max_members)) return { section: 'registration', message: 'Minimum team size cannot exceed the maximum.' };
  if (draft.coordinators.some(coord => !coord.name.trim() && coord.phone.trim())) return { section: 'people', message: 'Add a name for each coordinator with a phone number.' };
  for (const label of f.registration_participant_types) if (f.registration_participant_quotas[label] != null && (!Number.isInteger(Number(f.registration_participant_quotas[label])) || Number(f.registration_participant_quotas[label]) < 0)) return { section: 'registration', message: `Enter a valid participant quota for ${label}.` };
  return null;
}

export function notificationRules(rules: unknown) {
  return presentRules(rules).map(rule => ({ text: rule.content, kind: rule.level, highlight: false }));
}
