// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TimelineBridge from '../src/components/Timeline/TimelineBridge';
import { createChronicleCycle, sampleChronicleCycle } from '../src/components/Timeline/chronicleMotion';

let root: Root, host: HTMLDivElement, frames: Map<number, FrameRequestCallback>, nextId: number;
let pointAt: ReturnType<typeof vi.fn>;
const originalLength = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getTotalLength');
const originalPoint = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getPointAtLength');

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  frames = new Map(); nextId = 0;
  vi.stubGlobal('IntersectionObserver', undefined); vi.stubGlobal('ResizeObserver', undefined);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  pointAt = vi.fn((distance: number) => ({ x: distance, y: distance * 2 }));
  Object.defineProperty(SVGElement.prototype, 'getPointAtLength', { configurable: true, value: pointAt });
  Object.defineProperty(SVGElement.prototype, 'getTotalLength', { configurable: true, value: function(this: SVGElement) { return this.hasAttribute('data-energy-stop') ? 400 : 1000; } });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const [name, original] of [['getTotalLength', originalLength], ['getPointAtLength', originalPoint]] as const) {
    if (original) Object.defineProperty(SVGElement.prototype, name, original); else delete (SVGElement.prototype as unknown as Record<string, unknown>)[name];
  }
});

it('samples identical choreography while skipping stationary geometry and repeated eye/style writes', async () => {
  await act(async () => root.render(<section className="chronicles"><TimelineBridge signature="one"><div data-chronicle-row className="chronicle-stop--left"><article className="chronicle-card">Year</article></div></TimelineBridge></section>));
  const section = host.querySelector<HTMLElement>('.chronicles')!;
  const eyeWrites = vi.spyOn(section.style, 'setProperty');
  const wand = host.querySelector<SVGGElement>('.chronicles__wand')!;
  const transformWrites = vi.spyOn(wand, 'setAttribute');
  const cycle = createChronicleCycle([{distance:400, cardIndex:0}], 1000, 1000);
  let previous = 0, elapsed = 0;
  const step = (timestamp: number) => {
    if (previous) elapsed += Math.min(.1, (timestamp - previous) / 1000); previous = timestamp;
    const [id, callback] = [...frames][0]; frames.delete(id); callback(timestamp);
    const expected = sampleChronicleCycle(cycle, elapsed);
    expect(host.querySelector<HTMLElement>('.chronicles__journey')!.dataset.energyPhase).toBe(expected.phase);
    expect(Number(wand.getAttribute('opacity'))).toBe(expected.wand);
    expect(Number(section.style.getPropertyValue('--chronicle-eyes'))).toBe(expected.eyes);
    expect(wand.getAttribute('transform')).toBe(`translate(${expected.distance} ${expected.distance * 2}) rotate(${Math.atan2(4, 2) * 180 / Math.PI})`);
  };
  // Source phase: 100 frames previously evaluated SVG geometry 300 times.
  for (let frame = 0; frame < 100; frame++) step(1000 + frame * 1000 / 60);
  expect(pointAt).toHaveBeenCalledTimes(3);
  expect(transformWrites.mock.calls.filter(([name]) => name === 'transform')).toHaveLength(1);
  expect(eyeWrites.mock.calls.filter(([name]) => name === '--chronicle-eyes')).toHaveLength(0);
  // Check moving and held phases against the unchanged sampler at every frame.
  for (let frame = 100; frame < 450; frame++) step(1000 + frame * 1000 / 60);
  expect(host.querySelector<HTMLElement>('.chronicles__journey')!.dataset.energyPhase).toBe('card');
  pointAt.mockClear(); transformWrites.mockClear(); eyeWrites.mockClear();
  for (let frame = 450; frame < 510; frame++) step(1000 + frame * 1000 / 60);
  expect(pointAt).not.toHaveBeenCalled();
  expect(transformWrites.mock.calls.filter(([name]) => name === 'transform')).toHaveLength(0);
  expect(eyeWrites.mock.calls.filter(([name]) => name === '--chronicle-eyes')).toHaveLength(0);
});
