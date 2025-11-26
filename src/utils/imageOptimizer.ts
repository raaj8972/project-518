
/**
 * Image Optimization Utility
 * 
 * Provides client-side image compression and resizing using the Canvas API.
 * Supports WebP, JPEG, and PNG formats.
 */

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  format?: 'image/webp' | 'image/jpeg' | 'image/png' | 'auto';
  preserveTransparency?: boolean;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'auto',
  preserveTransparency: true,
};

/**
 * Loads an image file into an HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

/**
 * Optimizes an image file by resizing and compressing it.
 */
export const optimizeImage = async (file: File, options: OptimizationOptions = {}): Promise<File> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Don't optimize SVGs or non-images
  if (file.type === 'image/svg+xml' || !file.type.startsWith('image/')) {
    return file;
  }

  try {
    const img = await loadImage(file);
    
    // Calculate new dimensions
    let { width, height } = img;
    const { maxWidth, maxHeight } = opts;

    if (maxWidth && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (maxHeight && height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Determine output format
    let outputFormat = opts.format;
    if (outputFormat === 'auto') {
      // Prefer WebP if supported (most modern browsers)
      outputFormat = 'image/webp';
      
      // Fallback logic if needed (though toBlob usually handles unsupported types by falling back to png)
      // If original was PNG/GIF (likely transparent), prefer WebP or PNG
      const isTransparent = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
      if (opts.preserveTransparency && isTransparent) {
        // WebP supports transparency and is smaller than PNG
        outputFormat = 'image/webp'; 
      } else if (!isTransparent) {
        outputFormat = 'image/jpeg';
      }
    }

    // Convert to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        outputFormat,
        opts.quality
      );
    });

    if (!blob) {
      throw new Error('Image compression failed');
    }

    // If the optimized blob is actually larger than the original, return the original
    // (unless we resized it significantly, in which case we might prefer the smaller dimensions even if size is similar)
    if (blob.size > file.size && width >= img.naturalWidth && height >= img.naturalHeight) {
      return file;
    }

    // Create new File
    const extension = outputFormat === 'image/jpeg' ? 'jpg' : outputFormat === 'image/png' ? 'png' : 'webp';
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + "." + extension;
    
    return new File([blob], newFileName, {
      type: outputFormat as string,
      lastModified: Date.now(),
    });

  } catch (error) {
    console.warn('Image optimization failed, using original file:', error);
    return file;
  }
};
