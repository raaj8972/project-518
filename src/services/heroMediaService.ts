import { recordValue, textValue, finiteValue } from '../utils/studioData';
import { supabase } from '../lib/supabase';
import { dualRead, dualUpsert, invalidateTableCache } from '../lib/dualDb';

export type BackgroundType = 'image' | 'video' | 'auto';

export interface HeroMediaV2 {
  background_type: BackgroundType;
  image_url: string;
  mobile_image_url: string;
  video_url: string;
  mobile_video_url: string;
  poster_url: string;
  mobile_poster_url: string;
  overlay_color: string;
  overlay_opacity: number;
  enabled: boolean;
  desktop_zoom: number;
  desktop_offset_x: number;
  desktop_offset_y: number;
  mobile_zoom: number;
  mobile_offset_x: number;
  mobile_offset_y: number;
}

const DEFAULT_HERO_MEDIA: HeroMediaV2 = {
  background_type: 'image',
  image_url: '',
  mobile_image_url: '',
  video_url: '',
  mobile_video_url: '',
  poster_url: '',
  mobile_poster_url: '',
  overlay_color: '#000000',
  overlay_opacity: 0.35,
  enabled: true,
  desktop_zoom: 1,
  desktop_offset_x: 0,
  desktop_offset_y: 0,
  mobile_zoom: 1,
  mobile_offset_x: 0,
  mobile_offset_y: 0,
};

/** Normalize at every boundary; nullable database columns must never escape as typed strings. */
export function normalizeHeroMedia(value: unknown, baseline: HeroMediaV2 = DEFAULT_HERO_MEDIA): HeroMediaV2 {
  const row = recordValue(value);
  const result = { ...baseline };
  for (const key of ['image_url','mobile_image_url','video_url','mobile_video_url','poster_url','mobile_poster_url','overlay_color'] as const) result[key] = textValue(row[key], baseline[key]);
  if (row.background_type === 'image' || row.background_type === 'video' || row.background_type === 'auto') result.background_type = row.background_type;
  if (typeof row.enabled === 'boolean') result.enabled = row.enabled;
  for (const key of ['overlay_opacity','desktop_zoom','mobile_zoom','desktop_offset_x','desktop_offset_y','mobile_offset_x','mobile_offset_y'] as const) {
    const min = key === 'overlay_opacity' ? 0 : key.endsWith('zoom') ? .25 : -.5;
    const max = key === 'overlay_opacity' ? 1 : key.endsWith('zoom') ? 3 : .5;
    result[key] = Math.min(max, Math.max(min, finiteValue(row[key], baseline[key])));
  }
  return result;
}

const COLLECTION_NAME = 'hero_media';

export const heroMediaService = {
  /**
   * Fetches the hero media configuration for a specific page.
   * If no configuration exists, it returns a default configuration.
   */
  async getHeroMedia(pageKey: string, options: { strict?: boolean } = {}): Promise<HeroMediaV2> {
    try {
      const { data } = await dualRead({ 
        table: COLLECTION_NAME, 
        forceRefresh: options.strict,
        eq: ['page_key', pageKey],
        maybeSingle: true 
      });
      
      if (data) {
        return normalizeHeroMedia(data);
      }
      
      return normalizeHeroMedia(null);
    } catch (error) {
      console.error(`Error fetching hero media for page ${pageKey}:`, error);
      if (options.strict) throw error;
      return normalizeHeroMedia(null);
    }
  },

  /**
   * Subscribes to real-time updates for hero media configuration.
   */
  subscribeHeroMedia(pageKey: string, callback: (data: HeroMediaV2) => void): () => void {
    const channelName = `hero_media:${pageKey}`;
    
    let active = true;
    // Preserve the last good media on transient errors; refresh on focus and as a realtime fallback.
    const refresh = () => { if (typeof document !== 'undefined' && document.hidden) return; void this.getHeroMedia(pageKey, { strict: true }).then(value => { if (active) callback(value); }).catch(() => {}); };
    refresh();
    const refreshTimer = setInterval(refresh, 60000);
    if (typeof window !== 'undefined') window.addEventListener('focus', refresh);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: COLLECTION_NAME,
          filter: `page_key=eq.${pageKey}`
        },
        async (payload) => {
          invalidateTableCache(COLLECTION_NAME);
          if (!active) return;
          if (payload.eventType === 'DELETE') {
            callback(normalizeHeroMedia(null));
          } else if (payload.new) {
            callback(normalizeHeroMedia(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(refreshTimer);
      if (typeof window !== 'undefined') window.removeEventListener('focus', refresh);
      supabase.removeChannel(subscription);
    };
  },

  /**
   * Saves the hero media configuration for a specific page.
   */
  async saveHeroMedia(pageKey: string, data: Partial<HeroMediaV2>): Promise<void> {
    try {
      const { data: existing } = await dualRead({ table: COLLECTION_NAME, eq: ['page_key', pageKey], maybeSingle: true });
      await dualUpsert(COLLECTION_NAME, {
        ...(existing?.id ? { id: existing.id } : {}),
        ...normalizeHeroMedia(data, normalizeHeroMedia(existing)),
        page_key: pageKey,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error saving hero media for page ${pageKey}:`, error);
      throw new Error('Failed to save hero media configuration.');
    }
  }
};
