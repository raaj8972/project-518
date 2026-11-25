import type { DisplayPartner } from './homepageContent';

export const PARTNER_CATEGORY_OPTIONS = ['Travel', 'Study', 'Food', 'Technology', 'Health', 'Lifestyle', 'Media', 'Community'] as const;
export type PartnerTone = 'travel' | 'study' | 'food' | 'technology' | 'health' | 'lifestyle' | 'media' | 'community';
export interface PartnerGroup { key: string; label: string; tone: PartnerTone; partners: DisplayPartner[] }
export interface PartnerArchive { key: string; year?: number; label: string; partners: DisplayPartner[] }

const categoryRules: Array<{ match: RegExp; label: string; tone: PartnerTone }> = [
  { match: /travel|transport|touris|aviation|airline|mobility/i, label: 'Travel', tone: 'travel' },
  { match: /study|educat|learn|academ|coaching|training|book/i, label: 'Study', tone: 'study' },
  { match: /food|beverage|dining|restaurant|cafe|catering|refreshment/i, label: 'Food', tone: 'food' },
  { match: /tech|digital|software|internet/i, label: 'Technology', tone: 'technology' },
  { match: /health|medical|wellness|hospital|pharma/i, label: 'Health', tone: 'health' },
  { match: /lifestyle|fashion|apparel|beauty/i, label: 'Lifestyle', tone: 'lifestyle' },
  { match: /media|radio|press|broadcast|publicity|photograph/i, label: 'Media', tone: 'media' },
];

export function isTitlePartner(partner: Pick<DisplayPartner, 'category'>): boolean {
  return /title|presenting|powered\s*by/i.test(partner.category);
}

export function partnerCategory(partner: Pick<DisplayPartner, 'category' | 'partner_category'>) {
  const isTier = isTitlePartner(partner) || /^(?:co[\s-]*|platinum|gold|silver|bronze|diamond)\s*(?:sponsor|partner)s?$/i.test(partner.category.trim());
  const raw = (partner.partner_category || (isTier ? '' : partner.category)).trim();
  const preset = categoryRules.find(rule => rule.match.test(raw));
  if (preset) return { key: preset.tone, label: preset.label, tone: preset.tone };
  const label = raw.replace(/\b(?:official|partners?|sponsors?)\b/gi, '').replace(/\s+/g, ' ').trim() || 'Community';
  return { key: `custom-${label.toLowerCase().replace(/\s+/g, '-')}`, label, tone: 'community' as const };
}

export function groupPartners(partners: DisplayPartner[]): PartnerGroup[] {
  const groups = new Map<string, PartnerGroup>();
  for (const partner of partners) {
    const category = partnerCategory(partner);
    const group = groups.get(category.key) || { ...category, partners: [] };
    group.partners.push(partner);
    groups.set(category.key, group);
  }
  return [...groups.values()].sort((a, b) => {
    const index = (label: string) => { const i = PARTNER_CATEGORY_OPTIONS.indexOf(label as typeof PARTNER_CATEGORY_OPTIONS[number]); return i < 0 ? 100 : i; };
    return index(a.label) - index(b.label) || a.label.localeCompare(b.label);
  });
}

export function groupPartnerArchives(partners: DisplayPartner[], currentYear: number): PartnerArchive[] {
  const archives = new Map<string, PartnerArchive>();
  for (const partner of partners.filter(item => item.period === 'previous')) {
    // Older records have no verified year. Keep them in a separate archive.
    const year = partner.edition_year && partner.edition_year < currentYear ? partner.edition_year : undefined;
    const key = year ? String(year) : 'earlier';
    const archive = archives.get(key) || { key, year, label: year ? String(year) : 'Earlier editions', partners: [] };
    archive.partners.push(partner);
    archives.set(key, archive);
  }
  return [...archives.values()].sort((a, b) => (b.year || 0) - (a.year || 0));
}

export function safeSponsorLink(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
