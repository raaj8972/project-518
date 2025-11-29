/**
 * Media Optimization Utilities
 * Automatically optimizes images and videos for performance
 */

/**
 * Converts image URL to WebP format if supported
 */
export const getOptimizedImageUrl = (url: string, width?: number): string => {
  if (!url) return url;

  // For Supabase storage URLs, add transformation parameters
  if (url.includes('supabase.co/storage')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    params.append('quality', '85');
    params.append('format', 'webp');
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  return url;
};

/**
 * Generate responsive srcset for images
 */
export const generateSrcSet = (url: string): string | undefined => {
  if (!url) return undefined;

  // For Supabase or external CDN URLs
  if (url.includes('supabase') || url.includes('cloudinary') || url.includes('imgix')) {
    const sizes = [640, 750, 828, 1080, 1200, 1920];
    return sizes
      .map(size => `${getOptimizedImageUrl(url, size)} ${size}w`)
      .join(', ');
  }

  return undefined;
};

/**
 * Get optimal sizes attribute for responsive images
 */
export const getImageSizes = (size?: 'small' | 'medium' | 'large' | 'full'): string => {
  switch (size) {
    case 'small':
      return '(max-width: 640px) 100vw, 640px';
    case 'medium':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 768px';
    case 'large':
      return '(max-width: 1024px) 100vw, 1200px';
    case 'full':
    default:
      return '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px';
  }
};

/**
 * Check if WebP is supported
 */
export const supportsWebP = (() => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
})();

/**
 * Optimize video URL with quality and compression
 */
export const getOptimizedVideoUrl = (url: string): string => {
  if (!url) return url;

  // For Supabase storage, we can't transform videos but can add cache headers
  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cache-control=max-age=31536000`;
  }

  return url;
};

/**
 * Get preload link based on media type and priority
 */
export const getPreloadLink = (url: string, type: 'image' | 'video', priority: boolean = false): string | null => {
  if (!priority || !url) return null;

  const mimeType = type === 'image' 
    ? (supportsWebP ? 'image/webp' : 'image/jpeg')
    : 'video/mp4';

  return `<link rel="preload" href="${url}" as="${type}" type="${mimeType}">`;
};

/**
 * Calculate aspect ratio to prevent layout shift
 */
export const getAspectRatio = (width: number, height: number): string => {
  if (!width || !height) return 'auto';
  return `${width} / ${height}`;
};
