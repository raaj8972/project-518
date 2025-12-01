/**
 * useNetlifyImage - Generate Netlify Image CDN URLs
 * 
 * Provides automatic image optimization through Netlify's Image CDN:
 * - WebP/AVIF format conversion
 * - On-the-fly resizing
 * - Global CDN delivery
 * - Quality optimization
 */

interface NetlifyImageOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
}

/**
 * Generate a Netlify Image CDN URL
 * Only works in production when deployed to Netlify
 */
export const useNetlifyImage = (
  originalUrl: string,
  options: NetlifyImageOptions = {}
): string => {
  // In development or if URL is empty, return original
  if (!originalUrl || import.meta.env.DEV) {
    return originalUrl;
  }

  // Build query parameters
  const params = new URLSearchParams();
  params.set('url', originalUrl);
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.fit) params.set('fit', options.fit);

  // Return Netlify Image CDN URL
  return `/.netlify/images?${params.toString()}`;
};

/**
 * Generate responsive srcset using Netlify Image CDN
 */
export const useNetlifyImageSrcSet = (
  originalUrl: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920],
  quality?: number
): string | undefined => {
  if (!originalUrl || import.meta.env.DEV) {
    return undefined;
  }

  return widths
    .map(width => {
      const url = useNetlifyImage(originalUrl, { width, quality });
      return `${url} ${width}w`;
    })
    .join(', ');
};
