import React from 'react';
import { useNetlifyImage, useNetlifyImageSrcSet } from '../hooks/useNetlifyImage';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean; // If true, loads eagerly (for above-fold images)
  aspectRatio?: string; // e.g., "16/9" for proper layout shift prevention
  quality?: number; // Image quality 1-100 (default: 80)
}

/**
 * OptimizedImage - Automatically optimizes all images with:
 * - Netlify Image CDN integration (WebP/AVIF conversion in production)
 * - Lazy loading by default
 * - Async decoding for better performance
 * - Proper loading priority
 * - Automatic srcset generation for responsive images
 * - Global CDN delivery
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  aspectRatio,
  quality = 80,
  className = '',
  ...props
}) => {
  // Use Netlify Image CDN in production
  const optimizedSrc = useNetlifyImage(src, { quality });
  
  // Generate responsive srcset using Netlify CDN
  const netlifyImageSrcSet = useNetlifyImageSrcSet(src, undefined, quality);
  
  // Fallback to Supabase transformation for development
  const generateSupabaseSrcSet = (url: string) => {
    if (url.includes('supabase') && import.meta.env.DEV) {
      const sizes = [640, 750, 828, 1080, 1200, 1920];
      return sizes.map(size => `${url}?width=${size} ${size}w`).join(', ');
    }
    return undefined;
  };

  const srcSet = netlifyImageSrcSet || generateSupabaseSrcSet(src);
  
  // Determine sizes attribute for responsive images
  const sizes = srcSet ? '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px' : undefined;

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      srcSet={srcSet}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...props}
    />
  );
};

export default OptimizedImage;
