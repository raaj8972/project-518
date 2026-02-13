import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Scan,
  Loader2,
  AlertCircle
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
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {};
    reader.readAsDataURL(file);
    
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
        throw new Error('No face detected in the photo. Please try a clearer selfie.');
      }

      if (faces.length > 1) {
        toast.error('Multiple faces detected. Using the most prominent one.');
      }

      // Use the first (usually largest/most prominent) face
      const descriptor = faces[0].descriptor;

      // 3. Search Supabase for similar faces
      // match_threshold: 0.78 similarity for Cosine Similarity (1 - <=> )
      // 0.78 is a balanced threshold for accuracy.
      const { data, error: searchError } = await supabase.rpc('search_gallery_faces', {
        query_embedding: descriptor,
        match_threshold: 0.78, 
        match_count: 50
      });

      if (searchError) throw searchError;

      const results = data as any[];
      const imageIds = results.map(row => row.image_id);
      
      if (imageIds.length === 0) {
        // Try a slightly looser threshold if no results found on first pass
        // 0.70 is the safe limit for face matching without high false positives.
        const { data: looseData } = await supabase.rpc('search_gallery_faces', {
          query_embedding: descriptor,
          match_threshold: 0.70,
          match_count: 50
        });
        
        const looseIdsArray = (looseData as any[] || []).map(row => row.image_id);
        if (looseIdsArray.length > 0) {
          onResults(looseIdsArray);
          onClose();
          toast.success(`Found ${looseIdsArray.length} potential matches.`);
          return;
        }

        setError('No matching photos found in the gallery. Please ensure the gallery has been indexed in the admin panel.');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scan size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Find My Photos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Search the gallery with a selfie</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {searching ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-ping opacity-20"></div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Analyzing Face...</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
                Scanning the gallery database for your photos.
              </p>
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-4">
                <AlertCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Match Found</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Try Another Photo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-[2rem] hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Upload Photo</span>
                </button>

                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] opacity-50 cursor-not-allowed">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-gray-400 mb-3">
                    <Camera size={24} />
                  </div>
                  <span className="text-sm font-bold text-gray-500">Take Selfie</span>
                </div>
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
                <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  Your photo is only used for comparison in your browser. We do not store your selfie on our servers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
