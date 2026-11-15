// @vitest-environment jsdom
import React, { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpiderWebTransition } from '../src/components/ui/spider/SpiderWebTransition';

let host: HTMLDivElement;
let root: Root | null;
let router: ReturnType<typeof createMemoryRouter> | undefined;
let reducedMotion = false;
let updateEnabled: ((enabled: boolean) => void) | undefined;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  reducedMotion = false;
  updateEnabled = undefined;
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
    media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  router?.dispose();
  router = undefined;
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function Location() {
  const location = useLocation();
  return <output data-location>{location.pathname}{location.search}{location.hash}</output>;
}

function TransitionRoot({ initialEnabled, children }: { initialEnabled: boolean; children: ReactNode }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  updateEnabled = setEnabled;
  return <><SpiderWebTransition enabled={enabled} />{children}<Location /><Outlet /></>;
}

async function render(children: ReactNode, options: { entries?: string[]; enabled?: boolean } = {}) {
  router = createMemoryRouter([{
    path: '/',
    element: <TransitionRoot initialEnabled={options.enabled ?? true}>{children}</TransitionRoot>,
    children: [{ path: '*', element: null }],
  }], { initialEntries: options.entries ?? ['/events'], future: { v7_relativeSplatPath: true } });
  await act(async () => root!.render(<RouterProvider router={router!} future={{ v7_startTransition: true }} />));
}

async function click(target: Element, options: MouseEventInit = {}) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX: 140, clientY: 180, detail: 1, ...options });
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

async function advance(ms: number) {
  await act(async () => { vi.advanceTimersByTime(ms); });
}

function phase() {
  return document.querySelector<HTMLElement>('[data-spider-web-transition]')?.dataset.phase;
}

function location() {
  return host.querySelector('[data-location]')!.textContent;
}

function expectIdle() {
  expect(phase()).not.toBe('shooting');
  expect(phase()).not.toBe('revealing');
}

it('covers an actual page change before following a React link, without replaying its click handler', async () => {
  const action = vi.fn();
  await render(<Link to="/schedule" onClick={action}><span>Schedule</span></Link>);
  await click(host.querySelector('a span')!);
  expect(action).toHaveBeenCalledTimes(1);
  expect(phase()).toBe('shooting');
  expect(location()).toBe('/events');
  await advance(519);
  expect(location()).toBe('/events');
  await advance(1);
  expect(location()).toBe('/schedule');
  expect(action).toHaveBeenCalledTimes(1);
  expect(phase()).toBe('revealing');
  await advance(380);
  expectIdle();
});

it('handles a native same-origin page link through the same navigation transition', async () => {
  const action = vi.fn();
  await render(<a href="/schedule" onClick={action}>Schedule</a>);
  const event = await click(host.querySelector('a')!);
  expect(event.defaultPrevented).toBe(true);
  expect(action).toHaveBeenCalledTimes(1);
  expect(location()).toBe('/events');
  expect(phase()).toBe('shooting');
  await advance(520);
  expect(location()).toBe('/schedule');
  expect(action).toHaveBeenCalledTimes(1);
});

function NavigateButton({ action }: { action: () => void }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => { action(); navigate('/schedule'); }}>View schedule</button>;
}

it('animates button-driven useNavigate page changes while executing the original action immediately once', async () => {
  const action = vi.fn();
  await render(<NavigateButton action={action} />);
  await click(host.querySelector('button')!);
  expect(action).toHaveBeenCalledTimes(1);
  expect(location()).toBe('/events');
  expect(phase()).toBe('shooting');
  await advance(520);
  expect(location()).toBe('/schedule');
  expect(action).toHaveBeenCalledTimes(1);
});

it('covers browser-back navigation between festival pages', async () => {
  await render(null, { entries: ['/events', '/schedule'] });
  await act(async () => { void router!.navigate(-1); });
  expect(location()).toBe('/schedule');
  expect(phase()).toBe('shooting');
  await advance(520);
  expect(location()).toBe('/events');
  expect(phase()).toBe('revealing');
});

it('supports keyboard activation of page links', async () => {
  await render(<Link to="/schedule">Schedule</Link>);
  await act(async () => { host.querySelector('a')!.click(); });
  expect(phase()).toBe('shooting');
  expect(location()).toBe('/events');
  await advance(520);
  expect(location()).toBe('/schedule');
});

it('accepts the first touch-generated page-link click', async () => {
  await render(<Link to="/schedule">Schedule</Link>);
  const anchor = host.querySelector('a')!;
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerType: 'touch', pointerId: 1, clientX: 140, clientY: 180 });
    await act(async () => { anchor.dispatchEvent(event); });
  }
  await click(anchor);
  expect(phase()).toBe('shooting');
  expect(location()).toBe('/events');
  await advance(520);
  expect(location()).toBe('/schedule');
});

it('recognizes page links clicked through a decorative hidden icon', async () => {
  await render(<Link to="/schedule"><svg aria-hidden="true"><path d="M0 0L10 10" /></svg>Schedule</Link>);
  await click(host.querySelector('path')!);
  expect(phase()).toBe('shooting');
  await advance(520);
  expect(location()).toBe('/schedule');
});

it('keeps the first destination during repeated clicks and accepts a fresh navigation after the reveal', async () => {
  await render(<><Link to="/schedule">Schedule</Link><Link to="/gallery">Gallery</Link></>);
  const [schedule, gallery] = host.querySelectorAll('a');
  await click(schedule);
  await advance(200);
  await click(gallery);
  await advance(320);
  expect(location()).toBe('/schedule');
  expect(phase()).toBe('revealing');
  await click(gallery);
  expect(location()).toBe('/schedule');
  await advance(380);
  expectIdle();
  await click(gallery);
  expect(phase()).toBe('shooting');
  await advance(520);
  expect(location()).toBe('/gallery');
});

function LocalAction({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" data-spider-web="open" aria-expanded={open} onClick={() => setOpen(true)}>{label}</button>{open && <div role="dialog">Opened {label}</div>}</>;
}

it.each(['popup', 'mobile menu', 'event details'])('opens %s immediately without a page-transition web', async label => {
  await render(<LocalAction label={label} />);
  await click(host.querySelector('button')!);
  expect(host.querySelector('[role="dialog"]')?.textContent).toBe(`Opened ${label}`);
  expect(location()).toBe('/events');
  expectIdle();
  await advance(1000);
  expectIdle();
});

it.each(['/events?tab=upcoming', '/events#details'])('does not animate same-page navigation to %s', async to => {
  await render(<Link to={to}>Change tab</Link>);
  await click(host.querySelector('a')!);
  expect(location()).toBe(to);
  expectIdle();
});

it.each([
  ['external', <a href="https://example.org/">External</a>],
  ['new tab', <a href="/schedule" target="_blank">New tab</a>],
  ['download', <a href="/schedule" download>Download</a>],
  ['email', <a href="mailto:test@example.org">Email</a>],
  ['telephone', <a href="tel:5550100">Call</a>],
] as const)('preserves %s actions without a web or deferred replay', async (_name, content) => {
  await render(content);
  const target = host.querySelector('a')!;
  const action = vi.fn();
  target.addEventListener('click', action);
  const intercepted: boolean[] = [];
  // Run after the transition's document listener, so native navigation can be
  // suppressed in jsdom without concealing incorrect interception by the effect.
  const guard = (event: MouseEvent) => { intercepted.push(event.defaultPrevented); event.preventDefault(); };
  document.addEventListener('click', guard);
  try {
    await click(target);
    expect(action).toHaveBeenCalledTimes(1);
    expect(intercepted).toEqual([false]);
    expectIdle();
    expect(location()).toBe('/events');
    await advance(1000);
    expect(action).toHaveBeenCalledTimes(1);
  } finally { document.removeEventListener('click', guard); }
});

it.each([
  ['control', { ctrlKey: true }],
  ['command', { metaKey: true }],
  ['shift', { shiftKey: true }],
  ['alt', { altKey: true }],
  ['nonprimary', { button: 1 }],
] as const)('preserves %s clicks', async (_name, options) => {
  const action = vi.fn();
  await render(<Link to="/schedule" onClick={action}>Schedule</Link>);
  const intercepted: boolean[] = [];
  const guard = (event: MouseEvent) => { intercepted.push(event.defaultPrevented); event.preventDefault(); };
  document.addEventListener('click', guard);
  try {
    await click(host.querySelector('a')!, options);
    expect(action).toHaveBeenCalledTimes(1);
    expect(intercepted).toEqual([false]);
    expectIdle();
    expect(location()).toBe('/events');
  } finally { document.removeEventListener('click', guard); }
});

it('allows a link handler to cancel navigation without displaying webs', async () => {
  await render(<Link to="/schedule" onClick={event => event.preventDefault()}>Stay here</Link>);
  await click(host.querySelector('a')!);
  expect(location()).toBe('/events');
  expectIdle();
});

it('skips the visual delay when the transition is disabled', async () => {
  await render(<Link to="/schedule">Schedule</Link>, { enabled: false });
  await click(host.querySelector('a')!);
  expect(location()).toBe('/schedule');
  expectIdle();
});

it('cancels a pending transition when the effect is disabled, then allows ordinary navigation', async () => {
  await render(<Link to="/schedule">Schedule</Link>);
  await click(host.querySelector('a')!);
  expect(phase()).toBe('shooting');
  await advance(200);
  await act(async () => { updateEnabled!(false); });
  expectIdle();
  expect(location()).toBe('/events');
  expect(vi.getTimerCount()).toBe(0);
  await advance(1000);
  expect(location()).toBe('/events');
  await click(host.querySelector('a')!);
  expect(location()).toBe('/schedule');
  expectIdle();
});

it('honors an explicit opt-out on a page-link ancestor', async () => {
  await render(<div data-spider-web="off"><Link to="/schedule">Schedule</Link></div>);
  await click(host.querySelector('a')!);
  expect(location()).toBe('/schedule');
  expectIdle();
});

it('skips the overlay and delay for reduced motion', async () => {
  reducedMotion = true;
  await render(<Link to="/schedule">Schedule</Link>);
  await click(host.querySelector('a')!);
  expect(location()).toBe('/schedule');
  expectIdle();
});

it.each([
  ['/events', '/admin'],
  ['/admin', '/events'],
] as const)('does not animate staff navigation from %s to %s', async (from, to) => {
  await render(<Link to={to}>Continue</Link>, { entries: [from] });
  await click(host.querySelector('a')!);
  expect(location()).toBe(to);
  expectIdle();
});

it('keeps native form-field interaction immediate without a web', async () => {
  const change = vi.fn();
  await render(<label><input type="checkbox" onChange={change} />Choose</label>);
  await click(host.querySelector('input')!);
  expect(change).toHaveBeenCalledTimes(1);
  expect(host.querySelector('input')!.checked).toBe(true);
  expectIdle();
});

it('cancels pending navigation and timers when unmounted', async () => {
  await render(<Link to="/schedule">Schedule</Link>);
  await click(host.querySelector('a')!);
  expect(phase()).toBe('shooting');
  await act(async () => { root!.unmount(); });
  root = null;
  expect(vi.getTimerCount()).toBe(0);
  await advance(1000);
  expect(router!.state.location.pathname).toBe('/events');
});
