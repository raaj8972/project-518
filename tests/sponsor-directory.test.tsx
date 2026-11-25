// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SponsorDirectory } from '../src/components/Sponsors/SponsorDirectory';
import { sponsorDirectoryFixture } from './fixtures/sponsorDirectory';
import type { SponsorshipPackage } from '../src/types/data';

vi.mock('framer-motion', () => {
  const element = (tag: string) => React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const forwarded = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition', 'whileInView', 'viewport', 'layoutId']) delete forwarded[key];
    return React.createElement(tag, { ...forwarded, ref });
  });
  return { useReducedMotion: () => true, AnimatePresence: ({ children }: { children: React.ReactNode }) => children, motion: { div: element('div'), p: element('p'), span: element('span') } };
});

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function mount(partners = sponsorDirectoryFixture, extra = {}) { await act(async () => root.render(<SponsorDirectory partners={partners} year={2026} settings={null} packages={[]} onRetry={vi.fn()} {...extra} />)); }
async function click(element: Element | null) { expect(element).toBeTruthy(); await act(async () => (element as HTMLButtonElement).click()); }
const findButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent?.trim() === label) || null;
const filter = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Partner categories"] [role="tab"]')].find(tab => tab.textContent?.startsWith(label))!;

it('filters by industry while showing title partners and real category counts', async () => {
  await mount(); expect(filter('All partners').textContent).toContain('(14)');
  expect(host.querySelectorAll('.sponsor-feature-card')).toHaveLength(2);
  await click(filter('Food'));
  expect(host.querySelectorAll('.sponsor-category-row')).toHaveLength(1);
  expect(host.querySelector('.sponsor-category-row')?.textContent).toContain('The Daily Grind');
  expect(host.querySelector('.sponsor-partner-panel')?.textContent).not.toContain('Cedar Transit');
  expect(filter('Food').getAttribute('aria-selected')).toBe('true');
  expect(host.querySelector('.sponsor-results-status')?.textContent).toContain('3 Food partners shown');
});

it('expands a category and the complete list without dropping overflow partners', async () => {
  await mount(); await click(findButton('View all Travel partners'));
  expect(host.querySelectorAll('.sponsor-expanded-grid .sponsor-logo-tile')).toHaveLength(3);
  await click(findButton('Back to categories'));
  await click(findButton('View all partners (14)'));
  expect(host.querySelectorAll('.sponsor-expanded-grid .sponsor-logo-tile')).toHaveLength(14);
});

it('switches archive editions and supports arrow-key navigation for filters', async () => {
  await mount();
  expect(host.querySelector('.sponsor-archive-logos')?.textContent).toContain('Cedar Transit');
  await click(findButton('Next archive edition'));
  expect(host.querySelector('.sponsor-archive-brand')?.textContent).toContain('2024');
  expect(host.querySelectorAll('.sponsor-archive-logos .sponsor-logo-tile')).toHaveLength(2);
  await click([...host.querySelectorAll('[aria-label="Previous partner editions"] button')].find(button => button.textContent === 'Earlier editions')!);
  expect(host.querySelector('.sponsor-archive-brand')?.textContent).toContain('Earlier');
  const all = filter('All partners'); all.focus();
  await act(async () => all.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  expect(filter('Travel').getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(filter('Travel'));
});

it('opens and closes sponsorship details with Escape and restores focus and scrolling', async () => {
  await mount(); const trigger = findButton('Become a Sponsor for Ricorrenza 2026')!; trigger.focus();
  await click(trigger);
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Sponsorship contact details will be announced');
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('98765');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.style.overflow).toBe(''); expect(document.activeElement).toBe(trigger);
});

it('shows honest pending, loading and retry states without assigning previous logos to the current edition', async () => {
  await mount(sponsorDirectoryFixture.filter(partner => partner.period === 'previous'));
  expect(host.textContent).toContain('Great partnerships are on the way.');
  expect(host.querySelector('[aria-label="Partner categories"]')).toBeNull();
  expect(host.querySelector('.sponsor-stat-strip dd')?.textContent).toBe('0');
  await mount([], { loading: true }); expect(host.querySelector('[aria-label="Loading partners"]')).not.toBeNull();
  const retry = vi.fn(); await mount([], { error: 'Offline', onRetry: retry }); await click(findButton('Try again')); expect(retry).toHaveBeenCalledOnce();
});

it('replaces failed logos with readable names and omits unsafe website links', async () => {
  await mount([{ ...sponsorDirectoryFixture[2], website: 'javascript:alert(1)' }]);
  const image = host.querySelector('.sponsor-logo-tile img')!;
  await act(async () => image.dispatchEvent(new Event('error')));
  expect(host.querySelector('.sponsor-logo-initials')?.textContent).toBe('CT');
  expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
});

it('renders all 20 enabled custom tiers in admin order with every benefit and enquiry context', async () => {
  const packages = Array.from({ length: 21 }, (_, index) => ({ id: index + 1, tier: `Custom tier ${index + 1}`, price: `₹${(index + 1) * 1000}+`, benefits: ['On-campus branding', 'Digital promotion', 'Full final benefit'], color: 'from-yellow-400 to-amber-600', icon: 'Crown', enabled: index !== 20, order_position: 21 - index } as SponsorshipPackage));
  const teamContacts = [{ id: 1, name: 'Sponsorship lead', role: 'Head', committee: 'Sponsorship', group: 'sponsorship', phone: { number: '+91 98760 12345', url: 'tel:+919876012345' }, email: 'sponsor@festival.example' }, { id: 2, name: 'PR lead', role: 'PR Head', committee: 'Public Relations', group: 'pr', phone: null, email: 'pr@festival.example' }];
  await mount([], { packages, teamContacts });
  const cards = [...host.querySelectorAll('.sponsor-offer-card')];
  expect(cards).toHaveLength(20);
  expect(cards[0].querySelector('h3')?.textContent).toBe('Custom tier 20');
  expect(cards[19].querySelector('h3')?.textContent).toBe('Custom tier 1');
  expect(cards.every(card => card.querySelectorAll('li').length === 3)).toBe(true);
  await click(findButton('Enquire about Custom tier 20'));
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain('Custom tier 20');
  expect(dialog.textContent).toContain('PR lead');
  expect(dialog.querySelector('[aria-label="Call Sponsorship lead"]')?.getAttribute('href')).toBe('tel:+919876012345');
  expect(decodeURIComponent(dialog.querySelector('[aria-label="Email Sponsorship lead"]')!.getAttribute('href')!)).toContain('Ricorrenza 2026 sponsorship enquiry — Custom tier 20');
});
