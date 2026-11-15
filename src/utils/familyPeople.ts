import type { CoreTeamMember } from '../types/data';

export type FamilyPerson = Pick<CoreTeamMember, 'id' | 'name' | 'image' | 'enabled' | 'is_head' | 'committee_id' | 'order_position' | 'social_links'> & {
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

export function splitFamilyPeople(people: FamilyPerson[]) {
  const sorted = people.filter(person => person.enabled).sort((a, b) => a.order_position - b.order_position);
  return {
    heads: sorted.filter(person => person.is_head),
    members: sorted.filter(person => !person.is_head),
  };
}
