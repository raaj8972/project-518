// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DeferredSection from '../src/components/DeferredSection';
let root: Root, host: HTMLDivElement, enter: IntersectionObserverCallback;
const disconnect = vi.fn();
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  disconnect.mockClear();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { enter = callback; }
    observe() {} disconnect = disconnect;
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
it('defers child effects until nearby, then keeps the mounted section on screen exits', async () => {
  const mounted = vi.fn(), unmounted = vi.fn();
  function Content() { React.useEffect(() => { mounted(); return unmounted; }, []); return <p>History</p>; }
  await act(async () => root.render(<DeferredSection minHeight={800}><Content /></DeferredSection>));
  expect(mounted).not.toHaveBeenCalled(); expect(host.firstElementChild?.getAttribute('style')).toContain('800px');
  await act(async () => enter([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(mounted).toHaveBeenCalledTimes(1); expect(host.textContent).toBe('History'); expect(disconnect).toHaveBeenCalled();
  await act(async () => enter([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  expect(unmounted).not.toHaveBeenCalled();
});
it('renders direct-link content immediately and also works without observer support', async () => {
  await act(async () => root.render(<DeferredSection eager minHeight={800}><p>Direct link</p></DeferredSection>));
  expect(host.textContent).toBe('Direct link');
  await act(async () => root.render(null)); vi.stubGlobal('IntersectionObserver', undefined);
  await act(async () => root.render(<DeferredSection minHeight={800}><p>Fallback</p></DeferredSection>));
  expect(host.textContent).toBe('Fallback');
});
it('disconnects an unreached section when navigating away', async () => {
  await act(async () => root.render(<DeferredSection minHeight={800}><p>Later</p></DeferredSection>));
  await act(async () => root.render(null)); expect(disconnect).toHaveBeenCalled();
});
