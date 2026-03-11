import React, { useEffect, useRef, useState } from 'react';
import { 
  AlertCircle, 
  FileText, 
  Play, 
  Trash2, 
  UploadCloud, 
  X, 
  Check, 
  ZoomIn, 
  Crop as CropIcon,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';
import { useData } from '../context/DataContext';
import { optimizeImage, OptimizationOptions } from '../utils/imageOptimizer';
import { optimizeVideo, VideoOptimizationOptions } from '../utils/videoOptimizer';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { humanSize, getFileName } from '../utils/uploadUtils';
import { deleteStorageFileByPublicUrl } from '../utils/storageUtils';

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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  
  // Responsive / Layout state
  const { adminUsers, sanitizeUrl } = (useData?.() || {}) as any;
  const [isOwner, setIsOwner] = useState<boolean>(false);
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

    // 3. Cropper or Direct Upload
    if (!isPdfUpload && !isVideoUpload && !isAudioUpload && enableCropper) {
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
      setCrop({ x: 0, y: 0 });
      setError('');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
    setOriginalImageMime(file.type || null);
  };

  // --- Crop Actions ---
  
  const getCroppedImgBlob = async (pixelCrop: any): Promise<Blob> => {
    if (!cropSrc) throw new Error('No crop source');
    const image = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; 
      img.src = cropSrc;
      img.onload = () => resolve(img);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No context');

    // High quality scale
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(pixelCrop.width, pixelCrop.height));
    
    canvas.width = pixelCrop.width * scale;
    canvas.height = pixelCrop.height * scale;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, canvas.width, canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(blob => resolve(blob!), originalImageMime === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
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
            ? 'border border-white/10 bg-black/40' 
            : dragOver 
              ? 'border-2 border-dashed border-purple-500 bg-purple-500/10' 
              : 'border-2 border-dashed border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/10'
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
                   <FileText className="w-16 h-16 text-red-400" />
                   <span className="text-sm text-gray-300 font-mono break-all text-center">{getFileName(displayImage)}</span>
                   <a href={displayImage} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">Open PDF</a>
                 </div>
              ) : (
                <img src={displayImage} alt="Preview" className="w-full h-full object-contain" />
              )}
              
              {!hideControls && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex items-center justify-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                     <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white transition-colors" title="Change">
                       <RotateCcw size={18} />
                     </button>
                     <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur border border-red-500/30 text-red-200 transition-colors" title="Delete">
                        <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              )}
            </div>
            
            {!hideControls && (
               <div className="lg:hidden flex items-center justify-between p-3 bg-white/5 border-t border-white/5">
                  <button onClick={() => fileInputRef.current?.click()} type="button" className="text-xs font-bold text-gray-300 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                    <RotateCcw size={14} /> Change
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} type="button" className="text-xs font-bold text-red-400 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10">
                    <Trash2 size={14} /> Remove
                  </button>
               </div>
            )}
            
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
              <div className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-white text-[10px] font-medium backdrop-blur-md">
                <span className="font-medium truncate max-w-[150px]">{currentImage ? (isVideoUpload ? 'Video URL' : (isAudioUpload ? 'Audio URL' : 'Image URL')) : 'None'}</span>
              </div>
              
              {isDirty && (
                <div className="px-2 py-1 bg-yellow-500/90 text-black text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg backdrop-blur-sm flex items-center gap-1">
                  <AlertCircle size={10} />
                  Unsaved
                </div>
              )}
              {optimizedPreviewMeta && (
                <div className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-gray-400 text-[9px] backdrop-blur-md">
                  {humanSize(optimizedPreviewMeta.size)} • {optimizedPreviewMeta.type.split('/')[1].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div 
             onClick={() => fileInputRef.current?.click()}
             className="flex flex-col items-center justify-center py-10 px-4 cursor-pointer text-center min-h-[160px]"
          >
            <div className={`p-4 rounded-full mb-4 transition-all duration-300 ${dragOver ? 'bg-purple-500/20 scale-110' : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-105'}`}>
               {isVideoUpload ? <Play className="w-8 h-8 text-purple-400" /> : <UploadCloud className="w-8 h-8 text-purple-400" />}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Click to upload or drag & drop
            </h3>
            <p className="text-xs text-gray-500 max-w-[200px]">
              {effectiveFileTypeLabel}
            </p>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Delete File?</h3>
            <p className="text-sm text-gray-400 mb-6">This action cannot be undone. The file will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {cropSrc && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in fade-in duration-300">
           <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur border-b border-white/10 z-10 shrink-0">
             <div className="flex items-center gap-2">
                <CropIcon size={16} className="text-purple-400" />
                <span className="text-sm font-bold text-white tracking-wide">ADJUST IMAGE</span>
             </div>
             <button onClick={() => setCropSrc(null)} className="p-2 -mr-2 text-gray-400 hover:text-white">
                <X size={20} />
             </button>
           </div>
           
           <div className="relative flex-1 bg-[#1a1a1a] w-full overflow-hidden">
             <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropAspectLocal}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                objectFit="contain"
                showGrid={true}
             />
           </div>

           <div className="bg-gray-900 border-t border-white/10 p-4 md:p-6 shrink-0 safe-area-pb">
              <div className="flex items-center gap-4 mb-6 max-w-lg mx-auto">
                 <ZoomIn size={16} className="text-gray-500" />
                 <input 
                   type="range" min={1} max={3} step={0.1} 
                   value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                   className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                 />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar justify-start md:justify-center">
                 {[
                   ...(bucket === 'event-images' ? [{ label: 'Card', val: 49 / 59.4 }] : []),
                   { label: 'Square', val: 1 }, 
                   { label: '16:9', val: 16/9 }, 
                   { label: '4:3', val: 4/3 }, 
                   { label: 'Portrait', val: 3/4 },
                   { label: 'Story', val: 9/16 }
                 ].map(r => (
                   <button 
                     key={r.label}
                     onClick={() => setCropAspectLocal(r.val)}
                     className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                       Math.abs(cropAspectLocal - r.val) < 0.01 
                         ? 'bg-purple-500 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                         : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                     }`}
                   >
                     {r.label}
                   </button>
                 ))}
                 <div className="w-px h-6 bg-white/10 mx-2" />
                 <button 
                    onClick={onConfirmFull} 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 whitespace-nowrap"
                 >
                    Full Original
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                 <button onClick={() => setCropSrc(null)} className="py-3 rounded-xl bg-white/5 text-white font-medium text-sm hover:bg-white/10 transition-colors">
                    Cancel
                 </button>
                 <button onClick={onConfirmCrop} className="py-3 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-900/30 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2">
                    <Check size={18} /> Apply Crop
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};