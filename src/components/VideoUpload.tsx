import React, { useRef, useState } from 'react';
import { Play, Upload, Trash2, AlertCircle, Scissors } from 'lucide-react';
import { VideoTrimmer } from './VideoTrimmer';
import { useMediaUpload } from '../hooks/useMediaUpload';

interface VideoUploadProps {
  onVideoSelect: (videoUrl: string) => void;
  currentVideo?: string;
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoSelect,
  currentVideo,
  bucket,
  folder = '',
  maxSizeMB = 50
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(2);
  
  // Local preview state
  const [localPreview, setLocalPreview] = useState<string>(currentVideo || '');

  // Use the hook for R2 routing
  const {
    uploading,
    uploadPercent,
    error,
    setError,
    handleUploadProcess,
    deleteFromStorageByPublicUrl,
    resetUploadState
  } = useMediaUpload({
    bucket,
    folder,
    onImageSelect: (url) => {
        onVideoSelect(url);
        setLocalPreview(url);
    },
    maxImageBytes: maxSizeMB * 1024 * 1024
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file (MP4, MOV, or WEBM)');
      return;
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Video must be smaller than ${maxSizeMB}MB`);
      return;
    }

    try {
      // Use handleUploadProcess from hook which routes to R2 if configured
      await handleUploadProcess(file, true, false, false, true, true, currentVideo);
    } catch (err: any) {
      console.error('Upload error:', err);
      // Error handling is managed by the hook mostly, but we log here just in case
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      // Show local preview immediately
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
    }
  };

  const handleTrimComplete = (trimmedFile: File) => {
    setSelectedFile(trimmedFile);
    const url = URL.createObjectURL(trimmedFile);
    setLocalPreview(url);
    setShowTrimmer(false);
    // Auto-upload trimmed video
    handleFileSelect(trimmedFile);
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteCountdown(2);
    
    // Countdown timer
    const timer = setInterval(() => {
      setDeleteCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      if (localPreview) {
          await deleteFromStorageByPublicUrl(localPreview);
      }
      setLocalPreview('');
      setSelectedFile(null);
      onVideoSelect('');
      resetUploadState();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {localPreview ? (
        <div className="space-y-3">
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden">
            <video
              src={localPreview}
              controls
              className="w-full h-48 object-contain bg-black"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFile && !uploading && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTrimmer(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2"
                >
                  <Scissors size={16} />
                  Trim Video
                </button>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClick}
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload size={16} />
              Change Video
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={uploading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 font-medium">Uploading... {uploadPercent}%</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-100 p-4 rounded-full inline-block">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-700 font-medium">Click to upload video</p>
                <p className="text-gray-500 text-sm mt-1">MP4, MOV, WEBM up to {maxSizeMB}MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Trimmer Modal */}
      {showTrimmer && selectedFile && (
        <VideoTrimmer
          videoFile={selectedFile}
          onTrimComplete={handleTrimComplete}
          onCancel={() => setShowTrimmer(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete this video?</h3>
            <p className="text-gray-600 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteCountdown > 0}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteCountdown > 0 ? `Wait ${deleteCountdown}s` : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
