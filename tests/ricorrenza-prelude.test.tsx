// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RicorrenzaPrelude, { LOGO_ASSET_WAIT_MS, LOGO_PRELUDE_MS, LOGO_WEB_WIPE_MS } from '../src/components/cinematic/RicorrenzaPrelude';

// Renderer lifecycle is exercised separately; this suite owns title timing/input.
vi.mock('../src/components/cinematic/titleAtmosphereRenderer', () => ({ createTitleAtmosphereRenderer: () => null }));
const webCallbacks = vi.hoisted(() => ({ covered: () => {}, complete: () => {} }));
vi.mock('../src/components/cinematic/IntroWebWipe', () => ({ default: ({ running, paused, durationMs, onCovered, onComplete }: {
  running: boolean; paused: boolean; durationMs: number; onCovered: () => void; onComplete: () => void;
}) => {
  webCallbacks.covered = onCovered; webCallbacks.complete = onComplete;
  return <div data-web-wipe data-running={running} data-paused={paused} data-duration={durationMs} />;
} }));

type PendingImage = { onload: (() => void) | null; onerror: (() => void) | null; src: string; complete: boolean };
let host: HTMLDivElement, root: Root, hidden: boolean, images: PendingImage[];
let onComplete: ReturnType<typeof vi.fn>;
const prelude = () => host.querySelector<HTMLElement>('[data-logo-prelude]')!;
async function tick(milliseconds: number) { await act(async () => vi.advanceTimersByTime(milliseconds)); }
async function mount(strict = false) {
  await act(async () => root.render(strict
    ? <React.StrictMode><RicorrenzaPrelude onComplete={onComplete} /></React.StrictMode>
    : <RicorrenzaPrelude onComplete={onComplete} />));
}
async function settleImages(failed = false) {
  await act(async () => { for (const image of images) (failed ? image.onerror : image.onload)?.(); });
}
async function visibility(value: boolean) {
  hidden = value;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
}

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  hidden = false; images = []; onComplete = vi.fn();
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal('Image', class {
    onload = null; onerror = null; src = ''; complete = false;
    constructor() { images.push(this); }
  });
  document.documentElement.style.overflow = 'clip';
  document.body.style.overflow = 'auto';
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  document.documentElement.style.overflow = ''; document.body.style.overflow = '';
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it('starts its full five-second reveal after its artwork is ready and completes once', async () => {
  await mount();
  expect(images.length).toBeGreaterThan(0);
  expect(prelude().dataset.running).not.toBe('true');
  await tick(600);
  expect(onComplete).not.toHaveBeenCalled();
  await settleImages();
  expect(prelude().dataset.running).toBe('true');
  await tick(LOGO_PRELUDE_MS - 1);
  expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(onComplete).toHaveBeenCalledOnce();
  await tick(LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
});

it('starts the web in the final second, hides the title only under cover, and completes once at five seconds', async () => {
  await mount(); await settleImages();
  await tick(LOGO_PRELUDE_MS - LOGO_WEB_WIPE_MS - 1);
  expect(prelude().dataset.webTransitionStarted).not.toBe('true');
  expect(prelude().dataset.webCovered).not.toBe('true');
  expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(prelude().dataset.webTransitionStarted).toBe('true');
  const web = host.querySelector<HTMLElement>('[data-web-wipe]')!;
  expect(web.dataset.running).toBe('true');
  expect(web.dataset.duration).toBe(String(LOGO_WEB_WIPE_MS));
  const content = host.querySelector('.rico-title-content');
  expect(content).not.toBeNull();
  await act(async () => webCallbacks.covered());
  expect(prelude().dataset.webCovered).toBe('true');
  expect(host.querySelector('.rico-title-content')).toBe(content);
  expect(onComplete).not.toHaveBeenCalled();
  await tick(LOGO_WEB_WIPE_MS - 1);
  expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(onComplete).toHaveBeenCalledOnce();
  await act(async () => webCallbacks.complete());
  expect(onComplete).toHaveBeenCalledOnce();
});

it('pauses the web start and active wipe along with the title when the tab is hidden', async () => {
  await mount(); await settleImages(); await tick(3000);
  await visibility(true); await tick(20000);
  expect(prelude().dataset.webTransitionStarted).not.toBe('true');
  await visibility(false); await tick(1000);
  expect(prelude().dataset.webTransitionStarted).toBe('true');
  await tick(200); await visibility(true);
  expect(host.querySelector<HTMLElement>('[data-web-wipe]')?.dataset.paused).toBe('true');
  await tick(20000);
  expect(onComplete).not.toHaveBeenCalled();
  await visibility(false);
  expect(host.querySelector<HTMLElement>('[data-web-wipe]')?.dataset.paused).not.toBe('true');
  await tick(799);
  expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(onComplete).toHaveBeenCalledOnce();
});

it('does not let stalled or failed artwork leave the opening blocked', async () => {
  await mount();
  await tick(LOGO_ASSET_WAIT_MS);
  expect(prelude().dataset.running).toBe('true');
  await tick(LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
  // A late image callback cannot start another reveal or complete it twice.
  await settleImages(true); await tick(LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
});

it('starts the reveal immediately when the artwork settles with errors', async () => {
  await mount(); await settleImages(true);
  expect(prelude().dataset.running).toBe('true');
  await tick(LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
});

it('pauses in a hidden tab and resumes only the remaining reveal time', async () => {
  await mount(); await settleImages(); await tick(1800);
  await visibility(true);
  expect(prelude().dataset.paused).toBe('true');
  await tick(20000);
  expect(onComplete).not.toHaveBeenCalled();
  await visibility(false);
  expect(prelude().dataset.paused).not.toBe('true');
  await tick(LOGO_PRELUDE_MS - 1800 - 1);
  expect(onComplete).not.toHaveBeenCalled();
  await tick(1);
  expect(onComplete).toHaveBeenCalledOnce();
});

it('does not consume its artwork wait while the document is hidden', async () => {
  await mount(); await tick(400); await visibility(true); await tick(20000);
  expect(prelude().dataset.running).not.toBe('true');
  expect(onComplete).not.toHaveBeenCalled();
  await visibility(false); await tick(LOGO_ASSET_WAIT_MS - 400 - 1);
  expect(prelude().dataset.running).not.toBe('true');
  await tick(1);
  expect(prelude().dataset.running).toBe('true');
});

it('blocks scrolling, supports Escape, and restores the previous page styles on unmount', async () => {
  await mount();
  expect(document.documentElement.style.overflow).toBe('hidden');
  expect(document.body.style.overflow).toBe('hidden');
  const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true });
  const touch = new Event('touchmove', { bubbles: true, cancelable: true });
  const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  const letter = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
  await act(async () => {
    prelude().dispatchEvent(wheel); prelude().dispatchEvent(touch);
    prelude().dispatchEvent(down); prelude().dispatchEvent(letter);
  });
  expect(wheel.defaultPrevented).toBe(true);
  expect(touch.defaultPrevented).toBe(true);
  expect(down.defaultPrevented).toBe(true);
  expect(letter.defaultPrevented).toBe(false);
  await act(async () => prelude().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(onComplete).toHaveBeenCalledOnce();
  await act(async () => root.render(null));
  expect(document.documentElement.style.overflow).toBe('clip');
  expect(document.body.style.overflow).toBe('auto');
  const after = new WheelEvent('wheel', { bubbles: true, cancelable: true });
  document.dispatchEvent(after);
  expect(after.defaultPrevented).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it('offers a keyboard skip and cancels pending completion when it unmounts', async () => {
  await mount();
  const skip = host.querySelector<HTMLButtonElement>('button');
  expect(skip?.textContent).toContain('Skip title animation');
  await act(async () => skip!.click());
  expect(onComplete).toHaveBeenCalledOnce();
  await act(async () => root.render(null));
  await settleImages(); await tick(LOGO_ASSET_WAIT_MS + LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('preserves native Space activation when the keyboard skip button has focus', async () => {
  await mount();
  const skip = host.querySelector<HTMLButtonElement>('button')!;
  skip.focus();
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  await act(async () => skip.dispatchEvent(space));
  // Preventing this default action suppresses the browser's native button click.
  expect(space.defaultPrevented).toBe(false);
  const pageSpace = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  await act(async () => prelude().dispatchEvent(pageSpace));
  expect(pageSpace.defaultPrevented).toBe(true);
});

it('cancels an unfinished reveal when navigation unmounts it', async () => {
  await mount(); await settleImages(); await tick(1500);
  await act(async () => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
  await tick(LOGO_PRELUDE_MS);
  expect(onComplete).not.toHaveBeenCalled();
  expect(document.documentElement.style.overflow).toBe('clip');
  expect(document.body.style.overflow).toBe('auto');
});

it('keeps one live reveal through StrictMode effect replay', async () => {
  await mount(true); await settleImages();
  expect(prelude().dataset.running).toBe('true');
  expect(document.body.style.overflow).toBe('hidden');
  await tick(LOGO_PRELUDE_MS);
  expect(onComplete).toHaveBeenCalledOnce();
  await act(async () => root.render(null));
  expect(document.body.style.overflow).toBe('auto');
  expect(vi.getTimerCount()).toBe(0);
});
