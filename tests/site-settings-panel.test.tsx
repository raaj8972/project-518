// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SiteSettingsPanel } from '../src/components/admin/SiteSettingsPanel';

const mocks = vi.hoisted(() => ({
  updateSiteSettings: vi.fn(),
  submitForApproval: vi.fn(),
  checkRequiresApproval: vi.fn(),
  siteSettings: {
    id: 1,
    site_closed: false,
    coming_soon_enabled: false,
    chat_locked: false,
    locked_pages: {},
    locked_pages_until: {},
    coming_soon_until: null,
    coming_soon_title: 'Coming Soon',
    coming_soon_message: 'We are preparing something amazing...',
    coming_soon_ended_text: "We'll be back soon",
    homepage_hero_title: 'RICORRENZA',
    sports_instagram_url: '',
    default_landing_page: '/',
    navigation_order: [],
    registration_participant_types: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
  } as any,
}));

vi.mock('../src/context/DataContext', () => ({
  useData: () => ({
    siteSettings: mocks.siteSettings,
    updateSiteSettings: mocks.updateSiteSettings,
    isAdmin: () => true,
  }),
}));

vi.mock('../src/hooks/useApprovals', () => ({
  useApprovals: () => ({
    submitForApproval: mocks.submitForApproval,
    checkRequiresApproval: mocks.checkRequiresApproval,
  }),
}));

vi.mock('../src/components/admin/layout/WebsitePreviewFrame', () => ({
  WebsitePreviewFrame: ({ title, children }: any) => (
    <div data-testid="preview-frame" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock('../src/pages/ComingSoon', () => ({
  ComingSoon: ({ isPreview, previewSettings }: any) => {
    if (!isPreview) document.title = 'Access Denied | Ricorrenza';
    return (
      <div data-testid="coming-soon-preview" data-enabled={String(!!previewSettings?.coming_soon_enabled)}>
        {previewSettings?.coming_soon_title || 'RICORRENZA'}
      </div>
    );
  },
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  document.title = 'Navigation & site settings';
  mocks.updateSiteSettings.mockReset().mockResolvedValue(undefined);
  mocks.submitForApproval.mockReset().mockResolvedValue({ success: true });
  mocks.checkRequiresApproval.mockReset().mockResolvedValue(false);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const mount = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <SiteSettingsPanel />
      </MemoryRouter>
    );
  });
};

const getButton = (textOrLabel: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    btn => btn.getAttribute('aria-label') === textOrLabel || btn.textContent?.includes(textOrLabel)
  )!;

const clickButton = async (textOrLabel: string) => {
  const btn = getButton(textOrLabel);
  expect(btn, `Missing button: ${textOrLabel}`).toBeTruthy();
  await act(async () => {
    btn.click();
  });
};

const toggleSwitch = async (labelText: string) => {
  const label = [...container.querySelectorAll('label')].find(el => el.textContent?.includes(labelText));
  expect(label, `Missing switch label: ${labelText}`).toBeTruthy();
  const input = document.getElementById(label!.htmlFor) as HTMLInputElement;
  expect(input).toBeTruthy();
  await act(async () => {
    input.click();
  });
};

it('renders clean baseline status, preserves admin document title, and resets dirty state when reverted', async () => {
  await mount();
  expect(document.title).toBe('Navigation & site settings');
  expect(container.textContent).toContain('Website open to visitors');
  expect(container.textContent).toContain('0 of 7 pages locked');
  expect(getButton('Save settings').disabled).toBe(true);

  await toggleSwitch('Enable Coming Soon mode');
  expect(container.textContent).toContain('Coming soon gate active');
  expect(container.textContent).toContain('1 unsaved change');
  expect(getButton('Save settings').disabled).toBe(false);

  // Toggling back off cleanly clears dirty state
  await toggleSwitch('Enable Coming Soon mode');
  expect(getButton('Save settings').disabled).toBe(true);
});

it('reorders public navigation links in one click past hidden sports and saves clean payload', async () => {
  await mount();
  await clickButton('Navigation & landing');

  const moveSponsorsUp = getButton('Move Sponsors up');
  expect(moveSponsorsUp.disabled).toBe(false);
  await act(async () => {
    moveSponsorsUp.click();
  });

  const items = [...container.querySelectorAll('.ss-nav-item .ss-nav-info strong')].map(n => n.textContent);
  expect(items.slice(-2)).toEqual(['Sponsors', 'Rico Family']);

  await clickButton('Save settings');
  expect(mocks.updateSiteSettings).toHaveBeenCalledTimes(1);
  expect(mocks.updateSiteSettings.mock.calls[0][0]).not.toHaveProperty('registration_participant_types');
  expect(mocks.updateSiteSettings.mock.calls[0][0].navigation_order).toEqual([
    'home',
    'events',
    'schedule',
    'gallery',
    'home-bound',
    'sponsors',
    'rico-family',
  ]);
});

it('shows open status for unlocked pages, supports timed page locks, and preserves draft on save failure', async () => {
  await mount();
  await clickButton('Page locks');

  expect(container.textContent).toContain('Open to visitors');
  expect(container.textContent).not.toContain('Locked · Indefinite');

  const galleryCard = [...container.querySelectorAll('.ss-lock-card')].find(card =>
    card.textContent?.includes('/gallery')
  )!;
  expect(galleryCard).toBeTruthy();

  const timerModeBtn = [...galleryCard.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Timer')!;
  await act(async () => timerModeBtn.click());

  const add15m = [...galleryCard.querySelectorAll('button')].find(b => b.textContent?.includes('+15m'))!;
  await act(async () => add15m.click());

  expect(galleryCard.textContent).toContain('Until ');
  expect(container.textContent).toContain('1 of 7 pages locked');

  mocks.updateSiteSettings.mockRejectedValueOnce(new Error('Network failure'));
  await clickButton('Save settings');

  const alert = container.querySelector('[role="alert"]');
  expect(alert?.textContent).toContain('Network failure');
  expect(getButton('Save settings').disabled).toBe(false);

  await clickButton('Discard');
  expect(getButton('Save settings').disabled).toBe(true);
});
