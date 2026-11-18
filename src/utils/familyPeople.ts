import type { CoreTeamMember } from '../types/data';

export type FamilyPerson = Pick<CoreTeamMember, 'id' | 'name' | 'image' | 'enabled' | 'is_head' | 'committee_id' | 'order_position' | 'social_links'> & {
  phone?: string | null;
  is_council?: boolean;
  isCouncil?: boolean;
};

export const isCouncilPerson = (person: { is_council?: boolean; isCouncil?: boolean }) =>
  person.is_council === true || person.isCouncil === true;

export function instagramProfile(value: unknown): { url: string; handle: string } | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  let handle = input.replace(/^@/, '');
  if (/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(input)) {
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (!['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase())) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length !== 1) return null;
      handle = parts[0];
    } catch { return null; }
  }
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle) || ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'].includes(handle.toLowerCase())) return null;
  return { url: `https://www.instagram.com/${handle}/`, handle: `@${handle}` };
}

export function personInstagram(person: Pick<FamilyPerson, 'social_links'>) {
  const links = person.social_links;
  return links && typeof links === 'object' && !Array.isArray(links) ? instagramProfile(links.instagram) : null;
}

export function facebookProfile(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  if (/^@?[a-zA-Z0-9.]{2,100}$/.test(input)) return `https://www.facebook.com/${input.replace(/^@/, '')}/`;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com', 'fb.me'].includes(url.hostname.toLowerCase()) || !/^https?:$/.test(url.protocol)) return null;
    url.protocol = 'https:';
    return url.href;
  } catch { return null; }
}

export function splitFamilyPeople(people: FamilyPerson[]) {
  const sorted = people.filter(person => person.enabled).sort((a, b) => a.order_position - b.order_position);
  return {
    heads: sorted.filter(person => person.is_head),
    members: sorted.filter(person => !person.is_head),
  };
}

/** Only telephone digits and common display separators are accepted. */
export function phoneProfile(value: unknown): { url: string; number: string } | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const number = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(number)) return null;
  const digits = number.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return { url: `tel:${number.startsWith('+') ? '+' : ''}${digits}`, number };
}
export function personBatch(person: { social_links?: unknown }): string {
  const links = person.social_links;
  return links && typeof links === 'object' && !Array.isArray(links) && typeof (links as Record<string,unknown>).batch === 'string' ? (links as Record<string,string>).batch.trim() : '';
}
