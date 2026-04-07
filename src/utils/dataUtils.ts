import { supabase } from '../lib/supabase';
import { dualRead } from '../lib/dualDb';
import { GalleryImage, GallerySettings } from '../types/data';

export const fetchAllGalleryImages = async (): Promise<{ data: GalleryImage[] | null, error: any }> => {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data || []) as GalleryImage[], error };
};

/**
 * generic fetching utility that prioritizes Firestore via DualDb
 */
export async function fetchSupabaseBatch<T>(
  table: string, 
  options: { 
    order?: { column: string; ascending?: boolean };
    select?: string;
  } = {}
): Promise<{ data: T[] | null, error: any }> {
  try {
    const { data } = await dualRead({
      table,
      select: options.select,
      order: options.order ? [options.order.column, { ascending: options.order.ascending }] : undefined
    });
    return { data: (data || []) as T[], error: null };
  } catch (error) {
    console.error(`[fetchData:${table}] Error:`, error);
    return { data: null, error };
  }
}

export const fetchAllRegistrations = async (): Promise<{ data: any[] | null, error: any }> => {
  return fetchSupabaseBatch('registrations', { order: { column: 'created_at', ascending: false } });
};

export const fetchAllEvents = async (): Promise<{ data: any[] | null, error: any }> => {
  return fetchSupabaseBatch('events', { order: { column: 'display_order', ascending: true } });
};

export const DEFAULT_GALLERY_SETTINGS: GallerySettings = {
  id: 1,
  scroll_per_item: 400,
  distance: 300,
  background_blur_px: 15,
  card_blur_max: 10,
  reveal_enabled: true,
  reveal_duration_ms: 1000,
  reveal_orientation: 'horizontal',
  updated_at: null
};

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
}

/**
 * Sanitize a URL and optionally apply image optimization via Cloudflare Proxy
 * 
 * @param url The source image URL
 * @param options Optimization parameters (width, quality, etc.)
 */
export const sanitizeUrl = (url?: string | null, options?: ImageOptions): string => {
  if (!url) return '';
  let s = String(url).trim();
  if (!s) return '';
  
  // Handle drive:// protocol for Google Drive images
  if (s.startsWith('drive://')) {
    const fileId = s.replace('drive://', '');
    const width = options?.width || 1280;
    
    // If running locally without Netlify Proxy, use direct Google Drive thumbnails as fallback
    if (typeof window !== 'undefined' && 
       (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
    }
    
    return `/api/drive-proxy?id=${fileId}&width=${width}`;
  }
  
  // Normalize protocol
  if (s.startsWith('//')) s = `https:${s}`;
  
  // If no optimization options, return as is (but ensured absolute)
  if (!options || Object.keys(options).length === 0) {
    return s;
  }

  // Implementation of Image Proxy routing
  // Only proxy if it's an R2 asset (detecting by hostname or bucket pattern)
  const isR2Asset = s.includes('r2.cloudflarestorage.com') || s.includes('r2.dev') || 
                   (import.meta.env.VITE_R2_PUBLIC_DOMAIN && s.includes(import.meta.env.VITE_R2_PUBLIC_DOMAIN));

  if (isR2Asset) {
    try {
      const urlObj = new URL(s);
      const path = urlObj.pathname.substring(1); // Get the path without leading slash
      
      // Use proxy domain if available, otherwise just append params (if CF Image Resizing is on same domain)
      const proxyBase = import.meta.env.VITE_IMAGE_PROXY_URL || '';
      
      const params = new URLSearchParams();
      if (options.width) params.append('w', options.width.toString());
      if (options.height) params.append('h', options.height.toString());
      if (options.quality) params.append('q', options.quality.toString());
      if (options.format) params.append('f', options.format);
      
      const queryString = params.toString();
      
      if (proxyBase) {
        // format: https://images.rico.family/path/to/img.jpg?w=400
        return `${proxyBase.replace(/\/$/, '')}/${path}${queryString ? '?' + queryString : ''}`;
      } else {
        // format: https://r2.domain.com/path/to/img.jpg?w=400 (if resizing is enabled on primary domain)
        return `${s}${queryString ? (s.includes('?') ? '&' : '?') + queryString : ''}`;
      }
    } catch (e) {
      console.warn('Failed to construct proxy URL:', e);
      return s;
    }
  }

  return s;
};

/**
 * Generate a public URL for a storage object (supports both Supabase and Firebase buckets)
 */
export const publicUrlFor = (bucket: string, path: string): string => {
  // If bucket contains Firebase-like identifier or if we detected Firebase storage
  if (bucket.includes('firebase') || bucket.includes('appspot.com')) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
  }
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
