// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SiteSpiderEffects } from '../src/components/ui/spider/SiteSpiderEffects';
import { isFestivalRoute, isPortalRoute } from '../src/utils/portalRoutes';
import { publishIntroPhase, rememberIntroFallback } from '../src/components/cinematic/introCapability';

const mocks = vi.hoisted(() => ({ mounted: vi.fn(), disposed: vi.fn() }));
vi.mock('../src/components/ui/spider/SiteSpider', () => ({ SiteSpider: () => {
  useEffect(() => { mocks.mounted(); return () => mocks.disposed(); }, []);
  return <div data-spider-experience><div className="site-spider-controls" /><div data-spider-web-highlight /></div>;
} }));
vi.mock('../src/components/ui/spider/SpiderOpening', () => ({ SpiderOpening: ({ loading }: { loading: boolean }) => <div data-spider-opening data-loading={String(loading)} /> }));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  sessionStorage.clear(); delete document.documentElement.dataset.staticExperience; delete document.documentElement.dataset.cinematicIntro;
  vi.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); sessionStorage.clear(); delete document.documentElement.dataset.staticExperience; delete document.documentElement.dataset.cinematicIntro; });
async function render(pathname: string, isReady = true, theme = 'spiderman') {
  await act(async () => root.render(<SiteSpiderEffects pathname={pathname} theme={theme} isReady={isReady} />));
}

it('defers the extra spider renderer until the cinematic handoff and removes it on device fallback', async () => {
  publishIntroPhase('active'); await render('/');
  expect(container.querySelector('[data-spider-experience]')).toBeNull();
  await act(async () => publishIntroPhase('handoff'));
  expect(container.querySelector('[data-spider-experience]')).not.toBeNull();
  await act(async () => rememberIntroFallback('slow-renderer'));
  expect(container.childElementCount).toBe(0); expect(mocks.disposed).toHaveBeenCalledOnce();
});

const staffPortals = [
  '/admin', '/admin/homepage', '/admin/settings/security', '/coordinator/dashboard',
  '/cr/dashboard', '/security-dashboard', '/council-dashboard', '/sports-admin',
  '/login', '/forgot-password', '/reset-password', '/master-node-access', '/council',
  '/coordinator', '/cr/login', '/security-login', '/accept-admin-invite',
];
it.each(staffPortals)('excludes staff workspace %s from the festival theme and every spider effect', async path => {
  expect(isPortalRoute(path)).toBe(true);
  expect(isFestivalRoute(path)).toBe(false);
  await render(path, false);
  expect(container.childElementCount).toBe(0);
  await render(path, true);
  expect(container.childElementCount).toBe(0);
  expect(mocks.mounted).not.toHaveBeenCalled();
});

const studentRoutes = [
  '/dashboard', '/dashboard/events', '/dashboard/passes', '/dashboard/settings',
  '/student', '/student/login', '/student/forgot-password', '/student/reset-password',
];
it.each(studentRoutes)('shares the festival spider on student route %s without replaying the public introduction', async path => {
  expect(isPortalRoute(path)).toBe(true);
  expect(isFestivalRoute(path)).toBe(true);
  await render(path, false);
  expect(container.querySelector('[data-spider-experience]')).not.toBeNull();
  expect(container.querySelector('[data-spider-opening]')).toBeNull();
  await render(path, true);
  expect(container.querySelector('.site-spider-controls')).not.toBeNull();
  expect(container.querySelector('[data-spider-web-highlight]')).not.toBeNull();
  expect(container.querySelector('[data-spider-opening]')).toBeNull();
});

it('disposes the scene on staff entry, restores it for students, and keeps it alive between festival routes', async () => {
  await render('/events');
  expect(mocks.mounted).toHaveBeenCalledTimes(1);
  await render('/admin');
  expect(container.childElementCount).toBe(0);
  expect(mocks.disposed).toHaveBeenCalledTimes(1);
  await render('/dashboard/passes');
  expect(container.querySelector('[data-spider-experience]')).not.toBeNull();
  expect(container.querySelector('[data-spider-opening]')).toBeNull();
  expect(mocks.mounted).toHaveBeenCalledTimes(2);
  await render('/schedule');
  expect(container.querySelector('[data-spider-opening]')).not.toBeNull();
  expect(mocks.mounted).toHaveBeenCalledTimes(2);
});

it.each(['/', '/events', '/gallery', '/sports', '/schedule', '/sponsors', '/rico-family'])('keeps the public festival and loading introduction on %s', async path => {
  expect(isPortalRoute(path)).toBe(false);
  expect(isFestivalRoute(path)).toBe(true);
  await render(path, false);
  expect(container.querySelector('[data-spider-opening]')?.getAttribute('data-loading')).toBe('true');
  await render(path, true);
  expect(container.querySelector('[data-spider-opening]')?.getAttribute('data-loading')).toBe('false');
  expect(container.querySelector('[data-spider-experience]')).not.toBeNull();
});

it.each([
  ['/DASHBOARD/events?tab=upcoming#details', true],
  ['/STUDENT/reset-password?token=example', true],
  ['/ADMIN/homepage?tab=hero', false],
  ['/security-dashboard#scan', false],
  ['/dashboard-stories', true],
  ['/student-life', true],
])('resolves festival scope for normalized path %s', (path, expected) => {
  expect(isFestivalRoute(path)).toBe(expected);
});

it.each(['/events', '/dashboard', '/student/login'])('does not mount festival spider effects on alternate themes at %s', async path => {
  await render(path, true, 'cyberpunk');
  expect(container.childElementCount).toBe(0);
  expect(mocks.mounted).not.toHaveBeenCalled();
});

it('keeps the Homebound concert page clear and restores effects on other festival pages', async () => {
  await render('/home-bound', true);
  expect(container.querySelector('[data-spider-experience]')).toBeNull();
  expect(container.querySelector('.site-spider-controls')).toBeNull();
  await render('/events', true);
  expect(container.querySelector('[data-spider-experience]')).not.toBeNull();
});
