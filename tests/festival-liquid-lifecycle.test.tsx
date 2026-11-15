// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FestivalLiquidFlow } from '../src/components/ui/festival/FestivalLiquidFlow';

let root: Root;
let container: HTMLDivElement;
let scroll = 0;
let hidden = false;
let sequence = 0;
let frames: Map<number, FrameRequestCallback>;
let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  scroll = 0; hidden = false; sequence = 0; frames = new Map();
  preference = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++sequence; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(390);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(6000);
  const context = new Proxy({}, { get: (_target, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { top: -scroll, bottom: 1600 - scroll, left: 0, right: 390, width: 390, height: 1600, x: 0, y: -scroll, toJSON() {} };
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const flushFrame = (time: number) => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); };
async function mount() { await act(async () => root.render(<><section className="spider-hero" /><FestivalLiquidFlow /></>)); }
async function scrollTo(y: number) { scroll = y; await act(async () => { document.dispatchEvent(new Event('scroll')); flushFrame(50); }); }

it('schedules no water animation above the river and wakes only when scrolling below it', async () => {
  await mount(); expect(frames.size).toBe(0);
  expect(document.querySelector('[data-festival-liquid]')?.getAttribute('data-active')).toBe('false');
  await scrollTo(1000); expect(frames.size).toBe(1);
  expect(document.querySelector('[data-festival-liquid]')?.getAttribute('data-active')).toBe('true');
  scroll = 0;
  await act(async () => { flushFrame(100); flushFrame(150); });
  expect(frames.size).toBe(0);
});

it('stops all recurring frames while paused, off-tab, or after leaving the page', async () => {
  scroll = 1000; await mount(); expect(frames.size).toBe(1);
  const button = document.querySelector<HTMLButtonElement>('.festival-liquid-toggle')!;
  await act(async () => button.click()); expect(frames.size).toBe(0);
  expect(button.getAttribute('aria-label')).toBe('Resume liquid droplets');
  await scrollTo(1200); expect(frames.size).toBe(0);
  await act(async () => button.click()); expect(frames.size).toBe(1);
  hidden = true; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(frames.size).toBe(0);
  hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange'))); expect(frames.size).toBe(1);
  await act(async () => root.render(null)); expect(frames.size).toBe(0);
  document.dispatchEvent(new Event('scroll')); expect(frames.size).toBe(0);
  expect(document.querySelector('[data-festival-liquid]')).toBeNull();
});

it('never starts a recurring animation for reduced motion', async () => {
  preference.matches = true; scroll = 1000; await mount();
  expect(frames.size).toBe(0);
  await scrollTo(1400); expect(frames.size).toBe(0);
});
