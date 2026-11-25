import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import type { BandMember } from '../types/data';
import { getHomeboundCategory, safeHomeboundUrl } from './homebound';

export type HomeboundIcon = 'vocals' | 'guitars' | 'keys' | 'drums' | 'crew' | 'beatbox' | 'music';
export interface HomeboundCategoryConfig {
  id: string;
  label: string;
  icon: HomeboundIcon;
  enabled: boolean;
  aliases: string[];
}
export interface HomeboundJourneyItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  image_alt: string;
  enabled: boolean;
}
export interface HomeboundPageContent {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  hero_image_alt: string;
  hero_wordmark_image: string;
  hero_wordmark_enabled: boolean;
  about_heading: string;
  about_text: string;
  about_image: string;
  about_image_alt: string;
  band_heading: string;
  all_label: string;
  journey_heading: string;
  journey_items: HomeboundJourneyItem[];
  encore_text: string;
  listen_label: string;
  follow_label: string;
  audition_label: string;
  footer_text: string;
  footer_subtitle: string;
  gallery_label: string;
  gallery_url: string;
  sections: Record<'hero' | 'about' | 'band' | 'journey' | 'encore' | 'footer', boolean>;
  categories: HomeboundCategoryConfig[];
}
export interface HomeboundCategoryOption {
  value: string;
  label: string;
  enabled: boolean;
  legacy: boolean;
}

export const DEFAULT_HOMEBOUND_CONTENT: HomeboundPageContent = {
  hero_title: 'Homebound',
  hero_subtitle: 'The college band of Ricorrenza',
  hero_image: '/images/homebound/stage.webp',
  hero_image_alt: 'Guitar, microphone, drums and keys on an emerald-lit concert stage',
  hero_wordmark_image: '/images/homebound/wordmark.webp',
  hero_wordmark_enabled: true,
  about_heading: 'About Homebound',
  about_text: 'Homebound is the official college band of IQ City Medical College — a collective of {member_count} passionate medicos who turn duty breaks into music, ideas into originals, and the stage into a second home.',
  about_image: '/images/homebound/journey-campus.webp',
  about_image_alt: 'A singer and a sea of raised hands under concert lights',
  band_heading: 'Meet the band',
  all_label: 'All',
  journey_heading: 'Our\nJourney',
  journey_items: [
    { id: 'rehearsals', title: 'Rehearsals', subtitle: '(The Beginning)', image: '/images/homebound/journey-rehearsals.webp', image_alt: 'Rehearsals — an illustration of the Homebound journey', enabled: true },
    { id: 'campus', title: 'Campus Gigs', subtitle: '(Building the Sound)', image: '/images/homebound/journey-campus.webp', image_alt: 'Campus Gigs — an illustration of the Homebound journey', enabled: true },
    { id: 'ricorrenza', title: 'RICORRENZA', subtitle: 'Past Editions', image: '/images/homebound/journey-ricorrenza.webp', image_alt: 'RICORRENZA — an illustration of the Homebound journey', enabled: true },
  ],
  encore_text: 'Same heartbeat. One sound.',
  listen_label: 'Listen to Homebound',
  follow_label: 'Follow the journey',
  audition_label: 'Join the band',
  footer_text: `Homebound × ${BRAND_NAME}`,
  footer_subtitle: `IQ City Medical College · ${BRAND_YEAR}`,
  gallery_label: 'More moments',
  gallery_url: '/gallery',
  sections: { hero: true, about: true, band: true, journey: true, encore: true, footer: true },
  categories: [
    { id: 'vocals', label: 'Vocals', icon: 'vocals', enabled: true, aliases: ['Vocal', 'Vocalist', 'Singer'] },
    { id: 'guitars', label: 'Guitars', icon: 'guitars', enabled: true, aliases: ['Guitar', 'Guitarist', 'Bass', 'Bassist'] },
    { id: 'keys', label: 'Keys', icon: 'keys', enabled: true, aliases: ['Keyboard', 'Keyboards', 'Keyboardist', 'Piano', 'Pianist'] },
    { id: 'drums', label: 'Drums', icon: 'drums', enabled: true, aliases: ['Drum', 'Drummer', 'Percussion', 'Percussionist'] },
    { id: 'crew', label: 'Crew', icon: 'crew', enabled: true, aliases: ['Other'] },
  ],
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const text = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
const boolean = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
const normalized = (value: string) => value.trim().normalize('NFKC').toLowerCase();

/** Stable category IDs are independent of their editable display labels. */
export function homeboundCategoryId(value: string): string {
  const id = normalized(value).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return id === 'all' ? 'category-all' : id;
}

/** Images and links may use local site paths or ordinary web URLs. */
export function safeHomeboundContentUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  if (!input || /[\u0000-\u001f\u007f\\]/.test(input)) return '';
  if (input.startsWith('/') && !input.startsWith('//')) return input;
  return safeHomeboundUrl(input) ?? '';
}
const media = (value: unknown, fallback: string) => typeof value === 'string' ? safeHomeboundContentUrl(value) : fallback;

export function readHomeboundContent(value: unknown): HomeboundPageContent {
  const source = record(value);
  const defaults = DEFAULT_HOMEBOUND_CONTENT;
  const sectionSource = record(source.sections);
  const sections = { ...defaults.sections };
  for (const section of Object.keys(sections) as (keyof HomeboundPageContent['sections'])[]) {
    sections[section] = boolean(sectionSource[section], defaults.sections[section]);
  }
  const seenCategories = new Set<string>();
  const icons: HomeboundIcon[] = ['vocals', 'guitars', 'keys', 'drums', 'crew', 'beatbox', 'music'];
  const categories = (Array.isArray(source.categories) ? source.categories : defaults.categories).flatMap(value => {
    const item = record(value);
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    const id = homeboundCategoryId(typeof item.id === 'string' ? item.id : label);
    if (!label || !id || seenCategories.has(id)) return [];
    seenCategories.add(id);
    return [{ id, label, icon: icons.includes(item.icon as HomeboundIcon) ? item.icon as HomeboundIcon : 'music' as const, enabled: boolean(item.enabled, true), aliases: Array.isArray(item.aliases) ? [...new Set(item.aliases.filter((alias): alias is string => typeof alias === 'string').map(alias => alias.trim()).filter(Boolean))] : [] }];
  });
  const seenJourney = new Set<string>();
  const journey_items = (Array.isArray(source.journey_items) ? source.journey_items : defaults.journey_items).flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = record(value);
    const id = text(item.id, `journey-${index + 1}`).trim() || `journey-${index + 1}`;
    if (seenJourney.has(id)) return [];
    seenJourney.add(id);
    return [{ id, title: text(item.title, ''), subtitle: text(item.subtitle, ''), image: media(item.image, ''), image_alt: text(item.image_alt, ''), enabled: boolean(item.enabled, true) }];
  });
  return {
    hero_title: text(source.hero_title, defaults.hero_title),
    hero_subtitle: text(source.hero_subtitle, defaults.hero_subtitle),
    hero_image: media(source.hero_image, defaults.hero_image),
    hero_image_alt: text(source.hero_image_alt, defaults.hero_image_alt),
    hero_wordmark_image: media(source.hero_wordmark_image, defaults.hero_wordmark_image),
    hero_wordmark_enabled: boolean(source.hero_wordmark_enabled, defaults.hero_wordmark_enabled),
    about_heading: text(source.about_heading, defaults.about_heading),
    about_text: text(source.about_text, defaults.about_text),
    about_image: media(source.about_image, defaults.about_image),
    about_image_alt: text(source.about_image_alt, defaults.about_image_alt),
    band_heading: text(source.band_heading, defaults.band_heading),
    all_label: text(source.all_label, defaults.all_label),
    journey_heading: text(source.journey_heading, defaults.journey_heading),
    journey_items,
    encore_text: text(source.encore_text, defaults.encore_text),
    listen_label: text(source.listen_label, defaults.listen_label),
    follow_label: text(source.follow_label, defaults.follow_label),
    audition_label: text(source.audition_label, defaults.audition_label),
    footer_text: text(source.footer_text, defaults.footer_text),
    footer_subtitle: text(source.footer_subtitle, defaults.footer_subtitle),
    gallery_label: text(source.gallery_label, defaults.gallery_label),
    gallery_url: media(source.gallery_url, defaults.gallery_url),
    sections,
    categories,
  };
}

/** Resolve configured IDs first; free-form categories keep their own identity. */
export function getHomeboundMemberCategory(member: Pick<BandMember, 'category' | 'role' | 'specialty'>, categories: readonly HomeboundCategoryConfig[]): string {
  const raw = normalized(member.category || '');
  const exact = categories.find(category => [category.id, category.label, ...category.aliases].some(value => normalized(value) === raw));
  if (exact) return exact.id;
  const legacy = /^(vocals?|vocalist|singer|guitars?|guitarist|bass|bassist|keys?|keyboards?|keyboardist|piano|pianist|drums?|drummer|percussion|percussionist|other|crew|instrumentalist|band member)?$/.test(raw);
  if (legacy) return getHomeboundCategory({ ...member, category: member.category || '' });
  return homeboundCategoryId(member.category || '') || 'crew';
}

/** Include unpublished configured groups and unassigned legacy values for editing. */
export function getHomeboundCategoryOptions(categories: readonly HomeboundCategoryConfig[], members: readonly Pick<BandMember, 'category' | 'role' | 'specialty'>[]): HomeboundCategoryOption[] {
  const options: HomeboundCategoryOption[] = categories.map(category => ({ value: category.id, label: category.label, enabled: category.enabled, legacy: false }));
  const configured = new Set(categories.map(category => category.id));
  const existing = new Set(options.map(option => normalized(option.value)));
  for (const member of members) {
    if (configured.has(getHomeboundMemberCategory(member, categories))) continue;
    const category = member.category?.trim();
    if (!category || existing.has(normalized(category))) continue;
    existing.add(normalized(category));
    options.push({ value: category, label: category, enabled: false, legacy: true });
  }
  return options;
}
