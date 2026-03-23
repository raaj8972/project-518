import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

const sanitize = (html: string) => {
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    return html;
  }
};
import { useData } from '../../context/DataContext';
import { Plus, Trash, Save, Info, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { BRAND_YEAR } from '../../constants/brand';

export const AboutSettings: React.FC = () => {
  const { aboutSettings, updateAboutSettings } = useData();
  const savingProgress = useSavingProgress();

  const [enabled, setEnabled] = useState<boolean>(aboutSettings?.enabled ?? true);
  const [heroTitle, setHeroTitle] = useState<string>(aboutSettings?.hero_title ?? 'ABOUT RICORRENZA');
  const [heroHeading, setHeroHeading] = useState<string>(aboutSettings?.hero_heading ?? 'THE FUTURE IS NOW');
  const [paragraphs, setParagraphs] = useState<string[]>(aboutSettings?.hero_paragraphs ?? []);
  const [tracks, setTracks] = useState<string[]>(aboutSettings?.tracks ?? ['Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences']);
  const [zones, setZones] = useState<string[]>(aboutSettings?.zones ?? ['Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases']);
  const [tracksLabel, setTracksLabel] = useState<string>(aboutSettings?.tracksLabel ?? 'Innovation Tracks');
  const [zonesLabel, setZonesLabel] = useState<string>(aboutSettings?.zonesLabel ?? 'Experience Zones');
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>(aboutSettings?.stats ?? [
    { value: BRAND_YEAR, label: 'FESTIVAL YEAR' },
    { value: '3+', label: 'DAYS OF EVENTS' },
    { value: '1000+', label: 'PARTICIPANTS' },
    { value: '∞', label: 'POSSIBILITIES' },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const updatedAt = useMemo(() => aboutSettings?.updated_at ? new Date(aboutSettings.updated_at).toLocaleString() : null, [aboutSettings?.updated_at]);

  // Keep local form in sync when aboutSettings loads or changes
  React.useEffect(() => {
    if (!aboutSettings) return;
    setEnabled(aboutSettings.enabled ?? true);
    setHeroTitle(aboutSettings.hero_title ?? 'ABOUT RICORRENZA');
    setHeroHeading(aboutSettings.hero_heading ?? 'THE FUTURE IS NOW');
    setParagraphs(Array.isArray(aboutSettings.hero_paragraphs) ? aboutSettings.hero_paragraphs : []);
  setTracks(Array.isArray(aboutSettings.tracks) ? aboutSettings.tracks : []);
  setZones(Array.isArray(aboutSettings.zones) ? aboutSettings.zones : []);
  setTracksLabel(aboutSettings?.tracksLabel ?? 'Innovation Tracks');
  setZonesLabel(aboutSettings?.zonesLabel ?? 'Experience Zones');
    setStats(Array.isArray(aboutSettings.stats) ? aboutSettings.stats : []);
  }, [aboutSettings?.id, aboutSettings?.updated_at]);

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, '']);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => setter(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) => setter(prev => prev.map((v, i) => i === idx ? val : v));

  const addStat = () => setStats(prev => [...prev, { value: '', label: '' }]);
  const removeStat = (idx: number) => setStats(prev => prev.filter((_, i) => i !== idx));
  const updateStat = (idx: number, patch: Partial<{ value: string; label: string }>) => setStats(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const onSave = async () => {
    setSaving(true);
    setSaveOk(null);
    setSaveErr(null);
    const steps = savingProgress.withSteps(4, 'Preparing…');
    try {
      steps.next('Sanitizing');
      await updateAboutSettings({
        enabled,
        hero_title: heroTitle,
        hero_heading: heroHeading,
        hero_paragraphs: paragraphs.filter(Boolean),
        tracks: tracks.filter(Boolean),
        zones: zones.filter(Boolean),
        tracksLabel,
        zonesLabel,
        stats: stats.filter(s => s.value || s.label),
      } as any);
      steps.next('Saving to database');
      steps.next('Finalizing');
      setSaveOk('Saved successfully.');
      setTimeout(() => setSaveOk(null), 3000);
      steps.done();
    } finally {
      setSaving(false);
    }
  };

  const SaveStatus: React.FC = () => {
    if (saveErr) return <div className="text-sm font-bold text-red-400 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">{saveErr}</div>;
    if (saveOk) return <div className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">{saveOk}</div>;
    return null;
  };

  // Wrap save in error handling
  const onSaveClick = async () => {
    try {
      await onSave();
    } catch (e: any) {
      const msg = e?.message || 'Failed to save About settings. Ensure migrations are applied (about_settings table exists).';
      setSaveErr(String(msg));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            About Section Studio
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-gray-400 font-medium">Design majestic landing experiences for your users.</p>
            {updatedAt && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                <div className="text-xs text-indigo-400 uppercase tracking-widest font-bold">Updated: {updatedAt}</div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveStatus />
          <button 
            onClick={onSaveClick} 
            disabled={saving} 
            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              saving
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 text-white transform hover:-translate-y-1'
            }`}
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Deploy'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column - Configuration */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* General Settings */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
              <Layers className="w-5 h-5 text-indigo-400" />
              General Settings
            </h3>
            
            <label className="flex items-center gap-4 cursor-pointer group bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all mb-6">
              <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-500 ${enabled ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-500 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="hidden"
              />
              <div>
                <span className="block text-sm font-bold text-white tracking-widest uppercase">Enable About Section</span>
                <span className="text-xs text-gray-500">Show this section publicly on the home page</span>
              </div>
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hero Title</label>
                <input 
                  value={heroTitle} 
                  onChange={(e) => setHeroTitle(e.target.value)} 
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none" 
                  placeholder="ABOUT RICORRENZA" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hero Heading</label>
                <input 
                  value={heroHeading} 
                  onChange={(e) => setHeroHeading(e.target.value)} 
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none" 
                  placeholder="THE FUTURE IS NOW" 
                />
              </div>
            </div>
          </div>

          {/* Paragraphs */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
             <h3 className="text-lg font-black text-white flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <Info className="w-5 h-5 text-purple-400" />
                 Story Content
               </div>
               <button 
                 onClick={() => addItem(setParagraphs)}
                 className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                 title="Add Paragraph"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </h3>
             <div className="space-y-4">
               {paragraphs.map((p, i) => (
                 <div key={i} className="flex gap-3 items-start group">
                   <textarea 
                     value={p} 
                     onChange={(e) => updateItem(setParagraphs, i, e.target.value)} 
                     className="flex-1 bg-black/40 border border-white/5 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none resize-y min-h-[80px]" 
                     placeholder="Enter story paragraph..." 
                   />
                   <button 
                     onClick={() => removeItem(setParagraphs, i)} 
                     className="p-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100" 
                     title="Remove Paragraph"
                   >
                     <Trash className="w-4 h-4" />
                   </button>
                 </div>
               ))}
               {paragraphs.length === 0 && (
                 <div className="text-center py-6 text-gray-500 text-sm font-medium border border-dashed border-white/10 rounded-xl">
                   No paragraphs added yet.
                 </div>
               )}
             </div>
          </div>

          {/* Lists */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
             <h3 className="text-lg font-black text-white flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <Sparkles className="w-5 h-5 text-amber-400" />
                 Features & Experiences
               </div>
             </h3>

             <div className="space-y-8">
               {/* Tracks */}
               <div className="p-5 bg-black/20 border border-white/5 rounded-2xl">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Primary List Name</label>
                 <input 
                   value={tracksLabel} 
                   onChange={e => setTracksLabel(e.target.value)} 
                   className="w-full bg-black/40 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-3 mb-4 text-white transition-all outline-none" 
                   placeholder="Innovation Tracks" 
                 />
                 <div className="space-y-3">
                   {tracks.map((t, i) => (
                     <div key={i} className="flex gap-2 group">
                       <input 
                         value={t} 
                         onChange={(e)=>updateItem(setTracks, i, e.target.value)} 
                         className="flex-1 bg-black/40 border border-white/5 focus:border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white transition-all outline-none" 
                         placeholder="Track item" 
                       />
                       <button 
                         onClick={()=>removeItem(setTracks, i)} 
                         className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                   <button 
                     onClick={()=>addItem(setTracks)}
                     className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                   >
                     <Plus className="w-3 h-3" /> Add Item
                   </button>
                 </div>
               </div>

               {/* Zones */}
               <div className="p-5 bg-black/20 border border-white/5 rounded-2xl">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Secondary List Name</label>
                 <input 
                   value={zonesLabel} 
                   onChange={e => setZonesLabel(e.target.value)} 
                   className="w-full bg-black/40 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-3 mb-4 text-white transition-all outline-none" 
                   placeholder="Experience Zones" 
                 />
                 <div className="space-y-3">
                   {zones.map((z, i) => (
                     <div key={i} className="flex gap-2 group">
                       <input 
                         value={z} 
                         onChange={(e)=>updateItem(setZones, i, e.target.value)} 
                         className="flex-1 bg-black/40 border border-white/5 focus:border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white transition-all outline-none" 
                         placeholder="Zone item" 
                       />
                       <button 
                         onClick={()=>removeItem(setZones, i)} 
                         className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                     </div>
                   ))}
                   <button 
                     onClick={()=>addItem(setZones)}
                     className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                   >
                     <Plus className="w-3 h-3" /> Add Item
                   </button>
                 </div>
               </div>

             </div>
          </div>

          {/* Stats Box */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
             <h3 className="text-lg font-black text-white flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <Layers className="w-5 h-5 text-emerald-400" />
                 Highlight Stats
               </div>
             </h3>
             <div className="space-y-3">
               {stats.map((s, i) => (
                 <div key={i} className="flex gap-3 group bg-black/20 p-3 rounded-2xl border border-white/5">
                   <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                     <input 
                       value={s.value} 
                       onChange={(e)=>updateStat(i, { value: e.target.value })} 
                       className="bg-black/40 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-300 font-bold transition-all outline-none text-center" 
                       placeholder="Value (e.g. 2026)" 
                     />
                     <input 
                       value={s.label} 
                       onChange={(e)=>updateStat(i, { label: e.target.value })} 
                       className="md:col-span-2 bg-black/40 border border-white/5 focus:border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white transition-all outline-none" 
                       placeholder="Label (e.g. YEAR)" 
                     />
                   </div>
                   <button 
                     onClick={()=>removeStat(i)} 
                     className="p-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash className="w-5 h-5" />
                   </button>
                 </div>
               ))}
               <button 
                 onClick={addStat}
                 className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors"
               >
                 <Plus className="w-4 h-4" /> Add Highlight Metric
               </button>
             </div>
          </div>

        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl sticky top-8">
            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-500/20 rounded-xl">
                 <Sparkles className="w-4 h-4 text-indigo-400" />
               </div>
               Live Emulation
            </h3>

            {!enabled && (
              <div className="mb-6 p-4 border border-rose-500/20 bg-rose-500/10 rounded-2xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                 <span className="text-rose-400 text-xs font-black uppercase tracking-widest">Section globally disabled</span>
              </div>
            )}

            {/* The actual emulated area matching the Home look */}
            <div className={`p-8 rounded-[2rem] border border-white/5 bg-black/60 relative overflow-hidden transition-all duration-500 ${!enabled ? 'opacity-50 grayscale contrast-125' : ''}`}>
               {/* Decorative Background Hints */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px]"></div>

               <div className="relative z-10">
                 <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-3">
                   {heroTitle || 'ABOUT RICORRENZA'}
                 </p>
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter">
                   {heroHeading || 'THE FUTURE IS NOW'}
                 </h2>

                 <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-p:leading-relaxed text-lg mb-12">
                   {(paragraphs.length ? paragraphs : ['No content to display.']).map((p, i) => (
                     <p key={i} dangerouslySetInnerHTML={{ __html: sanitize(p) }} />
                   ))}
                 </div>

                 <div className="grid md:grid-cols-2 gap-8 mb-12">
                   {/* Primary List Preview */}
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                     <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
                       <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 text-sm">01</span>
                       {tracksLabel || 'Innovation Tracks'}
                     </h3>
                     <ul className="space-y-3">
                       {(tracks.length ? tracks : ['No items added']).map((t, i) => (
                         <li key={i} className="flex items-center text-gray-300 gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                           {t}
                         </li>
                       ))}
                     </ul>
                   </div>

                   {/* Secondary List Preview */}
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                     <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
                       <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 text-purple-400 text-sm">02</span>
                       {zonesLabel || 'Experience Zones'}
                     </h3>
                     <ul className="space-y-3">
                       {(zones.length ? zones : ['No items added']).map((z, i) => (
                         <li key={i} className="flex items-center text-gray-300 gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                           {z}
                         </li>
                       ))}
                     </ul>
                   </div>
                 </div>

                 {/* Stats Preview */}
                 {stats.length > 0 && (
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                     {stats.map((s, idx) => (
                       <div key={idx} className="bg-white/[0.03] p-6 rounded-3xl border border-white/5 text-center group">
                         <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 mb-2 group-hover:scale-110 transition-transform">
                           {s.value || '—'}
                         </div>
                         <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                           {s.label || '—'}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
