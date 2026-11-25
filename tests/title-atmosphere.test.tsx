// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TitleAtmosphere from '../src/components/cinematic/TitleAtmosphere';

const mocks = vi.hoisted(() => ({ create: vi.fn(), draw: vi.fn(), resize: vi.fn(), dispose: vi.fn(), disconnect: vi.fn() }));
vi.mock('../src/components/cinematic/titleAtmosphereRenderer', () => ({ createTitleAtmosphereRenderer: mocks.create }));

type PendingImage = { onload: (() => void) | null; onerror: (() => void) | null; complete: boolean; src: string };
let host: HTMLDivElement, root: Root, images: PendingImage[], now: number, nextFrame: number, hidden: boolean;
let frames: Map<number, FrameRequestCallback>;
let resizeCallback: (() => void) | undefined;
const atmosphere = () => host.querySelector<HTMLElement>('[data-title-atmosphere]')!;
const lastTime = () => mocks.draw.mock.calls.at(-1)?.[0] as number;

async function render(running = true, paused = false) {
  await act(async () => root.render(<TitleAtmosphere backdrop="/reference-atmosphere.webp" running={running} paused={paused} />));
}
async function loadImages(failed = false) {
  await act(async () => { for (const image of images) (failed ? image.onerror : image.onload)?.(); });
}
async function frame(timestamp: number) {
  now = timestamp;
  const callbacks = [...frames.values()]; frames.clear();
  await act(async () => { for (const callback of callbacks) callback(timestamp); });
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  images = []; frames = new Map(); nextFrame = 0; now = 0; hidden = false; resizeCallback = undefined;
  mocks.create.mockReturnValue({ draw: mocks.draw, resize: mocks.resize, dispose: mocks.dispose });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1600);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 1600, 900));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resizeCallback = callback; }
    observe() {}
    disconnect() { mocks.disconnect(); }
  });
  vi.stubGlobal('Image', class {
    onload = null; onerror = null; complete = false; src = '';
    naturalWidth = 1600; naturalHeight = 900; width = 1600; height = 900;
    constructor() { images.push(this); }
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it('keeps the exact reference photo visible until a textured frame has painted', async () => {
  await render(false);
  expect(atmosphere().querySelector('img')?.getAttribute('src')).toBe('/reference-atmosphere.webp');
  expect(atmosphere().dataset.live).not.toBe('true');
  expect(mocks.draw).not.toHaveBeenCalled();
  await loadImages();
  if (atmosphere().dataset.live === 'true') expect(mocks.draw).toHaveBeenCalled();
  expect(frames.size).toBe(0);
  await render(true); await frame(0); await frame(40);
  expect(mocks.draw).toHaveBeenCalled();
  expect(atmosphere().dataset.live).toBe('true');
  expect(atmosphere().querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
});

it('limits expensive cloud and ray paints to thirty frames per second', async () => {
  await render(); await loadImages(); await frame(0);
  const first = mocks.draw.mock.calls.length;
  await frame(8); await frame(16); await frame(24);
  expect(mocks.draw).toHaveBeenCalledTimes(first);
  await frame(40);
  expect(mocks.draw).toHaveBeenCalledTimes(first + 1);
});

it('stops animation while paused and resumes without consuming hidden time', async () => {
  await render(); await loadImages();
  await frame(0); await frame(100); await frame(180);
  const before = lastTime();
  expect(before).toBeGreaterThan(0);
  await render(true, true);
  expect(frames.size).toBe(0);
  const draws = mocks.draw.mock.calls.length;
  await frame(10180);
  expect(mocks.draw).toHaveBeenCalledTimes(draws);
  await render(true, false); await frame(10220); await frame(10260);
  expect(lastTime()).toBeGreaterThanOrEqual(before);
  expect(lastTime()).toBeLessThan(before + .25);
});

it('caps rendering density and resizes through its own observer', async () => {
  await render(); await loadImages(); await frame(40);
  expect(mocks.resize).toHaveBeenCalled();
  const [width, height, ratio] = mocks.resize.mock.calls.at(-1)! as number[];
  expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
  expect(ratio).toBeGreaterThan(0); expect(ratio).toBeLessThanOrEqual(1.25);
  expect(width * height * ratio * ratio).toBeLessThanOrEqual(900001);
  const count = mocks.resize.mock.calls.length;
  await act(async () => resizeCallback?.());
  expect(mocks.resize.mock.calls.length).toBeGreaterThan(count);
});

it('also suspends GPU work when browser visibility changes before the parent rerenders', async () => {
  await render(); await loadImages(); await frame(0); await frame(100);
  const before = lastTime();
  hidden = true;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames.size).toBe(0);
  const draws = mocks.draw.mock.calls.length;
  await frame(20100);
  expect(mocks.draw).toHaveBeenCalledTimes(draws);
  hidden = false;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  await frame(20140); await frame(20180);
  expect(lastTime()).toBeGreaterThanOrEqual(before);
  expect(lastTime()).toBeLessThan(before + .2);
});

it.each(['unavailable', 'throws', 'image-error'] as const)('retains the photo without leaving a frame loop after %s', async failure => {
  if (failure === 'unavailable') mocks.create.mockReturnValue(null);
  if (failure === 'throws') mocks.create.mockImplementation(() => { throw new Error('Context unavailable'); });
  await render(); await loadImages(failure === 'image-error'); await frame(40);
  expect(atmosphere().dataset.live).not.toBe('true');
  expect(atmosphere().querySelector('img')?.getAttribute('src')).toBe('/reference-atmosphere.webp');
  expect(frames.size).toBe(0);
});

it('releases GPU resources and falls back to the photo when its context is lost', async () => {
  await render(); await loadImages(); await frame(40);
  expect(atmosphere().dataset.live).toBe('true');
  const canvas = atmosphere().querySelector('canvas')!;
  await act(async () => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  expect(atmosphere().dataset.live).not.toBe('true');
  expect(atmosphere().querySelector('img')).not.toBeNull();
  expect(frames.size).toBe(0);
  expect(mocks.dispose).toHaveBeenCalledOnce();
});

it('cleans up its frame, observer and GPU resources when navigation unmounts it', async () => {
  await render(); await loadImages(); await frame(40);
  await act(async () => root.render(null));
  expect(frames.size).toBe(0);
  expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(mocks.disconnect).toHaveBeenCalledOnce();
  const count = mocks.draw.mock.calls.length;
  await frame(20000); await loadImages();
  expect(mocks.draw).toHaveBeenCalledTimes(count);
});
