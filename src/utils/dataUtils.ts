import { supabase } from '../lib/supabase';
import { GalleryImage, GallerySettings } from '../types/data';

export const fetchAllGalleryImages = async (): Promise<{ data: GalleryImage[] | null, error: any }> => {
  return fetchSupabaseBatch<GalleryImage>('gallery_images', { order: { column: 'created_at', ascending: false } });
};

/**
 * Generic Supabase batch fetching utility to bypass 1000 row limit
 */
export async function fetchSupabaseBatch<T>(
  table: string, 
  options: { 
    order?: { column: string; ascending?: boolean };
    select?: string;
  } = {}
): Promise<{ data: T[] | null, error: any }> {
  let allData: T[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  const select = options.select || '*';
  
  while (true) {
    let query = supabase.from(table).select(select);
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (error) {
      console.error(`[fetchSupabaseBatch:${table}] Error fetching batch:`, error);
      return { data: allData.length > 0 ? allData : null, error };
    }
    
    if (!data || data.length === 0) break;
    
    allData = [...allData, ...(data as any as T[])];
    
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page > 100) break; 
  }
  
  return { data: allData, error: null };
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
    const width = options?.width || 1600;
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
 * Generate a public URL for a Supabase storage object
 */
export const publicUrlFor = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
