import { getQualityProfile } from './cinematicMotion';
import { isMobileViewer } from './introFlow';

export const INTRO_FALLBACK_KEY = 'rico:intro-fallback:v1';
export const INTRO_STATIC_EVENT = 'rico:static-experience';
export const INTRO_PHASE_EVENT = 'rico:intro-phase';
export const INTRO_LIMITS = { probe: 1200, videoStart: 6500, sceneStart: 8000, transition: 4500, seek: 4000 } as const;
export const INTRO_VIDEO_TYPE = 'video/mp4; codecs="avc1.64001F"';

/** A background tab must not consume the user's loading allowance. */
export function visibleTimeout(callback: () => void, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => { clearTimeout(timer); timer = document.hidden ? undefined : setTimeout(callback, milliseconds); };
  document.addEventListener('visibilitychange', reset); reset();
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', reset); };
}

export type IntroNavigator = {
  userAgent: string; maxTouchPoints?: number; hardwareConcurrency?: number; deviceMemory?: number;
  onLine?: boolean; userAgentData?: { mobile?: boolean };
  connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
};

/** Cheap checks run before assigning any video source or importing the 3D scene. */
export function getIntroPolicy(nav: IntroNavigator, width: number) {
  const mobile = isMobileViewer(nav), network = nav.connection;
  let reason: string | undefined;
  const ios = /(?:iPhone|iPad|iPod).*OS (\d+)[_\.]/i.exec(nav.userAgent);
  const android = /Android\s+(\d+)/i.exec(nav.userAgent);
  if (nav.onLine === false) reason = 'offline';
  else if (network?.saveData) reason = 'save-data';
  else if (/^(slow-2g|2g|3g)$/.test(network?.effectiveType || '') || (network?.downlink !== undefined && network.downlink > 0 && network.downlink < 2.5)) reason = 'slow-network';
  else if ((nav.deviceMemory !== undefined && nav.deviceMemory <= (mobile ? 4 : 2)) || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= (mobile ? 4 : 2))) reason = 'limited-hardware';
  else if ((ios && Number(ios[1]) < 16) || (android && Number(android[1]) < 10)) reason = 'older-platform';
  const quality = mobile ? 'low' : getQualityProfile({ width, memory: nav.deviceMemory, cores: nav.hardwareConcurrency });
  return { mobile, quality: quality === 'high' ? 'high' as const : 'low' as const, reason };
}

export function savedIntroFallback() {
  const memoryFallback = document.documentElement.dataset.staticExperience === 'true' ? 'device-fallback' : undefined;
  try { return sessionStorage.getItem(INTRO_FALLBACK_KEY) || memoryFallback; } catch { return memoryFallback; }
}
export function rememberIntroFallback(reason: string) {
  try { sessionStorage.setItem(INTRO_FALLBACK_KEY, reason); } catch { /* Private mode may block storage. */ }
  document.documentElement.dataset.staticExperience = 'true';
  window.dispatchEvent(new Event(INTRO_STATIC_EVENT));
}
export function preferStaticExperience() {
  return !!getIntroPolicy(navigator, window.innerWidth).reason || !!savedIntroFallback() || document.documentElement.dataset.staticExperience === 'true';
}

/** Check the actual codec and WebGL2; no UA guess for unknown hardware. */
export function supportsCinematicGraphics(): boolean {
  const canvas = document.createElement('canvas');
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true, antialias: false, powerPreference: 'low-power' });
    if (!gl || gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) return false;
  } catch { return false; }
  finally { gl?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.width = canvas.height = 1; }
  return true;
}
export async function supportsCinematicIntro(mobile: boolean): Promise<boolean> {
  const video = document.createElement('video');
  if (!video.canPlayType(INTRO_VIDEO_TYPE) || !supportsCinematicGraphics()) return false;
  if (!navigator.mediaCapabilities?.decodingInfo) return true;
  try {
    const info = await navigator.mediaCapabilities.decodingInfo({
      type: 'file', video: { contentType: INTRO_VIDEO_TYPE, width: mobile ? 720 : 1280, height: mobile ? 1280 : 720, bitrate: 3_400_000, framerate: 24 },
    });
    return info.supported && info.smooth && (!mobile || info.powerEfficient);
  } catch {
    // Older implementations can reject the optional query despite codec support.
    // Runtime seek/render watchdogs still protect these browsers.
    return true;
  }
}

export function publishIntroPhase(phase?: string) {
  const html = document.documentElement;
  if (html.dataset.cinematicIntro === phase) return;
  if (phase) html.dataset.cinematicIntro = phase; else delete html.dataset.cinematicIntro;
  window.dispatchEvent(new Event(INTRO_PHASE_EVENT));
}
