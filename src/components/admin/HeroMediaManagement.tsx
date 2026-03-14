import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Save, Monitor, Smartphone, Video, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { heroMediaService, HeroMediaV2 } from '../../services/heroMediaService';

type PageKey = 'home' | 'homebound';

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Home Page',
  homebound: 'Home Bound Page',
};

export const HeroMediaManagement: React.FC = () => {
  const [selectedPage, setSelectedPage] = useState<PageKey>('home');
  const [form, setForm] = useState<HeroMediaV2 | null>(null);
  const [baselineForm, setBaselineForm] = useState<HeroMediaV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');
  const [previewVideoError, setPreviewVideoError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await heroMediaService.getHeroMedia(selectedPage);
        setForm(data);
        setBaselineForm(data);
      } catch (e) {
        console.error('Error fetching hero media:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    setPreviewVideoError(false);
  }, [selectedPage, activeTab]);

  const handleSave = async () => {
    if (!form) return;
    setIsSaving(true);
    try {
      await heroMediaService.saveHeroMedia(selectedPage, form);
      setBaselineForm({ ...form });
      alert('Hero Media saved successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to save Hero Media.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(baselineForm);

  if (isLoading || !form) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Hero Media Studio V2
          </h2>
          <p className="text-gray-400 mt-2 font-medium">Design majestic landing experiences for your users.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            {(Object.keys(PAGE_LABELS) as PageKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedPage(key)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                  selectedPage === key 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {PAGE_LABELS[key]}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              isSaving || !hasUnsavedChanges
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 text-white transform hover:-translate-y-1'
            }`}
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : 'Deploy'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Global Settings */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <Layers className="w-5 h-5 text-indigo-400" />
              General Settings
            </h3>
            
            <div className="space-y-6">
              <label className="flex items-center gap-4 cursor-pointer group bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-500 ${form.enabled ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-500 ${form.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="hidden"
                />
                <div>
                  <span className="block text-sm font-bold text-white tracking-widest uppercase">Enable Hero Section</span>
                  <span className="text-xs text-gray-500">Enable or disable this hero section publically</span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Background Type</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-black/50 rounded-2xl">
                  {(['image', 'video', 'auto'] as ('image' | 'video' | 'auto')[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, background_type: type })}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                        form.background_type === type ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Media Assets */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-black text-white flex items-center gap-3">
                 <ImageIcon className="w-5 h-5 text-purple-400" />
                 Media Assets
               </h3>
               
               {/* Device Toggle */}
               <div className="flex bg-black/50 p-1 rounded-xl">
                 <button 
                  onClick={() => setActiveTab('desktop')}
                  className={`p-2 rounded-lg transition-colors ${activeTab === 'desktop' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>
                   <Monitor size={18} />
                 </button>
                 <button 
                  onClick={() => setActiveTab('mobile')}
                  className={`p-2 rounded-lg transition-colors ${activeTab === 'mobile' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>
                   <Smartphone size={18} />
                 </button>
               </div>
             </div>

             <div className="space-y-8">
               {activeTab === 'desktop' ? (
                 <>
                  {form.background_type !== 'video' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Desktop Image</label>
                      <ImageUpload 
                        currentImage={form.image_url} 
                        onImageSelect={(url) => setForm({...form, image_url: url})} 
                        bucket="hero_v2" 
                        folder={`${selectedPage}/desktop`}
                        isDirty={form.image_url !== baselineForm?.image_url}
                      />
                    </div>
                  )}
                  {form.background_type !== 'image' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Video size={14} /> Desktop Video
                      </label>
                      <ImageUpload 
                        currentImage={form.video_url} 
                        onImageSelect={(url) => setForm({...form, video_url: url})} 
                        bucket="hero_v2" 
                        folder={`${selectedPage}/desktop`} 
                        acceptedTypes="video/*"
                        isDirty={form.video_url !== baselineForm?.video_url}
                      />
                    </div>
                  )}
                 </>
               ) : (
                 <>
                  {form.background_type !== 'video' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile Image (Portrait)</label>
                      <ImageUpload 
                        currentImage={form.mobile_image_url} 
                        onImageSelect={(url) => setForm({...form, mobile_image_url: url})} 
                        bucket="hero_v2" 
                        folder={`${selectedPage}/mobile`}
                        isDirty={form.mobile_image_url !== baselineForm?.mobile_image_url}
                      />
                    </div>
                  )}
                  {form.background_type !== 'image' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Video size={14} /> Mobile Video (Portrait)
                      </label>
                      <ImageUpload 
                        currentImage={form.mobile_video_url} 
                        onImageSelect={(url) => setForm({...form, mobile_video_url: url})} 
                        bucket="hero_v2" 
                        folder={`${selectedPage}/mobile`} 
                        acceptedTypes="video/*"
                        isDirty={form.mobile_video_url !== baselineForm?.mobile_video_url}
                      />
                    </div>
                  )}
                 </>
               )}
             </div>
          </div>
        </div>

        {/* Right Column - Tweaks & Preview */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl h-full flex flex-col">
            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <Monitor className="w-5 h-5 text-emerald-400" />
              Live Emulation & Adjustments
            </h3>

            {/* Adjustments */}
            <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-black/40 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Zoom</span>
                  <span className="text-emerald-400">{(activeTab === 'desktop' ? form.desktop_zoom : form.mobile_zoom).toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="3" step="0.01" 
                  value={activeTab === 'desktop' ? form.desktop_zoom : form.mobile_zoom}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm(activeTab === 'desktop' ? {...form, desktop_zoom: val} : {...form, mobile_zoom: val});
                  }}
                  className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Offset X</span>
                  <span className="text-indigo-400">{((activeTab === 'desktop' ? form.desktop_offset_x : form.mobile_offset_x) * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="-0.5" max="0.5" step="0.01" 
                  value={activeTab === 'desktop' ? form.desktop_offset_x : form.mobile_offset_x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm(activeTab === 'desktop' ? {...form, desktop_offset_x: val} : {...form, mobile_offset_x: val});
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Offset Y</span>
                  <span className="text-purple-400">{((activeTab === 'desktop' ? form.desktop_offset_y : form.mobile_offset_y) * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="-0.5" max="0.5" step="0.01" 
                  value={activeTab === 'desktop' ? form.desktop_offset_y : form.mobile_offset_y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm(activeTab === 'desktop' ? {...form, desktop_offset_y: val} : {...form, mobile_offset_y: val});
                  }}
                  className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Preview Box */}
            <div className={`flex-1 flex items-center justify-center bg-black rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 ${activeTab === 'mobile' ? 'mx-auto w-[320px] aspect-[9/16]' : 'w-full aspect-video'}`}>
              
              <div className="absolute inset-0"
                style={{
                  transform: `translate(${(activeTab === 'desktop' ? form.desktop_offset_x : form.mobile_offset_x) * 100}%, ${(activeTab === 'desktop' ? form.desktop_offset_y : form.mobile_offset_y) * 100}%) scale(${activeTab === 'desktop' ? form.desktop_zoom : form.mobile_zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease-out'
                }}
              >
                {(() => {
                  const mediaUrl = activeTab === 'desktop' 
                    ? (form.video_url || form.image_url) 
                    : (form.mobile_video_url || form.mobile_image_url || form.video_url || form.image_url);
                    
                  if (!mediaUrl) return <div className="w-full h-full flex flex-col items-center justify-center text-gray-600"><ImageIcon className="w-12 h-12 mb-4 opacity-20" /><span className="text-xs uppercase font-bold tracking-widest">No Media Selected</span></div>;

                  if (mediaUrl.match(/\.(mp4|webm|mov)$/i) || form.background_type === 'video') {
                    if (previewVideoError) {
                      return (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-950/20 text-red-400 p-8 text-center">
                          <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                          <span className="text-xs uppercase font-black tracking-widest mb-2">Resource Failed to Load</span>
                          <p className="text-[10px] text-red-300/60 max-w-[200px]">The video file could not be retrieved from storage. Please re-upload or check your Supabase settings.</p>
                        </div>
                      );
                    }
                    return (
                      <video 
                        src={mediaUrl} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          console.error('Preview video failed to load:', mediaUrl, e);
                          setPreviewVideoError(true);
                        }}
                      />
                    );
                  }

                  return <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />;
                })()}
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: form.overlay_color, opacity: form.overlay_opacity }} />
              
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white/50 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/5">
                {activeTab} Preview
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HeroMediaManagement;
