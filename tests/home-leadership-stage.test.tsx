// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LeadershipStage from '../src/components/Home/LeadershipStage';
import LeadershipSection from '../src/components/Home/LeadershipSection';
import LeadershipEyes from '../src/components/Home/LeadershipEyes';

const people = [1, 2, 3, 4, 5, 6].map(id => ({ id, name: `Leader ${id}`, image: `/portrait-${id}.jpg`, enabled: true, order_position: id, title: 'Department Head' }));
let root: Root, host: HTMLDivElement;
let reduced = false;
const select = vi.fn();
const callbacks = {
  setFacultyPaused: vi.fn(), setCommitteePaused: vi.fn(), setSelectedType: vi.fn(),
  setSelectedIndex: vi.fn(), setSelectedPerson: vi.fn(), setFacultyModalOpen: vi.fn(),
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  reduced = false; vi.clearAllMocks();
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const active = () => host.querySelector('.leadership-stage__slide[aria-current="true"]')?.textContent;
const click = (label: string) => act(async () => button(label).click());
const mount = (extra = {}) => act(async () => root.render(<LeadershipStage items={people} label="Faculty Heads" intervalMs={3000} renderItem={person => <span>{person.name}</span>} onSelect={select} {...extra} />));
const tick = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

it('rotates indefinitely in both directions and turns the floor with the foreground profile', async () => {
  await mount(); expect(active()).toBe('Leader 1');
  await click('Previous Faculty Heads'); expect(active()).toBe('Leader 6');
  expect((host.querySelector('.leadership-stage') as HTMLElement).style.getPropertyValue('--stage-turn')).toBe('32deg');
  await click('Next Faculty Heads'); expect(active()).toBe('Leader 1');
  await click('Show profile 4: Leader 4'); expect(active()).toBe('Leader 4');
  expect(host.querySelectorAll('.leadership-stage__slide')).toHaveLength(5);
  await click('View profile of Leader 4'); expect(select).toHaveBeenCalledWith(people[3], 3);
});

it('autoplays, pauses explicitly and resumes after pointer hover', async () => {
  vi.useFakeTimers(); await mount(); await tick(3000); expect(active()).toBe('Leader 2');
  await click('Pause stage rotation'); await tick(9000); expect(active()).toBe('Leader 2');
  await click('Play stage rotation'); await tick(3000); expect(active()).toBe('Leader 3');
  const stage = host.querySelector('.leadership-stage')!;
  await act(async () => stage.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
  await tick(6000); expect(active()).toBe('Leader 3');
  await act(async () => stage.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })));
  await tick(3000); expect(active()).toBe('Leader 4');
});

it('supports keyboard navigation and disables autoplay for reduced motion', async () => {
  vi.useFakeTimers(); reduced = true; await mount(); await tick(12000); expect(active()).toBe('Leader 1');
  expect(button('Pause stage rotation')).toBeNull();
  await act(async () => host.querySelector('.leadership-stage')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
  expect(active()).toBe('Leader 6');
});

it('swipes the stage without opening a profile and leaves vertical gestures alone', async () => {
  await mount(); const stage = host.querySelector<HTMLDivElement>('.leadership-stage')!;
  stage.setPointerCapture = vi.fn(); stage.hasPointerCapture = () => true; stage.releasePointerCapture = vi.fn();
  const pointer = (type: string, x: number, y: number) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { clientX: x, clientY: y, isPrimary: true, button: 0, pointerId: 1, pointerType: 'touch' });
    return act(async () => stage.dispatchEvent(event));
  };
  await pointer('pointerdown', 280, 100); await pointer('pointermove', 100, 104); await pointer('pointerup', 100, 104);
  await act(async () => stage.click()); expect(active()).toBe('Leader 2'); expect(select).not.toHaveBeenCalled();
  expect(stage.style.getPropertyValue('--stage-drag')).toBe('');
  await pointer('pointerdown', 100, 100); await pointer('pointermove', 104, 280); await pointer('pointerup', 104, 280);
  expect(active()).toBe('Leader 2');
});

it('keeps single-profile and empty data usable without navigation controls', async () => {
  await mount({ items: people.slice(0, 1) }); expect(active()).toBe('Leader 1'); expect(button('Next Faculty Heads')).toBeNull();
  await click('View profile of Leader 1'); expect(select).toHaveBeenCalledWith(people[0], 0);
  await mount({ items: [] }); expect(host.textContent).toBe('');
});

const section = (settings = { show_faculty_heads: true, show_committee_heads: true }) => act(async () => root.render(<MemoryRouter><LeadershipSection homepageSettings={settings}
  coreCommittees={[]} enabledFacultyHeads={people} sortedFacultyHeads={people} sortedCommitteeHeads={[{ ...people[0], id: 20, name: 'Council Lead', role: 'Council President', is_council: true }]}
  facultyPaused={false} committeePaused={false} {...callbacks} /></MemoryRouter>));

it('switches homepage leadership groups and opens the correct existing profile modal', async () => {
  await section();
  const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  await act(async () => tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  expect(tabs[1].getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(tabs[1]);
  await click('View profile of Council Lead');
  expect(callbacks.setSelectedType).toHaveBeenCalledWith('committee'); expect(callbacks.setSelectedIndex).toHaveBeenCalledWith(0);
  expect(callbacks.setSelectedPerson).toHaveBeenCalledWith(expect.objectContaining({ name: 'Council Lead' }));
  expect(callbacks.setFacultyModalOpen).toHaveBeenCalledWith(true); expect(callbacks.setCommitteePaused).toHaveBeenCalledWith(true);
  expect(host.querySelector('a[href="/rico-family"]')).not.toBeNull();
});

it('uses the available group when faculty is disabled and hides the section when both are disabled', async () => {
  await section({ show_faculty_heads: false, show_committee_heads: true });
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1); expect(active()).toContain('Council Lead');
  await section({ show_faculty_heads: false, show_committee_heads: false }); expect(host.textContent).toBe('');
});

it('blinks briefly at natural intervals and suspends the effect in a hidden tab', async () => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(.5);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  await act(async () => root.render(<LeadershipEyes />));
  const eyes = host.querySelector<SVGSVGElement>('.home-leadership__eyes')!;
  expect(eyes.dataset.active).toBe('true'); expect(eyes.dataset.blinking).toBe('false');
  await tick(3600); expect(eyes.dataset.blinking).toBe('true');
  await tick(220); expect(eyes.dataset.blinking).toBe('false');
  await tick(6800); expect(eyes.dataset.blinking).toBe('true');
  hidden.mockReturnValue(true);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(eyes.dataset.active).toBe('false'); expect(eyes.dataset.blinking).toBe('false');
  expect(vi.getTimerCount()).toBe(0);
  hidden.mockReturnValue(false);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  await tick(3600); expect(eyes.dataset.blinking).toBe('true');
});

it('keeps the original open eyes still for reduced motion', async () => {
  vi.useFakeTimers(); reduced = true;
  await act(async () => root.render(<LeadershipEyes />));
  await tick(30000);
  const eyes = host.querySelector<SVGSVGElement>('.home-leadership__eyes')!;
  expect(eyes.dataset.active).toBe('false'); expect(eyes.dataset.blinking).toBe('false');
  expect(vi.getTimerCount()).toBe(0);
});
