import React, { useCallback, useRef, useState } from 'react';
import { Image as ImageIcon, AlertCircle, FileText, Play } from 'lucide-react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import Cropper from 'react-easy-crop';
import { useSavingProgress } from '../context/SavingProgressContext';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
  bucket: 'event-images' | 'gallery-images' | 'sponsor-logos' | 'documents' | 'guest-artist-images' | 'guest-artist-videos' | 'band-images' | 'team-images' | 'faculty-images' | 'pdf' | 'hero-media' | 'hero-video' | 'registration-photos' | 'sports-images';
  folder?: string;
  acceptedTypes?: string;
  fileTypeLabel?: string;
  // optional crop settings
  enableCropper?: boolean; // default true for images
  cropAspect?: number; // e.g., 1 for square avatar, 4/3, 16/9, etc.
  // if true, immediately calls onImageSelect after a successful upload (skip extra Save click)
  autoSave?: boolean;
  // hide all action controls (Change/Save/Delete) and just display the image; intended for registration flow
  hideControls?: boolean;
  // optional override for image size limit (bytes). If not provided, defaults to 5MB for images
  maxImageBytes?: number;
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
  autoSave = false,
  hideControls = false,
  maxImageBytes
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string>('');
  // Local, immediate preview (data URL) so users can see the selected image even if bucket is private
  const [localPreview, setLocalPreview] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [missingBucket, setMissingBucket] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string>('');
  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalImageMime, setOriginalImageMime] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  const savingProgress = useSavingProgress();

  const isPdfUpload = acceptedTypes.includes('pdf');
  const isVideoUpload = acceptedTypes.includes('video');

  // Helper: read a File into an HTMLImageElement
  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper: draw image to canvas with max dimensions
  const drawImageToCanvas = (img: HTMLImageElement, maxW: number, maxH: number): HTMLCanvasElement => {
    const scale = Math.min(1, Math.min(maxW / (img.naturalWidth || img.width), maxH / (img.naturalHeight || img.height)));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  };

  // Attempt to compress an image under a target byte size. Returns a File if successful; null if not achievable.
  const compressImageToTarget = async (file: File, targetBytes: number): Promise<File | null> => {
    try {
      const img = await loadImageFromFile(file);
      // Start with modest bounds; we'll reduce progressively
      let maxW = Math.min(img.naturalWidth || img.width, 1280);
      let maxH = Math.min(img.naturalHeight || img.height, 1280);
      let quality = 0.82; // good starting point for photos

      let lastBlob: Blob | null = null;
      for (let i = 0; i < 10; i++) {
        const canvas = drawImageToCanvas(img, maxW, maxH);
        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality);
        });
        lastBlob = blob;
        if (blob.size <= targetBytes) {
          return new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        // Alternate lowering quality and dimensions
        if (i % 2 === 0 && quality > 0.5) {
          quality = Math.max(0.5, quality * 0.85);
        } else {
          maxW = Math.max(320, Math.round(maxW * 0.85));
          maxH = Math.max(320, Math.round(maxH * 0.85));
        }
      }
      // After attempts, if still too large, give up
      if (lastBlob && lastBlob.size <= targetBytes * 1.1) {
        // If within 10% over, allow as a pragmatic fallback
        return new File([lastBlob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      }
      return null;
    } catch (e) {
      console.warn('Compression failed:', e);
      return null;
    }
  };

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

  const uploadToSupabase = async (file: File, onProgress?: (p: number) => void): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Dynamic timeout based on file type: videos can be large, images smaller
    const timeoutMs = isVideoUpload ? 300_000 : isPdfUpload ? 60_000 : 120_000;
    // Try XHR path to surface real upload progress.
    const tryXHR = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const access = sessionData?.session?.access_token;
      if (!access) throw new Error('no-session');
      const base = `https://${SUPABASE_HOST}`;
      const endpoint = `${base}/storage/v1/object/${bucket}/${encodeURIComponent(fileName)}`;
      await withTimeout(new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const killer = setTimeout(() => { try { xhr.abort(); } catch {} reject(new Error('upload timed out')); }, timeoutMs);
        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Authorization', `Bearer ${access}`);
        try { xhr.setRequestHeader('apikey', (supabase as any).supabaseKey || ''); } catch {}
        xhr.setRequestHeader('x-upsert', 'false');
        if (file.type) xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && onProgress) {
            onProgress((evt.loaded / evt.total) * 100);
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            clearTimeout(killer);
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed (HTTP ${xhr.status}): ${xhr.responseText || 'unknown error'}`));
          }
        };
        xhr.onerror = () => { clearTimeout(killer); reject(new Error('Network error during upload')); };
        xhr.send(file);
      }), timeoutMs, 'upload');
    };

    const trySDK = async () => {
      const { error } = await withTimeout(
        supabase.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined }),
        timeoutMs,
        'upload'
      );
      if (error) throw error as any;
    };

    try {
      await tryXHR();
    } catch (e: any) {
      // Fallback to SDK if no session or XHR unsupported
      if ((e?.message || '').includes('no-session')) {
        await trySDK();
      } else {
        // Try SDK once more in case of other XHR errors
        try {
          await trySDK();
        } catch (ee) {
          // Surface the SDK error which usually includes useful status/details (e.g., 401/403, bucket not found)
          throw ee;
        }
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const mapUploadError = (error: any): Error => {
    const status = (error as any)?.status as number | undefined;
    const msgRaw = (error && (error as any).message) ? (error as any).message : String(error);
    const msg = msgRaw.toLowerCase();
    // Handle generic/opaque network errors (status 0) with actionable hints
    if (status === 0 || msg.includes('http 0') || msg.includes('unknown error')) {
      return new Error('Network/CORS error during upload (HTTP 0). Check your Supabase URL/key configuration, browser extensions (ad blockers), and retry. If this persists, try logging in to Admin and uploading from there.');
    }
    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('permission') || msg.includes('not allowed')) {
      return new Error(
        `Upload not permitted (HTTP ${status ?? '403'}). You must be logged in as admin. Please log in to the Admin dashboard and retry. If already logged in, ensure storage policies for bucket '${bucket}' allow authenticated inserts.`
      );
    }
    if (msg.includes('bucket not found') || msg.includes('not found') || msg.includes('no such file or directory')) {
      setMissingBucket(bucket);
      return new Error(`Storage bucket '${bucket}' not found in this Supabase project. Run the SQL shown below to create it, then retry.`);
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout')) {
      return new Error('Network error during upload. Check your internet connection or try a smaller image.');
    }
    return new Error(`Upload failed${status ? ` (HTTP ${status})` : ''}: ${msgRaw}`);
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

    // Check file size (max 50MB for videos, 10MB for PDFs, default 5MB for images unless overridden)
    const maxSize = isVideoUpload
      ? 50 * 1024 * 1024
      : isPdfUpload
        ? 10 * 1024 * 1024
        : (typeof maxImageBytes === 'number' && maxImageBytes > 0 ? maxImageBytes : 5 * 1024 * 1024);
    if (file.size > maxSize) {
      // For images, if a strict maxImageBytes is set, try auto-compress instead of erroring out.
      if (!isVideoUpload && !isPdfUpload && maxImageBytes) {
        const compressed = await compressImageToTarget(file, maxImageBytes);
        if (!compressed || compressed.size > maxImageBytes * 1.1) {
          setError(`File size must be less than ${Math.ceil(maxImageBytes / 1024)}KB (even after compression). Please choose a smaller image.`);
          return;
        }
        // Replace the file with compressed version and proceed
        file = compressed as File;
      } else {
        const sizeLabel = isVideoUpload
          ? '50MB'
          : isPdfUpload
            ? '10MB'
            : (typeof maxImageBytes === 'number' && maxImageBytes > 0 ? `${Math.ceil(maxImageBytes / 1024)}KB` : '5MB');
        setError(`File size must be less than ${sizeLabel}`);
        return;
      }
    }

    // For images, optionally open cropper instead of immediate upload
    if (!isPdfUpload && !isVideoUpload && enableCropper) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCropSrc(dataUrl);
        // Show immediate preview behind the crop modal
        setLocalPreview(dataUrl);
        setZoom(0.9); // start slightly zoomed-out for easier full-photo view
        setCrop({ x: 0, y: 0 });
        setError('');
      };
      reader.readAsDataURL(file);
      setOriginalImageMime(file.type || null);
      // stash the original file object for later in input (not stored; we’ll recreate from canvas)
      return;
    }

    // If cropper is disabled but this is an image, still create a quick local preview
    if (!isPdfUpload && !isVideoUpload && !enableCropper) {
      try {
        const r = new FileReader();
        r.onload = () => setLocalPreview(r.result as string);
        r.readAsDataURL(file);
      } catch {}
    }

    // Default path: direct upload (videos/PDFs or cropper disabled)
    setUploading(true);
  setUploadHint('');
  setUploadPercent(0);
  // Start global overlay for uploads
  try { savingProgress.start('Uploading…', 1); } catch {}
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
    setError('');
    try {
      const fileUrl = await uploadToSupabase(file, (p) => {
        const pct = Math.round(p);
        setUploadPercent(pct);
        try { savingProgress.set(Math.max(1, Math.min(99, pct))); } catch {}
      });
      try { savingProgress.set(100); } catch {}
      setPendingImage(fileUrl);
      if (autoSave || hideControls) {
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
        setError(mapUploadError(err).message);
      } else {
        setError('Upload failed');
      }
    } finally {
      if (hintTimer) clearTimeout(hintTimer);
      setUploading(false);
      setUploadHint('');
      setUploadPercent(0);
      try { savingProgress.done(); } catch {}
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
  setUploadPercent(0);
  try { savingProgress.start('Uploading…', 1); } catch {}
    hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
    // Allow full-image fallback when croppedAreaPixels is not yet set
  const fmt = chooseOutputFormat();
  const blob = await getCroppedImgBlob(cropSrc, croppedAreaPixels, fmt.mime);
  const file = new File([blob], `crop_${Date.now()}.${fmt.ext}`, { type: fmt.mime });
    const fileUrl = await uploadToSupabase(file, (p) => {
      const pct = Math.round(p);
      setUploadPercent(pct);
      try { savingProgress.set(Math.max(1, Math.min(99, pct))); } catch {}
    });
    try { savingProgress.set(100); } catch {}
    setPendingImage(fileUrl);
    if (autoSave || hideControls) {
      onImageSelect(fileUrl);
      setHasUnsavedChanges(false);
    } else {
      setHasUnsavedChanges(true);
    }
    setCropSrc(null);
  } catch (err) {
    console.error('Crop upload failed:', err);
    setError(mapUploadError(err).message);
  } finally {
    if (hintTimer) clearTimeout(hintTimer);
    setUploadHint('');
    setUploading(false);
    setUploadPercent(0);
    try { savingProgress.done(); } catch {}
  }
  };

  // Explicit "Use Full Photo" path: ignore the crop area and upload the whole image
  const confirmFullImageUpload = async () => {
    if (!cropSrc) return;
    let hintTimer: ReturnType<typeof setTimeout> | undefined;
    try {
  setUploading(true);
  setUploadHint('');
  setUploadPercent(0);
  try { savingProgress.start('Uploading…', 1); } catch {}
      hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);
  const fmt = chooseOutputFormat();
  const blob = await getCroppedImgBlob(cropSrc, null, fmt.mime);
  const file = new File([blob], `full_${Date.now()}.${fmt.ext}`, { type: fmt.mime });
      const fileUrl = await uploadToSupabase(file, (p) => {
        const pct = Math.round(p);
        setUploadPercent(pct);
        try { savingProgress.set(Math.max(1, Math.min(99, pct))); } catch {}
      });
      try { savingProgress.set(100); } catch {}
      setPendingImage(fileUrl);
      if (autoSave || hideControls) {
        onImageSelect(fileUrl);
        setHasUnsavedChanges(false);
      } else {
        setHasUnsavedChanges(true);
      }
      setCropSrc(null);
    } catch (err) {
      console.error('Full image upload failed:', err);
      setError(mapUploadError(err).message);
    } finally {
      if (hintTimer) clearTimeout(hintTimer);
      setUploadHint('');
      setUploading(false);
      setUploadPercent(0);
      try { savingProgress.done(); } catch {}
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
  // Prefer local preview so that private buckets still show an image immediately after selection
  const displayImage = localPreview || pendingImage || currentImage;
  return (
    <div className={`relative mb-3 ${className}`}>
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
  <div className={`relative group ${hideControls ? 'cursor-pointer' : ''}`} onClick={hideControls ? handleClick : undefined}>
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
          {hideControls && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-80 group-hover:opacity-100 select-none">
              Change
            </div>
          )}
          {!hideControls && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
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
          )}
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
              {/* Circular progress ring */}
              <div className="relative mb-2" style={{ width: 72, height: 72 }}>
                <svg className="transform -rotate-90" width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="32" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle
                    cx="36"
                    cy="36"
                    r="32"
                    stroke="#f59e0b"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={(1 - (uploadPercent || 0) / 100) * (2 * Math.PI * 32)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">{Math.max(0, Math.min(100, Math.round(uploadPercent || 0)))}%</span>
                </div>
              </div>
              <p className="text-gray-600">Uploading to Supabase…</p>
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