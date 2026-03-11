import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, FileImage, ImagePlus, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Flash 2.5', desc: 'Fastest, newest' },
  { id: 'gemini-2.5-pro', label: 'Pro 2.5', desc: 'Most capable' },
  { id: 'gemini-2.0-flash', label: 'Flash 2.0', desc: 'Balanced' },
  { id: 'gemini-2.0-flash-lite', label: 'Flash Lite 2.0', desc: 'Highest limits' },
  { id: 'gemini-pro-latest', label: 'Pro Latest', desc: 'Stable logic' },
];

interface AIScheduleScannerProps {
  onScanComplete: (scheduleData: any[], scheduleType: 'prelims' | 'mains') => void;
  onCancel: () => void;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64?: string;
}

export const AIScheduleScanner: React.FC<AIScheduleScannerProps> = ({ onScanComplete, onCancel }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scheduleType, setScheduleType] = useState<'prelims' | 'mains'>('prelims');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [modelStatuses, setModelStatuses] = useState<Record<string, boolean>>({});
  const [isCheckingModels, setIsCheckingModels] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchModelStatuses = async () => {
      try {
        const response = await fetch('/api/ai-check-models');
        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            setModelStatuses(data.models);
            
            // Auto-select the first available model if current is unavailable
            if (data.models[selectedModel] === false) {
              const available = AI_MODELS.find(m => data.models[m.id]);
              if (available) setSelectedModel(available.id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch model statuses:', error);
      } finally {
        setIsCheckingModels(false);
      }
    };
    fetchModelStatuses();
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
             width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // Aggressive compression for API
        } else {
          resolve('');
        }
      };
      img.onerror = reject;
    });
  };

  const processFiles = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      toast.error('Please select valid image files.');
      return;
    }

    if (images.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed for a single scan.');
      return;
    }

    const toastId = toast.loading('Compressing images for AI...');
    try {
      const newImages = await Promise.all(
        validFiles.map(async (file) => {
          const compressedBase64 = await compressImage(file);
          return {
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            base64: compressedBase64
          };
        })
      );
      setImages(prev => [...prev, ...newImages]);
      toast.success('Images ready!', { id: toastId });
    } catch (err) {
      toast.error('Failed to process one or more images.', { id: toastId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [images]);

  const removeImage = (idToRemove: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== idToRemove);
      // Revoke the object URL to avoid memory leaks
      const imgToRemove = prev.find(img => img.id === idToRemove);
      if (imgToRemove?.preview) {
        URL.revokeObjectURL(imgToRemove.preview);
      }
      return filtered;
    });
  };

  const handleScan = async () => {
    if (images.length === 0) return;

    setIsScanning(true);
    const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
    const toastId = toast.loading(`Scanning with ${modelLabel}...`);

    try {
      const base64Images = images.map(img => img.base64).filter(Boolean);

      const response = await fetch('/api/ai-extract-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: base64Images, model: selectedModel }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         const text = await response.text();
         throw new Error(`Invalid server response (Ensure you are running npm run dev:netlify): ${text.substring(0, 100)}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract schedule');
      }

      toast.success('Schedule parsed successfully!', { id: toastId });
      onScanComplete(result.schedule, scheduleType);
    } catch (error: any) {
      console.error('AI Scan Error:', error);
      toast.error(error.message || 'Failed to scan images', { id: toastId });
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#181824]/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20 max-w-3xl w-full mx-auto animate-in slide-in-from-bottom-8 duration-500 relative flex flex-col max-h-[90vh]">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-inner">
             <FileImage className="text-cyan-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">AI Multi-Image Scanner</h3>
            <p className="text-sm text-cyan-200/60">Upload multiple poster pages and Gemini will extract the full schedule</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          disabled={isScanning}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Schedule Type Selector */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-3 shrink-0">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule For:</span>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => !isScanning && setScheduleType('prelims')}
            disabled={isScanning}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              scheduleType === 'prelims'
                ? 'bg-cyan-500 text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => !isScanning && setScheduleType('mains')}
            disabled={isScanning}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              scheduleType === 'mains'
                ? 'bg-orange-500 text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Mains
          </button>
        </div>

        {/* AI Model Selector */}
        <div className="px-6 pb-2 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest whitespace-nowrap">AI Model</span>
          <div className="relative flex-1">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isScanning || isCheckingModels}
              className="w-full appearance-none p-2.5 pr-8 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all disabled:opacity-50 cursor-pointer">
              {isCheckingModels ? (
                <option>Loading models...</option>
              ) : (
                AI_MODELS.map(m => {
                  const isAvailable = modelStatuses[m.id] !== false; // default true if unknown
                  return (
                    <option key={m.id} value={m.id} disabled={!isAvailable}>
                      {isAvailable ? '🟢 ' : '🔴 BUSY - '}{m.label} — {m.desc}
                    </option>
                  );
                })
              )}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* Dropzone */}
        <div 
          onClick={() => !isScanning && fileInputRef.current?.click()}
          onDragOver={!isScanning ? onDragOver : undefined}
          onDragLeave={!isScanning ? onDragLeave : undefined}
          onDrop={!isScanning ? onDrop : undefined}
          className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[200px] mb-6 ${
            isScanning ? 'opacity-50 cursor-not-allowed border-white/10 bg-black/20' :
            isDragging 
              ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20 scale-[1.02]' 
              : 'border-white/20 bg-black/40 hover:border-cyan-500/50 hover:bg-white/5'
          }`}
        >
          <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileChange} 
             accept="image/*" 
             multiple 
             className="hidden" 
             disabled={isScanning}
          />
          
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
            isDragging ? 'bg-cyan-500 text-black scale-110' : 'bg-white/10 text-cyan-400'
          }`}>
             {isScanning ? <Loader2 size={32} className="animate-spin" /> : <ImagePlus size={32} />}
          </div>
          
          <p className="text-lg font-bold text-white mb-2 text-center">
            {isScanning ? 'Analyzing Images...' : isDragging ? 'Drop Images Here' : 'Click or Drag & Drop Images'}
          </p>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            {isScanning 
              ? 'Gemini Vision AI is currently parsing the schedule data from all uploaded images.' 
              : 'Upload up to 5 images of your schedule (e.g., Pages 1-3, Front & Back). Supported: JPG, PNG, WEBP.'
            }
          </p>
        </div>

        {/* Selected Images Gallery */}
        {images.length > 0 && (
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Selected Images ({images.length}/5)</h4>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-[3/4] border border-white/10 bg-black/50">
                     <img src={img.preview} alt={`Page ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                     
                     {/* Badge */}
                     <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                       Img {index + 1}
                     </div>

                     {/* Remove Button */}
                     {!isScanning && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                         className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg backdrop-blur-md transform translate-y-[-10px] group-hover:translate-y-0"
                       >
                         <X size={14} />
                       </button>
                     )}
                     
                     {/* Status indicator during scan */}
                     {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                           <Loader2 className="text-cyan-400 animate-spin" size={32} />
                        </div>
                     )}
                  </div>
                ))}

                {/* Add More Placeholder */}
                {!isScanning && images.length < 5 && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl aspect-[3/4] border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <ImagePlus size={24} className="text-gray-500 group-hover:text-cyan-400 transition-colors mb-2" />
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-cyan-400 uppercase tracking-widest">Add More</span>
                  </div>
                )}
             </div>
          </div>
        )}

      </div>

      {/* Footer / Actions */}
      <div className="p-6 border-t border-white/5 bg-black/30 shrink-0 flex items-center justify-between">
         <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 max-w-[60%]">
           <AlertCircle size={14} className="shrink-0" />
           <p>Double-check images are perfectly legible before scanning.</p>
         </div>
         
         <div className="flex gap-3">
           <button 
             onClick={onCancel}
             disabled={isScanning}
             className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
           >
             Cancel
           </button>
           
           <button 
             onClick={handleScan}
             disabled={isScanning || images.length === 0}
             className="px-8 py-2.5 rounded-xl font-bold text-black transition-all text-sm uppercase tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                      bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-cyan-500/20 hover:shadow-cyan-500/40"
           >
             {isScanning ? (
               <>
                 <Loader2 size={16} className="animate-spin" /> Scanning...
               </>
             ) : (
               <>
                 <CheckCircle2 size={16} /> Process {images.length} Image{images.length !== 1 ? 's' : ''}
               </>
             )}
           </button>
         </div>
      </div>
    </div>
  );
};
