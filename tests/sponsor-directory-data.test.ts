import { expect, it } from 'vitest';
import { readHomepagePartners, resolvePartnerCatalog, resolveHomepagePartners, setSponsorPlacement, rolloverPartnerPlacements } from '../src/utils/homepageContent';
import { groupPartners, groupPartnerArchives, partnerCategory, safeSponsorLink } from '../src/utils/sponsorPresentation';
import { fixturePartner, sponsorDirectoryFixture } from './fixtures/sponsorDirectory';

it('keeps current and archived editions available together without changing homepage fallback', () => {
  const records = [fixturePartner(1, 'Current'), fixturePartner(2, 'Archived')];
  const placements = [{ id: 'one', sponsor_id: 1, period: 'current', partner_category: 'Food' }, { id: 'two', sponsor_id: 2, period: 'previous', edition_year: 2024 }];
  const catalog = resolvePartnerCatalog(records, placements);
  expect(catalog.map(partner => partner.period)).toEqual(['current', 'previous']);
  expect(catalog[0].partner_category).toBe('Food');
  expect(catalog[1].edition_year).toBe(2024);
  expect(resolveHomepagePartners(records, placements).partners.map(partner => partner.id)).toEqual([1]);
});

it('preserves category, archive year and homepage visibility when editing publication metadata', () => {
  const sponsor = fixturePartner(1, 'Archived');
  const placements = [{ id: 'linked', sponsor_id: 1, period: 'previous', edition_year: 2025, partner_category: 'Food', featured: false }];
  const changed = setSponsorPlacement(sponsor, placements, { enabled: false });
  expect(changed[0]).toMatchObject({ edition_year: 2025, partner_category: 'Food', featured: false, enabled: false });
  expect(setSponsorPlacement(sponsor, changed, { period: 'current' }).find(record => record.sponsor_id === 1)).toMatchObject({ edition_year: 2026, period: 'current' });
  expect(resolvePartnerCatalog([sponsor], changed)).toEqual([]);
});

it('moves current partners into their real archive year when the brand year advances', () => {
  const sponsor = fixturePartner(1, 'Year partner');
  const placements = setSponsorPlacement(sponsor, [], { period: 'current', enabled: true }, 2026);
  expect(placements[0].edition_year).toBe(2026);
  const archived = rolloverPartnerPlacements(placements, 2026, 2027);
  const catalog = resolvePartnerCatalog([sponsor], archived, 2027);
  expect(catalog[0]).toMatchObject({ period: 'previous', edition_year: 2026 });
  expect(groupPartnerArchives(catalog, 2027)[0].label).toBe('2026');
  expect(resolveHomepagePartners([sponsor], archived, { currentYear: 2027 }).period).toBe('previous');
  expect(rolloverPartnerPlacements(archived, 2027, 2028)).toEqual(archived);
});

it('archives unstamped current records under the outgoing year and preserves hidden and unknown editions', () => {
  const result = rolloverPartnerPlacements([{ id: 'one', period: 'current', enabled: false }, { id: 'old', period: 'previous' }], 2026, 2027);
  expect(result[0]).toMatchObject({ period: 'previous', edition_year: 2026, enabled: false });
  expect(result[1]).not.toHaveProperty('edition_year');
});

it('keeps a frozen archive when a brand returns in a later edition without linking the snapshot to the current record', () => {
  const old = fixturePartner(1, 'Original brand');
  const archived = rolloverPartnerPlacements(setSponsorPlacement(old, [], { period: 'current' }, 2026), 2026, 2027);
  const returning = { ...old, name: 'Updated brand', logo: 'new-logo.png' };
  const published = setSponsorPlacement(returning, archived, { period: 'current' }, 2027);
  const catalog = resolvePartnerCatalog([returning], published, 2027);
  expect(catalog).toHaveLength(2);
  expect(catalog.find(partner => partner.period === 'previous')).toMatchObject({ name: 'Original brand', logo: old.logo, edition_year: 2026 });
  expect(catalog.find(partner => partner.period === 'current')).toMatchObject({ name: 'Updated brand', edition_year: 2027 });
  expect(setSponsorPlacement(returning, published, { period: 'current' }, 2027)).toHaveLength(2);
});

it('supports custom categories independently of sponsorship tiers and normalizes common category names', () => {
  expect(partnerCategory({ category: 'Title Sponsor', partner_category: 'Food & Beverages' })).toMatchObject({ label: 'Food', tone: 'food' });
  expect(partnerCategory({ category: 'Education Partner' })).toMatchObject({ label: 'Study' });
  expect(partnerCategory({ category: 'Title Sponsor' })).toMatchObject({ label: 'Community' });
  const groups = groupPartners([fixturePartner(1, 'One', 'Sustainability'), fixturePartner(2, 'Two', 'Food'), fixturePartner(3, 'Three', 'Sustainability')]);
  expect(groups.map(group => [group.label, group.partners.length])).toEqual([['Food', 1], ['Sustainability', 2]]);
});

it('never invents an archive year from creation timestamps or assigns current partners to history', () => {
  const groups = groupPartnerArchives(sponsorDirectoryFixture, 2026);
  expect(groups.map(group => [group.label, group.partners.length])).toEqual([['2025', 4], ['2024', 2], ['Earlier editions', 1]]);
  expect(groupPartnerArchives([{ ...fixturePartner(1, 'Unknown', 'Food', 'previous'), created_at: '2023-01-01' }], 2026)[0].year).toBeUndefined();
});

it('validates metadata and website protocols while retaining genuine legacy archives', () => {
  const legacy = [{ id: 'old', name: 'Saved partner', logo_url: 'old.svg', enabled: true, edition_year: '2024', partner_category: ' Travel ', website: 'javascript:alert(1)' }];
  expect(readHomepagePartners(legacy)[0]).toMatchObject({ edition_year: 2024, partner_category: 'Travel' });
  expect(resolvePartnerCatalog([], legacy)[0]).toMatchObject({ website: null, edition_year: 2024, partner_category: 'Travel' });
  expect(readHomepagePartners([{ edition_year: 2024.5 }])[0]).not.toHaveProperty('edition_year');
  expect(safeSponsorLink('javascript:alert(1)')).toBeUndefined();
  expect(safeSponsorLink('https://partner.example')).toBe('https://partner.example/');
});
