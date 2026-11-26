// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Users } from 'lucide-react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrandMark } from '../src/components/BrandMark';
import { StaffPortalLayout } from '../src/components/StaffPortalLayout';
import { AdminAccessState } from '../src/components/admin/layout/AdminAccessState';
import { Footer } from '../src/components/Footer';
import StudentDashboardShell from '../src/components/dashboard/StudentDashboardShell';
import { DEFAULT_BRAND_LOGO, resolveBrandLogoUrl } from '../src/utils/brandLogo';

const mocks = vi.hoisted(() => ({
  homepageSettings: null as Record<string, any> | null,
  socialMediaSettings: {} as Record<string, any>,
}));

vi.mock('../src/context/CoreDataContext', () => ({
  useOptionalCoreData: () => ({ homepageSettings: mocks.homepageSettings }),
  useCoreData: () => ({ homepageSettings: mocks.homepageSettings }),
}));

vi.mock('../src/context/DataContext', () => ({
  useData: () => ({
    homepageSettings: mocks.homepageSettings,
    socialMediaSettings: mocks.socialMediaSettings,
  }),
}));

vi.mock('../src/components/dashboard/StudentDashboardTour', () => ({
  default: () => null,
}));

vi.mock('../src/components/CartDrawer', () => ({
  CartButton: () => null,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  mocks.homepageSettings = null;
  if (typeof HTMLDialogElement !== 'undefined') {
    HTMLDialogElement.prototype.showModal ??= vi.fn();
    HTMLDialogElement.prototype.close ??= vi.fn();
  }
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

it('resolves brand logos strictly to published settings, cache while loading, or official crest', () => {
  localStorage.setItem('rico_brand_logo_url', 'https://cdn.example/cached-logo.png');
  expect(resolveBrandLogoUrl(null, { allowCachedWhileLoading: true })).toBe('https://cdn.example/cached-logo.png');

  // When settings have loaded without a custom brand_logo_url, do not leak stale cache or /favicon.svg
  expect(resolveBrandLogoUrl({ brand_logo_url: '' }, { allowCachedWhileLoading: true })).toBe(DEFAULT_BRAND_LOGO);
  expect(resolveBrandLogoUrl({ brand_logo_url: '/favicon.svg' })).toBe(DEFAULT_BRAND_LOGO);

  // Poisoned cached /favicon.svg URL is rejected
  localStorage.setItem('rico_brand_logo_url', 'https://ricorrenza.fun/favicon.svg');
  expect(resolveBrandLogoUrl(null, { allowCachedWhileLoading: true })).toBe(DEFAULT_BRAND_LOGO);
});

it('renders published brand logo in StaffPortalLayout, AdminAccessState, Footer, and StudentDashboardShell with clean crest fallback', async () => {
  mocks.homepageSettings = {
    brand_logo_url: 'https://cdn.example/official-crest.png',
    updated_at: '2026-11-26',
  };

  await act(async () => {
    root.render(
      <MemoryRouter>
        <StaffPortalLayout
          title="Event Coordinator"
          eyebrow="Registration management"
          description="Sign in"
          icon={Users}
          storyTitle="Portal"
          storyDescription="Story"
          features={[]}
          footerLabel="Coordinator portal"
        >
          <div>Form</div>
        </StaffPortalLayout>
        <AdminAccessState state="loading" />
        <Footer />
        <StudentDashboardShell
          studentId="stu-1"
          profile={{ full_name: 'Student', avatar_url: null, batch: '2026' }}
          xpData={null}
          unreadCount={0}
          pendingInvitesCount={0}
          signOut={async () => {}}
        >
          <div>Body</div>
        </StudentDashboardShell>
      </MemoryRouter>
    );
  });

  const imgs = [...container.querySelectorAll('img')];
  expect(imgs.length).toBeGreaterThanOrEqual(4);
  for (const img of imgs) {
    expect(img.getAttribute('src')).toBe('https://cdn.example/official-crest.png?v=2026-11-26');
    expect(img.getAttribute('src')).not.toContain('/favicon.svg');
  }

  // Simulate load failure -> falls back to official crest, never /favicon.svg
  await act(async () => {
    root.render(<BrandMark settings={mocks.homepageSettings} />);
  });
  const mark = container.querySelector('img')!;
  expect(mark.getAttribute('src')).toBe('https://cdn.example/official-crest.png?v=2026-11-26');
  await act(async () => {
    mark.dispatchEvent(new Event('error'));
  });
  expect(mark.getAttribute('src')).toBe(DEFAULT_BRAND_LOGO);
});

it('removes the legacy cyan-triangle RICO SVG from public/favicon.svg and bans /favicon.svg references in src/', () => {
  const rootDir = path.resolve(__dirname, '..');
  const faviconSvg = fs.readFileSync(path.join(rootDir, 'public/favicon.svg'), 'utf8');
  expect(faviconSvg).not.toContain('>RICO<');
  expect(faviconSvg).not.toContain('#00f8ff');
  expect(faviconSvg).not.toContain('9b7bff');

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : /\.(ts|tsx|js|jsx|css|html)$/.test(entry.name) ? [full] : [];
    });

  const srcFiles = walk(path.join(rootDir, 'src'));
  const offenders: string[] = [];
  for (const file of srcFiles) {
    if (file.endsWith(path.join('utils', 'brandLogo.ts')) || file.endsWith(path.join('cinematic', 'portalLogoUrl.ts'))) {
      continue; // Explicitly matches and blocks /favicon.svg
    }
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('/favicon.svg')) {
      offenders.push(path.relative(rootDir, file));
    }
  }
  expect(offenders).toEqual([]);
});
