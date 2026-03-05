import { supabase } from '../supabase';

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

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Sanitize a URL and optionally apply image optimization
 */
export const sanitizeUrl = (url?: string | null, options?: ImageOptions): string => {
  if (!url) return '';
  let s = String(url).trim();
  if (!s) return '';
  
  // Handle drive:// protocol for Google Drive images
  if (s.startsWith('drive://')) {
    const fileId = s.replace('drive://', '');
    const width = options?.width || 1200;
    
    // On React Native, we don't have CORS restrictions like the Web does!
    // We can completely bypass the slow web proxy and hit Google's blazing-fast native edge servers directly.
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
  }

  // Normalize protocol
  if (s.startsWith('//')) s = `https:${s}`;
  
  // For mobile app, we mostly want to ensured nested Supabase URLs are absolute
  // if they are just paths, but since we use public URLs in the data, 
  // they should already be absolute.
  
  return s;
};

/**
 * Generate a public URL for a Supabase storage object
 */
export const publicUrlFor = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
