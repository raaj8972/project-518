// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createScrollVideoController, VIDEO_SCROLL_END, videoTimeForProgress } from '../src/components/cinematic/scrollVideo';
let frames: Map<number, FrameRequestCallback>, nextId: number;
let hidden = false;
class FakeVideo extends EventTarget {
  duration = 21.75; readyState = 2; seeking = false; paused = true; muted = false; playsInline = false; loop = true;
  writes: number[] = []; time = 0; buffered = { length: 1, end: () => 10 };
  pause = vi.fn(() => { this.paused = true; });
  get currentTime() { return this.time; }
  set currentTime(value: number) { this.time = value; this.writes.push(value); this.seeking = true; }
  decoded() { this.seeking = false; this.dispatchEvent(new Event('seeked')); }
}
beforeEach(() => {
  frames = new Map(); nextId = 0; hidden = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++nextId, cb); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(1)); };
function setup() {
  const video = new FakeVideo(), callbacks = { onReady: vi.fn(), onBuffer: vi.fn(), onFailure: vi.fn() };
  const controller = createScrollVideoController(video as unknown as HTMLVideoElement, callbacks);
  return { video, controller, callbacks };
}
it('scrubs forward/reverse deterministically, reaches the cloud frame, and avoids seeking duration', () => {
  const end = 21.75 - 1 / 24;
  expect(videoTimeForProgress(0, 21.75)).toBe(0);
  expect(videoTimeForProgress(VIDEO_SCROLL_END, 21.75)).toBeCloseTo(end);
  expect(videoTimeForProgress(1, 21.75)).toBeCloseTo(end);
  expect(videoTimeForProgress(VIDEO_SCROLL_END / 2, 21.75)).toBeCloseTo(end / 2);
  expect(videoTimeForProgress(.44, 21.75)).toBe(videoTimeForProgress(.44, 21.75));
  expect(videoTimeForProgress(1, NaN)).toBe(0);
});
it('coalesces swipes and waits for the decoder before seeking the latest requested frame', () => {
  const { video, controller } = setup();
  controller.seek(.2); controller.seek(.7); controller.seek(.4); expect(frames.size).toBe(1); flush();
  expect(video.writes).toEqual([videoTimeForProgress(.4, video.duration)]);
  controller.seek(.8); controller.seek(.1); flush(); expect(video.writes).toHaveLength(1);
  video.decoded(); flush(); expect(video.writes).toEqual([videoTimeForProgress(.4, video.duration), videoTimeForProgress(.1, video.duration)]);
  expect(frames.size).toBe(0); controller.dispose();
});
it('waits for metadata, reports real buffering, and never allows autoplay', () => {
  const video = new FakeVideo(); video.readyState = 0; video.duration = NaN;
  const callbacks = { onReady: vi.fn(), onBuffer: vi.fn(), onFailure: vi.fn() };
  const c = createScrollVideoController(video as unknown as HTMLVideoElement, callbacks);
  c.seek(.6); flush(); expect(video.writes).toHaveLength(0); expect(callbacks.onReady).not.toHaveBeenCalled();
  video.duration = 21.75; video.readyState = 2; video.dispatchEvent(new Event('loadeddata')); flush();
  expect(callbacks.onReady).toHaveBeenCalledTimes(1); expect(callbacks.onBuffer).toHaveBeenCalledWith(46);
  video.paused = false; video.dispatchEvent(new Event('play')); expect(video.pause).toHaveBeenCalledTimes(1);
  expect(video.muted).toBe(true); expect(video.loop).toBe(false); expect(video.playsInline).toBe(true); c.dispose();
});
it('suspends hidden-tab seeks and removes frame requests and listeners on disposal', () => {
  const { video, controller, callbacks } = setup();
  controller.seek(.7); hidden = true; document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(0);
  controller.seek(.2); expect(frames.size).toBe(0);
  hidden = false; document.dispatchEvent(new Event('visibilitychange')); flush();
  expect(video.writes).toEqual([videoTimeForProgress(.2, video.duration)]);
  video.dispatchEvent(new Event('error')); expect(callbacks.onFailure).toHaveBeenCalledTimes(1);
  controller.dispose(); video.decoded(); video.dispatchEvent(new Event('error')); expect(frames.size).toBe(0); expect(callbacks.onFailure).toHaveBeenCalledTimes(1);
});

it('automatically abandons a stuck decoder, without queueing more seeks', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); const {video, controller, callbacks} = setup();
  controller.seek(.2); flush(); vi.advanceTimersByTime(3999); expect(callbacks.onFailure).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(callbacks.onFailure).toHaveBeenCalledOnce();
  controller.seek(.4); flush(); expect(video.writes).toHaveLength(1);
  controller.dispose(); expect(vi.getTimerCount()).toBe(0);
});

it('detects persistently slow decoding but excludes time spent in the background', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); const {video, controller, callbacks} = setup();
  controller.seek(.03); flush(); hidden = true; document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(60000); expect(callbacks.onFailure).not.toHaveBeenCalled();
  hidden = false; document.dispatchEvent(new Event('visibilitychange')); video.decoded();
  for (let i = 0; i < 4; i++) { controller.seek(.05 + i * .05); flush(); vi.advanceTimersByTime(600); video.decoded(); }
  expect(callbacks.onFailure).not.toHaveBeenCalled();
  controller.seek(.3); flush(); vi.advanceTimersByTime(600); video.decoded();
  expect(callbacks.onFailure).toHaveBeenCalledOnce(); controller.dispose();
});
