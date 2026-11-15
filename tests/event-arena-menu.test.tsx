// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Navbar } from '../src/components/Navbar';
vi.mock('../src/context/ThemeContext', () => ({ useTheme: () => ({ theme: 'spiderman' }) }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: {}, siteSettings: {}, adminUsers: [], prefetchEvents: vi.fn(), prefetchGalleryImages: vi.fn() }) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../src/context/StudentAuthContext', () => ({ useStudentAuth: () => ({ user: null }) }));
vi.mock('../src/components/BrandLogo3D', () => ({ default: () => null }));
vi.mock('../src/components/CartDrawer', () => ({ CartButton: () => null }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const component = (tag: string) => React.forwardRef(({ initial, animate, exit, transition, variants, ...props }: any, ref: any) => React.createElement(tag, { ...props, ref }));
  return { AnimatePresence: ({ children }: any) => children, useReducedMotion: () => true, motion: { div: component('div'), button: component('button') } };
});
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; }); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
it.each(['/events', '/'])('opens the same illustrated drawer on %s and closes through Escape and the backdrop', async path => {
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={[path]}><Navbar /></MemoryRouter>));
    const toggle = host.querySelector('[aria-controls="festival-mobile-menu"]') as HTMLButtonElement;
    expect(host.querySelector('.doom-navigation')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); toggle.focus();
    await act(async () => toggle.click());
    const menu = document.querySelector('#festival-mobile-menu');
    expect(host.contains(menu)).toBe(false);
    expect(menu?.getAttribute('role')).toBe('dialog');
    expect(menu?.querySelector('.doom-artwork image')?.getAttribute('href')).toBe('/images/doom-menu-reference.png');
    expect(menu?.querySelector('.doom-hand-spell')).toBeTruthy();
    expect(menu?.querySelector('.doom-links a[aria-current="page"]')?.getAttribute('href')).toBe(path);
    expect(menu?.querySelector('.doom-links a[href="/student/login"]')?.textContent).toBe('Dashboard');
    expect(menu?.querySelector('.doom-links a[href="/sports"]')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('#festival-mobile-menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
    expect(document.body.style.overflow).not.toBe('hidden');
    await act(async () => toggle.click());
    await act(async () => (document.querySelector('.doom-menu-backdrop') as HTMLButtonElement).click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('#festival-mobile-menu')).toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); }
});
