// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpiderOpening } from '../src/components/ui/spider/SpiderOpening';

const documentVisit = vi.hoisted(() => ({ eligible: true, played: false }));
vi.mock('../src/components/cinematic/documentIntro', () => ({
  canPlayDocumentIntro: (_kind: string, pathname: string) => documentVisit.eligible && !documentVisit.played && pathname === '/',
  markDocumentIntroPlayed: () => { documentVisit.played = true; },
  isDocumentEntryRoute: (pathname: string) => documentVisit.eligible && pathname === '/',
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  documentVisit.eligible = true; documentVisit.played = false;
  window.history.replaceState(null, '', '/');
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('stays while essential data loads and releases the page within 360ms of readiness', async () => {
  await act(async () => root.render(<SpiderOpening loading />));
  await act(async () => vi.advanceTimersByTime(3000));
  expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
  // Readiness, not a fabricated percentage or fixed intro runtime, controls exit.
  expect(host.querySelector('[aria-valuenow]')).toBeNull();
  await act(async () => root.render(<SpiderOpening loading={false} />));
  expect(host.querySelector('.is-revealing')).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(360));
  expect(host.childElementCount).toBe(0);
  await act(async () => root.render(<SpiderOpening loading={false} />));
  expect(host.childElementCount).toBe(0);
});
it('clears immediately for reduced motion and cancels pending work on unmount', async () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  await act(async () => root.render(<SpiderOpening loading={false} />));
  await act(async () => vi.advanceTimersByTime(0));
  expect(host.childElementCount).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it('does not replay the opening when a public page remounts it', async () => {
  await act(async () => root.render(<SpiderOpening loading pathname="/" />));
  expect(host.querySelector('[data-spider-opening]')).not.toBeNull();
  await act(async () => root.render(null));
  await act(async () => root.render(<SpiderOpening loading pathname="/" />));
  expect(host.childElementCount).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it('dismisses a pending opening when the user switches pages', async () => {
  await act(async () => root.render(<SpiderOpening loading pathname="/" />));
  expect(host.querySelector('[data-spider-opening]')).not.toBeNull();
  documentVisit.eligible = false;
  await act(async () => root.render(<SpiderOpening loading pathname="/events" />));
  expect(host.childElementCount).toBe(0);
  await act(async () => root.render(<SpiderOpening loading pathname="/" />));
  expect(host.childElementCount).toBe(0);
});

it('keeps the initial opening visible during StrictMode effect replay', async () => {
  await act(async () => root.render(<React.StrictMode><SpiderOpening loading pathname="/" /></React.StrictMode>));
  expect(documentVisit.played).toBe(true);
  expect(host.querySelector('[data-spider-opening]')).not.toBeNull();
  await act(async () => root.render(<React.StrictMode><SpiderOpening loading={false} pathname="/" /></React.StrictMode>));
  await act(async () => vi.advanceTimersByTime(360));
  expect(host.childElementCount).toBe(0);
});
