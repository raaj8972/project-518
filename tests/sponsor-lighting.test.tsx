// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LogoLoop from '../src/components/LogoLoop';
import { createPartnerLighting, lightAngle, selectLightTarget } from '../src/components/Sponsors/partnerLighting';

const target = (id: number, x: number) => ({ id, x, y: 240, width: 300 });

it('holds a passing sponsor instead of switching whenever another becomes closer', () => {
  const passing = target(1, 120);
  expect(selectLightTarget([passing, target(2, 260)], 195, 390, 1, 1, new Set())?.id).toBe(1);
});

it('hands off when most of a mobile logo leaves the screen and reacquires after a loop wrap', () => {
  expect(selectLightTarget([target(1, 0), target(2, 330)], 195, 390, 1, 1, new Set())?.id).toBe(2);
  expect(selectLightTarget([target(1, 150), target(2, 480)], 195, 390, 1, 2, new Set())?.id).toBe(1);
});

it('aims through the sponsor center from the same fixed origin in either direction', () => {
  for (const x of [70, 195, 320]) {
    const angle = lightAngle(195, 30, x, 240);
    expect(195 - Math.tan(angle * Math.PI / 180) * 210).toBeCloseTo(x);
  }
  expect(selectLightTarget([target(1, 150), target(2, 450)], 195, 900, 3, null, new Set([1]))?.id).toBe(2);
});

let root: Root;
let host: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let observer: IntersectionObserverCallback;
let hidden: boolean;
let viewportWidth: number;
let resized: (() => void)[];
let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

const rect = (left: number, top: number, width: number, height: number) => ({ x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() {} });

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  frames = new Map(); nextId = 0; hidden = false;
  viewportWidth = 390; resized = [];
  preference = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized.push(callback); } observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { observer = callback; } observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextId; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => viewportWidth);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.classList.contains('logoloop__list')) return rect(0, 0, 330, 450);
    if (this.classList.contains('logoloop__card')) return rect(0, 130, 300, 246);
    if (this.hasAttribute('data-partner-light')) return rect(164, 10, 62, 84);
    return rect(0, 0, 390, 450);
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const mount = () => act(async () => root.render(<LogoLoop logos={[{ src: '/sponsor.png', alt: 'Partner', title: 'Partner name' }]} glow spotlight showTitles speed={24} />));

it('renders fixed lights outside the rail, visible captions, and a single shared animation loop', async () => {
  await mount();
  const rail = host.querySelector('.logoloop__track')!;
  expect(rail.querySelector('[data-partner-light]')).toBeNull();
  expect(host.querySelectorAll('[data-partner-light]')).toHaveLength(5);
  expect(host.querySelector('.logoloop__title')?.textContent).toBe('Partner name');
  expect(frames.size).toBe(1);
  await act(async () => observer([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(frames.size).toBe(0);
  await act(async () => observer([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(frames.size).toBe(1);
  hidden = true;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames.size).toBe(0);
});

it('keeps the rail and lights static for reduced motion and cancels frames on unmount', async () => {
  preference.matches = true;
  await mount();
  expect(frames.size).toBe(0);
  expect(host.querySelector<HTMLElement>('.logoloop')?.dataset.running).toBe('false');
  preference.matches = false;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames.size).toBe(1);
  await act(async () => root.render(null));
  expect(frames.size).toBe(0);
});

it('updates tracking from rail offsets without measuring layout every frame', async () => {
  await mount();
  const container = host.querySelector<HTMLElement>('.logoloop')!;
  const rail = host.querySelector<HTMLElement>('.logoloop__track')!;
  const lighting = createPartnerLighting(container, rail);
  const measurements = vi.mocked(HTMLElement.prototype.getBoundingClientRect).mock.calls.length;
  lighting.update(0, 0);
  const firstAngle = container.querySelector<HTMLElement>('[data-partner-light]')!.dataset.angle;
  lighting.update(45, .05);
  expect(container.querySelector<HTMLElement>('[data-partner-light]')!.dataset.angle).not.toBe(firstAngle);
  expect(vi.mocked(HTMLElement.prototype.getBoundingClientRect).mock.calls.length).toBe(measurements);
  lighting.dispose();
});

it('keeps exact rail easing without reading width during frames and updates the speed factor on resize', async () => {
  await mount();
  const widthRead = vi.mocked(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')!.get!);
  widthRead.mockClear();
  const rail = host.querySelector<HTMLElement>('.logoloop__track')!;
  let velocity = 0, offset = 0, last = 1000;
  const step = (timestamp: number, factor: number) => {
    const delta = Math.min(.05, Math.max(0, timestamp - last) / 1000); last = timestamp;
    velocity += (24 * factor - velocity) * (1 - Math.exp(-delta / .25));
    offset = ((offset + velocity * delta) % 330 + 330) % 330;
    const [id, callback] = [...frames][0]; frames.delete(id); callback(timestamp);
    expect(Number(rail.style.transform.match(/translate3d\(([-\d.]+)px/)![1])).toBeCloseTo(-offset, 10);
  };
  for (let frame = 0; frame < 120; frame++) step(1000 + frame * 1000 / 60, .9);
  expect(widthRead).not.toHaveBeenCalled();
  viewportWidth = 800;
  await act(async () => resized.forEach(callback => callback()));
  expect(widthRead).toHaveBeenCalled(); widthRead.mockClear();
  for (let frame = 120; frame < 180; frame++) step(1000 + frame * 1000 / 60, 1);
  expect(widthRead).not.toHaveBeenCalled();
});
