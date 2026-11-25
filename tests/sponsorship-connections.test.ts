import { expect, it } from 'vitest';
import type { CoreCommittee, CoreTeamMember, SponsorshipPackage } from '../src/types/data';
import { sponsorshipTeamContacts, sponsorshipEmailHref } from '../src/utils/sponsorshipContacts';
import { sortSponsorshipPackages, packageMovePlan } from '../src/utils/sponsorshipPackages';
import { getDataScope } from '../src/utils/dataScope';

const teams = [{ id: 1, name: 'Sponsorship', enabled: true }, { id: 2, name: 'Public Relations', enabled: true }, { id: 3, name: 'Sponsorship archive', enabled: false }] as CoreCommittee[];
const person = (id: number, committee_id: number, is_head = false) => ({ id, committee_id, name: `Team contact ${id}`, role: is_head ? 'Head' : 'Member', enabled: true, is_head, order_position: id, phone: '+91 98760 12345', email: `team-${id}@festival.example` } as CoreTeamMember);
const pkg = (id: number, order_position: number) => ({ id, order_position, tier: `Partnership ${id}`, enabled: true } as SponsorshipPackage);

it('uses enabled Sponsorship members and only PR heads from the shared family records', () => {
  const people = [person(1, 1, true), person(2, 1), person(3, 2), person(4, 2, true), person(5, 3, true), { ...person(6, 1), enabled: false }];
  const contacts = sponsorshipTeamContacts(teams, people);
  expect(contacts.map(contact => contact.id)).toEqual([1, 4, 2]);
  expect(contacts.find(contact => contact.id === 4)?.group).toBe('pr');
  expect(contacts[0].phone?.url).toBe('tel:+919876012345');
  expect(sponsorshipTeamContacts(teams, people.map(item => item.id === 4 ? { ...item, phone: 'invalid', email: 'javascript:example' } : item)).find(item => item.id === 4)).toMatchObject({ phone: null, email: null });
});

it('reflects family contact edits and encodes the selected tier in the enquiry email', () => {
  const changed = { ...person(1, 1), name: 'Updated team head', phone: '+91 98760 54321' };
  expect(sponsorshipTeamContacts(teams, [changed])[0]).toMatchObject({ name: changed.name, phone: { number: changed.phone } });
  expect(decodeURIComponent(sponsorshipEmailHref('team@festival.example', 2027, 'Gold & Media'))).toBe('mailto:team@festival.example?subject=Ricorrenza 2027 sponsorship enquiry — Gold & Media');
  expect(getDataScope('/sponsors', false)).toMatchObject({ personnel: true, management: true, privateManagement: false });
});

it('keeps all 20 custom tiers ordered and moves a middle tier by exactly one place', () => {
  const packages = Array.from({ length: 20 }, (_, i) => pkg(i + 1, i + 1)).reverse();
  const plan = packageMovePlan(packages, 11, 'up');
  const updated = packages.map(item => ({ ...item, order_position: plan.find(step => step.id === item.id)?.next ?? item.order_position }));
  expect(sortSponsorshipPackages(updated).map(item => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  expect(plan).toHaveLength(2); expect(packages[0].id).toBe(20);
});

it('repairs tied positions deterministically and leaves boundary moves unchanged', () => {
  const packages = [pkg(1, 1), pkg(2, 1), pkg(3, 1)];
  const plan = packageMovePlan(packages, 3, 'up');
  const updated = packages.map(item => ({ ...item, order_position: plan.find(step => step.id === item.id)?.next ?? item.order_position }));
  expect(sortSponsorshipPackages(updated).map(item => item.id)).toEqual([1, 3, 2]);
  expect(packageMovePlan(packages, 1, 'up')).toEqual([]);
});
