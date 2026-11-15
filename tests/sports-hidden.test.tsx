// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { SITE_FEATURES, isSportsSection } from '../src/constants/siteFeatures';
import { getAdminSections } from '../src/constants/adminSections';
import { getDataScope, pendingLandingPath } from '../src/utils/dataScope';
import { AdminPageSelector } from '../src/components/admin/AdminPageSelector';
afterEach(() => { SITE_FEATURES.sports = false; sessionStorage.clear(); });
it('hides sports, annual sports and legacy teams from both owner and delegated admin menus', () => {
  for (const owner of [true, false]) for (const annualMode of [true, false]) {
    const tabs = getAdminSections(owner, annualMode);
    expect(tabs.some(tab => isSportsSection(tab.id))).toBe(false);
    expect(tabs.some(tab => tab.id === 'events')).toBe(true);
    expect(tabs.some(tab => tab.id === 'registrations')).toBe(true);
  }
});
it('preserves the full sports inventory for restoration', () => {
  SITE_FEATURES.sports = true;
  const tabs = getAdminSections(true);
  expect(tabs.filter(tab => isSportsSection(tab.id))).toHaveLength(12);
  expect(tabs.find(tab => tab.id === 'sports-team')).toBeDefined();
  expect(tabs.find(tab => tab.id === 'annual-registration-model')).toBeDefined();
});
it('does not load sports domains or loop through a previously saved sports landing page', () => {
  for (const path of ['/admin', '/sports', '/dashboard']) {
    const scope = getDataScope(path, true);
    expect(scope.sports).toBe(false); expect(scope.annualSports).toBe(false);
  }
  expect(pendingLandingPath('/', '/sports', false)).toBeNull();
  expect(pendingLandingPath('/', '/events', false)).toBe('/events');
});
it('omits sports permission choices without silently revoking existing grants', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  let next: string[] = [];
  try {
    await act(async () => root.render(<AdminPageSelector pages={['sports-teams']} onChange={pages => { next = pages; }} />));
    expect(container.textContent).not.toMatch(/sports|annual|legacy teams/i);
    const events = [...container.querySelectorAll('label')].find(label => label.textContent === 'Events')!.querySelector('input')!;
    await act(async () => events.click());
    expect(next).toEqual(['sports-teams', 'events']);
  } finally { await act(async () => root.unmount()); container.remove(); }
});
