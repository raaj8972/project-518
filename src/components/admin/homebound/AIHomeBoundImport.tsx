import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, ImagePlus, CheckCircle2, UserPlus, FileText, Wand2, Trash2, Instagram, Youtube, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';

const AI_MODELS = [
  { id: 'gemini-2.0-flash-lite', label: 'Flash 2.0 Lite', desc: 'Resilient, Best for Free Tier' },
  { id: 'gemini-2.0-flash', label: 'Flash 2.0', desc: 'Fast & Balanced' },
  { id: 'gemini-2.5-flash', label: 'Flash 2.5', desc: 'Newest, Accurate' },
  { id: 'gemini-2.5-pro', label: 'Pro 2.5', desc: 'Most Capable (Slow)' },
  { id: 'gemini-pro-latest', label: 'Pro Latest', desc: 'Stable' },
];

const categoryOptions = ["Vocals", "Guitar", "Bass", "Drums", "Keyboard", "Other"];

interface ExtractedMember {
  name: string;
  role: string;
  description: string;
  specialty: string;
  category: string;
  is_featured: boolean;
  social_links: {
    instagram: string;
    youtube: string;
    spotify: string;
  };
  image_index?: number;
}

interface AIHomeBoundImportProps {
  onCancel: () => void;
  onSaved: () => void;
}

export const AIHomeBoundImport: React.FC<AIHomeBoundImportProps> = ({ onCancel, onSaved }) => {
  const { getValidToken } = useAuth();
  const { addBandMember } = useData();
  const [images, setImages] = useState<{ file: File; base64: string }[]>([]);
  const [rawText, setRawText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-lite');
  const [modelStatuses, setModelStatuses] = useState<Record<string, boolean>>({});
  const [isCheckingModels, setIsCheckingModels] = useState(true);
  const [extractedMembers, setExtractedMembers] = useState<ExtractedMember[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchModelStatuses = async () => {
      try {
        const token = await getValidToken();
        const response = await fetch('/api/ai-check-models', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            console.log('AI Model Statuses:', data.models);
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
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10);
    if (newFiles.length === 0) return;

    try {
      const processed = await Promise.all(newFiles.map(async f => ({
        file: f,
        base64: await compressImage(f)
      })));
      setImages(prev => [...prev.slice(0, 10 - processed.length), ...processed]);
    } catch {
      toast.error('Failed to process images');
    }
  };

  const handleExtract = async () => {
    if (!rawText && images.length === 0) {
      toast.error('Please provide text or images for extraction');
      return;
    }

    const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label || 'AI';
    const toastId = toast.loading(`${modelLabel} is analyzing ${images.length > 0 ? `${images.length} images & text` : 'roster text'}...`);

    try {
      const token = await getValidToken();
      const response = await fetch('/api/ai-extract-homebound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: rawText,
          images: images.map(img => ({ data: img.base64, mimeType: 'image/jpeg' })),
          model: selectedModel
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Extraction failed');

      // AI now returns is_featured, so we respect its decision while defaulting to false if missing
      setExtractedMembers(data.members.map((m: ExtractedMember) => ({ 
        ...m, 
        is_featured: m.is_featured ?? false 
      })));
      toast.success(`Successfully extracted ${data.members.length} members!`, { id: toastId });
    } catch (error) {
      const err = error as Error;
      toast.error(err?.message || 'AI extraction failed', { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  const handleMemberChange = (index: number, field: string, value: string | boolean | number) => {
    const updated = [...extractedMembers];
    if (field.includes('.')) {
      const [parent, child] = field.split('.') as [keyof ExtractedMember, string];
      const parentObj = updated[index][parent];
      if (parentObj && typeof parentObj === 'object') {
        (parentObj as Record<string, any>)[child] = value;
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setExtractedMembers(updated);
  };

  const removeMember = (index: number) => {
    setExtractedMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkSave = async () => {
    if (extractedMembers.length === 0) return;
    setIsSaving(true);
    const total = extractedMembers.length;
    let saved = 0;
    const toastId = toast.loading(`Importing: 0/${total} members...`);

    try {
      const { supabase } = await import('../../../lib/supabase');
      
      for (const member of extractedMembers) {
        saved++;
        toast.loading(`Importing: ${saved}/${total} (${member.name})...`, { id: toastId });
        
        let imageUrl = '';
        
        // If there's a matched image, upload it
        if (member.image_index !== undefined && member.image_index >= 0 && images[member.image_index]) {
          const imgData = images[member.image_index];
          const fileName = `hb/artist_${Date.now()}_${imgData.file.name.replace(/[^a-z0-9.]/gi, '_')}`;
          
          const { error: uploadError } = await supabase.storage
            .from('band-images')
            .upload(fileName, imgData.file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('band-images')
            .getPublicUrl(fileName);
            
          imageUrl = publicUrl;
        }

        await addBandMember({
           ...member,
           image: imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
           achievements: [],
           enabled: true,
           order_position: 100 + saved // Spread order positions
        });
      }
      toast.success('All members saved successfully!', { id: toastId });
      onSaved();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to save members', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0c0c14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[900px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-amber-400" />
          </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">AI Bulk Import</h2>
              {isCheckingModels ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
                  <Loader2 size={10} className="animate-spin text-amber-500" />
                  <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Checking AI Availabilty...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest leading-none">AI Live</span>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-200/50">Parse artist rosters using Gemini AI</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {extractedMembers.length === 0 ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Phase: Text and Images */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                <FileText size={12} /> Paste Talent Roster / Bio
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste artist names, roles, and bios here... AI will figure out the structure."
                className="w-full h-64 bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                <ImagePlus size={12} /> Upload Roster Images (OCR)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all min-h-[256px] ${
                  isDragging ? 'border-amber-400 bg-amber-400/5' : 'border-white/10 hover:border-amber-500/30 bg-white/[0.01]'
                }`}
              >
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} />
                {images.length === 0 ? (
                  <>
                    <div className="w-12 h-12 bg-white/[0.03] rounded-full flex items-center justify-center mb-3">
                      <ImagePlus className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400">Drag files here or <button onClick={() => fileInputRef.current?.click()} className="text-amber-400 hover:underline">browse</button></p>
                    <p className="text-[10px] text-gray-600 mt-2">Supports JPG, PNG (Max 20)</p>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10">
                        <img src={URL.createObjectURL(img.file)} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {images.length < 20 && (
                      <button onClick={() => fileInputRef.current?.click()} className="aspect-square border border-dashed border-white/10 rounded-lg flex items-center justify-center hover:bg-white/5">
                        <Plus size={20} className="text-gray-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Select AI Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_MODELS.map(model => {
                    const isAvailable = modelStatuses[model.id] !== false;
                    const isSelected = selectedModel === model.id;
                    
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        disabled={isScanning}
                        className={`p-4 rounded-xl border text-left transition-all relative group h-full flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/20' 
                            : !isAvailable
                              ? 'bg-black/60 border-white/5 opacity-50 grayscale'
                              : 'bg-white/[0.02] border-white/5 hover:border-amber-500/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isCheckingModels ? 'bg-gray-600 animate-pulse' : isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'
                            }`} />
                            <div className={`text-sm font-bold leading-none ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                              {model.label}
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors uppercase tracking-tight font-black leading-none pl-4">
                            {isCheckingModels ? 'Checking...' : isAvailable ? model.desc : 'Busy / Quota Reached'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 size={12} className="text-amber-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="text-amber-400" /> Review & Verification
              </h3>
              <button onClick={() => setExtractedMembers([])} className="text-xs text-gray-500 hover:text-white transition-colors">
                Start Over
              </button>
            </div>
            <div className="grid xl:grid-cols-2 gap-4">
              {extractedMembers.map((member, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-amber-500/20 transition-all group relative">
                  <button onClick={() => removeMember(i)} className="absolute top-4 right-4 text-gray-600 hover:text-rose-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex gap-4">
                    {/* Image Thumbnail / Matcher */}
                    <div className="w-24 min-w-[96px] h-24 bg-black/40 rounded-xl overflow-hidden border border-white/5 relative group shrink-0">
                      {member.image_index !== undefined && member.image_index >= 0 && images[member.image_index] ? (
                        <img 
                          src={URL.createObjectURL(images[member.image_index].file)} 
                          className="w-full h-full object-cover"
                          alt="Match"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                          <ImagePlus size={20} />
                          <span className="text-[8px] mt-1 font-bold">NO PHOTO</span>
                        </div>
                      )}
                      
                      {/* Image Cycler */}
                      {images.length > 0 && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleMemberChange(i, 'image_index', ((member.image_index ?? -1) - 1 + (images.length + 1)) % (images.length + 1) - 1)}
                            className="p-1 hover:text-amber-400 transition-colors"
                          >
                            <Plus size={12} className="rotate-45" />
                          </button>
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">
                            {member.image_index !== undefined && member.image_index >= 0 ? `${member.image_index + 1}` : 'None'}
                          </span>
                          <button 
                            onClick={() => handleMemberChange(i, 'image_index', ((member.image_index ?? -1) + 1 + 1) % (images.length + 1) - 1)}
                            className="p-1 hover:text-amber-400 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Artist Name</label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleMemberChange(i, 'name', e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Role</label>
                        <input
                          type="text"
                          value={member.role}
                          onChange={(e) => handleMemberChange(i, 'role', e.target.value)}
                          className="w-full bg-black/20 border border-white/5 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Specialty</label>
                      <input
                        type="text"
                        value={member.specialty}
                        onChange={(e) => handleMemberChange(i, 'specialty', e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Category</label>
                      <select
                        value={member.category}
                        onChange={(e) => handleMemberChange(i, 'category', e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      >
                        {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={member.is_featured} 
                            onChange={(e) => handleMemberChange(i, 'is_featured', e.target.checked)} 
                            className="sr-only peer" 
                          />
                          <div className="w-8 h-5 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-amber-500/30 peer-checked:border-amber-500/30 transition-all" />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-3 peer-checked:bg-amber-400 transition-all" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">Featured</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Bio / Description</label>
                    <textarea
                      value={member.description}
                      onChange={(e) => handleMemberChange(i, 'description', e.target.value)}
                      rows={2}
                      className="w-full bg-black/20 border border-white/5 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-black/20 border border-white/5 rounded-lg px-2">
                      <Instagram size={12} className="text-pink-400" />
                      <input
                        type="text"
                        value={member.social_links.instagram}
                        placeholder="IG Link"
                        onChange={(e) => handleMemberChange(i, 'social_links.instagram', e.target.value)}
                        className="bg-transparent border-none text-[10px] text-white focus:ring-0 placeholder-gray-700 w-full"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-black/20 border border-white/5 rounded-lg px-2">
                      <Youtube size={12} className="text-red-400" />
                      <input
                        type="text"
                        value={member.social_links.youtube}
                        placeholder="YT Link"
                        onChange={(e) => handleMemberChange(i, 'social_links.youtube', e.target.value)}
                        className="bg-transparent border-none text-[10px] text-white focus:ring-0 placeholder-gray-700 w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-black/40 border-t border-white/10 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {extractedMembers.length > 0 ? (
            <span className="flex items-center gap-2">
              <UserPlus size={14} className="text-emerald-400" />
              {extractedMembers.length} artists ready for import
            </span>
          ) : (
             "Gemini will extract name, role, bio and social links"
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          {extractedMembers.length === 0 ? (
            <button
              onClick={handleExtract}
              disabled={isScanning || (!rawText && images.length === 0)}
              className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Process with AI
            </button>
          ) : (
            <button
              onClick={handleBulkSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Import All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
