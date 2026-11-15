// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ThemeManagement } from '../src/components/admin/ThemeManagement';

const mocks = vi.hoisted(() => ({ useData: vi.fn(), save: vi.fn(), toast: vi.fn() }));
vi.mock('../src/context/DataContext', () => ({ useData: mocks.useData }));
vi.mock('../src/components/ToastProvider', () => ({ useToast: () => ({ push: mocks.toast }) }));
let container: HTMLDivElement;
let root: Root;
const initialOptions = { active_theme: 'bollywood', batches: ['2025', '2026'], default_payment: true };
function SettingsFixture() {
  const [settings, setSettings] = useState({ batch_options: initialOptions });
  mocks.useData.mockReturnValue({ siteSettings: settings, updateSiteSettings: async (patch: any) => { mocks.save(patch); setSettings(old => ({ ...old, ...patch })); } });
  return <ThemeProvider><ThemeManagement /></ThemeProvider>;
}
beforeEach(() => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState({}, '', '/');
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); window.history.replaceState({}, '', '/'); });

it('applies the festival redesign to existing unversioned settings without writing to the backend', async () => {
  await act(async () => root.render(<SettingsFixture />));
  expect(document.documentElement.dataset.theme).toBe('spiderman');
  expect(document.body.classList.contains('theme-spiderman')).toBe(true);
  expect(container.querySelector('[aria-pressed="true"]')?.textContent).toContain('Emerald & Gold');
  expect(mocks.save).not.toHaveBeenCalled();
});
it('lets the owner switch themes, preserving unrelated batch settings and a persistent explicit selection', async () => {
  await act(async () => root.render(<SettingsFixture />));
  const choice = [...container.querySelectorAll('button')].find(button => button.querySelector('h3')?.textContent === 'Cyberpunk')!;
  await act(async () => choice.click());
  expect(mocks.save).toHaveBeenCalledWith({ batch_options: { ...initialOptions, active_theme: 'cyberpunk', theme_version: 2 } });
  expect(document.documentElement.dataset.theme).toBe('cyberpunk');
  expect(document.body.classList.contains('theme-spiderman')).toBe(false);
  const festival = [...container.querySelectorAll('button')].find(button => button.querySelector('h3')?.textContent.includes('Emerald & Gold'))!;
  await act(async () => festival.click());
  expect(document.documentElement.dataset.theme).toBe('spiderman');
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});
it('supports a read-only URL preview without mixing old body classes or persisting a theme', async () => {
  window.history.replaceState({}, '', '/?theme=vaporwave');
  await act(async () => root.render(<SettingsFixture />));
  expect(document.documentElement.dataset.theme).toBe('vaporwave');
  expect(document.body.classList.contains('theme-vaporwave')).toBe(true);
  expect(document.body.classList.contains('theme-spiderman')).toBe(false);
  expect(mocks.save).not.toHaveBeenCalled();
});
