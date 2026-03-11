import { useState } from 'react';
import { useSavingProgress } from '../context/SavingProgressContext';
import { mapUploadError } from '../utils/uploadUtils';
import { deleteStorageFileByPublicUrl } from '../utils/storageUtils';
import { supabase } from '../lib/supabase';

interface UseMediaUploadProps {
  bucket: string;
  folder?: string;
  onImageSelect: (url: string) => void;
  maxImageBytes?: number;
}

export const useMediaUpload = ({ 
  bucket, 
  folder = '', 
  onImageSelect
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

  const handleUploadProcess = async (
    file: File,
    autoSave?: boolean,
    hideControls?: boolean,
    currentImage?: string
  ) => {
    setIsProcessing(true);
    setUploading(true);
    setUploadHint('');
    setUploadPercent(0);
    setError('');
    
    try { savingProgress.start('Uploading…', 1); } catch {}
    
    const hintTimer = setTimeout(() => setUploadHint('Taking longer than usual… If the file is large, try a smaller one.'), 8000);

    try {
      // ══ SUPABASE UPLOAD ══
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Simulated progress since we don't have native XMLHttpRequest progress easily here
      setUploadPercent(30);
      try { savingProgress.set(30); } catch {}

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadPercent(70);
      try { savingProgress.set(70); } catch {}

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const fileUrl = publicUrl;
      
      if (!fileUrl) {
          throw new Error("Upload failed to return a valid URL.");
      }

      setUploadPercent(100);
      try { savingProgress.set(100); } catch {}
      
      // Cleanup previous pending image
      if (pendingImage && pendingImage !== fileUrl) {
        await deleteStorageFileByPublicUrl(pendingImage);
      }
      
      setPendingImage(fileUrl);
      
      if (autoSave || hideControls) {
        if (currentImage && currentImage !== fileUrl) {
          await deleteStorageFileByPublicUrl(currentImage);
        }
        onImageSelect(fileUrl);
      }
      return fileUrl;

    } catch (err: any) {
      console.error('Upload error:', err);
      // Fallback error mapping
      const mappedErr = mapUploadError(err, bucket);
      setError(mappedErr.message);
      if (mappedErr.message.toLowerCase().includes('bucket')) {
        setMissingBucket(bucket);
      }
      throw err;
    } finally {
      clearTimeout(hintTimer);
      setIsProcessing(false);
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
    deleteFromStorageByPublicUrl: (url: string) => deleteStorageFileByPublicUrl(url)
  };
};
