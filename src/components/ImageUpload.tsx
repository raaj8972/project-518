import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertCircle, 
  FileText, 
  Play, 
  Trash2, 
  UploadCloud, 
  X, 
  Check, 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Maximize,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'; // Added from instruction
import { useData } from '../context/DataContext';
import { optimizeImage, OptimizationOptions } from '../utils/imageOptimizer';
import { optimizeVideo, VideoOptimizationOptions } from '../utils/videoOptimizer';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { humanSize, getFileName } from '../utils/uploadUtils';
import { deleteStorageFileByPublicUrl } from '../utils/storageUtils';

const getRadianAngle = (degreeValue: number) => {
  return (degreeValue * Math.PI) / 180;
};

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
  bucket: 'event-images' | 'gallery-images' | 'sponsor-logos' | 'documents' | 'guest-artist-images' | 'guest-artist-videos' | 'guest-artist-audio' | 'band-images' | 'team-images' | 'faculty-images' | 'pdf' | 'hero-media' | 'hero-video' | 'registration-photos' | 'sports-images' | 'hero_v2' | 'team-branding';
  folder?: string;
  acceptedTypes?: string;
  fileTypeLabel?: string;
  enableCropper?: boolean;
  cropAspect?: number;
  autoSave?: boolean;
  hideControls?: boolean;
  maxImageBytes?: number;
  optimizeOptions?: OptimizationOptions;
  optimizeVideoOptions?: VideoOptimizationOptions;
  allowMultiple?: boolean;
  onBatchComplete?: (results: { url: string; file: File }[]) => void;
  onProcessingChange?: (busy: boolean) => void;
  isDirty?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  currentImage, 
  className = '',
  bucket,
  folder = '',
  acceptedTypes = 'image/*',
  fileTypeLabel,
  enableCropper = true,
  cropAspect,
  autoSave = false,
  hideControls = false,
  maxImageBytes,
  optimizeOptions,
  optimizeVideoOptions,
  allowMultiple = false,
  onBatchComplete,
  onProcessingChange,
  isDirty = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Local preview state
  const [localPreview, setLocalPreview] = useState<string>('');
  const [optimizedPreviewMeta, setOptimizedPreviewMeta] = useState<{ size: number; type: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Batch state
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalImageMime, setOriginalImageMime] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  
  // Responsive / Layout state
  const { adminUsers, sanitizeUrl, isAdmin } = (useData?.() || {}) as any;
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  const [cropAspectLocal, setCropAspectLocal] = useState<number>(typeof cropAspect === 'number' ? cropAspect : 16/9);

  // Hook integration
  const {
    isProcessing,
    setIsProcessing,
    uploading,
    uploadPercent,
    error,
    setError,
    pendingImage,
    uploadHint,
    missingBucket,
    handleUploadProcess,
    resetUploadState
  } = useMediaUpload({
    bucket,
    folder,
    onImageSelect,
    maxImageBytes
  });

  // Relay processing state to parent
  useEffect(() => {
    onProcessingChange?.(isProcessing || uploading);
  }, [isProcessing, uploading, onProcessingChange]);

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

  const handleRotate90 = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => prev + (direction === 'cw' ? 90 : -90));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  // --- Crop Actions ---
  
  const getCroppedImgBlob = async (pixelCrop: any): Promise<Blob> => {
    if (!cropSrc) throw new Error('No crop source');
    const imageElement = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; 
      img.src = cropSrc;
      img.onload = () => resolve(img);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No context');

    const rotRad = getRadianAngle(rotation);
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      imageElement.width,
      imageElement.height,
      rotation
    );

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-imageElement.width / 2, -imageElement.height / 2);
    ctx.drawImage(imageElement, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) throw new Error('No context');

    // High quality scale
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(pixelCrop.width, pixelCrop.height));
    
    croppedCanvas.width = pixelCrop.width * scale;
    croppedCanvas.height = pixelCrop.height * scale;
    
    croppedCtx.imageSmoothingEnabled = true;
    croppedCtx.imageSmoothingQuality = 'high';
    croppedCtx.drawImage(
      canvas,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, croppedCanvas.width, croppedCanvas.height
    );

    return new Promise((resolve) => {
      croppedCanvas.toBlob(blob => resolve(blob!), originalImageMime === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
    });
  };

  const onConfirmCrop = async () => {
    try {
      const blob = await getCroppedImgBlob(croppedAreaPixels);
      const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: originalImageMime || 'image/jpeg' });
      const uploadedUrl = await handleUploadProcess(file, autoSave, hideControls, currentImage);
      
      if (!autoSave && !hideControls) {
        onImageSelect(uploadedUrl);
      }
      
      setCropSrc(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Cropping failed');
      alert(`Cropping Error: ${e.message}`);
    }
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
    if (target) await deleteStorageFileByPublicUrl(target);
    resetUploadState();
    onImageSelect('');
    setLocalPreview('');
    setShowDeleteConfirm(false);
  };
  
  const displayImageRaw = localPreview || pendingImage || currentImage;
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

  // Scroll Lock for Cropper
  useBodyScrollLock(!!cropSrc); // Changed from showCropper to cropSrc

  return (
    <div className={`relative ${className}`}>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept={acceptedTypes} 
        multiple={allowMultiple}
        onChange={(e) => e.target.files && handleFiles(e.target.files)} 
        className="hidden" 
      />

      {(error || missingBucket) && (
        <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-100 font-medium">{error || `Bucket '${missingBucket}' missing`}</p>
            {missingBucket && <p className="text-xs text-red-300 mt-1">Please contact admin to initialize storage.</p>}
          </div>
          <button onClick={() => { setError(''); }} className="text-red-400 hover:text-red-200"><X size={16} /></button>
        </div>
      )}

      <div 
        className={`group relative w-full overflow-hidden rounded-2xl transition-all duration-300 ${
           displayImage 
            ? 'border border-white/10 bg-black/40 shadow-xl' 
            : dragOver 
              ? 'border-2 border-dashed border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(147,51,234,0.15)]' 
              : 'border-2 border-dashed border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/10 hover:shadow-lg'
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
               <svg className="animate-spin w-full h-full text-purple-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {uploadPercent > 0 && !batchProgress && (
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{uploadPercent}%</div>
               )}
            </div>
            {batchProgress ? (
              <p className="text-sm font-medium text-purple-200">
                Uploading {batchProgress.current} of {batchProgress.total}...
              </p>
            ) : (
              <p className="text-sm font-medium text-purple-200">{uploading ? 'Uploading media...' : 'Optimizing...'}</p>
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
              
              {!hideControls && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex items-center justify-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                     <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-110 shadow-lg" title="Change">
                       <RotateCcw size={18} />
                     </button>
                     <button onClick={() => setShowDeleteConfirm(true)} className="p-3 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 text-red-200 transition-all hover:scale-110 shadow-lg" title="Delete">
                        <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              )}
            </div>
            
            {!hideControls && (
               <div className="lg:hidden flex items-center justify-between p-3 bg-black/60 backdrop-blur-md border-t border-white/10">
                  <button onClick={() => fileInputRef.current?.click()} type="button" className="text-xs font-bold text-gray-200 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                    <RotateCcw size={14} /> Change
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} type="button" className="text-xs font-bold text-red-400 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14} /> Remove
                  </button>
               </div>
            )}
            
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-[10px] font-medium backdrop-blur-md shadow-lg">
                <span className="font-medium truncate max-w-[150px]">{currentImage ? (isVideoUpload ? 'Video URL' : (isAudioUpload ? 'Audio URL' : 'Image URL')) : 'None'}</span>
              </div>
              
              {isDirty && (
                <div className="px-2.5 py-1.5 bg-yellow-500/90 text-black text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Unsaved
                </div>
              )}
              {optimizedPreviewMeta && (
                <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-zinc-300 text-[10px] uppercase font-bold backdrop-blur-md shadow-lg">
                  {humanSize(optimizedPreviewMeta.size)} • {optimizedPreviewMeta.type.split('/')[1]}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div 
             onClick={() => fileInputRef.current?.click()}
             className="flex flex-col items-center justify-center py-10 px-4 cursor-pointer text-center min-h-[160px]"
          >
            <div className={`p-4 rounded-2xl mb-4 transition-all duration-300 ${dragOver ? 'bg-purple-500/20 scale-110 shadow-[0_0_30px_rgba(147,51,234,0.3)] border border-purple-500/30' : 'bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:scale-105 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'}`}>
               {isVideoUpload ? <Play className="w-8 h-8 text-purple-400 transform group-hover:scale-110 transition-transform" /> : <UploadCloud className="w-8 h-8 text-purple-400 transform group-hover:-translate-y-1 transition-transform" />}
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

      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete File?</h3>
            <p className="text-sm text-zinc-400 mb-6">This action cannot be undone. The file will be permanently removed from storage.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors border border-white/5">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(239,68,68,0.3)] transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {cropSrc && createPortal(
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[12000] flex items-center justify-center p-0 sm:p-4 lg:p-8 animate-in fade-in duration-300">
          
          <div className="bg-zinc-950 lg:bg-black/40 lg:backdrop-blur-2xl lg:border lg:border-white/10 lg:rounded-[2rem] w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] lg:max-w-6xl flex flex-col lg:flex-row overflow-hidden shadow-2xl relative">
            
            {/* Mobile Header (Only visible on smallest screens/touch) */}
            <div className="w-full h-14 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 lg:hidden sticky top-0 z-20">
              <h3 className="text-white font-medium">Crop & Adjust Image</h3>
              <button
                onClick={() => setCropSrc(null)}
                disabled={isProcessing}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Left/Top Area: Cropper */}
            <div className="relative flex-1 min-h-[40vh] bg-black">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={cropAspectLocal}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                cropShape="rect"
                showGrid={true}
              />
              
              {/* Desktop Close Button */}
              <button
                onClick={() => setCropSrc(null)}
                className="hidden lg:flex items-center justify-center absolute top-6 right-6 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-105 border border-white/10 shadow-lg"
              >
                <X size={20} />
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-zinc-300 text-xs font-medium shadow-lg pointer-events-none hidden lg:block">
                Drag to pan • Scroll to zoom
              </div>
            </div>

            {/* Right/Bottom Area: Controls */}
            <div className="w-full lg:w-[400px] bg-zinc-900/50 backdrop-blur-xl flex flex-col flex-1 lg:h-auto lg:max-h-full rounded-t-3xl lg:rounded-none border-t lg:border-t-0 lg:border-l border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
              
              <div className="flex-1 overflow-y-auto px-5 py-6 lg:p-8 space-y-6 lg:gap-8 pb-safe">
                <div className="hidden lg:block relative z-10">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">Adjust Image</h3>
                  <p className="text-sm text-zinc-400">Position, rotate, and crop for your template.</p>
                </div>

              {/* Templates / Ratio (Accessible to all admins) */}
              {isAdminUser && (
                <div className="space-y-4 relative z-10">
                  <label className="text-[11px] font-bold text-purple-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Template Settings</span>
                    <span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-md text-[10px] normal-case tracking-wide border border-purple-500/20">
                      {bucket}
                    </span>
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.label}
                        onClick={() => setCropAspectLocal(ratio.value || 0)} // react-easy-crop takes undefined for free aspect, we'll map below
                        className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-medium transition-all w-full flex items-center justify-between border ${
                          (!cropAspectLocal && !ratio.value) || (cropAspectLocal === ratio.value)
                            ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_20px_rgba(147,51,234,0.3)] border-purple-400/50 scale-[1.02]'
                            : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span>{ratio.label}</span>
                        {((!cropAspectLocal && !ratio.value) || (cropAspectLocal === ratio.value)) && (
                          <Check size={16} className="text-white drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zoom */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Zoom
                </label>
                <div className="flex items-center gap-4 bg-black/30 p-3 rounded-xl border border-zinc-800">
                  <ZoomOut className="text-zinc-500" size={16} />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    disabled={isProcessing}
                    className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <ZoomIn className="text-zinc-500" size={16} />
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Rotation
                  </label>
                  <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    {Math.round(rotation)}°
                  </span>
                </div>
                
                <div className="flex items-center gap-4 bg-black/30 p-3 rounded-xl border border-zinc-800">
                  <RotateCcw 
                    className="text-zinc-500 cursor-pointer hover:text-purple-400 transition-colors" 
                    size={16} 
                    onClick={() => handleRotate90('ccw')}
                  />
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={Math.round(rotation)}
                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                    disabled={isProcessing}
                    className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <RotateCw 
                    className="text-zinc-500 cursor-pointer hover:text-purple-400 transition-colors" 
                    size={16} 
                    onClick={() => handleRotate90('cw')}
                  />
                </div>
              </div>

              </div>

              {/* Sticky Actions Container */}
              <div className="sticky bottom-0 left-0 right-0 p-5 lg:p-8 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 space-y-4 z-20">
                <div className="flex items-center justify-between text-zinc-500 mb-2">
                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="flex items-center gap-2 text-xs font-medium hover:text-white transition-colors"
                  >
                    <RefreshCw size={12} /> Reset
                  </button>
                  <button
                    onClick={onConfirmFull}
                    disabled={isProcessing}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Use Original
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCropSrc(null)}
                    disabled={isProcessing}
                    className="flex-1 py-3.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl disabled:opacity-50 font-medium transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmCrop}
                    disabled={isProcessing}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(147,51,234,0.4)] hover:shadow-[0_4px_25px_rgba(147,51,234,0.6)] disabled:opacity-50 font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    {isProcessing ? (
                      <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <Check size={18} className="drop-shadow-md" /> Save & Apply
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};