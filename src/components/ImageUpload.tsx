import React, { useRef, useState } from 'react';
import { Image as ImageIcon, AlertCircle, FileText, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
  bucket: 'event-images' | 'gallery-images' | 'sponsor-logos' | 'documents' | 'guest-artist-images' | 'guest-artist-videos' | 'band-images' | 'team-images' | 'faculty-images' | 'pdf' | 'hero-media' | 'hero-video';
  folder?: string;
  acceptedTypes?: string;
  fileTypeLabel?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  currentImage, 
  className = '',
  bucket,
  folder = '',
  acceptedTypes = 'image/*',
  fileTypeLabel = 'PNG, JPG, GIF up to 5MB'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [missingBucket, setMissingBucket] = useState<string | null>(null);

  const isPdfUpload = acceptedTypes.includes('pdf');
  const isVideoUpload = acceptedTypes.includes('video');

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

  if (error) {
      if (error.message.includes('Bucket not found')) {
    setMissingBucket(bucket);
    throw new Error(`Storage bucket '${bucket}' not found. Please run the provided SQL to create it.`);
      }
      throw new Error(`Upload failed: ${error.message}`);
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

    setUploading(true);
    setError('');
    
    try {
      const fileUrl = await uploadToSupabase(file);
      setPendingImage(fileUrl);
      setHasUnsavedChanges(true);
  } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof Error && /mime type/i.test(err.message)) {
        setError('Upload failed: this file type is not allowed in the bucket. Allowed: PNG, JPG, WEBP, GIF, MP4, MOV');
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    } finally {
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
        // Extract file path from URL
        const url = new URL(imageToRemove);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // Delete from Supabase storage
        await supabase.storage
          .from(bucket)
          .remove([fileName]);
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
              onClick={handleClick}
              disabled={uploading}
             className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Change
            </button>
            {hasUnsavedChanges ? (
              <>
                <button
                  onClick={handleSaveImage}
                  disabled={uploading}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleDiscardChanges}
                  disabled={uploading}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            ) : (
              <button
                onClick={handleSaveImage}
                disabled={uploading}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            )}
            <button
              onClick={removeFile}
             disabled={uploading}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Remove
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
    </div>
  );
};