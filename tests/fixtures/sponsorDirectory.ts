import type { DisplayPartner } from '../../src/utils/homepageContent';

// UI fixtures only. These illustrative brands are never published to the catalog.
export function fixturePartner(id: number, name: string, partnerCategory = 'Travel', period: 'current' | 'previous' = 'current', editionYear?: number): DisplayPartner {
  const colors: Record<string, string> = { Travel: '#a32773', Study: '#2367aa', Food: '#bc4d20', Technology: '#1f7064', Health: '#aa4455', Lifestyle: '#774fa0' };
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90"><rect width="240" height="90" fill="#ffffff"/><text x="120" y="53" text-anchor="middle" fill="${colors[partnerCategory] || '#244b33'}" font-family="Georgia,serif" font-size="21" font-weight="bold">${name.replaceAll('&', '&amp;')}</text></svg>`;
  return { id, name, logo: `data:image/svg+xml,${encodeURIComponent(logo)}`, website: `https://partner-${id}.example`, category: `${partnerCategory} Partner`, partner_category: partnerCategory, description: '', featured: true, order_position: id, created_at: null, updated_at: null, period, ...(editionYear ? { edition_year: editionYear } : {}) };
}

export const sponsorDirectoryFixture: DisplayPartner[] = [
  { ...fixturePartner(1, 'NORTHSTAR', 'Technology'), category: 'Title Sponsor' },
  { ...fixturePartner(2, 'SOLSTICE', 'Lifestyle'), category: 'Associate Title Sponsor' },
  fixturePartner(3, 'Cedar Transit'), fixturePartner(4, 'Route & River'), fixturePartner(5, 'Atlas Journeys'),
  fixturePartner(6, 'Study Circle', 'Study'), fixturePartner(7, 'Open Notebook', 'Study'), fixturePartner(8, 'Campus Press', 'Study'),
  fixturePartner(9, 'The Daily Grind', 'Food'), fixturePartner(10, 'Table & Thyme', 'Food'), fixturePartner(11, 'Citrus Kitchen', 'Food'),
  fixturePartner(12, 'Wellness Studio', 'Health'), fixturePartner(13, 'Thread House', 'Lifestyle'), fixturePartner(14, 'Paper Lantern', 'Media'),
  fixturePartner(15, 'Cedar Transit', 'Travel', 'previous', 2025), fixturePartner(16, 'Open Notebook', 'Study', 'previous', 2025),
  fixturePartner(17, 'The Daily Grind', 'Food', 'previous', 2025), fixturePartner(18, 'Thread House', 'Lifestyle', 'previous', 2025),
  fixturePartner(19, 'Atlas Journeys', 'Travel', 'previous', 2024), fixturePartner(20, 'Campus Press', 'Study', 'previous', 2024),
  fixturePartner(21, 'Table & Thyme', 'Food', 'previous'),
];
