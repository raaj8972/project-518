// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { DoomNavigationDrawer } from '../src/components/navigation/DoomNavigationDrawer';
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const component = (tag: string) => React.forwardRef(({ initial, animate, exit, transition, variants, ...props }: any, ref: any) => React.createElement(tag, { ...props, ref }));
  return { AnimatePresence: ({ children }: any) => children, useReducedMotion: () => true, motion: { div: component('div'), button: component('button') } };
});
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; }); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 20, height: 20 }] as any);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Fixture({ socials }: { socials?: any }) {
  const [open, setOpen] = useState(false); const location = useLocation();
  return <><button id="trigger" onClick={() => setOpen(true)}>Open menu</button><output>{location.pathname}</output><DoomNavigationDrawer open={open} onClose={() => setOpen(false)} onNavigate={() => setOpen(false)} socialMediaSettings={socials} items={[{ name: 'Home', path: '/' }, { name: 'Events', path: '/events' }, { name: 'Login', path: '/login' }]} /></>;
}
const render = async (socials?: any) => act(async () => root.render(<MemoryRouter><Fixture socials={socials} /></MemoryRouter>));
const open = async () => { const trigger = host.querySelector('#trigger') as HTMLButtonElement; trigger.focus(); await act(async () => trigger.click()); };
it('navigates using real links, closes after selection and restores background scrolling', async () => {
  await render(); document.body.style.overflow = 'auto'; await open();
  expect(document.body.style.overflow).toBe('hidden');
  await act(async () => (document.querySelector('.doom-links a[href="/events"]') as HTMLAnchorElement).click());
  expect(host.querySelector('output')?.textContent).toBe('/events');
  expect(document.querySelector('[data-doom-menu]')).toBeNull();
  expect(document.body.style.overflow).toBe('auto'); document.body.style.overflow = '';
});
it('keeps keyboard focus in the drawer, supports its close button and restores the trigger', async () => {
  await render(); await open();
  const dialog = document.querySelector('[role="dialog"]') as HTMLDivElement;
  expect(document.activeElement).toBe(dialog);
  const last = document.querySelector('.doom-designer-credit a') as HTMLAnchorElement; last.focus();
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
  expect(document.activeElement).toBe(document.querySelector('.doom-close'));
  await act(async () => (document.querySelector('.doom-close') as HTMLButtonElement).click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(host.querySelector('#trigger'));
});
it('shows only enabled, valid configured social accounts', async () => {
  await render({ instagram_enabled: true, instagram_url: 'https://www.instagram.com/example/', youtube_enabled: true, youtube_url: 'javascript:alert(1)' }); await open();
  const links = document.querySelectorAll('.doom-socials a');
  expect(links).toHaveLength(1); expect(links[0].getAttribute('aria-label')).toBe('Rico Instagram');
  expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
  expect(document.querySelector('a[href="#"]')).toBeNull();
  const credit = document.querySelector('.doom-designer-credit a');
  expect(credit?.getAttribute('href')).toBe('https://www.instagram.com/i_amraaj__/');
  expect(credit?.textContent).toContain('RAAJ');
  expect(links[0].getAttribute('href')).toBe('https://www.instagram.com/example/');
});
