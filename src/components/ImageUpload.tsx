import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertCircle, 
  FileText, 
  Play, 
  Trash2, 
  UploadCloud, 
  X, 
  RotateCcw,
  Maximize,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageCropDialog } from './ImageCropDialog';
import { drawImageCrop, PROFILE_CROP_ASPECTS, type ProfileCropKind, type PixelCrop } from '../utils/imageCrop';
import { useData } from '../context/DataContext';
import { optimizeImage, OptimizationOptions } from '../utils/imageOptimizer';
import { optimizeVideo, VideoOptimizationOptions } from '../utils/videoOptimizer';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { humanSize, getFileName } from '../utils/uploadUtils';
import { deleteStorageFileByPublicUrl } from '../utils/storageUtils';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  /** Display the active site fallback without treating it as an uploaded draft asset. */
  previewFallback?: string;
  className?: string;
  bucket: 'event-images' | 'gallery-images' | 'roadmap-images' | 'sponsor-logos' | 'documents' | 'guest-artist-images' | 'guest-artist-videos' | 'guest-artist-audio' | 'band-images' | 'team-images' | 'faculty-images' | 'pdf' | 'hero-media' | 'hero-video' | 'registration-photos' | 'sports-images' | 'hero_v2' | 'team-branding';
  folder?: string;
  acceptedTypes?: string;
  fileTypeLabel?: string;
  enableCropper?: boolean;
  cropAspect?: number;
  profileCrop?: ProfileCropKind;
  autoSave?: boolean;
  hideControls?: boolean;
  maxImageBytes?: number;
  optimizeOptions?: OptimizationOptions;
  optimizeVideoOptions?: VideoOptimizationOptions;
  allowMultiple?: boolean;
  onBatchComplete?: (results: { url: string; file: File }[]) => void;
  onProcessingChange?: (busy: boolean) => void;
  isDirty?: boolean;
  preserveExistingMedia?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  currentImage,
  previewFallback,
  className = '',
  bucket,
  folder = '',
  acceptedTypes = 'image/*',
  fileTypeLabel,
  enableCropper = true,
  cropAspect,
  profileCrop,
  autoSave = false,
  hideControls = false,
  maxImageBytes,
  optimizeOptions,
  optimizeVideoOptions,
  allowMultiple = false,
  onBatchComplete,
  onProcessingChange,
  isDirty = false,
  preserveExistingMedia = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRootRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Local preview state
  const [localPreview, setLocalPreview] = useState<string>('');
  const [optimizedPreviewMeta, setOptimizedPreviewMeta] = useState<{ size: number; type: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Batch state
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const [originalImageMime, setOriginalImageMime] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  
  // Responsive / Layout state
  const { adminUsers, sanitizeUrl, isAdmin } = (useData?.() || {}) as any;
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  const [cropAspectLocal, setCropAspectLocal] = useState<number>(profileCrop ? PROFILE_CROP_ASPECTS[profileCrop] : typeof cropAspect === 'number' ? cropAspect : 16/9);

  // Hook integration
  const {
    isProcessing,
    setIsProcessing,
    uploading,
    uploadPercent,
    error,
    setError,
    pendingImage,
    setPendingImage,
    uploadHint,
    missingBucket,
    handleUploadProcess,
    resetUploadState
  } = useMediaUpload({
    bucket,
    folder,
    onImageSelect,
    maxImageBytes,
    preserveExistingMedia
  });

  useEffect(() => {
    if (preserveExistingMedia) { setLocalPreview(''); setPendingImage(''); }
  }, [currentImage, preserveExistingMedia, setPendingImage]);

  // Relay processing state to parent
  useEffect(() => {
    onProcessingChange?.(isProcessing || uploading || cropApplying || !!cropSrc);
    return () => onProcessingChange?.(false);
  }, [isProcessing, uploading, cropApplying, cropSrc, onProcessingChange]);

  // Check owner status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid || !Array.isArray(adminUsers)) {
          if (!cancelled) setIsOwner(false);
          return;
        }
        const owner = !!adminUsers.find((a: any) => a?.user_id === uid && (a?.role === 'owner' || a?.is_primary));
        if (!cancelled) setIsOwner(owner);
      } catch {
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminUsers]);

  // Derived types
  const acceptedTypesLower = acceptedTypes.toLowerCase();
  const isPdfUpload = acceptedTypesLower.includes('pdf');
  const isVideoUpload = acceptedTypesLower.includes('video');
  const isAudioUpload = acceptedTypesLower.includes('audio');
  
  const defaultImageMaxBytes = isOwner ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
  const defaultAudioMaxBytes = 25 * 1024 * 1024;
  const effectiveImageMaxBytes = (typeof maxImageBytes === 'number' && maxImageBytes > 0) ? maxImageBytes : defaultImageMaxBytes;
  
  const effectiveFileTypeLabel = fileTypeLabel || (isVideoUpload
    ? 'MP4, MOV up to 50MB'
    : isAudioUpload
      ? 'MP3, OGG'
      : isPdfUpload 
        ? 'PDF up to 10MB' 
        : `PNG, JPG, WEBP up to ${humanSize(effectiveImageMaxBytes)}`);

  // --- Handlers ---

  const validateFileType = (file: File) => {
    if (acceptedTypes === '*') return true;
    if (isVideoUpload && !file.type.startsWith('video/')) return setError('Invalid file type. Video required.'), false;
    if (isPdfUpload && file.type !== 'application/pdf') return setError('Invalid file type. PDF required.'), false;
    if (isAudioUpload && !file.type.startsWith('audio/')) return setError('Invalid file type. Audio required.'), false;
    if (!isVideoUpload && !isPdfUpload && !isAudioUpload && !file.type.startsWith('image/')) return setError('Invalid file type. Image required.'), false;
    return true;
  };

  const validateFileSize = (file: File) => {
    const maxSize = isVideoUpload ? (maxImageBytes || 50 * 1024 * 1024) : 
                isPdfUpload ? 10 * 1024 * 1024 : 
                isAudioUpload ? defaultAudioMaxBytes : effectiveImageMaxBytes;
    
    if (file.size > maxSize) {
      setError(`File too large. Max size: ${humanSize(maxSize)}`);
      return false;
    }
    return true;
  };

  const handleImageOptimization = async (file: File) => {
    try {
      const defaultOpts: OptimizationOptions = { maxWidth: 1920, maxHeight: 1920, quality: 0.8, format: 'auto', preserveTransparency: true };
      const opts = optimizeOptions ? { ...defaultOpts, ...optimizeOptions } : defaultOpts;
      const optimized = await optimizeImage(file, opts);
      setOptimizedPreviewMeta({ size: optimized.size, type: optimized.type });
      return optimized as File;
    } catch (e) {
      console.warn('Image optimization skipped', e);
      return file;
    }
  };

  const handleVideoOptimization = async (file: File) => {
    try {
      if (file.size > (maxImageBytes || 50 * 1024 * 1024) || optimizeVideoOptions?.force) {
        const vopts = optimizeVideoOptions || { maxWidth: 1280, maxHeight: 720, bitrate: 800_000, mimeType: 'video/webm;codecs=vp8,opus' };
        const optimized = await optimizeVideo(file, vopts);
        setOptimizedPreviewMeta({ size: optimized.size, type: optimized.type || file.type });
        return optimized as File;
      }
    } catch (e) {
      console.warn('Video optimization skipped', e);
    }
    return file;
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError('');
    
    // 1. Validation
    if (!validateFileType(file)) {
      setIsProcessing(false);
      return;
    }
    
    if (!validateFileSize(file)) {
      setIsProcessing(false);
      return;
    }

    // 2. Optimization (Images/Videos)
    let processedFile = file;
    if (!isVideoUpload && !isPdfUpload && !isAudioUpload) {
      processedFile = await handleImageOptimization(file);
    } else if (isVideoUpload) {
      processedFile = await handleVideoOptimization(processedFile);
    }

    // 3. Cropper or Direct Upload (Cropper restricted to admins)
    const effectiveEnableCropper = enableCropper && isAdminUser;

    if (!isPdfUpload && !isVideoUpload && !isAudioUpload && effectiveEnableCropper) {
      openCropper(processedFile);
    } else {
      // Local preview fallback
      if (!isPdfUpload) {
        if (isVideoUpload) {
          setLocalPreview(URL.createObjectURL(processedFile));
        } else {
          const reader = new FileReader();
          reader.onload = () => setLocalPreview(reader.result as string);
          reader.readAsDataURL(processedFile);
        }
      }
      
      try {
        const uploadedUrl = await handleUploadProcess(processedFile, autoSave, hideControls, currentImage);
        
        // Ensure parent gets the URL even if autoSave is false (manual save mode)
        if (!autoSave && !hideControls) {
          onImageSelect(uploadedUrl);
        }
        
      } catch (e: any) {
        console.error('Upload process failed:', e);
        setError(e.message || 'Upload failed');
        alert(`Upload Error: ${e.message}`);
      }
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    // Single file fallback
    if (files.length === 1) {
      handleFileSelect(files[0]);
      return;
    }

    // Batch processing
    if (!allowMultiple) {
      handleFileSelect(files[0]);
      return;
    }

    setIsProcessing(true);
    setError('');
    const results: { url: string; file: File }[] = [];
    const fileArray = Array.from(files);
    
    setBatchProgress({ current: 0, total: fileArray.length });

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setBatchProgress({ current: i + 1, total: fileArray.length });
        
        // Validate
        if (!validateFileType(file) || !validateFileSize(file)) {
          continue; // Skip invalid
        }

        try {
            // Optimize
            let processed = file;
             if (!isVideoUpload && !isPdfUpload && !isAudioUpload) {
                processed = await handleImageOptimization(file);
            }
            
            // Upload (Direct, no crop for batch)
            const url = await handleUploadProcess(processed, true, true);
            results.push({ url, file: processed });
        } catch (e) {
            console.warn('Batch upload error for', file.name, e);
        }
    }

    setIsProcessing(false);
    setBatchProgress(null);
    if (onBatchComplete && results.length > 0) {
        onBatchComplete(results);
    }
  };

  const openCropper = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (profileCrop) setCropAspectLocal(PROFILE_CROP_ASPECTS[profileCrop]);
      setCroppedAreaPixels(null);
      setCropSrc(reader.result as string);
      setLocalPreview(reader.result as string);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setError('');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
    setOriginalImageMime(file.type || null);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  // --- Crop Actions ---
  
  const getCroppedImgBlob = async (pixelCrop: PixelCrop | null): Promise<Blob> => {
    if (!cropSrc || !pixelCrop) throw new Error('Select an image crop first.');
    const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not load the image.'));
      image.src = cropSrc;
    });
    const canvas = drawImageCrop(imageElement, pixelCrop, rotation);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the cropped image.')), originalImageMime === 'image/png' ? 'image/png' : 'image/jpeg', .9));
  };

  const adjustExistingCrop = async () => {
    if (!currentImage || !isAdminUser) return;
    setIsProcessing(true); setError('');
    try {
      const response = await fetch(currentImage);
      if (!response.ok) throw new Error('Could not load the saved photo.');
      const blob = await response.blob();
      openCropper(new File([blob], 'profile-photo', { type: blob.type || 'image/jpeg' }));
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load the saved photo.'); setIsProcessing(false); }
  };

  const onConfirmCrop = async () => {
    if (cropApplying || isProcessing || uploading) return;
    setCropApplying(true);
    try {
      const blob = await getCroppedImgBlob(croppedAreaPixels);
      const file = new File([blob], `cropped_${Date.now()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type || 'image/jpeg' });
      const uploadedUrl = await handleUploadProcess(file, autoSave, hideControls, currentImage);
      
      if (!autoSave && !hideControls) {
        onImageSelect(uploadedUrl);
      }
      
      setCropSrc(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Cropping failed');
    } finally { setCropApplying(false); }
  };

  const onConfirmFull = async () => {
    try {
      const res = await fetch(cropSrc!);
      const blob = await res.blob();
      const file = new File([blob], `original_${Date.now()}.jpg`, { type: blob.type });
      
      const uploadedUrl = await handleUploadProcess(file, autoSave, hideControls, currentImage);
      
      if (!autoSave && !hideControls) {
        onImageSelect(uploadedUrl);
      }
      
      setCropSrc(null);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      alert(`Upload Error: ${e.message}`);
    }
  };

  const handleDelete = async () => {
    const target = pendingImage || currentImage;
    if (target && !preserveExistingMedia) await deleteStorageFileByPublicUrl(target);
    resetUploadState();
    onImageSelect('');
    setLocalPreview('');
    setShowDeleteConfirm(false);
  };
  
  const displayImageRaw = localPreview || pendingImage || currentImage || previewFallback;
  const displayImage = (() => {
    const sanitized = sanitizeUrl?.(displayImageRaw) || displayImageRaw || '';
    return sanitized;
  })();

  const getAspectRatiosForBucket = () => {
    switch (bucket) {
      case 'event-images':
        return [
          { label: 'Event Card (49:59)', value: 49 / 59.4, icon: undefined },
          { label: 'Home Bound (49:59)', value: 49 / 59.4, icon: undefined },
          { label: 'Square (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      case 'team-images':
        return [
          { label: 'Core Team (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Portrait (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      case 'faculty-images':
        return [
          { label: 'Faculty Card (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Portrait (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      case 'guest-artist-images':
        return [
          { label: 'Feature Artist / Guest (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Home Bound Card (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Square (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      case 'band-images':
        return [
          { label: 'Home Bound (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Feature Artist (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Square (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      case 'hero-media':
      case 'hero_v2':
      case 'hero-video':
        return [
          { label: 'Desktop (16:9)', value: 16 / 9, icon: undefined },
          { label: 'Mobile (9:16)', value: 9 / 16, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
      default:
        return [
          { label: 'Square (1:1)', value: 1 / 1, icon: undefined },
          { label: 'Landscape (16:9)', value: 16 / 9, icon: undefined },
          { label: 'Portrait (3:4)', value: 3 / 4, icon: undefined },
          { label: 'Story (9:16)', value: 9 / 16, icon: undefined },
          { label: 'Free', value: undefined, icon: Maximize }
        ];
    }
  };

  const ASPECT_RATIOS = getAspectRatiosForBucket();


  return (
    <div ref={uploadRootRef} className={`relative ${className}`}>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept={acceptedTypes} 
        multiple={allowMultiple}
        onChange={(e) => e.target.files && handleFiles(e.target.files)} 
        className="hidden" 
      />

      {(error || missingBucket) && (
        <div className="mb-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-indigo-100 font-medium">{error || `Bucket '${missingBucket}' missing`}</p>
            {missingBucket && <p className="text-xs text-indigo-300 mt-1">Please contact admin to initialize storage.</p>}
          </div>
          <button type="button" onClick={() => { setError(''); }} className="text-indigo-400 hover:text-indigo-200"><X size={16} /></button>
        </div>
      )}

      <div 
        className={`group relative w-full overflow-hidden rounded-2xl transition-all duration-300 ${
           displayImage 
            ? 'border border-white/10 bg-black/40 shadow-xl' 
            : dragOver 
              ? 'border-2 border-dashed border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(79,70,229,0.15)]' 
              : 'border-2 border-dashed border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-white/10 hover:shadow-lg'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => { 
          e.preventDefault(); 
          setDragOver(false); 
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        
        {(isProcessing || uploading) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="relative w-16 h-16 mb-4">
               <svg className="animate-spin w-full h-full text-indigo-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {uploadPercent > 0 && !batchProgress && (
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{uploadPercent}%</div>
               )}
            </div>
            {batchProgress ? (
              <p className="text-sm font-medium text-indigo-200">
                Uploading {batchProgress.current} of {batchProgress.total}...
              </p>
            ) : (
              <p className="text-sm font-medium text-indigo-200">{uploading ? 'Uploading media...' : 'Optimizing...'}</p>
            )}
            {uploadHint && <p className="text-xs text-gray-400 mt-2 text-center max-w-[80%]">{uploadHint}</p>}
          </div>
        )}

        {displayImage ? (
          <div className="relative min-h-[200px] w-full flex flex-col">
            <div className="relative flex-1 bg-black/50 flex items-center justify-center overflow-hidden min-h-[200px] max-h-[400px]">
              {isVideoUpload ? (
                <video src={displayImage} className="max-h-full max-w-full w-auto h-auto object-contain" controls />
              ) : isPdfUpload ? (
                 <div className="flex flex-col items-center gap-2 p-6">
                   <FileText className="w-16 h-16 text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]" />
                   <span className="text-sm text-gray-300 font-mono break-all text-center">{getFileName(displayImage)}</span>
                   <a href={displayImage} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">Open PDF</a>
                 </div>
              ) : (
                <img src={displayImage} alt="Preview" className="w-full h-full object-contain" />
              )}
              
              {!hideControls && !profileCrop && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex items-center justify-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-110 shadow-lg" title="Change">
                       <RotateCcw size={18} />
                     </button>
                     <button type="button" disabled={!localPreview && !pendingImage && !currentImage} onClick={() => setShowDeleteConfirm(true)} className="p-3 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 backdrop-blur-md border border-indigo-500/30 text-indigo-200 transition-all hover:scale-110 shadow-lg" title="Delete">
                        <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              )}
            </div>
            
            {!hideControls && !profileCrop && (
               <div className="lg:hidden flex items-center justify-between p-3 bg-black/60 backdrop-blur-md border-t border-white/10">
                  <button onClick={() => fileInputRef.current?.click()} type="button" className="text-xs font-bold text-gray-200 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                    <RotateCcw size={14} /> Change
                  </button>
                  <button disabled={!localPreview && !pendingImage && !currentImage} onClick={() => setShowDeleteConfirm(true)} type="button" className="text-xs font-bold text-indigo-400 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors">
                    <Trash2 size={14} /> Remove
                  </button>
               </div>
            )}
            
            {!profileCrop && <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-[10px] font-medium backdrop-blur-md shadow-lg">
                <span className="font-medium truncate max-w-[150px]">{currentImage ? (isVideoUpload ? 'Video URL' : (isAudioUpload ? 'Audio URL' : 'Image URL')) : previewFallback ? 'Current website media' : 'None'}</span>
              </div>
              
              {isDirty && (
                <div className="px-2.5 py-1.5 bg-indigo-500/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Unsaved
                </div>
              )}
              {optimizedPreviewMeta && (
                <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-zinc-300 text-[10px] uppercase font-bold backdrop-blur-md shadow-lg">
                  {humanSize(optimizedPreviewMeta.size)} • {optimizedPreviewMeta.type.split('/')[1]}
                </div>
              )}
            </div>}
          </div>
        ) : (
          <div 
             onClick={() => fileInputRef.current?.click()}
             className="flex flex-col items-center justify-center py-10 px-4 cursor-pointer text-center min-h-[160px]"
          >
            <div className={`p-4 rounded-2xl mb-4 transition-all duration-300 ${dragOver ? 'bg-indigo-500/20 scale-110 shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-500/30' : 'bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:scale-105 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'}`}>
               {isVideoUpload ? <Play className="w-8 h-8 text-indigo-400 transform group-hover:scale-110 transition-transform" /> : <UploadCloud className="w-8 h-8 text-indigo-400 transform group-hover:-translate-y-1 transition-transform" />}
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              Click to upload or drag & drop
            </h3>
            <p className="text-xs font-medium text-zinc-500 max-w-[200px]">
              {effectiveFileTypeLabel}
            </p>
          </div>
        )}
      </div>

      {profileCrop && <div className="people-upload-actions">
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing || uploading}>{currentImage ? 'Change photo' : 'Choose photo'}</button>
        {currentImage && isAdminUser && <button type="button" onClick={adjustExistingCrop} disabled={isProcessing || uploading}>Adjust photo crop</button>}
        {currentImage && !hideControls && <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isProcessing || uploading}>Remove</button>}
      </div>}

      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{preserveExistingMedia ? 'Remove from draft?' : 'Delete File?'}</h3>
            <p className="text-sm text-zinc-400 mb-6">{preserveExistingMedia ? 'This removes the image from your draft. The saved file is kept.' : 'This action cannot be undone. The file will be permanently removed from storage.'}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors border border-white/5">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(239,68,68,0.3)] transition-all">
                {preserveExistingMedia ? 'Remove' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        uploadRootRef.current?.closest('dialog') || document.body
      )}

      {cropSrc && createPortal(<ImageCropDialog source={cropSrc} kind={profileCrop} aspect={cropAspectLocal} onAspect={setCropAspectLocal} ratios={ASPECT_RATIOS} crop={crop} onCrop={setCrop} zoom={zoom} onZoom={setZoom} rotation={rotation} onRotation={setRotation} selected={croppedAreaPixels} onSelect={setCroppedAreaPixels} busy={isProcessing || uploading || cropApplying} error={error || ''} onClose={() => setCropSrc(null)} onSave={onConfirmCrop} onOriginal={onConfirmFull} onReset={handleReset} />, uploadRootRef.current?.closest('dialog') || document.body)}
    </div>
  );
};
