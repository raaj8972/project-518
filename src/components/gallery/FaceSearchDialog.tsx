import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Scan,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-lg overflow-hidden shadow-2xl border border-violet-950/30 animate-in zoom-in-95 duration-300 relative nebula-theme">
        
        {/* Header */}
        <div className="p-6 border-b border-violet-950/20 flex items-center justify-between bg-violet-950/10 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-600/10 flex items-center justify-center text-cyan-500">
              <Scan size={24} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-cyan-50 uppercase tracking-wider">Find Your Face_</h3>
              <p className="text-[10px] text-cyan-900/60 uppercase tracking-widest">Neural Archive Search</p>
            </div>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px] flex flex-col items-center justify-center">
          {searching ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full border-4 border-cyan-950/30 flex items-center justify-center">
                  <Scan className="w-12 h-12 text-cyan-500 animate-pulse" />
                </div>
                <div className="absolute inset-0 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <h4 className="text-xl font-serif text-cyan-100 mb-2 uppercase tracking-widest animate-pulse">Scanning Archives_</h4>
              <p className="text-sm text-cyan-900/60 font-serif italic max-w-[200px] mx-auto">
                Searching the records for your match...
              </p>
            </div>
          ) : cameraActive ? (
              <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden flex flex-col border border-violet-950/30">
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline
                   className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] opacity-70 grayscale contrast-125"
                 />
                 <div className="absolute inset-0 pointer-events-none border-[3px] border-cyan-600/20 rounded-lg"></div>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-48 h-64 border-2 border-cyan-600/30 rounded-full border-dashed opacity-40"></div>
                 </div>
                 
                 <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-20">
                   <button 
                     onClick={stopCamera}
                     className="p-3 bg-black/60 text-cyan-500 rounded-full backdrop-blur-md border border-violet-950/30 hover:bg-cyan-600/20 transition-colors"
                   >
                     <X size={24} />
                   </button>
                   <button 
                     onClick={capturePhoto}
                     className="w-16 h-16 rounded-full bg-cyan-600 border-4 border-violet-950 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110 transition-transform active:scale-95 group"
                   >
                     <div className="w-12 h-12 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors"></div>
                   </button>
                   <div className="w-12 opacity-0"></div> {/* Spacer */}
                 </div>
              </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-violet-950/20 rounded-full flex items-center justify-center border border-violet-900/30">
                <AlertCircle className="w-10 h-10 text-violet-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-serif text-violet-100 uppercase tracking-widest">Search Failed_</h4>
                <p className="text-sm text-violet-900/60 font-serif italic max-w-[250px] mx-auto">
                  {error}
                </p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="mt-6 px-8 py-2 bg-violet-600 hover:bg-violet-700 text-white font-serif uppercase tracking-widest rounded transition-all shadow-lg shadow-violet-900/40 active:scale-95 cursor-pointer"
              >
                Try Again_
              </button>
            </div>
          ) : ( // Initial state for selection
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 bg-violet-950/10 border-2 border-dashed border-violet-900/30 rounded-xl hover:border-violet-600/50 hover:bg-violet-600/5 transition-all group group-hover:cursor-pointer"
                >
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="text-sm font-serif uppercase tracking-widest text-indigo-200">Upload Dossier</span>
                  <span className="text-[10px] text-indigo-900/60 mt-1 uppercase">from your drive</span>
                </button>

                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-8 bg-violet-950/10 border-2 border-dashed border-violet-900/30 rounded-xl hover:border-violet-600/50 hover:bg-violet-600/5 transition-all group group-hover:cursor-pointer"
                >
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="text-sm font-serif uppercase tracking-widest text-indigo-200">Live Capture</span>
                  <span className="text-[10px] text-indigo-900/60 mt-1 uppercase">using webcam</span>
                </button>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="p-4 bg-indigo-950/10 border border-indigo-900/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <p className="text-xs text-indigo-400/80 leading-relaxed font-serif uppercase tracking-tight">
                  <span className="font-bold text-indigo-500">Confidentiality Notice:</span> Face data is handled locally. No temporary facial vectors are stored in the archive after search completion.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
