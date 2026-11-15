// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SponsorSmoke from '../src/components/Sponsors/SponsorSmoke';

let root: Root;
let host: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let intersection: IntersectionObserverCallback;
let hidden: boolean;
let reduced: boolean;
let textures: ImageData[];
let draw: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  frames = new Map(); nextId = 0; hidden = false; reduced = false; textures = []; draw = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersection = callback; } observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextId; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 574, bottom: 230, width: 574, height: 230, toJSON() {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (data: ImageData) => textures.push(data),
    setTransform() {}, clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const mount = () => act(async () => root.render(<SponsorSmoke />));
const setVisible = (visible: boolean) => act(async () => intersection([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
const flush = (time: number) => { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(time); };

it('uses individually feathered density fields with no rectangular alpha edge', async () => {
  await mount();
  expect(textures).toHaveLength(3);
  for (const texture of textures) {
    const alpha = (x: number, y: number) => texture.data[(y * texture.width + x) * 4 + 3];
    for (let i = 0; i < texture.width; i++) {
      expect(alpha(i, 0)).toBe(0); expect(alpha(i, texture.height - 1)).toBe(0);
      expect(alpha(0, i)).toBe(0); expect(alpha(texture.width - 1, i)).toBe(0);
    }
    expect(alpha(48, 48)).toBeGreaterThan(0);
  }
});

it('paints curling puffs only while visible and stops offscreen, off-tab and on unmount', async () => {
  await mount(); expect(frames.size).toBe(0);
  await setVisible(true); expect(frames.size).toBe(1);
  await act(async () => { flush(100); flush(150); });
  expect(draw).toHaveBeenCalled();
  await setVisible(false); expect(frames.size).toBe(0);
  await setVisible(true); expect(frames.size).toBe(1);
  hidden = true; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames.size).toBe(0);
  hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames.size).toBe(1);
  await act(async () => root.render(null)); expect(frames.size).toBe(0);
});

it('keeps smoke static for reduced motion', async () => {
  reduced = true; await mount(); await setVisible(true);
  expect(frames.size).toBe(0); expect(draw).toHaveBeenCalled();
});
