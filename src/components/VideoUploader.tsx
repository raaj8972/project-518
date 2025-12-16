import React from 'react';
import { ImageUpload } from './ImageUpload';
import { VideoOptimizationOptions } from '../utils/videoOptimizer';

interface VideoUploaderProps {
  onVideoSelect: (url: string) => void;
  currentVideo?: string;
  bucket: 'guest-artist-videos' | 'hero-video' | 'featured-videos' | 'posts';
  folder?: string;
  fileTypeLabel?: string;
  className?: string;
  optimizeVideoOptions?: VideoOptimizationOptions;
  maxSizeMB?: number; // Optional max size in MB, defaults to 50
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoSelect,
  currentVideo,
  bucket,
  folder = 'videos',
  fileTypeLabel = 'MP4, MOV, WEBM up to 50MB',
  className = '',
  optimizeVideoOptions,
  maxSizeMB = 50
}) => {
  return (
    <ImageUpload
      onImageSelect={onVideoSelect}
      currentImage={currentVideo}
      bucket={bucket as any} // Cast to satisfy simpler union if needed, or update ImageUpload types
      folder={folder}
      acceptedTypes="video/*"
      fileTypeLabel={fileTypeLabel}
      enableCropper={false} // Videos can't be cropped with the image cropper
      maxImageBytes={maxSizeMB * 1024 * 1024}
      optimizeVideoOptions={optimizeVideoOptions}
      className={className}
      autoSave={true} // Auto-update parent state on successful upload
    />
  );
};
