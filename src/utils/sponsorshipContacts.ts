import type { CoreCommittee, CoreTeamMember } from '../types/data';
import { phoneProfile } from './familyPeople';

export interface SponsorshipPerson {
  id: number;
  name: string;
  role: string;
  committee: string;
  group: 'sponsorship' | 'pr';
  phone: ReturnType<typeof phoneProfile>;
  email: string | null;
}

export function sponsorshipTeamContacts(committees: CoreCommittee[], members: CoreTeamMember[]): SponsorshipPerson[] {
  const enabledTeams = new Map((committees || []).filter(team => team.enabled).map(team => [team.id, team]));
  const result: SponsorshipPerson[] = [];
  const seen = new Set<number>();
  for (const person of [...(members || [])].sort((a, b) => Number(b.is_head) - Number(a.is_head) || a.order_position - b.order_position)) {
    if (!person.enabled || seen.has(person.id) || !person.name.trim()) continue;
    const team = person.committee_id != null ? enabledTeams.get(person.committee_id) : undefined;
    if (person.committee_id != null && !team) continue;
    const description = `${team?.name || ''} ${person.role || ''}`;
    const sponsorship = /sponsor|corporate\s*(?:relations?|partnerships?)/i.test(description);
    const pr = /\bpr\b|public\s*relations?|publicity/i.test(description);
    const head = person.is_head || /\b(head|lead|chief|chair|coordinator|co-ordinator|convenor|convener)\b/i.test(person.role || '');
    if (!sponsorship && !(pr && head)) continue;
    const email = typeof person.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim()) ? person.email.trim() : null;
    result.push({ id: person.id, name: person.name.trim(), role: person.role.trim(), committee: team?.name || (sponsorship ? 'Sponsorship team' : 'PR team'), group: sponsorship ? 'sponsorship' : 'pr', phone: phoneProfile(person.phone), email });
    seen.add(person.id);
  }
  return result;
}

export function sponsorshipEmailHref(email: string, year: number, tier?: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(`Ricorrenza ${year} sponsorship enquiry${tier ? ` — ${tier}` : ''}`)}`;
}
