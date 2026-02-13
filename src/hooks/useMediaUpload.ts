import { useState, useRef, useEffect } from 'react';
import { supabase, SUPABASE_HOST } from '../lib/supabase';
import { ensureValidSession } from '../lib/authFetch';
import { useSavingProgress } from '../context/SavingProgressContext';
import { optimizeImage, OptimizationOptions } from '../utils/imageOptimizer';
import { optimizeVideo, VideoOptimizationOptions } from '../utils/videoOptimizer';
import { mapUploadError, deleteFromStorageByPublicUrl, humanSize } from '../utils/uploadUtils';

interface UseMediaUploadProps {
  bucket: string;
  folder?: string;
  onImageSelect: (url: string) => void;
  maxImageBytes?: number;
}

export const useMediaUpload = ({ 
  bucket, 
  folder = '', 
  onImageSelect,
  maxImageBytes
}: UseMediaUploadProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string>('');
  const [uploadHint, setUploadHint] = useState<string>('');
  const [missingBucket, setMissingBucket] = useState<string>('');
  
  // Local state for context aware helpers
  const savingProgress = useSavingProgress();

  // Helper to race promise against timeout
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

  const uploadToSupabase = async (
    file: File, 
    isVideoUpload: boolean, 
    isPdfUpload: boolean, 
    isAudioUpload: boolean,
    onProgress?: (p: number) => void
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const timeoutMs = isVideoUpload ? 300_000 : isPdfUpload ? 60_000 : isAudioUpload ? 180_000 : 120_000;

  /* 115 original line; replaced content follows */
  /* 115 original line; replaced content follows */
    const tryXHR = async () => {
      // --- INTERCEPTION: Route ALL images to/from Cloudflare R2 ---
      // Map Supabase buckets to R2 folders for cleaner organization
      const BUCKET_TO_R2: Record<string, string> = {
        'gallery-images': 'gallery',
        'event-images': 'events',
        'sponsor-logos': 'sponsors',
        'team-images': 'team',
        'faculty-images': 'faculty',
        'guest-artist-images': 'guests', 
        'guest-artist-videos': 'videos',
        'guest-artist-audio': 'audio',
        'band-images': 'band',
        'hero-media': 'hero',
        'hero-video': 'hero-video',
        'documents': 'documents',
        'registration-photos': 'registrations',
        'sports-images': 'sports',
        'pdf': 'pdf'
      };

      // If bucket is in our map (or we want to catch-all), use R2
      const r2Folder = BUCKET_TO_R2[bucket];
      
      if (r2Folder) {
        try {
          const { uploadToR2 } = await import('../utils/r2Utils');
          const secureUrl = await withTimeout(
            uploadToR2(file, r2Folder), // Pass mapped folder
            Math.max(timeoutMs, 60000), 
            'r2-upload'
          );
          return secureUrl; 
        } catch (e: any) {
          throw new Error(`R2 Upload Error: ${e.message || 'Upload failed'}`);
        }
      }
      // --- End Interception ---

      const access = await ensureValidSession();
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
      
      // If we used XHR successfully for Supabase, extract the public URL below
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrl;
    };

    const trySDK = async () => {
      // --- INTERCEPTION (Backup): Ensure R2 is used even in fallback ---
      // Simplified check: validation is done in tryXHR mostly, but if session fails, we still want R2
      // We can re-derive folder or just default to 'uploads' if not found, but let's replicate map
      const BUCKET_TO_R2_BACKUP: Record<string, string> = {
        'gallery-images': 'gallery',
        'event-images': 'events',
        'sponsor-logos': 'sponsors',
        'team-images': 'team',
        'faculty-images': 'faculty',
        'guest-artist-images': 'guests', 
        'guest-artist-videos': 'videos',
        'guest-artist-audio': 'audio',
        'band-images': 'band',
        'hero-media': 'hero',
        'hero-video': 'hero-video',
        'documents': 'documents',
        'registration-photos': 'registrations',
        'sports-images': 'sports',
        'pdf': 'pdf'
      };
      
      const r2Folder = BUCKET_TO_R2_BACKUP[bucket];

      if (r2Folder) {
         const { uploadToR2 } = await import('../utils/r2Utils');
         return await withTimeout(
           uploadToR2(file, r2Folder),
           timeoutMs,
           'r2-retry'
         );
      }
      // --- End Interception ---

      const { error } = await withTimeout(
        supabase.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined }),
        timeoutMs,
        'upload'
      );
      if (error) throw error as any;
      
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrl;
    };

    try {
      // Execute the appropriate path, returning the URL immediately if successful
      return await tryXHR();
    } catch (e: any) {
      if ((e?.message || '').includes('no-session')) {
        try { return await trySDK(); } catch (ee) { throw new Error('no-session'); }
      } else {
        try { return await trySDK(); } catch (ee) { throw ee; }
      }
    }
    // Unreachable if returns above work correctly, but safeguard
    // The returns are inside tryXHR/trySDK for R2 paths
  };

  const handleUploadProcess = async (
    file: File,
    isVideoUpload: boolean,
    isPdfUpload: boolean,
    isAudioUpload: boolean,
    autoSave: boolean,
    hideControls: boolean,
    currentImage?: string
  ) => {
    setUploading(true);
    setUploadHint('');
    setUploadPercent(0);
    setError('');
    
    try { savingProgress.start('Uploading…', 1); } catch {}
    
    const hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the image is large, try a smaller one.'), 8000);

    try {
      const fileUrl = await uploadToSupabase(file, isVideoUpload, isPdfUpload, isAudioUpload, (p) => {
        const pct = Math.round(p);
        setUploadPercent(pct);
        try { savingProgress.set(Math.max(1, Math.min(99, pct))); } catch {}
      });

      try { savingProgress.set(100); } catch {}
      
      // Cleanup previous pending image
      if (pendingImage && pendingImage !== fileUrl) {
        await deleteFromStorageByPublicUrl(pendingImage, bucket);
      }
      
      setPendingImage(fileUrl);
      
      if (autoSave || hideControls) {
        if (currentImage && currentImage !== fileUrl) {
          await deleteFromStorageByPublicUrl(currentImage, bucket);
        }
        onImageSelect(fileUrl);
      }
      return fileUrl;

    } catch (err: any) {
      console.error('Upload error:', err);
      if (err instanceof Error && /mime type/i.test(err.message)) {
        setError('Upload failed: this file type is not allowed in the bucket.');
      } else {
        const mappedErr = mapUploadError(err, bucket);
        setError(mappedErr.message);
        if (mappedErr.message.includes('bucket not found')) {
          setMissingBucket(bucket);
        }
      }
      throw err;
    } finally {
      clearTimeout(hintTimer);
      setUploading(false);
      setUploadHint('');
      setUploadPercent(0);
      try { savingProgress.done(); } catch {}
    }
  };

  const clearError = () => setError('');
  
  const resetUploadState = () => {
    setPendingImage('');
    setError('');
    setUploadPercent(0);
    setUploading(false);
  };

  return {
    isProcessing,
    setIsProcessing,
    uploading,
    uploadPercent,
    error,
    setError,
    clearError,
    pendingImage,
    setPendingImage,
    uploadHint,
    missingBucket,
    handleUploadProcess,
    resetUploadState,
    deleteFromStorageByPublicUrl: (url: string) => deleteFromStorageByPublicUrl(url, bucket)
  };
};
