// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FestivalEnvironment } from '../src/components/ui/festival/FestivalEnvironment';
import { publishIntroPhase, rememberIntroFallback } from '../src/components/cinematic/introCapability';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  world: { ready: Promise.resolve(), resize: vi.fn(), setPaused: vi.fn(), setVisible: vi.fn(), react: vi.fn(), release: vi.fn(), rotateBy: vi.fn(), resetRotation: vi.fn(() => 0), dispose: vi.fn() },
}));
vi.mock('../src/components/ui/festival/environmentRenderer', () => ({ createFestivalEnvironment: mocks.create }));
let root: Root; let host: HTMLDivElement; let visibility: ((entries: Array<{ isIntersecting: boolean; intersectionRatio?: number }>) => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear(); delete document.documentElement.dataset.staticExperience; delete document.documentElement.dataset.cinematicIntro;
  vi.clearAllMocks(); localStorage.clear(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof visibility) { visibility = callback; } observe() {} disconnect() {} });
  mocks.create.mockReturnValue(mocks.world); mocks.world.rotateBy.mockReturnValue(75);
  mocks.world.ready = Promise.resolve();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); delete document.documentElement.dataset.staticExperience; delete document.documentElement.dataset.cinematicIntro; });
async function mount() {
  await act(async () => root.render(<section><FestivalEnvironment logoUrl="/festival-logo.png" /></section>));
  await act(async () => { host.querySelector('img')!.dispatchEvent(new Event('load')); });
  await act(async () => { vi.advanceTimersByTime(120); });
}
function pointer(target: Element, type: string, clientX: number, clientY = 200) {
  const event = new MouseEvent(type, { clientX, clientY, bubbles: true, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 }); target.dispatchEvent(event);
}
it('shows artwork and releases loading before renderer setup starts', async () => {
  mocks.world.ready = new Promise<void>(() => {});
  const settled = vi.fn();
  await act(async () => root.render(<section><FestivalEnvironment onSettled={settled} /></section>));
  expect(host.querySelector('.festival-environment-fallback')).not.toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
  await act(async () => { host.querySelector('img')!.dispatchEvent(new Event('load')); });
  expect(settled).toHaveBeenLastCalledWith(true);
  expect(mocks.create).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTime(120));
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(host.querySelector('.festival-environment-fallback')).not.toBeNull();
});
it('loads the scene after its clean plate, maps the real logo and reacts to pointer movement/touch bursts', async () => {
  await mount();
  expect(mocks.create).toHaveBeenCalledWith(expect.any(HTMLDivElement), expect.any(Function), expect.objectContaining({ logoUrl: '/festival-logo.png', islandControl: expect.any(HTMLDivElement) }));
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('ready');
  await act(async () => { pointer(host.querySelector('section')!, 'pointermove', 100); pointer(host.querySelector('section')!, 'pointerdown', 100); });
  expect(mocks.world.react).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), false);
  expect(mocks.world.react).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), true);
  visibility?.([{ isIntersecting: false }]); expect(mocks.world.setVisible).toHaveBeenLastCalledWith(false);
  visibility?.([{ isIntersecting: true, intersectionRatio: .01 }]); expect(mocks.world.setVisible).toHaveBeenLastCalledWith(false);
  visibility?.([{ isIntersecting: true, intersectionRatio: .5 }]); expect(mocks.world.setVisible).toHaveBeenLastCalledWith(true);
});
it('throttles pointer movement without forcing layout and keeps taps immediate', async () => {
  await mount(); const section = host.querySelector('section')!;
  const measure = vi.spyOn(section, 'getBoundingClientRect');
  let now = 100; const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
  mocks.world.react.mockClear();
  await act(async () => {
    for (let i = 0; i < 10; i++) pointer(section, 'pointermove', 100 + i);
    pointer(section, 'pointerdown', 120);
    now = 141; pointer(section, 'pointermove', 130);
  });
  expect(mocks.world.react).toHaveBeenCalledTimes(3);
  expect(mocks.world.react.mock.calls[1][2]).toBe(true);
  expect(measure).not.toHaveBeenCalled(); measure.mockRestore(); clock.mockRestore();
});
it('reuses both original foreground towers for mobile instead of leaving the flags over empty sky', async () => {
  await mount();
  const towers = host.querySelectorAll('.festival-mobile-architecture');
  expect(towers.length).toBe(2);
  expect(towers[0].classList.contains('festival-mobile-architecture-left')).toBe(true);
  expect(towers[1].classList.contains('festival-mobile-architecture-right')).toBe(true);
  towers.forEach(tower => {
    expect(tower.querySelector('img')?.getAttribute('src')).toBe('/images/ricorrenza-emerald-environment.webp');
    expect(tower.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(tower.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
it('rotates the island by dragging and by keyboard without taking over vertical page scrolling', async () => {
  await mount(); const slider = host.querySelector('[role="slider"]')!;
  await act(async () => { pointer(slider, 'pointerdown', 100); pointer(slider, 'pointermove', 160); pointer(slider, 'pointerup', 160); });
  expect(mocks.world.rotateBy).toHaveBeenCalledWith(.72); expect(slider.getAttribute('aria-valuenow')).toBe('75');
  await act(async () => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  expect(mocks.world.rotateBy).toHaveBeenLastCalledWith(Math.PI / 12);
  await act(async () => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
  expect(mocks.world.resetRotation).toHaveBeenCalled(); expect(slider.getAttribute('aria-valuenow')).toBe('0');
});
it('respects reduced motion without displaying a scene toolbar or drag instructions', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  await mount();
  expect(mocks.world.setPaused).toHaveBeenLastCalledWith(true);
  expect(host.querySelector('button')).toBeNull();
  expect(host.textContent).not.toContain('Drag to rotate');
  const slider = host.querySelector('[role="slider"]')!;
  expect(slider.hasAttribute('title')).toBe(false);
  await act(async () => { pointer(slider, 'pointerdown', 100); pointer(slider, 'pointermove', 200); });
  expect(mocks.world.rotateBy).not.toHaveBeenCalled();
});
it('disposes the renderer and pointer listeners on route unmount', async () => {
  await mount(); const section = host.querySelector('section')!;
  await act(async () => root.render(null)); expect(mocks.world.dispose).toHaveBeenCalledTimes(1);
  mocks.world.react.mockClear(); pointer(section, 'pointerdown', 100); expect(mocks.world.react).not.toHaveBeenCalled();
});
it('retains the static artwork fallback when WebGL is unavailable', async () => {
  mocks.create.mockImplementationOnce((_host, unavailable) => { unavailable(); return null; });
  await mount(); expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('fallback');
  expect(host.querySelector('button')).toBeNull(); expect(host.querySelector('[role="slider"]')?.getAttribute('aria-disabled')).toBe('true');
  expect(host.querySelector('.festival-environment-fallback')?.getAttribute('src')).toBe('/images/ricorrenza-emerald-city.webp');
});

it('opens on the visible image while the island and flags prepare, including reduced motion', async () => {
  let finish!: () => void;
  mocks.world.ready = new Promise<void>(resolve => { finish = resolve; });
  const settled = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  await act(async () => root.render(<section><FestivalEnvironment onSettled={settled} /></section>));
  await act(async () => { host.querySelector('img')!.dispatchEvent(new Event('load')); });
  await act(async () => { vi.advanceTimersByTime(120); });
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('loading');
  expect(host.querySelector('.festival-environment-fallback')).not.toBeNull();
  expect(settled).toHaveBeenLastCalledWith(true);
  expect(mocks.world.setPaused).toHaveBeenLastCalledWith(true);
  await act(async () => finish());
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('ready');
  expect(settled).toHaveBeenLastCalledWith(true);
  // A React update must not reset the host to loading after its first frame.
  await act(async () => root.render(<section><FestivalEnvironment onSettled={value => settled(value)} /></section>));
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('ready');
});

it('releases the opening to a stable fallback if the scene stalls and ignores late readiness', async () => {
  let finish!: () => void;
  mocks.world.ready = new Promise<void>(resolve => { finish = resolve; });
  const settled = vi.fn();
  await act(async () => root.render(<section><FestivalEnvironment onSettled={settled} /></section>));
  await act(async () => { host.querySelector('img')!.dispatchEvent(new Event('load')); });
  await act(async () => { vi.advanceTimersByTime(120); });
  vi.useFakeTimers();
  // Restart the loading deadline with fake timers by remounting.
  await act(async () => root.render(null));
  await act(async () => root.render(<section><FestivalEnvironment onSettled={settled} /></section>));
  await act(async () => { host.querySelector('img')!.dispatchEvent(new Event('load')); });
  await act(async () => vi.advanceTimersByTime(10000));
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('fallback');
  expect(settled).toHaveBeenLastCalledWith(true);
  await act(async () => finish());
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('fallback');
  vi.useRealTimers();
});

it('defers the homepage renderer until the cinematic handoff instead of loading two GPU scenes together', async () => {
  publishIntroPhase('active'); await mount(); expect(mocks.create).not.toHaveBeenCalled();
  await act(async () => { publishIntroPhase('handoff'); });
  await act(async () => { vi.advanceTimersByTime(120); });
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('ready');
});

it('uses the existing static homepage art immediately on limited hardware', async () => {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2);
  await mount(); expect(mocks.create).not.toHaveBeenCalled();
  expect(host.querySelector('.festival-environment-fallback')).not.toBeNull();
});

it('releases an already-mounted homepage renderer after a runtime performance fallback', async () => {
  await mount(); await act(async () => rememberIntroFallback('slow-renderer'));
  expect(mocks.world.dispose).toHaveBeenCalledOnce();
  expect(host.querySelector('[data-festival-environment]')?.getAttribute('data-state')).toBe('fallback');
  expect(host.querySelector('[role="slider"]')?.getAttribute('aria-disabled')).toBe('true');
});
