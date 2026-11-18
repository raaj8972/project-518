// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getIntroPolicy, INTRO_FALLBACK_KEY, rememberIntroFallback, savedIntroFallback, supportsCinematicIntro, visibleTimeout } from '../src/components/cinematic/introCapability';
import { createFrameHealthMonitor } from '../src/components/cinematic/frameHealth';

const modern = { userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', hardwareConcurrency: 8, deviceMemory: 8, onLine: true };
beforeEach(() => { sessionStorage.clear(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); sessionStorage.clear(); delete document.documentElement.dataset.staticExperience; });
it.each([
  [{ deviceMemory: 2 }, 'limited-hardware'], [{ hardwareConcurrency: 2 }, 'limited-hardware'], [{ connection: { saveData: true } }, 'save-data'],
  [{ userAgent: 'Android 9 Mobile' }, 'older-platform'],
  [{ userAgent: 'iPhone; CPU iPhone OS 15_7 like Mac OS X' }, 'older-platform'],
  [{ onLine: false }, 'offline'],
])('skips the film for an explicit limit %j', (limits, reason) => {
  expect(getIntroPolicy({ ...modern, ...limits }, 390).reason).toBe(reason);
});
it('uses a bounded mobile tier in both orientations and tolerates missing Safari hardware hints', () => {
  expect(getIntroPolicy(modern, 390)).toEqual({ mobile: true, quality: 'low', reason: undefined });
  expect(getIntroPolicy(modern, 900).quality).toBe('low');
  expect(getIntroPolicy({ userAgent: 'iPhone; CPU iPhone OS 18_0 like Mac OS X' }, 390).reason).toBeUndefined();
  expect(getIntroPolicy({ userAgent: 'Macintosh', hardwareConcurrency: 8 }, 1440).quality).toBe('high');
});
it('keeps failures within the current document and ignores old session failures after refresh', () => {
  sessionStorage.setItem(INTRO_FALLBACK_KEY, 'video-timeout');
  expect(savedIntroFallback()).toBeUndefined();
  rememberIntroFallback('scene-failed'); expect(savedIntroFallback()).toBe('scene-failed');
  // A fresh document does not retain the previous HTML element's state.
  delete document.documentElement.dataset.staticExperience;
  expect(savedIntroFallback()).toBeUndefined();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  expect(() => rememberIntroFallback('video-failed')).not.toThrow();
  expect(savedIntroFallback()).toBe('video-failed');
});
it('uses low quality rather than skipping modern four-core, 4GB mobile hardware', () => {
  expect(getIntroPolicy({...modern, deviceMemory: 4, hardwareConcurrency: 4}, 390)).toEqual({mobile:true, quality:'low', reason:undefined});
});
function supportedBrowser() {
  const loseContext = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ MAX_TEXTURE_SIZE: 1, getParameter: () => 8192, getExtension: () => ({loseContext}) } as unknown as WebGL2RenderingContext);
  const decode = vi.fn().mockResolvedValue({ supported: true, smooth: true, powerEfficient: true });
  vi.stubGlobal('navigator', { ...modern, mediaCapabilities: { decodingInfo: decode } });
  return { getContext, loseContext, decode };
}
it('checks the actual portrait codec budget and releases the probe context immediately', async () => {
  const browser = supportedBrowser(); expect(await supportsCinematicIntro(true)).toBe(true);
  expect(browser.getContext).toHaveBeenCalledWith('webgl2', expect.objectContaining({failIfMajorPerformanceCaveat:true}));
  expect(browser.loseContext).toHaveBeenCalledOnce();
  expect(browser.decode).toHaveBeenCalledWith({ type: 'file', video: { contentType: 'video/mp4; codecs="avc1.64001F"', width: 720, height: 1280, bitrate: 3400000, framerate: 24 } });
});
it.each([{ supported: false, smooth: false, powerEfficient: false }, { supported: true, smooth: false, powerEfficient: true }])('bypasses unsupported or choppy mobile decoding: %j', async info => {
  const browser = supportedBrowser(); browser.decode.mockResolvedValue(info);
  expect(await supportsCinematicIntro(true)).toBe(false);
});
it('keeps smooth supported mobile video when power efficiency is unreported', async () => {
  const browser = supportedBrowser(); browser.decode.mockResolvedValue({supported: true, smooth: true, powerEfficient: false});
  expect(await supportsCinematicIntro(true)).toBe(true);
});
it('rejects missing WebGL2/codec support without loading an asset', async () => {
  const browser = supportedBrowser(); browser.getContext.mockReturnValue(null);
  expect(await supportsCinematicIntro(false)).toBe(false); expect(browser.decode).not.toHaveBeenCalled();
  vi.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue('');
  expect(await supportsCinematicIntro(false)).toBe(false);
});
it('does not require or probe WebGL for the video-only opening', async () => {
  const browser = supportedBrowser(); browser.getContext.mockReturnValue(null);
  expect(await supportsCinematicIntro(false, false)).toBe(true);
  expect(browser.getContext).not.toHaveBeenCalled();
  expect(browser.decode).toHaveBeenCalledOnce();
});
it('keeps optional MediaCapabilities API absence/rejection compatible with runtime watchdogs', async () => {
  const browser = supportedBrowser(); browser.decode.mockRejectedValue(new TypeError('Old browser query'));
  expect(await supportsCinematicIntro(true)).toBe(true);
  vi.stubGlobal('navigator', modern); expect(await supportsCinematicIntro(true)).toBe(true);
});
it('pauses loading deadlines in a hidden tab and removes the visibility listener on cleanup', () => {
  vi.useFakeTimers(); let hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const fail = vi.fn(), cancel = visibleTimeout(fail, 1000);
  vi.advanceTimersByTime(500); hidden = true; document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(60000); expect(fail).not.toHaveBeenCalled();
  hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(999); expect(fail).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(fail).toHaveBeenCalledOnce();
  cancel(); document.dispatchEvent(new Event('visibilitychange')); expect(vi.getTimerCount()).toBe(0);
});
it('reacts to sustained slow frame work, tolerates isolated compilation spikes and ignores idle duration', () => {
  const fail = vi.fn(), monitor = createFrameHealthMonitor(fail);
  monitor.sample(200); for (let i = 0; i < 12; i++) monitor.sample(16);
  expect(fail).not.toHaveBeenCalled();
  for (let i = 0; i < 7; i++) monitor.sample(85); expect(fail).not.toHaveBeenCalled();
  monitor.reset(); for (let i = 0; i < 8; i++) monitor.sample(85);
  expect(fail).toHaveBeenCalledOnce(); monitor.sample(100); expect(fail).toHaveBeenCalledOnce();
});

it.each([{effectiveType:'3g'}, {downlink:1.5}])('uses low quality without removing the intro for network estimates: %j', connection => {
  expect(getIntroPolicy({...modern, userAgent: 'Macintosh', connection}, 1440)).toEqual({mobile:false, quality:'low', reason:undefined});
});
