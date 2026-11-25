// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BandMember } from '../src/types/data';
import { getEnabledHomeboundMembers, getHomeboundCategory, getHomeboundSocialLinks, safeHomeboundUrl } from '../src/utils/homebound';
import { HomeboundMemberCard } from '../src/components/HomeBound/HomeboundMemberCard';

const member = (overrides: Partial<BandMember> = {}): BandMember => ({
  id: 1, name: 'Published Singer', category: 'Vocals', role: 'Lead vocals', specialty: 'Vocals', description: 'A published band profile.',
  enabled: true, is_featured: false, order_position: 1, image: '/portrait.webp', social_links: null, achievements: null,
  created_at: null, updated_at: null, ...overrides,
});

it('classifies explicit admin categories before considering role or specialty', () => {
  expect(getHomeboundCategory(member({ category: 'Guitar', role: 'Backing vocals' }))).toBe('guitars');
  expect(getHomeboundCategory(member({ category: 'Bass' }))).toBe('guitars');
  expect(getHomeboundCategory(member({ category: 'Keyboard' }))).toBe('keys');
  expect(getHomeboundCategory(member({ category: 'Drums' }))).toBe('drums');
  expect(getHomeboundCategory(member({ category: 'Other' }))).toBe('crew');
  expect(getHomeboundCategory(member({ category: 'Vocalist' }))).toBe('vocals');
  expect(getHomeboundCategory(member({ category: 'Instrumentalist', role: 'Band member', specialty: 'Piano' }))).toBe('keys');
});

it('omits unpublished members and preserves featured and admin ordering without mutating context', () => {
  const rows = [member({ id: 1, order_position: null }), member({ id: 2, order_position: 4 }), member({ id: 3, is_featured: true, order_position: 9 }), member({ id: 4, enabled: false }), member({ id: 5, enabled: null }), member({ id: 6, is_featured: true, order_position: 2 })];
  expect(getEnabledHomeboundMembers(rows).map(row => row.id)).toEqual([6, 3, 2, 1]);
  expect(rows.map(row => row.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(getEnabledHomeboundMembers(null)).toEqual([]);
});

it('accepts HTTP links and protocol-relative links while rejecting executable, credential and relative URLs', () => {
  expect(safeHomeboundUrl('//www.instagram.com/published/')).toBe('https://www.instagram.com/published/');
  expect(safeHomeboundUrl(' https://youtube.com/watch?v=band ')).toBe('https://youtube.com/watch?v=band');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/secret', '/account', 'https://name:password@example.com', null, {}]) expect(safeHomeboundUrl(value)).toBeNull();
  expect(getHomeboundSocialLinks(member({ social_links: { instagram: '@published', youtube: 'javascript:alert(1)' } }))).toEqual({ instagram: 'https://www.instagram.com/published/', youtube: null, spotify: null });
  expect(getHomeboundSocialLinks(member({ social_links: ['not an object'] }))).toEqual({ instagram: null, youtube: null, spotify: null });
});

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('opens the actual member profile and keeps Instagram a separate accessible link', async () => {
  const selected = vi.fn();
  const row = member({ social_links: { instagram: 'https://www.instagram.com/published/' } });
  await act(async () => root.render(<HomeboundMemberCard member={row} index={0} onSelect={selected} />));
  const button = host.querySelector<HTMLButtonElement>('button')!;
  expect(button.getAttribute('aria-label')).toBe('View Published Singer profile');
  expect(button.querySelector('a')).toBeNull();
  expect(host.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  await act(async () => button.click());
  expect(selected).toHaveBeenCalledWith(row);
});

it('replaces a failed portrait with initials and omits missing or unsafe social links', async () => {
  await act(async () => root.render(<HomeboundMemberCard member={member({ social_links: { instagram: 'javascript:alert(1)' } })} index={1} onSelect={vi.fn()} />));
  await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')));
  expect(host.querySelector('.hb-member__fallback')?.textContent).toBe('PS');
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelector('a')).toBeNull();
});
