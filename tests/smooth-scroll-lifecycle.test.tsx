// @vitest-environment jsdom
import React, { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SmoothScroll } from '../src/components/ui/SmoothScroll';

const mocks = vi.hoisted(() => ({ instances: [] as { raf: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; scrollTo: ReturnType<typeof vi.fn> }[] }));
vi.mock('lenis', () => ({ default: class {
  raf = vi.fn(); destroy = vi.fn(); scrollTo = vi.fn();
  constructor() { mocks.instances.push(this); }
} }));

let root: Root, host: HTMLDivElement, hidden: boolean, nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  hidden = false; nextFrame = 0; frames = new Map(); mocks.instances.length = 0;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const visibility = (value: boolean) => { hidden = value; document.dispatchEvent(new Event('visibilitychange')); };

it('suspends hidden tabs and resumes one frame chain despite repeated visibility events', async () => {
  await act(async () => root.render(<SmoothScroll><p>Page content</p></SmoothScroll>));
  expect(host.textContent).toBe('Page content'); expect(frames.size).toBe(1);
  const [id, callback] = [...frames][0]; frames.delete(id); callback(16);
  expect(mocks.instances[0].raf).toHaveBeenCalledWith(16); expect(frames.size).toBe(1);
  visibility(true); expect(frames.size).toBe(0);
  visibility(false); visibility(false); expect(frames.size).toBe(1);
  await act(async () => root.render(null)); expect(frames.size).toBe(0);
  visibility(false); expect(frames.size).toBe(0); expect(mocks.instances[0].destroy).toHaveBeenCalledTimes(1);
});

it('keeps immediate programmatic scroll working while mounted in a hidden tab', async () => {
  hidden = true;
  await act(async () => root.render(<SmoothScroll><span>Content</span></SmoothScroll>));
  expect(frames.size).toBe(0);
  window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: 520 } }));
  expect(mocks.instances[0].scrollTo).toHaveBeenCalledWith(520, { immediate: true, force: true });
  window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: NaN } }));
  expect(mocks.instances[0].scrollTo).toHaveBeenCalledTimes(1);
  visibility(false); expect(frames.size).toBe(1);
});

it('cleans the StrictMode trial instance and leaves exactly one active listener and frame', async () => {
  await act(async () => root.render(<StrictMode><SmoothScroll><span>Content</span></SmoothScroll></StrictMode>));
  expect(mocks.instances).toHaveLength(2); expect(mocks.instances[0].destroy).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(1);
  window.dispatchEvent(new CustomEvent('rico:scroll-to', { detail: { top: 120 } }));
  expect(mocks.instances[0].scrollTo).not.toHaveBeenCalled(); expect(mocks.instances[1].scrollTo).toHaveBeenCalledTimes(1);
  visibility(true); expect(frames.size).toBe(0);
  visibility(false); expect(frames.size).toBe(1);
});
