import { clamp01, smoothRange } from './cinematicMotion';
/** A gentle push preserves the original video's cloud detail instead of magnifying it 4×. */
export function cloudEntryPose(progress: number) {
  const entry = smoothRange(.48, .55, progress);
  return { scale: 1 + .3 * entry, rise: entry === 0 ? 0 : -3 * entry };
}
export function isMobileViewer(nav: { userAgent: string; maxTouchPoints?: number; userAgentData?: { mobile?: boolean } }) {
  return nav.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || (/Macintosh/i.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1);
}
export function introAssets(mobile: boolean) {
  return mobile ? { video: '/media/cinematic/ricorrenza-mobile-v2.mp4', poster: '/media/cinematic/ricorrenza-start-v1.webp' }
    : { video: '/media/cinematic/ricorrenza-desktop-v2.mp4', poster: '/media/cinematic/ricorrenza-desktop-start-v1.webp' };
}
export function introFlow(p: number) {
  return {
    scene: clamp01((p - .65) / .35),
    videoVisible: p < .56,
  };
}
