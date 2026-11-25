// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntroWebWipe from '../src/components/cinematic/IntroWebWipe';

let host: HTMLDivElement, root: Root, hidden: boolean;
let onCovered: ReturnType<typeof vi.fn>, onComplete: ReturnType<typeof vi.fn>;
const wipe = () => host.querySelector<HTMLElement>('[data-intro-web-wipe]');
async function tick(milliseconds: number) { await act(async () => vi.advanceTimersByTime(milliseconds)); }
async function render(running = true, paused = false, strict = false) {
  const element = <IntroWebWipe running={running} paused={paused} onCovered={onCovered} onComplete={onComplete} durationMs={1000} />;
  await act(async () => root.render(strict ? <React.StrictMode>{element}</React.StrictMode> : element));
}

beforeEach(() => {
  vi.useFakeTimers(); hidden = false;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  onCovered = vi.fn(); onComplete = vi.fn();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  vi.useRealTimers(); vi.restoreAllMocks();
});

it('waits for the title trigger and swaps the title only at full web coverage', async () => {
  await render(false); await tick(4000);
  expect(wipe()).toBeNull(); expect(onCovered).not.toHaveBeenCalled();
  expect(onComplete).not.toHaveBeenCalled();
  await render();
  expect(wipe()?.dataset.phase).toBe('shooting');
  expect(wipe()?.getAttribute('aria-hidden')).toBe('true');
  await tick(499); expect(onCovered).not.toHaveBeenCalled();
  await tick(1);
  expect(onCovered).toHaveBeenCalledOnce();
  expect(wipe()?.dataset.phase).toBe('clearing');
  expect(onComplete).not.toHaveBeenCalled();
  await tick(499); expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(onComplete).toHaveBeenCalledOnce(); expect(wipe()).toBeNull();
  await tick(10000);
  expect(onCovered).toHaveBeenCalledOnce(); expect(onComplete).toHaveBeenCalledOnce();
});

it('pauses both phases and resumes only their remaining time', async () => {
  await render(); await tick(220); await render(true, true);
  expect(wipe()?.dataset.paused).toBe('true');
  await tick(10000); expect(onCovered).not.toHaveBeenCalled();
  await render(true, false); await tick(279); expect(onCovered).not.toHaveBeenCalled();
  await tick(1); expect(onCovered).toHaveBeenCalledOnce();
  await tick(200); await render(true, true); await tick(10000);
  expect(onComplete).not.toHaveBeenCalled();
  await render(); await tick(299); expect(onComplete).not.toHaveBeenCalled();
  await tick(1); expect(onComplete).toHaveBeenCalledOnce();
});

it('also pauses for browser visibility without waiting for a parent render', async () => {
  await render(); await tick(300);
  hidden = true; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(wipe()?.dataset.paused).toBe('true');
  await tick(10000); expect(onCovered).not.toHaveBeenCalled();
  hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  await tick(199); expect(onCovered).not.toHaveBeenCalled();
  await tick(1); expect(onCovered).toHaveBeenCalledOnce();
  await tick(500); expect(onComplete).toHaveBeenCalledOnce();
});

it('does not start a hidden transition until the document is visible', async () => {
  hidden = true; await render(); await tick(10000);
  expect(wipe()?.dataset.paused).toBe('true');
  expect(onCovered).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
  hidden = false; await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  await tick(500); expect(onCovered).toHaveBeenCalledOnce();
  await tick(500); expect(onComplete).toHaveBeenCalledOnce();
});

it('cancels all pending callbacks when navigation unmounts the transition', async () => {
  await render(); await tick(250);
  await act(async () => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
  await tick(10000);
  expect(onCovered).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
});

it('cancels the revealing phase when the caller disables the transition', async () => {
  await render(); await tick(500); expect(onCovered).toHaveBeenCalledOnce();
  await render(false); await tick(10000);
  expect(wipe()).toBeNull(); expect(onComplete).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it('keeps one pair of callbacks during StrictMode effect replay', async () => {
  await render(true, false, true); await tick(500);
  expect(onCovered).toHaveBeenCalledOnce();
  await tick(500); expect(onComplete).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('uses updated callbacks without restarting an active transition', async () => {
  await render(); await tick(300);
  const oldCovered = onCovered, oldComplete = onComplete;
  onCovered = vi.fn(); onComplete = vi.fn();
  await render(); await tick(200);
  expect(oldCovered).not.toHaveBeenCalled(); expect(onCovered).toHaveBeenCalledOnce();
  await tick(500);
  expect(oldComplete).not.toHaveBeenCalled(); expect(onComplete).toHaveBeenCalledOnce();
});
