// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { DashboardThemeToggle, DASHBOARD_THEME_KEY } from '../src/components/admin/layout/DashboardThemeToggle';
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  document.documentElement.dataset.theme = 'spiderman';
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });
it('switches immediately, persists the preference and leaves the website theme alone', async () => {
  await act(async () => root.render(<DashboardThemeToggle />));
  expect(document.body.dataset.dashboardTheme).toBe('dark');
  await act(async () => container.querySelectorAll('button')[0].click());
  expect(document.body.dataset.dashboardTheme).toBe('light');
  expect(container.querySelectorAll('button')[0].getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('spiderman');
  await act(async () => root.render(null));
  expect(document.body.dataset.dashboardTheme).toBeUndefined();
  await act(async () => root.render(<DashboardThemeToggle />));
  expect(document.body.dataset.dashboardTheme).toBe('light');
  await act(async () => container.querySelectorAll('button')[1].click());
  expect(document.body.dataset.dashboardTheme).toBe('dark');
});
it('updates another open dashboard tab when the saved preference changes', async () => {
  await act(async () => root.render(<DashboardThemeToggle />));
  await act(async () => window.dispatchEvent(new StorageEvent('storage', { key:DASHBOARD_THEME_KEY, newValue:'light' })));
  expect(document.body.dataset.dashboardTheme).toBe('light');
});
