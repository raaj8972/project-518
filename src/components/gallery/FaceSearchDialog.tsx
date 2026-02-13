import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Scan,
  Loader2,
  AlertCircle,
  Repeat
} from 'lucide-react';
import { loadImageFromUrl, extractFaceDescriptors } from '../../utils/faceUtils';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FaceSearchDialogProps {
  onResults: (imageIds: number[]) => void;
  onClose: () => void;
}

export const FaceSearchDialog: React.FC<FaceSearchDialogProps> = ({ onResults, onClose }) => {
  const [searching, setSearching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      toast.error('Could not access camera. Please upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Flip horizontally if front camera (mirror effect)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopCamera();
        performSearch(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    performSearch(file);
  };

  const performSearch = async (file: File) => {
    setSearching(true);
    setError(null);

    try {
      // 1. Create temporary URL for face-api
      const tempUrl = URL.createObjectURL(file);
      const img = await loadImageFromUrl(tempUrl);
      
      // 2. Extract face descriptor from selfie
      const faces = await extractFaceDescriptors(img);
      URL.revokeObjectURL(tempUrl);

      if (faces.length === 0) {
        throw new Error('No face detected. Please try a clearer selfie with good lighting.');
      }

      if (faces.length > 1) {
        toast.success('Multiple faces detected. Using the most prominent one.');
      }

      // Use the first (usually largest/most prominent) face
      const descriptor = faces[0].descriptor;

      // 3. Search Supabase for similar faces
      // match_threshold: 0.65 (More lenient for better recall, since 0.78 was missing matches)
      const { data, error: searchError } = await supabase.rpc('search_gallery_faces', {
        query_embedding: descriptor,
        match_threshold: 0.65, 
        match_count: 100
      });

      if (searchError) throw searchError;

      const results = data as any[];
      const imageIds = results.map(row => row.image_id);
      
      if (imageIds.length === 0) {
        // Fallback with very loose threshold for "best effort"
        const { data: looseData } = await supabase.rpc('search_gallery_faces', {
          query_embedding: descriptor,
          match_threshold: 0.60,
          match_count: 50
        });
        
        const looseIdsArray = (looseData as any[] || []).map(row => row.image_id);
        if (looseIdsArray.length > 0) {
          onResults(looseIdsArray);
          onClose();
          toast.success(`Found ${looseIdsArray.length} possible matches.`);
          return;
        }

        setError('No matching photos found via Face ID. Try browsing the categories.');
      } else {
        onResults(imageIds);
        onClose();
        toast.success(`Found ${imageIds.length} photos!`);
      }
    } catch (err: any) {
      console.error('Face search failed:', err);
      setError(err.message || 'Face search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300 relative">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scan size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Find My Photos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI Face Recognition</p>
            </div>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px] flex flex-col items-center justify-center">
          {searching ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center">
                  <Scan className="w-12 h-12 text-indigo-600 animate-pulse" />
                </div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">Scanning Faces...</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                Searching 2,500+ photos for you.
              </p>
            </div>
          ) : cameraActive ? (
             <div className="relative w-full h-[400px] bg-black rounded-3xl overflow-hidden flex flex-col">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                />
                <div className="absolute inset-0 pointer-events-none border-[3px] border-white/20 rounded-3xl"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-white/50 rounded-full border-dashed opacity-50"></div>
                </div>
                
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-20">
                  <button 
                    onClick={stopCamera}
                    className="p-3 bg-red-500/20 text-red-100 rounded-full backdrop-blur-sm border border-red-500/30 hover:bg-red-500/40"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                  ></button>
                  <div className="w-12 opacity-0"></div> {/* Spacer */}
                </div>
             </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-4">
                <AlertCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Matches Found</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-[2.5rem] hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <span className="text-base font-bold text-indigo-900 dark:text-indigo-200">Upload Selfie</span>
                </button>

                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-8 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-[2.5rem] hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <Camera size={28} />
                  </div>
                  <span className="text-base font-bold text-blue-900 dark:text-blue-200">Take Selfie</span>
                </button>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                  Privacy First: Face analysis happens instantly. We identify matches and discard your selfie immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
