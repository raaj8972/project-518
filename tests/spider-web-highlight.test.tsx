// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpiderWebHighlight } from '../src/components/ui/spider/SpiderWebHighlight';

let host: HTMLDivElement;
let root: Root;
let button: HTMLButtonElement;
let frame: HTMLDivElement;
const pointer = (target: Element, type: string, pointerType = 'mouse', x = 30) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerType, pointerId: 1, clientX: x, clientY: 40 });
  target.dispatchEvent(event);
  return event;
};

beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<><SpiderWebHighlight /><div data-spider-web><button><span>Choose event</span></button></div><button disabled>Unavailable</button></>));
  button = host.querySelector('button')!;
  frame = host.querySelector('[data-spider-web-highlight]')!;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 20, y: 30, left: 20, top: 30, right: 160, bottom: 80, width: 140, height: 50, toJSON() {} });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove(); vi.restoreAllMocks(); vi.useRealTimers();
});

it('frames the nearest hovered control and follows keyboard focus without taking focus', () => {
  // Decorative icons can be aria-hidden while their parent button is interactive.
  button.firstElementChild!.setAttribute('aria-hidden', 'true');
  pointer(button.firstElementChild!, 'pointerover');
  expect(frame.dataset.visible).toBe('true');
  expect(frame.style.width).toBe('140px');
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  document.dispatchEvent(new Event('scroll'));
  expect(frame.dataset.visible).toBe('false');
  button.focus();
  expect(frame.dataset.visible).toBe('true');
  expect(document.activeElement).toBe(button);
  button.blur();
  expect(frame.dataset.visible).toBe('false');
});

it('shows touch feedback on the first tap without canceling the click, then clears it', () => {
  const click = vi.fn(); button.addEventListener('click', click);
  expect(pointer(button, 'pointerdown', 'touch').defaultPrevented).toBe(false);
  expect(frame.dataset.visible).toBe('true');
  // Mobile focus and compatibility mouse events must not leave a sticky hover.
  button.focus();
  pointer(button, 'pointerup', 'touch');
  button.click();
  pointer(button, 'pointerover', 'mouse');
  expect(click).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1150);
  expect(frame.dataset.visible).toBe('false');
});

it('cancels web feedback when a touch becomes a scroll or is canceled', () => {
  pointer(button, 'pointerdown', 'touch');
  pointer(button, 'pointermove', 'touch', 70);
  expect(frame.dataset.visible).toBe('false');
  pointer(button, 'pointerup', 'touch', 70);
  pointer(button, 'pointerdown', 'touch');
  pointer(button, 'pointercancel', 'touch');
  expect(frame.dataset.visible).toBe('false');
});

it('ignores unavailable controls and removes its global listeners on unmount', async () => {
  pointer(host.querySelector('button:disabled')!, 'pointerover');
  expect(frame.dataset.visible).toBe('false');
  pointer(button, 'pointerdown', 'touch');
  await act(async () => root.unmount());
  expect(vi.getTimerCount()).toBe(0);
  frame.dataset.visible = 'false';
  pointer(document.body, 'pointerover');
  expect(frame.dataset.visible).toBe('false');
});
