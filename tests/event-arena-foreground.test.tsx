// @vitest-environment jsdom
import React, { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { EventsHeroForeground } from '../src/components/Events/EventsHeroForeground';
it('places the normal hero foreground outside the page stack, follows resizing and removes it on navigation', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let notify = () => {}; const disconnect = vi.fn(); let width = 1100;
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { notify = callback; } observe() {} disconnect = disconnect; });
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top: 0, left: 0, width, height: 620, right: width, bottom: 620, x: 0, y: 0, toJSON() {} }));
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  function Hero() { const ref = useRef<HTMLElement>(null); return <header ref={ref}><EventsHeroForeground heroRef={ref} /></header>; }
  try {
    await act(async () => root.render(<Hero />));
    const layer = document.body.querySelector('.arena-hero-foreground') as HTMLElement;
    expect(layer.parentElement).toBe(document.body);
    expect(host.contains(layer)).toBe(false);
    expect(layer.style.width).toBe('1100px');
    expect(layer.querySelector('image')?.getAttribute('href')).toBe('/images/events-reference-source.png');
    width = 390; await act(async () => notify());
    expect(layer.style.width).toBe('390px');
    await act(async () => root.render(null));
    expect(document.querySelector('.arena-hero-foreground')).toBeNull();
    expect(disconnect).toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); host.remove(); rect.mockRestore(); vi.unstubAllGlobals(); }
});
