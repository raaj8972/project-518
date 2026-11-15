import type { HeroMediaV2 } from '../services/heroMediaService';

export const DEFAULT_HOME_VIDEO = '/hero-preview.mp4';
export const DEFAULT_HOME_POSTER = '/hero-preview.jpg';
/** Resolve what visitors actually see without turning a fallback into a saved upload. */
export function resolveHomepageMedia(media: HeroMediaV2 | null | undefined, mobile = false) {
  const video = mobile ? media?.mobile_video_url || media?.video_url : media?.video_url;
  const image = mobile ? media?.mobile_image_url || media?.image_url : media?.image_url;
  const poster = (mobile ? media?.mobile_poster_url || media?.poster_url : media?.poster_url) || DEFAULT_HOME_POSTER;
  const imageMode = media?.background_type === 'image';
  if ((imageMode || !video) && image) return {kind:'image' as const,src:image,poster,origin:mobile && !media?.mobile_image_url ? 'desktop' as const : 'saved' as const};
  if (!imageMode && video) return {kind:'video' as const,src:video,poster,origin:mobile && !media?.mobile_video_url ? 'desktop' as const : 'saved' as const};
  return {kind:'video' as const,src:DEFAULT_HOME_VIDEO,poster,origin:'default' as const};
}
