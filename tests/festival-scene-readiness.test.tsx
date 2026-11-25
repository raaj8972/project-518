// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FestivalSceneProvider, useFestivalSceneReadiness } from '../src/components/ui/festival/FestivalSceneReadiness';
import { SiteSpiderEffects } from '../src/components/ui/spider/SiteSpiderEffects';
import { SpiderHeroContent } from '../src/components/ui/SpiderHeroContent';
import { LockedPageGuard } from '../src/components/LockedPageGuard';

const mocks = vi.hoisted(() => ({ locked: false }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: {}, siteSettings: { locked_pages: { home: mocks.locked } }, isAdmin: () => false }) }));
vi.mock('../src/pages/ComingSoon', () => ({ default: () => <div>Under maintenance</div> }));
vi.mock('../src/components/ui/spider/SiteSpider', () => ({ SiteSpider: () => null }));
vi.mock('../src/components/ui/festival/FestivalEnvironment', () => ({ FestivalEnvironment: ({ onSettled }: { onSettled: (settled: boolean) => void }) => {
  useEffect(() => onSettled(false), [onSettled]);
  return <button onClick={() => onSettled(true)}>Scene ready or fallback</button>;
} }));

let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  mocks.locked = false;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

function ReadinessProbe({ ready }: { ready: boolean }) {
  const { pending } = useFestivalSceneReadiness();
  return <span data-scene-pending={pending} data-app-ready={ready} />;
}

async function render({ ready = true, media }: { ready?: boolean; media?: any } = {}) {
  await act(async () => root.render(<FestivalSceneProvider required><ReadinessProbe ready={ready} /><SiteSpiderEffects pathname="/" theme="spiderman" isReady={ready} /><MemoryRouter><SpiderHeroContent media={media} /></MemoryRouter></FestivalSceneProvider>));
}

it('reports the island and flags pending independently of ready app data', async () => {
  await render();
  expect(host.querySelector('[data-scene-pending]')?.getAttribute('data-scene-pending')).toBe('true');
  expect(host.querySelector('[data-app-ready]')?.getAttribute('data-app-ready')).toBe('true');
  await act(async () => host.querySelector('button')!.click());
  expect(host.querySelector('[data-scene-pending]')?.getAttribute('data-scene-pending')).toBe('false');
});

it('reports app data still loading after the scene settles', async () => {
  await render({ ready: false });
  await act(async () => host.querySelector('button')!.click());
  expect(host.querySelector('[data-scene-pending]')?.getAttribute('data-scene-pending')).toBe('false');
  expect(host.querySelector('[data-app-ready]')?.getAttribute('data-app-ready')).toBe('false');
});

it.each([
  { enabled: false },
  { enabled: true, background_type: 'image', image_url: '/custom.jpg' },
])('settles a disabled or configured background without waiting for a scene', async media => {
  await render({ media });
  expect(host.querySelector('button')).toBeNull();
  expect(host.querySelector('[data-scene-pending]')?.getAttribute('data-scene-pending')).toBe('false');
});

it('does not block a locked homepage that displays maintenance instead of the island', async () => {
  mocks.locked = true;
  await act(async () => root.render(<FestivalSceneProvider required><ReadinessProbe ready /><SiteSpiderEffects pathname="/" theme="spiderman" isReady /><LockedPageGuard pageKey="home"><SpiderHeroContent /></LockedPageGuard></FestivalSceneProvider>));
  expect(host.textContent).toContain('Under maintenance');
  expect(host.querySelector('button')).toBeNull();
  expect(host.querySelector('[data-scene-pending]')?.getAttribute('data-scene-pending')).toBe('false');
});
