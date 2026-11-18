// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AutoCarousel from '../src/components/AutoCarousel';

let root: Root;
let host: HTMLDivElement;
let viewportWidth: number;
let contentWidth: number;
let resized: (() => void) | undefined;
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  viewportWidth = 0; contentWidth = 900;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => viewportWidth);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => contentWidth);
  scrollTo = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); resized = undefined;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  vi.useRealTimers();
});

const mount = async () => {
  await act(async () => { root.render(<AutoCarousel paused><div>First</div><div>Second</div><div>Third</div></AutoCarousel>); });
  track().scrollTo = scrollTo;
};
const dots = () => host.querySelectorAll('button[aria-label^="Go to slide"]');
const track = () => host.querySelector('.overflow-x-auto') as HTMLDivElement;

it('mounts a zero-width overflowing carousel and recovers its dots after layout becomes visible', async () => {
  await mount();
  expect(host.textContent).toContain('Third'); expect(dots()).toHaveLength(0);
  viewportWidth = 300;
  await act(async () => resized?.());
  expect(dots()).toHaveLength(3);
  await act(async () => (host.querySelector('[aria-label="Next"]') as HTMLButtonElement).click());
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
});

it('keeps resize and scroll state finite when a visible carousel temporarily collapses', async () => {
  viewportWidth = 300; await mount(); track().scrollLeft = 600;
  await act(async () => track().dispatchEvent(new Event('scroll')));
  expect(dots()[2].classList.contains('scale-110')).toBe(true);
  viewportWidth = 0;
  await act(async () => { resized?.(); track().dispatchEvent(new Event('scroll')); });
  expect(dots()).toHaveLength(0);
  await act(async () => (host.querySelector('[aria-label="Next"]') as HTMLButtonElement).click());
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  viewportWidth = 450;
  await act(async () => resized?.());
  expect(dots()).toHaveLength(2);
  expect(dots()[1].classList.contains('scale-110')).toBe(true);
});

it('keeps navigation targets finite while both content and viewport have zero width', async () => {
  contentWidth = 0; await mount();
  await act(async () => { track().dispatchEvent(new Event('scroll')); (host.querySelector('[aria-label="Next"]') as HTMLButtonElement).click(); });
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  expect(dots()).toHaveLength(0);
});

it('advances by a card on mobile and clamps the final card to the end of the track', async () => {
  viewportWidth = 360; contentWidth = 980;
  await act(async () => root.render(<AutoCarousel paused itemNavigation ariaLabel="Featured events"><div>First</div><div>Second</div><div>Third</div></AutoCarousel>));
  track().scrollTo = scrollTo;
  Array.from(track().children).forEach((child, index) => Object.defineProperty(child, 'offsetLeft', { configurable: true, value: 20 + index * 320 }));
  await act(async () => resized?.());
  expect(dots()).toHaveLength(3);
  await act(async () => (host.querySelector('[aria-label="Next"]') as HTMLButtonElement).click());
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' });
  await act(async () => (dots()[2] as HTMLButtonElement).click());
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 620, behavior: 'smooth' });
  track().scrollLeft = 620;
  await act(async () => track().dispatchEvent(new Event('scroll')));
  expect(dots()[2].getAttribute('aria-current')).toBe('true');
  expect((host.querySelector('[aria-label="Next"]') as HTMLButtonElement).disabled).toBe(true);
});

it('leaves space key activation on a card button to the button', async () => {
  await act(async () => root.render(<AutoCarousel showPause><button type="button">View student profile</button></AutoCarousel>));
  const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  await act(async () => host.querySelector('button')!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(false);
  expect(host.querySelector('[aria-label="Pause carousel"]')).not.toBeNull();
});

it('uses cached card positions during scrolling and refreshes them after layout changes', async () => {
  viewportWidth = 360; contentWidth = 980;
  await act(async () => root.render(<AutoCarousel paused itemNavigation><div>First</div><div>Second</div><div>Third</div></AutoCarousel>));
  const readOffset = vi.fn();
  Array.from(track().children).forEach((child, index) => Object.defineProperty(child, 'offsetLeft', { configurable: true, get: () => { readOffset(); return 20 + index * 320; } }));
  await act(async () => resized?.());
  expect(readOffset).toHaveBeenCalled(); readOffset.mockClear();
  await act(async () => {
    for (const left of [100, 200, 320]) { track().scrollLeft = left; track().dispatchEvent(new Event('scroll')); }
  });
  expect(readOffset).not.toHaveBeenCalled();
  expect(dots()[1].getAttribute('aria-current')).toBe('true');
  await act(async () => resized?.());
  expect(readOffset).toHaveBeenCalled();
});

it('removes autoplay timers while paused, offscreen or in a hidden tab and resumes when active', async () => {
  vi.useFakeTimers(); viewportWidth = 300;
  let hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof intersect) { intersect = callback; } observe() {} disconnect() {} });
  const render = (paused = false) => act(async () => root.render(<AutoCarousel paused={paused}><div>First</div><div>Second</div><div>Third</div></AutoCarousel>));
  await render(); track().scrollTo = scrollTo;
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => vi.advanceTimersByTime(4000));
  expect(scrollTo).toHaveBeenCalledTimes(1);
  await act(async () => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  expect(vi.getTimerCount()).toBe(1);
  await act(async () => intersect([{ isIntersecting: false }]));
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => intersect([{ isIntersecting: true }]));
  expect(vi.getTimerCount()).toBe(1);
  await render(true);
  expect(vi.getTimerCount()).toBe(0);
});
