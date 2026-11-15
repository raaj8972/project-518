// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { SpiderHeroContent } from '../src/components/ui/SpiderHeroContent';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: { hero_title: 'RICO', hero_subtitle: 'Campus festival' } }) }));
const festivalArtwork = '/images/ricorrenza-emerald-environment.webp';
let element: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('IntersectionObserver', undefined);
  element = document.createElement('div'); document.body.appendChild(element); root = createRoot(element);
});
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(props: React.ComponentProps<typeof SpiderHeroContent> = {}) {
  await act(async () => root.render(<MemoryRouter><SpiderHeroContent {...props} /></MemoryRouter>));
}

it('loads the clean scene plate without flashing the old painted island while retaining copy and navigation', async () => {
  await render();
  expect(element.querySelector('video')).toBeNull();
  expect(element.querySelector('.festival-environment-plate')?.getAttribute('src')).toBe(festivalArtwork);
  expect(element.querySelector('.spider-hero-city')).toBeNull();
  expect(element.querySelector('h1')?.textContent).toBe('RICO');
  expect(element.querySelector('.spider-hero-subtitle')?.textContent).toBe('Campus festival');
  expect(element.querySelector('a[href="/events"]')?.textContent).toContain('Explore Events');
  expect(element.querySelector('a[href="/schedule"]')?.textContent).toContain('View Schedule');
});

it('plays configured mobile video and poster without downloading the desktop version', async () => {
  await render({ mobile: true, media: { video_url: '/desktop.mp4', mobile_video_url: '/mobile.mp4', mobile_poster_url: '/mobile.jpg' } as any });
  const video = element.querySelector('video')!;
  expect(video.getAttribute('src')).toBe('/mobile.mp4');
  expect(video.getAttribute('poster')).toBe('/mobile.jpg');
  expect(video.muted && video.loop && video.playsInline).toBe(true);
  expect(element.querySelector('.spider-hero-city')).toBeNull();
  await act(async () => video.dispatchEvent(new Event('canplay')));
  expect(video.play).toHaveBeenCalled();
});

it('replaces an unavailable configured clip with festival artwork and recovers when the configured source changes', async () => {
  await render({ media: { video_url: '/unavailable.mp4' } as any });
  const video = element.querySelector('video')!;
  expect(video.getAttribute('src')).toBe('/unavailable.mp4');
  await act(async () => video.dispatchEvent(new Event('error')));
  expect(element.querySelector('video')).toBeNull();
  expect(element.querySelector('.festival-environment-plate')?.getAttribute('src')).toBe(festivalArtwork);
  expect(element.querySelector('.spider-hero-city')).toBeNull();
  await render({ media: { video_url: '/replacement.mp4' } as any });
  expect(element.querySelector('video')?.getAttribute('src')).toBe('/replacement.mp4');
  expect(element.querySelector('.spider-hero-city')).toBeNull();
});

it('honors configured device images and an explicitly disabled background', async () => {
  const media = { enabled: true, background_type: 'image', image_url: '/desktop.jpg', mobile_image_url: '/portrait.jpg' } as any;
  await render({ media, mobile: true });
  expect(element.querySelector('video')).toBeNull();
  expect(element.querySelector('.spider-hero-video')?.getAttribute('src')).toBe('/portrait.jpg');
  await render({ media });
  expect(element.querySelector('.spider-hero-video')?.getAttribute('src')).toBe('/desktop.jpg');
  await render({ media: { enabled: false, video_url: '/desktop.mp4' } as any });
  expect(element.querySelector('.spider-hero-video')).toBeNull();
  expect(element.querySelector('video')).toBeNull();
  expect(element.querySelector('h1')?.textContent).toBe('RICO');
});
