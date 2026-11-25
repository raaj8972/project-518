import type { BandMember } from '../types/data';
import { instagramProfile } from './familyPeople';

export type HomeboundCategory = 'vocals' | 'guitars' | 'keys' | 'drums' | 'crew';

/** Keep explicit admin categories authoritative; infer only older, broad categories. */
export function getHomeboundCategory(member: Pick<BandMember, 'category' | 'role' | 'specialty'>): HomeboundCategory {
  const category = member.category.trim().toLowerCase();
  if (/^(vocals?|vocalist|singer)$/.test(category)) return 'vocals';
  if (/^(guitars?|guitarist|bass|bassist)$/.test(category)) return 'guitars';
  if (/^(keys?|keyboards?|keyboardist|piano|pianist)$/.test(category)) return 'keys';
  if (/^(drums?|drummer|percussion|percussionist)$/.test(category)) return 'drums';
  if (/^(other|crew)$/.test(category)) return 'crew';

  const specialty = `${member.role} ${member.specialty}`.toLowerCase();
  if (/\b(vocals?|vocalist|singer|singing)\b/.test(specialty)) return 'vocals';
  if (/\b(guitars?|guitarist|bass|bassist)\b/.test(specialty)) return 'guitars';
  if (/\b(keys?|keyboards?|keyboardist|piano|pianist|synth)\b/.test(specialty)) return 'keys';
  if (/\b(drums?|drummer|percussion|percussionist)\b/.test(specialty)) return 'drums';
  return 'crew';
}

/** Use the published roster without mutating the shared context array. */
export function getEnabledHomeboundMembers(members: readonly BandMember[] | null | undefined): BandMember[] {
  return (members ?? []).filter(member => member.enabled === true).sort((a, b) => {
    const featured = Number(b.is_featured === true) - Number(a.is_featured === true);
    return featured || (a.order_position ?? Number.MAX_SAFE_INTEGER) - (b.order_position ?? Number.MAX_SAFE_INTEGER);
  });
}

export function safeHomeboundUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  try {
    const url = new URL(input.startsWith('//') ? `https:${input}` : input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function getHomeboundSocialLinks(member: Pick<BandMember, 'social_links'>): {
  instagram: string | null;
  youtube: string | null;
  spotify: string | null;
} {
  const value = member.social_links;
  const links = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    instagram: safeHomeboundUrl(links.instagram) ?? instagramProfile(links.instagram)?.url ?? null,
    youtube: safeHomeboundUrl(links.youtube),
    spotify: safeHomeboundUrl(links.spotify),
  };
}
