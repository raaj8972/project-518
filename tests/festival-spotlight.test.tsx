// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TopLegendsSection from '../src/components/Home/TopLegendsSection';
import FeaturedEventsSection from '../src/components/Home/FeaturedEventsSection';

const mocks = vi.hoisted(() => ({ stars: [] as any[], loading: false, error: null as string | null, refetch: vi.fn() }));
vi.mock('../src/hooks/useTopStars', () => ({ useTopStars: () => mocks }));
let root: Root; let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  mocks.stars = [{ id: 'student-1', full_name: 'Ananya Sen', xp: 350, likes_count: 7, rank: 1, tier: 'gold', avatar_url: null, batch: '2024' }];
  mocks.error = null; mocks.loading = false; mocks.refetch.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it('opens the real ranking values in a profile dialog and restores focus after Escape', async () => {
  await act(async () => root.render(<TopLegendsSection />));
  const card = host.querySelector('button[aria-label="View Ananya Sen, rank 1"]') as HTMLButtonElement;
  expect(card.textContent).toContain('350'); expect(card.textContent).toContain('7');
  expect(host.querySelector('.rico-star-monogram')?.textContent).toBe('AS');
  card.focus(); await act(async () => card.click());
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain('Ananya Sen');
  expect(dialog.querySelector('.rico-star-modal-join')?.getAttribute('href')).toBe('/student/login');
  expect(dialog.contains(document.activeElement)).toBe(true);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.activeElement).toBe(card);
});

it('keeps error and empty ranking states honest and offers retry', async () => {
  mocks.error = 'Live rankings could not load.';
  await act(async () => root.render(<TopLegendsSection />));
  expect(host.querySelector('.rico-star-panel')).toBeNull();
  await act(async () => (host.querySelector('.festival-ranking-empty button') as HTMLButtonElement).click());
  expect(mocks.refetch).toHaveBeenCalledTimes(1);
  mocks.error = null; mocks.stars = [];
  await act(async () => root.render(<TopLegendsSection />));
  expect(host.textContent).toContain('Your moment is coming');
  expect(host.querySelector('.rico-star-panel')).toBeNull();
});

it('uses the published event content and a named More link', async () => {
  await act(async () => root.render(<FeaturedEventsSection hasManyEvents featuredEvents={[{ id: 1, title: 'Campus Band Showdown', description: 'Live bands on the main stage.', category: 'Music', image: '/event.jpg', featured: true }]} />));
  expect(host.querySelector('article h3')?.textContent).toBe('Campus Band Showdown');
  expect(host.querySelector('.event-spotlight-category')?.textContent).toBe('Music');
  expect(host.querySelector('a[aria-label="More about Campus Band Showdown"]')?.getAttribute('href')).toBe('/events');
  expect(host.textContent).toContain('View all events');
});
