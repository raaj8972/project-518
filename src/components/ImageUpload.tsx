import React, { useCallback, useRef, useState } from 'react';
import { Image as ImageIcon, AlertCircle, FileText, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
  bucket: 'event-images' | 'gallery-images' | 'sponsor-logos' | 'documents' | 'guest-artist-images' | 'guest-artist-videos' | 'band-images' | 'team-images' | 'faculty-images' | 'pdf' | 'hero-media' | 'hero-video';
  folder?: string;
  acceptedTypes?: string;
  fileTypeLabel?: string;
  // optional crop settings
  enableCropper?: boolean; // default true for images
  cropAspect?: number; // e.g., 1 for square avatar, 4/3, 16/9, etc.
  // if true, immediately calls onImageSelect after a successful upload (skip extra Save click)
  autoSave?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  currentImage, 
  className = '',
  bucket,
  folder = '',
  acceptedTypes = 'image/*',
  fileTypeLabel = 'PNG, JPG, GIF up to 5MB',
  enableCropper = true,
  cropAspect,
  autoSave = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [missingBucket, setMissingBucket] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string>('');
  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalImageMime, setOriginalImageMime] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<null | { x: number; y: number; width: number; height: number }>(null);

  const isPdfUpload = acceptedTypes.includes('pdf');
  const isVideoUpload = acceptedTypes.includes('video');

  // Utility: race a promise against a timeout
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> => {
    let timer: any;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
      const result = await Promise.race([promise, timeout]);
      return result as T;
    } finally {
      clearTimeout(timer);
    }
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Dynamic timeout based on file type: videos can be large, images smaller
    const timeoutMs = isVideoUpload ? 300_000 : isPdfUpload ? 60_000 : 120_000;
    const { error } = await withTimeout(
      supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined }),
      timeoutMs,
      'upload'
    );

    if (error) {
      const status = (error as any)?.status as number | undefined;
      const msgRaw = error.message || '';
      const msg = msgRaw.toLowerCase();
      // Auth/permission issues (common when not logged in to Supabase auth)
      if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed')) {
        throw new Error(
          `Upload not permitted (HTTP ${status ?? '403'}). You must be logged in as admin. Please log in to the Admin dashboard and retry. If already logged in, ensure storage policies for bucket '${bucket}' allow authenticated inserts.`
        );
      }
      // Missing bucket in this Supabase project
      if (msg.includes('bucket not found') || msg.includes('not found') || msg.includes('no such file or directory')) {
        setMissingBucket(bucket);
        throw new Error(
          `Storage bucket '${bucket}' not found in this Supabase project. Run the SQL shown below to create it, then retry.`
        );
      }
      // Network issues
      if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout')) {
        throw new Error('Network error during upload. Check your internet connection or try a smaller image.');
      }
      // Generic fallback with status code if present
      throw new Error(`Upload failed${status ? ` (HTTP ${status})` : ''}: ${msgRaw}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileSelect = async (file: File) => {
    if (isVideoUpload) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file (MP4 or MOV)');
        return;
      }
    } else if (isPdfUpload) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
    } else {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
    }

    // Check file size (max 50MB for videos, 10MB for PDFs, 5MB for images)
    const maxSize = isVideoUpload ? 50 * 1024 * 1024 : isPdfUpload ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than ${isVideoUpload ? '50MB' : isPdfUpload ? '10MB' : '5MB'}`);
      return;
    }

    // For images, optionally open cropper instead of immediate upload
    if (!isPdfUpload && !isVideoUpload && enableCropper) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCropSrc(dataUrl);
        setZoom(0.9); // start slightly zoomed-out for easier full-photo view
        setCrop({ x: 0, y: 0 });
        setError('');
      };
      reader.readAsDataURL(file);
      setOriginalImageMime(file.type || null);
      // stash the original file object for later in input (not stored; we’ll recreate from canvas)
      return;
    }

    // Default path: direct upload (videos/PDFs or cropper disabled)
    setUploading(true);
  setUploadHint('');
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
    setError('');
    try {
      const fileUrl = await uploadToSupabase(file);
      setPendingImage(fileUrl);
      if (autoSave) {
        onImageSelect(fileUrl);
        setHasUnsavedChanges(false);
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof Error && /mime type/i.test(err.message)) {
        setError('Upload failed: this file type is not allowed in the bucket. Allowed: PNG, JPG, WEBP, GIF, MP4, MOV');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Upload failed');
      }
    } finally {
      if (hintTimer) clearTimeout(hintTimer);
      setUploading(false);
    }
  };

  const handleSaveImage = () => {
    if (pendingImage) {
      onImageSelect(pendingImage);
      setHasUnsavedChanges(false);
      setError('');
    }
  };

  const handleDiscardChanges = () => {
    setPendingImage('');
    setHasUnsavedChanges(false);
    setError('');
  };

  const onCropComplete = useCallback((_: any, areaPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // Create a blob from the cropped area via canvas
  const getCroppedImgBlob = async (
    imageSrc: string,
    cropPixels: { x: number; y: number; width: number; height: number } | null,
    outputMime: 'image/png' | 'image/jpeg'
  ): Promise<Blob> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });

    // If no crop area provided yet (user didn’t move handles), default to full image
    const effective = cropPixels && cropPixels.width && cropPixels.height
      ? cropPixels
      : { x: 0, y: 0, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };

    // Downscale very large images to keep size reasonable (max dimension ~1600px)
    const maxDim = 1600;
    const scale = Math.min(1, Math.min(maxDim / effective.width, maxDim / effective.height));
    const targetW = Math.max(1, Math.floor(effective.width * scale));
    const targetH = Math.max(1, Math.floor(effective.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      effective.x,
      effective.y,
      effective.width,
      effective.height,
      0,
      0,
      targetW,
      targetH
    );

    return await new Promise<Blob>((resolve, reject) => {
      const quality = outputMime === 'image/jpeg' ? 0.9 : undefined;
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, outputMime, quality as any);
    });
  };

  // Decide export format: strictly preserve PNG/JPG; otherwise choose sensible fallback
  const chooseOutputFormat = () => {
    const orig = (originalImageMime || '').toLowerCase();
    if (orig.includes('image/png')) {
      return { mime: 'image/png' as const, ext: 'png' };
    }
    if (orig.includes('image/jpeg') || orig.includes('image/jpg')) {
      return { mime: 'image/jpeg' as const, ext: 'jpg' };
    }
    // Fallbacks for other types
    if (bucket === 'sponsor-logos') {
      // Prefer PNG for logos when original type is unknown/other to preserve transparency
      return { mime: 'image/png' as const, ext: 'png' };
    }
    // Default to JPEG for photos
    return { mime: 'image/jpeg' as const, ext: 'jpg' };
  };

  const confirmCropAndUpload = async () => {
    if (!cropSrc) return;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    setUploading(true);
    setUploadHint('');
    hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
    // Allow full-image fallback when croppedAreaPixels is not yet set
  const fmt = chooseOutputFormat();
  const blob = await getCroppedImgBlob(cropSrc, croppedAreaPixels, fmt.mime);
  const file = new File([blob], `crop_${Date.now()}.${fmt.ext}`, { type: fmt.mime });
    const fileUrl = await uploadToSupabase(file);
    setPendingImage(fileUrl);
    if (autoSave) {
      onImageSelect(fileUrl);
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(true);
    }
    setCropSrc(null);
  } catch (err) {
    console.error('Crop upload failed:', err);
    setError(err instanceof Error ? err.message : 'Crop upload failed');
  } finally {
    if (hintTimer) clearTimeout(hintTimer);
    setUploadHint('');
    setUploading(false);
  }
  };

  // Explicit "Use Full Photo" path: ignore the crop area and upload the whole image
  const confirmFullImageUpload = async () => {
    if (!cropSrc) return;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      setUploading(true);
      setUploadHint('');
      hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
  const fmt = chooseOutputFormat();
  const blob = await getCroppedImgBlob(cropSrc, null, fmt.mime);
  const file = new File([blob], `full_${Date.now()}.${fmt.ext}`, { type: fmt.mime });
      const fileUrl = await uploadToSupabase(file);
      setPendingImage(fileUrl);
      if (autoSave) {
        onImageSelect(fileUrl);
        setHasUnsavedChanges(false);
      } else {
        setHasUnsavedChanges(true);
      }
      setCropSrc(null);
    } catch (err) {
      console.error('Full image upload failed:', err);
      setError(err instanceof Error ? err.message : 'Full image upload failed');
    } finally {
      if (hintTimer) clearTimeout(hintTimer);
      setUploadHint('');
      setUploading(false);
    }
  };

  const cancelCrop = () => {
    setCropSrc(null);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = async () => {
    const imageToRemove = pendingImage || currentImage;
    if (imageToRemove && imageToRemove.includes(bucket)) {
      try {
        // Extract object path relative to the bucket from the public URL
        const url = new URL(imageToRemove);
        // Typical pathname: /storage/v1/object/public/<bucket>/<folder>/<filename>
        const publicPrefix = `/storage/v1/object/public/${bucket}/`;
        let objectPath = '';
        if (url.pathname.includes(publicPrefix)) {
          objectPath = url.pathname.substring(url.pathname.indexOf(publicPrefix) + publicPrefix.length);
        } else {
          // Fallback: find bucket segment and take the rest
          const parts = url.pathname.split('/');
          const idx = parts.findIndex((p) => p === bucket);
          objectPath = idx >= 0 ? parts.slice(idx + 1).join('/') : parts[parts.length - 1];
        }

        if (objectPath) {
          await supabase.storage.from(bucket).remove([objectPath]);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    if (pendingImage) {
      setPendingImage('');
      setHasUnsavedChanges(false);
    } else {
      onImageSelect('');
    }
  };

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch {
      return 'Document';
    }
  };

  // Display the pending image if available, otherwise show current image
  const displayImage = pendingImage || currentImage;
  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      {missingBucket && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">Create missing bucket '{missingBucket}'</p>
          <pre className="text-xs whitespace-pre-wrap bg-yellow-100 p-2 rounded border border-yellow-200 overflow-x-auto">
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '{missingBucket}','{missingBucket}', true, 83886080,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public = EXCLUDED.public;

-- Policies
DROP POLICY IF EXISTS "Public read {missingBucket}" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert {missingBucket}" ON storage.objects;
DROP POLICY IF EXISTS "Auth update {missingBucket}" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete {missingBucket}" ON storage.objects;

CREATE POLICY "Public read {missingBucket}" ON storage.objects FOR SELECT TO public USING (bucket_id = '{missingBucket}');
CREATE POLICY "Auth insert {missingBucket}" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = '{missingBucket}');
CREATE POLICY "Auth update {missingBucket}" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = '{missingBucket}') WITH CHECK (bucket_id = '{missingBucket}');
CREATE POLICY "Auth delete {missingBucket}" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = '{missingBucket}');
          </pre>
          <p className="text-[11px] text-yellow-700 mt-1">Run in Supabase SQL editor, then retry upload.</p>
        </div>
      )}
      
      {hasUnsavedChanges && (
        <div className="mb-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center">
          <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
          <span className="text-yellow-700 text-sm">You have unsaved changes to this image</span>
        </div>
      )}
      
      {displayImage ? (
        <div className="relative group">
          {isVideoUpload ? (
            <div className="w-full h-48 bg-gray-100 border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center">
              <Play className="w-16 h-16 text-blue-500 mb-2" />
              <span className="text-sm text-gray-600 text-center px-2">
                {getFileName(displayImage)}
              </span>
              <a
                href={displayImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs mt-1"
              >
                View Video
              </a>
            </div>
          ) : isPdfUpload ? (
            <div className="w-full h-48 bg-gray-100 border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center">
              <FileText className="w-16 h-16 text-red-500 mb-2" />
              <span className="text-sm text-gray-600 text-center px-2">
                {getFileName(displayImage)}
              </span>
              <a
                href={displayImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs mt-1"
              >
                View PDF
              </a>
            </div>
          ) : (
            <img
              src={displayImage}
              alt="Selected"
             className="w-full h-24 object-cover rounded-lg border-2 border-gray-300"
            />
          )}
          <div className="mt-2 flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={handleClick}
              disabled={uploading}
             className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Change
            </button>
            {hasUnsavedChanges ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={uploading}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={uploading}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={uploading}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={removeFile}
             disabled={uploading}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-yellow-400 bg-yellow-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600">Uploading to Supabase...</p>
              {uploadHint && <p className="text-xs text-gray-500 mt-1">{uploadHint}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                {isVideoUpload ? (
                  <Play className="w-8 h-8 text-gray-400" />
                ) : isPdfUpload ? (
                  <FileText className="w-8 h-8 text-gray-400" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 mb-2">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">{fileTypeLabel}</p>
            </div>
          )}
        </div>
      )}

      {/* Cropper Modal */}
      {cropSrc && !isPdfUpload && !isVideoUpload && enableCropper && (
        <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Adjust & Crop</h3>
              <p className="text-sm text-gray-500">Drag to reposition, pinch/scroll to zoom. You can zoom out to see the full photo, or use the button to upload the entire image.</p>
            </div>
            <div className="relative" style={{ height: 420 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                restrictPosition={false}
                objectFit="contain"
                cropShape="rect"
                showGrid={false}
                minZoom={0.2}
                maxZoom={8}
              />
            </div>
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Zoom</label>
                <input
                  type="range"
                  min={0.2}
                  max={8}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={cancelCrop} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm">Cancel</button>
                <button type="button" onClick={confirmFullImageUpload} disabled={uploading} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm">Use Full Photo</button>
                <button type="button" onClick={confirmCropAndUpload} disabled={uploading} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm">Crop & Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};