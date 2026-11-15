// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CinematicHome from '../src/components/cinematic/CinematicHome';
import { CLOUD_HOLD_MS, HOME_FADE_MS } from '../src/components/cinematic/scrollVideo';
import { INTRO_FALLBACK_KEY, INTRO_LIMITS } from '../src/components/cinematic/introCapability';

type State = { progress: number; start: number; end: number };
type Options = { onUpdate: (state: State) => void; onRefresh: (state: State) => void };
const mocks = vi.hoisted(() => ({ options: null as Options | null, state: { progress: 0, start: 0, end: 4800 }, create: vi.fn(), kill: vi.fn(), disconnect: vi.fn(), seek: vi.fn(), dispose: vi.fn(), controller: vi.fn(), support: vi.fn(), videoReady: true, sceneReady: true, fail: () => {} }));
const branding = vi.hoisted(() => ({ homepageSettings: { brand_logo_url: '/uploaded-logo.png', updated_at: '2026-11-15' } }));
const documentVisit = vi.hoisted(() => ({ eligible: true, played: false }));
vi.mock('../src/components/cinematic/documentIntro', () => ({
  canPlayDocumentIntro: () => documentVisit.eligible && !documentVisit.played,
  markDocumentIntroPlayed: () => { documentVisit.played = true; },
}));
vi.mock('../src/context/CoreDataContext', () => ({ useCoreData: () => branding }));
vi.mock('../src/components/cinematic/CinematicScene', () => ({ default: ({onReady,onFailure,variant,logoUrl}: {onReady:()=>void;onFailure:()=>void;variant:string;logoUrl:string}) => { useEffect(() => { if (mocks.sceneReady) onReady(); }, [onReady]); return <div data-scene data-variant={variant} data-logo-url={logoUrl} onClick={onFailure} />; } }));
vi.mock('../src/components/cinematic/introCapability', async importOriginal => ({ ...await importOriginal<typeof import('../src/components/cinematic/introCapability')>(), supportsCinematicIntro: mocks.support }));
vi.mock('../src/components/cinematic/VideoCloudTransition', () => ({ default: ({onReady}: {onReady:()=>void}) => <canvas data-video-clouds onClick={onReady} /> }));
vi.mock('gsap', () => ({ default: { registerPlugin: vi.fn() } }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: mocks.create } }));
vi.mock('../src/components/cinematic/scrollVideo', async importOriginal => ({
  ...await importOriginal<typeof import('../src/components/cinematic/scrollVideo')>(),
  createScrollVideoController: mocks.controller,
}));
let host: HTMLDivElement, root: Root, y: number, mounts: number, unmounts: number;
let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
let preferenceChange: (() => void) | undefined;
function ExistingHome() {
  useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
  return <><h1>Existing festival title</h1><a href="/events">Explore Events</a><a href="/schedule">View Schedule</a><input aria-label="Existing input" defaultValue="Keep me" /></>;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  documentVisit.eligible = true; documentVisit.played = false;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  y = 0; mounts = 0; unmounts = 0; mocks.options = null; mocks.state = { progress: 0, start: 0, end: 4800 };
  sessionStorage.clear(); delete document.documentElement.dataset.staticExperience;
  mocks.support.mockResolvedValue(true); mocks.videoReady = true; mocks.sceneReady = true;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  branding.homepageSettings = { brand_logo_url: '/uploaded-logo.png', updated_at: '2026-11-15' };
  mocks.create.mockImplementation((options: Options) => { mocks.options = options; return { ...mocks.state, kill: mocks.kill, refresh: vi.fn() }; });
  mocks.controller.mockImplementation((_video, callbacks) => { if (mocks.videoReady) callbacks.onReady(); mocks.fail = callbacks.onFailure; return { seek: mocks.seek, dispose: mocks.dispose }; });
  preference = { matches: false, addEventListener: vi.fn((_event, listener) => { preferenceChange = listener; }), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() { mocks.disconnect(); } });
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, -y, 100, 800));
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(4800);
  window.history.replaceState(null, '', '/');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); delete document.documentElement.dataset.cinematicIntro; delete document.documentElement.dataset.staticExperience; });
async function mount() { await act(async () => root.render(<CinematicHome><ExistingHome /></CinematicHome>)); }
async function cloudLoaded() { await act(async () => host.querySelector('[data-video-clouds]')!.dispatchEvent(new MouseEvent('click', {bubbles:true}))); }
async function progressTo(progress: number) { y = 4800 * progress; mocks.state.progress = progress; await act(async () => mocks.options!.onUpdate(mocks.state)); }
async function tick(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }

it('holds the cloud ending before revealing the same live Home, including on a fast scroll to the end', async () => {
  await mount(); await cloudLoaded();
  const page = host.querySelector<HTMLElement>('[data-cinematic-homepage]')!, title = host.querySelector('h1'), input = host.querySelector<HTMLInputElement>('input')!;
  input.value = 'Preserved editing';
  expect(page.inert).toBe(true);
  await progressTo(1);
  expect(host.querySelector('[data-video-clouds]')).not.toBeNull();
  expect(host.querySelector('img.cinematic-cloud-ending')).toBeNull();
  expect(host.querySelector<HTMLElement>('[data-cinematic-overlay]')!.style.opacity).toBe('1');
  expect(page.inert).toBe(true);
  await tick(CLOUD_HOLD_MS - 1); expect(page.inert).toBe(true);
  await tick(1); await progressTo(1); expect(host.querySelector<HTMLElement>('[data-cinematic-overlay]')!.style.opacity).toBe('0');
  expect(page.inert).toBe(true);
  await tick(HOME_FADE_MS);
  expect(page.inert).toBe(false); expect(page.hasAttribute('aria-hidden')).toBe(false);
  expect(host.querySelector('h1')).toBe(title); expect(input.value).toBe('Preserved editing');
  expect(host.querySelector('a[href="/events"]')?.textContent).toBe('Explore Events');
  expect(host.querySelector('a[href="/schedule"]')?.textContent).toBe('View Schedule');
  expect(mounts).toBe(1); expect(unmounts).toBe(0);
  await progressTo(.3);
  expect(page.inert).toBe(true); expect(mocks.seek).toHaveBeenLastCalledWith(.3);
  expect(host.querySelector<HTMLElement>('[data-cinematic-overlay]')!.style.visibility).toBe('visible');
  expect(host.querySelector('h1')).toBe(title);
});

it('does not reveal Home before the film-sampled clouds are ready and cancels the hold when reversing', async () => {
  await mount(); await progressTo(1); await tick(2000);
  expect(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!.inert).toBe(true);
  await cloudLoaded(); await tick(CLOUD_HOLD_MS / 2); await progressTo(.5); await tick(2000);
  expect(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!.inert).toBe(true);
  await progressTo(1); await tick(CLOUD_HOLD_MS); await progressTo(1); await tick(HOME_FADE_MS);
  expect(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!.inert).toBe(false);
});

it('Skip Intro goes straight to the original Home endpoint and restores focus', async () => {
  const move = vi.fn(); window.addEventListener('rico:scroll-to', move);
  await mount();
  const page = host.querySelector<HTMLElement>('[data-cinematic-homepage]')!, focus = vi.spyOn(page, 'focus');
  await act(async () => host.querySelector<HTMLButtonElement>('.cinematic-skip')!.click());
  expect((move.mock.calls[0][0] as CustomEvent).detail).toEqual({ top: 0 });
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  expect(page.inert).toBe(false); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(host.querySelector('video')).toBeNull(); expect(mocks.dispose).toHaveBeenCalledTimes(1);
  window.removeEventListener('rico:scroll-to', move);
});

it('clamps a fast swipe to the real hero start while the cloud ending still covers the page', async () => {
  await mount(); await cloudLoaded(); await progressTo(1);
  y = 6800;
  await tick(CLOUD_HOLD_MS); y = 6800; mocks.state.progress = 1; await act(async () => mocks.options!.onUpdate(mocks.state));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 4800, behavior: 'instant' });
  expect(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!.inert).toBe(true);
  await tick(HOME_FADE_MS);
  expect(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!.inert).toBe(false);
});

it('bypasses video loading for reduced motion and homepage deep links', async () => {
  preference.matches = true; await mount();
  expect(host.querySelector('video')).toBeNull(); expect(mocks.controller).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  await act(async () => root.render(null)); preference.matches = false; window.history.replaceState(null, '', '/#artist-12'); await mount();
  expect(host.querySelector('video')).toBeNull(); expect(host.querySelector('h1')?.textContent).toBe('Existing festival title');
});

it('resets to the same homepage start if reduced motion is enabled during the film', async () => {
  await mount(); await progressTo(.6);
  const input = host.querySelector<HTMLInputElement>('input')!; input.value = 'Saved state';
  preference.matches = true; await act(async () => preferenceChange?.());
  expect(host.querySelector('video')).toBeNull(); expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  expect(host.querySelector('input')).toBe(input); expect(input.value).toBe('Saved state'); expect(mocks.dispose).toHaveBeenCalledTimes(1);
});

it('automatically opens the same live homepage on media failure and releases decoder, timers and only its own trigger', async () => {
  await mount(); await cloudLoaded(); await progressTo(.97);
  vi.spyOn(host.querySelector<HTMLElement>('[data-cinematic-homepage]')!, 'focus').mockImplementation(() => {});
  await act(async () => mocks.fail());
  expect(host.querySelector('video')).toBeNull(); expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(mocks.kill).toHaveBeenCalledTimes(1); expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  expect(document.documentElement.dataset.cinematicIntro).toBeUndefined();
  await tick(0); // Flush jsdom's asynchronous session-storage notification.
  expect(vi.getTimerCount()).toBe(0);
  expect(host.querySelector('[data-cinematic-homepage]')?.getAttribute('aria-hidden')).toBeNull();
  expect(sessionStorage.getItem(INTRO_FALLBACK_KEY)).toBe('video-failed');
});

it.each([
  { cores: 2, memory: 8, ua: 'Mozilla/5.0' },
  { cores: 8, memory: 4, ua: 'Mozilla/5.0 (Linux; Android 14) Mobile' },
  { cores: 6, memory: undefined, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X)' },
])('opens Home immediately on limited/older hardware without downloading intro media: %j', async ({cores,memory,ua}) => {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(cores);
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: memory });
  await mount();
  expect(host.querySelector('video')).toBeNull(); expect(host.querySelector('[data-cinematic-overlay]')).toBeNull();
  expect(mocks.controller).not.toHaveBeenCalled(); expect(mocks.support).not.toHaveBeenCalled();
  expect(host.querySelector('a[href="/events"]')).not.toBeNull();
  delete (navigator as Navigator & {deviceMemory?: number}).deviceMemory;
});

it('waits for codec/GPU approval before assigning the film source and bypasses a failed check', async () => {
  let finish!: (ready: boolean) => void;
  mocks.support.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve; }));
  await mount();
  expect(host.querySelector('video')?.getAttribute('src')).toBeNull(); expect(mocks.controller).not.toHaveBeenCalled();
  await act(async () => finish(false));
  expect(host.querySelector('video')).toBeNull(); expect(mocks.controller).not.toHaveBeenCalled();
  expect(host.querySelector('[data-intro-bypass]')?.getAttribute('data-intro-bypass')).toBe('unsupported-device');
});

it('does not retry an intro that already failed in this tab', async () => {
  sessionStorage.setItem(INTRO_FALLBACK_KEY, 'video-failed');
  await mount();
  expect(host.querySelector('video')).toBeNull(); expect(mocks.support).not.toHaveBeenCalled();
});

it.each(['probe', 'videoStart', 'sceneStart', 'transition'] as const)('bounds a stalled %s phase and restores the real Home automatically', async phase => {
  if (phase === 'probe') mocks.support.mockReturnValue(new Promise(() => {}));
  if (phase === 'videoStart') mocks.videoReady = false;
  if (phase === 'sceneStart') mocks.sceneReady = false;
  await mount();
  const input = host.querySelector<HTMLInputElement>('input')!; input.value = 'Preserved';
  if (phase === 'sceneStart') await progressTo(.4);
  if (phase === 'transition') await progressTo(.6);
  await tick(INTRO_LIMITS[phase] - 1); expect(host.querySelector('[data-cinematic-overlay]')).not.toBeNull();
  await tick(1);
  expect(host.querySelector('[data-cinematic-overlay]')).toBeNull();
  expect(host.querySelector('[data-cinematic-homepage]')?.hasAttribute('aria-hidden')).toBe(false);
  expect(input.value).toBe('Preserved'); expect(mounts).toBe(1); expect(unmounts).toBe(0);
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
});

it('opens Home on actual renderer failure without leaving an error panel or blocking links', async () => {
  await mount(); await progressTo(.4);
  await act(async () => host.querySelector('[data-scene]')!.dispatchEvent(new MouseEvent('click', {bubbles:true})));
  expect(host.querySelector('[data-cinematic-overlay]')).toBeNull();
  expect(host.querySelector('a[href="/schedule"]')?.textContent).toBe('View Schedule');
  expect(mocks.dispose).toHaveBeenCalledOnce();
});

it('opens Home if the connection goes offline during the film', async () => {
  await mount();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  await act(async () => window.dispatchEvent(new Event('offline')));
  expect(host.querySelector('video')).toBeNull();
  expect(host.querySelector('[data-intro-bypass]')?.getAttribute('data-intro-bypass')).toBe('offline');
});

it('keeps look-around inside the live intro without a separate viewer link or route', async () => {
  await mount(); await cloudLoaded(); await progressTo(.6); await tick(CLOUD_HOLD_MS); await progressTo(.74);
  const overlay=host.querySelector<HTMLElement>('[data-cinematic-overlay]')!;
  expect(overlay.dataset.lookActive).toBe('true');
  expect(host.querySelector('a[href="/character-preview"]')).toBeNull();
  expect(host.querySelector<HTMLElement>('.cinematic-look-hint')!.hidden).toBe(false);
  const title=host.querySelector('h1');await progressTo(.8);
  expect(host.querySelector('h1')).toBe(title);
  await progressTo(.91);expect(overlay.dataset.lookActive).toBe('false');
});

it('keeps a ready live portal scene after 20 seconds instead of replacing it with a picture', async () => {
  await mount(); await progressTo(.4);
  expect(host.querySelector('[data-scene]')?.getAttribute('data-variant')).toBe('portal');
  expect(host.querySelector('[data-scene-state]')?.getAttribute('data-scene-state')).toBe('ready');
  await tick(25000);
  expect(host.querySelector('[data-scene-state]')?.getAttribute('data-scene-state')).toBe('ready');
  expect(host.querySelector('.cinematic-light-realm')).toBeNull();
  expect(host.querySelector('.cinematic-scene-stage img')).toBeNull();
});

it('updates the live portal from published branding without resetting the intro or existing Home', async () => {
  await mount(); await progressTo(.75);
  const title = host.querySelector('h1'), scene = host.querySelector('[data-scene]');
  expect(scene?.getAttribute('data-logo-url')).toBe('/uploaded-logo.png?v=2026-11-15');
  branding.homepageSettings = { brand_logo_url: '/new-logo.webp', updated_at: '2026-11-16' };
  await mount();
  expect(host.querySelector('[data-scene]')).toBe(scene);
  expect(scene?.getAttribute('data-logo-url')).toBe('/new-logo.webp?v=2026-11-16');
  expect(host.querySelector('h1')).toBe(title);
  expect(mocks.create).toHaveBeenCalledTimes(1); expect(mounts).toBe(1);
});

it('does not replay an unfinished film when Home remounts after another page', async () => {
  await mount();
  expect(host.querySelector('[data-cinematic-overlay]')).not.toBeNull();
  const checks = mocks.support.mock.calls.length;
  const controllers = mocks.controller.mock.calls.length;
  await act(async () => root.render(<div>Events page</div>));
  await mount();
  expect(host.querySelector('[data-intro-bypass]')?.getAttribute('data-intro-bypass')).toBe('navigation');
  expect(host.querySelector('[data-cinematic-overlay]')).toBeNull();
  expect(host.querySelector('video')).toBeNull();
  expect(host.querySelector('a[href="/events"]')).not.toBeNull();
  expect(mocks.support).toHaveBeenCalledTimes(checks);
  expect(mocks.controller).toHaveBeenCalledTimes(controllers);
});

it('opens Home directly when the document entry is no longer eligible', async () => {
  documentVisit.eligible = false;
  await mount();
  expect(host.querySelector('[data-intro-bypass]')?.getAttribute('data-intro-bypass')).toBe('navigation');
  expect(host.querySelector('[data-cinematic-overlay]')).toBeNull();
  expect(mocks.support).not.toHaveBeenCalled();
  expect(mocks.controller).not.toHaveBeenCalled();
});

it('keeps the first entry intro enabled during StrictMode effect replay', async () => {
  await act(async () => root.render(<React.StrictMode><CinematicHome><ExistingHome /></CinematicHome></React.StrictMode>));
  expect(documentVisit.played).toBe(true);
  expect(host.querySelector('[data-cinematic-overlay]')).not.toBeNull();
  expect(host.querySelector('[data-intro-mode]')?.getAttribute('data-intro-mode')).toBe('video-3d');
});
