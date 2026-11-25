// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FestivalLoadingPreview, LOADING_RECOVERY_MS } from '../src/components/ui/FestivalLoadingPreview';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  window.history.replaceState({}, '', '/?theme=spiderman#artists');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

it('offers a same-route direct entry and retry when loading stalls, preserving query and anchor', async () => {
  await act(async () => root.render(<FestivalLoadingPreview />));
  expect(host.querySelector('a')).toBeNull();
  await act(async () => vi.advanceTimersByTime(LOADING_RECOVERY_MS));
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/?theme=spiderman&intro=off#artists');
  expect(host.querySelector('button')?.textContent).toBe('Retry loading');
  expect(host.textContent).toContain('Taking longer than usual');
});

it('cleans up recovery timers and keeps protected route paths intact', async () => {
  window.history.replaceState({}, '', '/events?intro=on');
  await act(async () => root.render(<FestivalLoadingPreview />));
  await act(async () => vi.advanceTimersByTime(LOADING_RECOVERY_MS));
  expect(host.querySelector('a')?.getAttribute('href')).toBe('/events?intro=off');
  await act(async () => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
});
