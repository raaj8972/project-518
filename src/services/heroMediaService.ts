import { supabase } from '../lib/supabase';
import { dualRead, dualUpsert } from '../lib/dualDb';

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

const COLLECTION_NAME = 'hero_media';

export const heroMediaService = {
  /**
   * Fetches the hero media configuration for a specific page.
   * If no configuration exists, it returns a default configuration.
   */
  async getHeroMedia(pageKey: string): Promise<HeroMediaV2> {
    try {
      const { data } = await dualRead({ 
        table: COLLECTION_NAME, 
        eq: ['id', pageKey], 
        maybeSingle: true 
      });
      
      if (data) {
        return { ...DEFAULT_HERO_MEDIA, ...data } as HeroMediaV2;
      }
      
      return DEFAULT_HERO_MEDIA;
    } catch (error) {
      console.error(`Error fetching hero media for page ${pageKey}:`, error);
      return DEFAULT_HERO_MEDIA;
    }
  },

  /**
   * Subscribes to real-time updates for hero media configuration.
   */
  subscribeHeroMedia(pageKey: string, callback: (data: HeroMediaV2) => void): () => void {
    const channelName = `hero_media:${pageKey}`;
    
    // Initial fetch to ensure up-to-date data
    this.getHeroMedia(pageKey).then(callback);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: COLLECTION_NAME,
          filter: `id=eq.${pageKey}`
        },
        async (payload) => {
          if (payload.new) {
            callback({ ...DEFAULT_HERO_MEDIA, ...(payload.new as any) } as HeroMediaV2);
          } else if (payload.eventType === 'DELETE') {
            callback(DEFAULT_HERO_MEDIA);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  /**
   * Saves the hero media configuration for a specific page.
   */
  async saveHeroMedia(pageKey: string, data: Partial<HeroMediaV2>): Promise<void> {
    try {
      await dualUpsert(COLLECTION_NAME, {
        ...data,
        id: pageKey,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error saving hero media for page ${pageKey}:`, error);
      throw new Error('Failed to save hero media configuration.');
    }
  }
};
