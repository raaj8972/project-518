// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FamilyTeams } from '../src/components/RicoFamily/FamilyTeams';
import { FamilyMembersCarousel } from '../src/components/RicoFamily/FamilyMembersCarousel';
import { instagramProfile } from '../src/utils/familyPeople';

let root: Root, container: HTMLDivElement;
let reduced = false;
const committees = [{ id: 1, name: 'Tech Team', description: 'Website · App · Systems', enabled: true, order_position: 1 }, { id: 2, name: 'Cultural Team', description: 'Stage · Events', enabled: true, order_position: 2 }] as any;
const person = (id: number, extra = {}) => ({ id, name: `Person ${id}`, image: `/person-${id}.jpg`, role: 'Private role', phone: 'Private phone', enabled: true, is_head: false, is_council: false, committee_id: 1, order_position: id, social_links: { instagram: `@person_${id}`, facebook: 'https://facebook.com/private' }, ...extra }) as any;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('shows three heads together, member carousel and council separately without private details', async () => {
  await act(async () => root.render(<FamilyTeams committees={committees} members={[
    person(1, { is_head: true }), person(2, { is_head: true }), person(3, { is_head: true }), person(4), person(5),
    person(6, { is_council: true, is_head: true }), person(7, { is_council: true }), person(8, { enabled: false }),
  ]} />));
  expect(container.querySelectorAll('[aria-label="Tech Team heads"] .family-person')).toHaveLength(3);
  expect(container.querySelectorAll('[aria-label="Tech Team members"] .family-carousel-slide')).toHaveLength(2);
  expect(container.querySelector('[aria-label="Council profiles"]')?.textContent).toContain('Person 6');
  expect(container.querySelector('[aria-label="Council profiles"]')?.textContent).toContain('Person 7');
  expect(container.textContent).not.toContain('Person 8');
  expect(container.textContent).not.toContain('Private');
  expect([...container.querySelectorAll('a')].every(link => link.href.startsWith('https://www.instagram.com/'))).toBe(true);
  expect(container.querySelector('[aria-label="Tech Team heads"]')?.textContent).not.toContain('Person 6');
  const toggle = [...container.querySelectorAll<HTMLButtonElement>('.family-committee-toggle')][1];
  await act(async () => toggle.click()); expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('[aria-label="Tech Team heads"]')).toBeNull();
});
it('advances automatically, wraps and pauses after manual navigation', async () => {
  vi.useFakeTimers();
  await act(async () => root.render(<FamilyMembersCarousel members={[person(1), person(2), person(3)]} label="Test members" />));
  const track = container.querySelector('.family-carousel-track') as HTMLDivElement;
  Object.defineProperties(track, { scrollWidth: { value: 700 }, clientWidth: { value: 200 } });
  track.scrollTo = vi.fn(({ left }: any) => { track.scrollLeft = left; });
  await act(async () => vi.advanceTimersByTime(3200)); expect(track.scrollLeft).toBe(172);
  const next = container.querySelector<HTMLButtonElement>('[aria-label="Next Test members"]')!;
  await act(async () => next.click()); expect(track.scrollLeft).toBe(344);
  await act(async () => vi.advanceTimersByTime(6400)); expect(track.scrollLeft).toBe(344);
  await act(async () => next.click()); expect(track.scrollLeft).toBe(500);
  await act(async () => next.click()); expect(track.scrollLeft).toBe(0);
});
it('disables automatic movement for reduced motion and clears timers on unmount', async () => {
  reduced = true; vi.useFakeTimers();
  await act(async () => root.render(<FamilyMembersCarousel members={[person(1), person(2)]} label="Reduced members" />));
  expect(container.querySelector('[aria-label="Pause Reduced members"]')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  await act(async () => root.unmount()); root = createRoot(container); reduced = false;
  await act(async () => root.render(<FamilyMembersCarousel members={[person(1), person(2)]} label="Active members" />));
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => root.unmount()); root = createRoot(container); expect(vi.getTimerCount()).toBe(0);
});
it('keeps unassigned legacy people visible and hides disabled committees', async () => {
  await act(async () => root.render(<FamilyTeams committees={[{ ...committees[0], enabled: false }]} members={[person(1, { committee_id: null })]} />));
  expect(container.querySelector('.family-unassigned')?.textContent).toContain('Person 1'); expect(container.querySelector('.family-committee')).toBeNull();
});
it('normalizes Instagram handles and rejects unrelated or executable links', () => {
  expect(instagramProfile('@raaj.dev')?.url).toBe('https://www.instagram.com/raaj.dev/');
  expect(instagramProfile('https://instagram.com/raaj.dev/?igsh=123')?.handle).toBe('@raaj.dev');
  for (const value of ['javascript:alert(1)', 'https://example.com/profile', 'https://instagram.com/p/123', '@bad handle']) expect(instagramProfile(value)).toBeNull();
});

it('keeps council visible without fabricated profiles, and respects department order and visibility', async () => {
  await act(async () => root.render(<FamilyTeams committees={[{...committees[1],order_position:1},{...committees[0],order_position:2},{...committees[0],id:3,name:'Hidden team',enabled:false}]} members={[]} />));
  expect(container.querySelector('#family-council-title')?.textContent).toBe('The Council');
  expect(container.querySelector('.family-council-empty')?.textContent).toContain('will be announced');
  expect(container.querySelectorAll('.family-council-roster .family-person')).toHaveLength(0);
  expect([...container.querySelectorAll('.family-committee-title > span')].map(node => node.textContent)).toEqual(['Cultural Team','Tech Team']);
  expect(container.querySelector('.family-committee-toggle')?.getAttribute('aria-expanded')).toBe('true');
});
