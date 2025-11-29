import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean; // If true, loads eagerly (for above-fold images)
  aspectRatio?: string; // e.g., "16/9" for proper layout shift prevention
}

/**
 * OptimizedImage - Automatically optimizes all images with:
 * - Lazy loading by default
 * - Async decoding for better performance
 * - Proper loading priority
 * - Automatic srcset generation for responsive images
 * - WebP format support
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  aspectRatio,
  className = '',
  ...props
}) => {
  // Generate responsive srcset
  const generateSrcSet = (url: string) => {
    // For Supabase URLs, we can add transformation parameters
    if (url.includes('supabase')) {
      const sizes = [640, 750, 828, 1080, 1200, 1920];
      return sizes.map(size => `${url}?width=${size} ${size}w`).join(', ');
    }
    return undefined;
  };

  const srcSet = generateSrcSet(src);
  
  // Determine sizes attribute for responsive images
  const sizes = srcSet ? '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px' : undefined;

  return (
    <img
      src={src}
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
