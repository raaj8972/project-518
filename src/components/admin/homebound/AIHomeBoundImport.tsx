import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AIChatScanner } from '../AIChatScanner';
import { CheckCircle2, Loader2, UserPlus, Trash2, Instagram, Youtube, Plus, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../../../context/DataContext';

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

const SYSTEM_INSTRUCTION = `You are a rigorous AI conversational assistant for Homebound Artist roster extraction.
Your goal is to extract artist/band details from text or images provided by the user.

- "image_index": Provide 'image_index' (0-based) ONLY if a photo corresponds to a member. If no photo is found, DO NOT ASK; instead, use 'image hosdel event poster' as a placeholder.
- "instagram": Full Instagram profile URL (e.g., "https://instagram.com/username"). If the user provides just an ID or handle (like @username), convert it to a full link.
- "youtube": Full YouTube channel/video URL.
- "spotify": Full Spotify artist/track URL.

MANDATORY FIELDS (Ask ONLY if these are missing):
- "name": Official name of the artist or band.
- "role": Primary instrument or role in the band.
- "category": Type of artist (e.g., Vocals, Guitar, Bass, Drums, Keyboard, Other).

STRICT PROTOCOL:
1. If "name", "role", or "category" are missing, respond naturally and ask for them.
2. If the user explicitly states a mandatory field is "not available", "unknown", "skip", or "not decided", USE A PLACEHOLDER (e.g., "TBA", "Artist", "Member") and proceed to generate the JSON.
3. If the user provided content but some fields are absent, and the user says "extract with what you have" or "proceed", DO NOT RE-ASK. Use placeholders.
4. DO NOT ask for images, bios, or social links. Use placeholders or omit them.
5. For Instagram, ALWAYS return a full URL starting with https://instagram.com/.
6. ONLY when all mandatory details are known or explicitly waived, output the final result as a JSON array wrapped in markdown blocks:
\`\`\`json
[
  {
    "name": "...",
    "role": "...",
    "description": "...",
    "specialty": "...",
    "category": "...",
    "is_featured": false,
    "social_links": {
      "instagram": "https://instagram.com/...",
      "youtube": "...",
      "spotify": "..."
    },
    "image_index": 0
  }
]
\`\`\`
7. Do not guess mandatory information. If unclear, ASK. For non-mandatory fields, just use placeholders or omit.
8. If the user tells you to "extract what you can" or "proceed without missing info", use placeholders for missing mandatory fields and generate JSON.
9. If a category is missing and user doesn't provide it, use "Other".`;


export const AIHomeBoundImport: React.FC<AIHomeBoundImportProps> = ({ onCancel, onSaved }) => {
  const { addBandMember } = useData();
  const [extractedMembers, setExtractedMembers] = useState<ExtractedMember[]>([]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleScanComplete = (data: unknown, images: string[]) => {
    console.log('[AIImport] Scan complete. Data:', data);
    console.log('[AIImport] Images received:', images.length);
    if (images.length > 0) {
      console.log('[AIImport] First image preview (100 chars):', images[0].substring(0, 100));
    }
    
    // Keep images around for the matching UI
    setCapturedImages(images);
    setExtractedMembers((data as ExtractedMember[]).map(m => ({
      ...m,
      is_featured: m.is_featured ?? false
    })));
  };

  const handleMemberChange = (index: number, field: string, value: string | boolean | number) => {
    const updated = [...extractedMembers];
    if (field.includes('.')) {
      const [parent, child] = field.split('.') as [keyof ExtractedMember, string];
      const parentObj = updated[index][parent];
      if (parentObj && typeof parentObj === 'object') {
        (parentObj as Record<string, unknown>)[child] = value;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated[index] as any)[field] = value;
    }
    setExtractedMembers(updated);
  };

  const removeMember = (index: number) => {
    setExtractedMembers(prev => prev.filter((_, i) => i !== index));
  };
  
  // Convert base64 string back to File object for Supabase upload
  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    // Strip data URL prefix if present
    const base64Data = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    return new File([bytes], filename, { type: 'image/jpeg' });
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
        if (member.image_index !== undefined && member.image_index >= 0 && capturedImages[member.image_index]) {
          try {
            const imgBase64 = capturedImages[member.image_index];
            const file = await base64ToFile(imgBase64, `artist_${Date.now()}_${member.name.replace(/[^a-z0-9]/gi, '_')}.jpg`);
            const fileName = `hb/${file.name}`;
            
            console.log(`[AIImport] Uploading image for ${member.name}: ${fileName}`);
            const { error: uploadError } = await supabase.storage
              .from('band-images')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
              });
              
            if (uploadError) {
              console.error('[AIImport] Upload error:', uploadError);
              // Don't throw here, just log and continue without image
            } else {
              console.log(`[AIImport] Upload success for ${member.name}`);
              const { data: { publicUrl } } = supabase.storage
                .from('band-images')
                .getPublicUrl(fileName);
              imageUrl = publicUrl;
            }
          } catch (e) {
            console.error('[AIImport] Image processing error:', e);
          }
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

  if (extractedMembers.length === 0) {
    return (
      <AIChatScanner
        title="HomeBound Roster Importer"
        description="Extract artist names, roles, bios, and links using Gemini."
        systemInstruction={SYSTEM_INSTRUCTION}
        onDataComplete={handleScanComplete}
        onCancel={onCancel}
        placeholder="Paste artist bios or drop photos..."
      />
    );
  }

  // Verification UI
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0c0c14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full h-full max-h-[90vh] max-w-6xl animate-in zoom-in-95 duration-300">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
             <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Review Roster</h2>
            <p className="text-xs text-gray-400">{extractedMembers.length} members extracted</p>
          </div>
        </div>
        <button onClick={() => setExtractedMembers([])} className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10">
          <Edit2 size={14} /> Start Over
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-b from-[#0c0c14] to-black">
        <div className="grid xl:grid-cols-2 gap-4">
          {extractedMembers.map((member, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-amber-500/20 transition-all group relative">
              <button onClick={() => removeMember(i)} className="absolute top-4 right-4 text-gray-600 hover:text-rose-400 transition-colors">
                <Trash2 size={16} />
              </button>
              
              <div className="flex gap-4">
                {/* Image Cycler block */}
                <div className="w-24 min-w-[96px] h-24 bg-black/40 rounded-xl overflow-hidden border border-white/5 relative group shrink-0 shadow-inner">
                  {member.image_index !== undefined && member.image_index >= 0 && capturedImages[member.image_index] ? (
                    <img 
                      src={`data:image/jpeg;base64,${capturedImages[member.image_index]}`}
                      className="w-full h-full object-cover"
                      alt="Match"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-white/[0.01]">
                       <UserPlus size={20} className="mb-1 opacity-50" />
                      <span className="text-[8px] font-bold tracking-wider">NO PHOTO</span>
                    </div>
                  )}
                  
                  {capturedImages.length > 0 && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 backdrop-blur-sm">
                      <button 
                         onClick={() => handleMemberChange(i, 'image_index', ((member.image_index ?? -1) - 1 + (capturedImages.length + 1)) % (capturedImages.length + 1) - 1)}
                        className="p-1.5 hover:bg-white/10 rounded-md hover:text-amber-400 transition-colors"
                      >
                         <Plus size={14} className="rotate-45" />
                      </button>
                      <span className="text-[10px] font-bold text-white px-1">
                        {member.image_index !== undefined && member.image_index >= 0 ? `#${member.image_index + 1}` : '-'}
                      </span>
                      <button 
                         onClick={() => handleMemberChange(i, 'image_index', ((member.image_index ?? -1) + 1 + 1) % (capturedImages.length + 1) - 1)}
                        className="p-1.5 hover:bg-white/10 rounded-md hover:text-amber-400 transition-colors"
                      >
                         <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest pl-1">Artist Name</label>
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => handleMemberChange(i, 'name', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm font-medium text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">Role</label>
                    <input
                      type="text"
                      value={member.role}
                      onChange={(e) => handleMemberChange(i, 'role', e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">Specialty</label>
                  <input
                    type="text"
                    value={member.specialty}
                    onChange={(e) => handleMemberChange(i, 'specialty', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">Category</label>
                  <select
                    value={member.category}
                    onChange={(e) => handleMemberChange(i, 'category', e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 appearance-none"
                  >
                    {categoryOptions.map(opt => <option key={opt} value={opt} className="bg-[#181824]">{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group w-max">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={member.is_featured} 
                        onChange={(e) => handleMemberChange(i, 'is_featured', e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-black/50 border border-white/10 rounded-full peer-checked:bg-amber-500/20 peer-checked:border-amber-500/50 transition-all shadow-inner" />
                      <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-amber-400 transition-all shadow-md" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider group-hover:text-gray-300">FEATURED</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">Bio / Description</label>
                <textarea
                  value={member.description}
                  onChange={(e) => handleMemberChange(i, 'description', e.target.value)}
                  rows={2}
                  className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-gray-300 focus:outline-none focus:border-amber-500/50 resize-none custom-scrollbar"
                />
              </div>

              <div className="flex gap-3">
                 <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 group focus-within:border-amber-500/30 transition-colors">
                  <Instagram size={14} className="text-pink-500/70 group-focus-within:text-pink-400" />
                  <input
                    type="text"
                    value={member.social_links.instagram}
                    placeholder="IG URL"
                    onChange={(e) => handleMemberChange(i, 'social_links.instagram', e.target.value)}
                    className="bg-transparent border-none text-[11px] text-gray-300 py-2 focus:ring-0 placeholder-gray-700 w-full"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 group focus-within:border-amber-500/30 transition-colors">
                  <Youtube size={14} className="text-red-500/70 group-focus-within:text-red-400" />
                  <input
                    type="text"
                    value={member.social_links.youtube}
                    placeholder="YT URL"
                    onChange={(e) => handleMemberChange(i, 'social_links.youtube', e.target.value)}
                    className="bg-transparent border-none text-[11px] text-gray-300 py-2 focus:ring-0 placeholder-gray-700 w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-black/60 border-t border-white/10 flex items-center justify-between backdrop-blur-md">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleBulkSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          Import All to Roster
        </button>
      </div>
      </div>
    </div>,
    document.body
  );
};
