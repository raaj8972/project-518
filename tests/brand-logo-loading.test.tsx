// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BrandLogo3D from '../src/components/BrandLogo3D';

const player = vi.hoisted(() => ({ loaded: vi.fn() }));
vi.mock('../src/components/BrandLogoAnimation', () => {
  player.loaded();
  return { default: ({ animationData }: { animationData: { name: string } }) => <output>{animationData.name}</output> };
});
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('renders bitmap and SVG logos without fetching animation data or loading the player', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const loaded = player.loaded.mock.calls.length;
  await act(async () => root.render(<BrandLogo3D src="/logo.svg" alt="Festival" />));
  expect(host.querySelector('img')?.getAttribute('src')).toBe('/logo.svg');
  expect(host.querySelector('img')?.alt).toBe('Festival');
  expect(fetch).not.toHaveBeenCalled(); expect(player.loaded).toHaveBeenCalledTimes(loaded);
});

it('loads the player for an animated logo and keeps JSON out of image elements while pending', async () => {
  let complete!: (response: unknown) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { complete = resolve; })));
  await act(async () => root.render(<BrandLogo3D src="/logo.json" alt="Festival" />));
  expect(host.querySelector('img')).toBeNull();
  await act(async () => { complete({ ok: true, json: async () => ({ name: 'Animated crest' }) }); });
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(host.querySelector('output')?.textContent).toBe('Animated crest');
});

it('aborts replaced logos and ignores a late animation response', async () => {
  let complete!: (response: unknown) => void;
  const fetch = vi.fn(() => new Promise(resolve => { complete = resolve; })); vi.stubGlobal('fetch', fetch);
  await act(async () => root.render(<BrandLogo3D src="/old.json" />));
  const signal = (fetch.mock.calls[0] as unknown as [string, { signal: AbortSignal }])[1].signal;
  await act(async () => root.render(<BrandLogo3D src="/new.png" />));
  expect(signal.aborted).toBe(true);
  await act(async () => { complete({ ok: true, json: async () => ({ name: 'Old animation' }) }); });
  expect(host.querySelector('img')?.getAttribute('src')).toBe('/new.png');
  expect(host.querySelector('output')).toBeNull();
});
