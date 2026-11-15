// @vitest-environment jsdom
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpiderScene3D } from '../src/components/ui/spider/SpiderScene3D';

const captured = vi.hoisted(() => ({ options: undefined as { antialias?: boolean } | undefined, render: vi.fn(), update: vi.fn(), dispose: vi.fn() }));
vi.mock('three', async importOriginal => {
  const three = await importOriginal<typeof import('three')>();
  return {
    ...three,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      constructor(options: { antialias?: boolean }) { captured.options = options; }
      setClearColor() {} setPixelRatio() {} setSize() {}
      render = captured.render;
      dispose() {} forceContextLoss() {}
    },
  };
});
vi.mock('../src/components/ui/spider/spiderModel', async () => {
  const { Group } = await import('three');
  return { createSpiderModel: () => ({ root: new Group(), update: captured.update, dispose: captured.dispose }) };
});

let root: Root; let host: HTMLDivElement; let now: number; let sequence: number;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.clearAllMocks(); now = 0; sequence = 0; frames = new Map();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++sequence; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  document.querySelectorAll('[data-test-modal]').forEach(modal => modal.remove());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const advance = (milliseconds: number) => {
  const end = now + milliseconds;
  while (now < end) {
    now += 1000 / 60;
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
  }
};
async function mount(width: number) {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
  await act(async () => root.render(<SpiderScene3D paused={false} silkRef={createRef<SVGLineElement>()} onReady={vi.fn()} onUnavailable={vi.fn()} />));
}

it('uses a smaller mobile GPU budget without multisample antialiasing', async () => {
  await mount(390);
  expect(captured.options?.antialias).toBe(false);
  captured.render.mockClear(); advance(1000);
  expect(captured.render.mock.calls.length).toBeGreaterThanOrEqual(19);
  expect(captured.render.mock.calls.length).toBeLessThanOrEqual(21);
});

it('caps desktop animation at 24 actual renders per second', async () => {
  await mount(1440);
  expect(captured.options?.antialias).toBe(true);
  captured.render.mockClear(); advance(1000);
  expect(captured.render.mock.calls.length).toBeGreaterThanOrEqual(23);
  expect(captured.render.mock.calls.length).toBeLessThanOrEqual(25);
});

it('stops WebGL frames while a modal hides the spider, then resumes after it closes', async () => {
  await mount(390); advance(200);
  const modal = document.createElement('div'); modal.dataset.testModal = 'true';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  await act(async () => { document.body.append(modal); });
  const before = captured.render.mock.calls.length;
  expect(frames.size).toBe(0);
  advance(600); expect(captured.render).toHaveBeenCalledTimes(before);
  await act(async () => { modal.remove(); });
  expect(frames.size).toBe(1);
  advance(200); expect(captured.render.mock.calls.length).toBeGreaterThan(before);
});
