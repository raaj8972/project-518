import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

const COLLECTION_NAME = 'hero_media_v2';

export const heroMediaService = {
  /**
   * Fetches the hero media configuration for a specific page.
   * If no configuration exists, it returns a default configuration.
   */
  async getHeroMedia(pageKey: string): Promise<HeroMediaV2> {
    try {
      const docRef = doc(db, COLLECTION_NAME, pageKey);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        return { ...DEFAULT_HERO_MEDIA, ...snapshot.data() } as HeroMediaV2;
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
    const docRef = doc(db, COLLECTION_NAME, pageKey);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...DEFAULT_HERO_MEDIA, ...snapshot.data() } as HeroMediaV2);
      } else {
        callback(DEFAULT_HERO_MEDIA);
      }
    }, (error) => {
      console.error(`Error subscribing to hero media for page ${pageKey}:`, error);
    });
  },

  /**
   * Saves the hero media configuration for a specific page.
   */
  async saveHeroMedia(pageKey: string, data: Partial<HeroMediaV2>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, pageKey);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error(`Error saving hero media for page ${pageKey}:`, error);
      throw new Error('Failed to save hero media configuration.');
    }
  }
};
