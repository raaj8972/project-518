import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Loader2, ImagePlus, Building2, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Flash 2.5', desc: 'Fastest, newest' },
  { id: 'gemini-2.5-pro', label: 'Pro 2.5', desc: 'Most capable' },
  { id: 'gemini-2.0-flash', label: 'Flash 2.0', desc: 'Balanced' },
  { id: 'gemini-2.0-flash-lite', label: 'Flash Lite 2.0', desc: 'Highest limits' },
  { id: 'gemini-pro-latest', label: 'Pro Latest', desc: 'Stable logic' },
];

interface AISponsorScannerProps {
  onScanComplete: (sponsorsData: any[]) => void;
  onCancel: () => void;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64?: string;
}

export const AISponsorScanner: React.FC<AISponsorScannerProps> = ({ onScanComplete, onCancel }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
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
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
        else { resolve(''); }
      };
      img.onerror = reject;
    });
  };

  const processFiles = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) { toast.error('Please select valid image files.'); return; }
    if (images.length + validFiles.length > 5) { toast.error('Maximum 5 images allowed.'); return; }

    const toastId = toast.loading('Compressing images...');
    try {
      const newImages = await Promise.all(
        validFiles.map(async (file) => ({
          id: Math.random().toString(36).substring(7),
          file,
          preview: URL.createObjectURL(file),
          base64: await compressImage(file)
        }))
      );
      setImages(prev => [...prev, ...newImages]);
      toast.success('Images ready!', { id: toastId });
    } catch { toast.error('Failed to process images.', { id: toastId }); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFiles(Array.from(e.target.files)); };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files)); }, [images]);
  const removeImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));

  const handleScan = async () => {
    if (images.length === 0) return;
    setIsScanning(true);
    const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
    const toastId = toast.loading(`Scanning with ${modelLabel}...`);

    try {
      const base64Images = images.map(img => img.base64).filter(Boolean);
      const response = await fetch('/api/ai-extract-sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images, model: selectedModel }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to extract sponsors');

      toast.success(`Found ${result.sponsors.length} sponsors! (${modelLabel})`, { id: toastId });
      onScanComplete(result.sponsors);
    } catch (error: any) {
      console.error('AI Scan Error:', error);
      toast.error(error.message || 'Failed to scan images', { id: toastId });
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#181824]/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20 max-w-3xl w-full mx-auto animate-in slide-in-from-bottom-8 duration-500 relative flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-inner">
            <Building2 className="text-amber-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Sponsor Scanner</h2>
            <p className="text-amber-300/60 text-sm">Upload sponsor banners or logos to auto-extract details</p>
          </div>
        </div>
        <button onClick={onCancel} disabled={isScanning} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-50">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        {/* Model Selector */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-bold text-amber-400/80 uppercase tracking-widest whitespace-nowrap">AI Model</label>
          <div className="relative flex-1">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isScanning || isCheckingModels}
              className="w-full appearance-none p-2.5 pr-8 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all disabled:opacity-50 cursor-pointer">
              {isCheckingModels ? (
                <option>Loading models...</option>
              ) : (
                AI_MODELS.map(m => {
                  const isAvailable = modelStatuses[m.id] !== false;
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

        {images.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <ImagePlus className="mx-auto text-amber-400/50 mb-4" size={48} />
            <p className="text-gray-300 font-bold text-lg">Drop sponsor images here</p>
            <p className="text-gray-500 text-sm mt-1">Banners, logo sheets, brochures (up to 5 images)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video">
                  <img src={img.preview} className="w-full h-full object-cover" />
                  {!isScanning && (
                    <button onClick={() => removeImage(img.id)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
              {images.length < 5 && !isScanning && (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-amber-500/30 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer transition-all">
                  <ImagePlus className="text-gray-500" size={24} />
                  <span className="text-gray-500 text-xs mt-1">Add More</span>
                </div>
              )}
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
      </div>

      <div className="p-4 border-t border-white/5 flex justify-end gap-3 shrink-0 bg-black/20">
        <button onClick={onCancel} disabled={isScanning} className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50">Cancel</button>
        <button onClick={handleScan} disabled={images.length === 0 || isScanning}
          className="px-6 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {isScanning ? <><Loader2 size={16} className="animate-spin" />Extracting Sponsors...</> : <><Building2 size={16} />Extract Sponsors</>}
        </button>
      </div>
    </div>
  );
};
