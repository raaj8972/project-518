import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Loader2, FileImage, ImagePlus, CheckCircle2, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Flash 2.5', desc: 'Fastest, newest' },
  { id: 'gemini-2.5-pro', label: 'Pro 2.5', desc: 'Most capable' },
  { id: 'gemini-2.0-flash', label: 'Flash 2.0', desc: 'Balanced' },
  { id: 'gemini-2.0-flash-lite', label: 'Flash Lite 2.0', desc: 'Highest limits' },
  { id: 'gemini-pro-latest', label: 'Pro Latest', desc: 'Stable logic' },
];

interface ExtractedPasswordData {
  event_name: string;
  coordinator_name: string;
  password: string;
}

interface AICoordinatorScannerProps {
  onScanComplete: (data: ExtractedPasswordData[]) => void;
  onCancel: () => void;
}

export const AICoordinatorScanner: React.FC<AICoordinatorScannerProps> = ({ 
  onScanComplete, 
  onCancel 
}) => {
  const [images, setImages] = useState<{ file: File; base64: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64.split(',')[1]); 
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Only process top 3 images to prevent overwhelming payload sizes
    const newFiles = Array.from(files).slice(0, 3);
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== newFiles.length) {
      toast.error('Only image files are supported');
    }

    if (images.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const toastId = toast.loading(`Processing ${validFiles.length} image(s)...`);

    try {
      const processedImages = await Promise.all(
        validFiles.map(async (file) => ({
          file,
          base64: await compressImage(file)
        }))
      );

      setImages(prev => [...prev, ...processedImages]);
      toast.success('Images added successfully', { id: toastId });
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Failed to process some images', { id: toastId });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [images.length]);

  const handleScan = async () => {
    if (images.length === 0) return;

    setIsScanning(true);
    const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
    const toastId = toast.loading(`Extracting passwords using ${modelLabel}...`);

    try {
      const base64Images = images.map(img => img.base64).filter(Boolean);
      
      const response = await fetch('/api/ai-extract-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: base64Images, model: selectedModel }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid content format');
      }

      const rawData = await response.json();

      if (!response.ok) {
        throw new Error(rawData.error || `HTTP ${response.status} Error`);
      }

      if (!rawData.data || !Array.isArray(rawData.data)) {
        throw new Error('Invalid data format received from AI');
      }

      toast.success(`Extracted ${rawData.data.length} assignments!`, { id: toastId });
      onScanComplete(rawData.data);
      
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Failed to scan images', { id: toastId, duration: 5000 });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-green-950 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl flex flex-col md:flex-row">
      
      {/* Settings / Controls Sidebar */}
      <div className="md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 flex flex-col pt-6 pb-4 shrink-0">
        <div className="px-6 pb-6 border-b border-white/10 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-bold text-white tracking-wide">AI Scanner</h3>
          </div>
          <p className="text-sm text-emerald-200/60 leading-relaxed font-medium">
            Upload document screenshots to automatically assign passwords.
          </p>
        </div>

        {/* AI Model Selector */}
        <div className="px-6 py-4 flex flex-col gap-2 shrink-0 border-b border-white/10">
          <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest whitespace-nowrap">AI Model</span>
          <div className="relative w-full">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isScanning || isCheckingModels}
              className="w-full appearance-none p-2.5 pr-8 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50 cursor-pointer">
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
      <div className="flex-1 p-6 lg:p-8 flex flex-col min-w-0">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-8 text-center min-h-[200px]
            ${isDragging 
              ? 'border-emerald-400 bg-emerald-400/10 scale-[1.02]' 
              : images.length > 0
                ? 'border-emerald-500/30 bg-black/20 hover:border-emerald-500/50'
                : 'border-white/20 hover:border-emerald-400/50 hover:bg-white/5'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {images.length === 0 ? (
            <div className="space-y-4 pointer-events-none flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <FileImage className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  Drag & Drop coordinator lists here
                </p>
                <p className="text-emerald-200/60 mt-1">
                  or click to browse
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full h-full justify-items-center relative z-10 pointer-events-auto">
              {images.map((img, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden border border-white/20 aspect-square w-full max-w-[150px] bg-black/50 shadow-lg">
                  <img 
                    src={URL.createObjectURL(img.file)} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 hover:scale-110 transition-transform shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-400/10 rounded-lg aspect-square w-full max-w-[150px] transition-all group pointer-events-auto"
                >
                  <ImagePlus className="w-8 h-8 text-emerald-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                  <span className="text-xs text-emerald-400/80 font-medium">Add Image</span>
                </button>
              )}
            </div>
          )}

          {/* Click overlay for empty state */}
          {images.length === 0 && (
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isScanning}
            className="px-6 py-2.5 rounded-xl font-medium text-emerald-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleScan}
            disabled={images.length === 0 || isScanning}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg
              ${images.length === 0 
                ? 'bg-emerald-900/50 text-emerald-500/50 cursor-not-allowed shadow-none' 
                : isScanning
                  ? 'bg-emerald-600 text-white cursor-wait'
                  : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'
              }
            `}
          >
            {isScanning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Scanning Docs...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Extract Passwords
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
