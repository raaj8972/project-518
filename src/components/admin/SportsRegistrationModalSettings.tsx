import React, { useEffect, useState } from 'react';
import { Save, X, Plus, Trash2, Settings2, Eye, Building2, Sparkles, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// ─── Styling tokens ─────────────────────────────
const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';

export const SportsRegistrationModalSettings: React.FC = () => {
  const { siteSettings, updateSiteSettings, isAdmin, isOwner } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configMode, setConfigMode] = useState<'player' | 'owner'>('player');

  const [playerDraft, setPlayerDraft] = useLocalStorage('admin_sports_player_registration_draft', {
    registration_open: (siteSettings?.sports_player_registration_config?.registration_open ?? siteSettings?.sports_registration_config?.registration_open ?? true),
    form_fields: (siteSettings?.sports_player_registration_config?.form_fields as any[]) || 
                 (siteSettings?.sports_registration_config?.form_fields as any[]) || [
      { name: 'name', label: 'Full Name', required: true, type: 'text' },
      { name: 'phone', label: 'Phone Number', required: true, type: 'tel' },
      { name: 'email', label: 'Email', required: false, type: 'email' },
      { name: 'year', label: 'Year / Class', required: true, type: 'text' },
      { name: 'position', label: 'Role / Position', required: true, type: 'text' },
      { name: 'experience', label: 'Past Experience / Achievements', required: true, type: 'textarea' }
    ],
    participant_types: (siteSettings?.sports_player_registration_config?.participant_types as string[]) || 
                      (siteSettings?.sports_registration_config?.participant_types as string[]) || ['Student', 'Faculty'],
  });

  const [ownerDraft, setOwnerDraft] = useLocalStorage('admin_sports_owner_registration_draft', {
    registration_open: (siteSettings?.sports_owner_registration_config?.registration_open ?? siteSettings?.sports_registration_config?.registration_open ?? true),
    form_fields: (siteSettings?.sports_owner_registration_config?.form_fields as any[]) || [
      { name: 'name', label: 'Owner Name', required: true, type: 'text' },
      { name: 'phone', label: 'WhatsApp Number', required: true, type: 'tel' },
      { name: 'email', label: 'Email', required: true, type: 'email' },
      { name: 'company', label: 'Company / Firm (Optional)', required: false, type: 'text' },
    ],
    participant_types: (siteSettings?.sports_owner_registration_config?.participant_types as string[]) || ['Franchise Owner'],
  });

  const draft = configMode === 'player' ? playerDraft : ownerDraft;
  const setDraft = configMode === 'player' ? setPlayerDraft : setOwnerDraft;

  useEffect(() => {
    if (!isEditing) {
      if (siteSettings?.sports_player_registration_config) {
        setPlayerDraft(siteSettings.sports_player_registration_config);
      } else if (siteSettings?.sports_registration_config) {
        setPlayerDraft(siteSettings.sports_registration_config);
      }
      
      if (siteSettings?.sports_owner_registration_config) {
        setOwnerDraft(siteSettings.sports_owner_registration_config);
      }
    }
  }, [siteSettings, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configMode === 'player') {
        await updateSiteSettings({
          sports_player_registration_config: playerDraft,
          // Sync to legacy if needed, but primarily use new one
          sports_registration_config: playerDraft
        });
      } else {
        await updateSiteSettings({
          sports_owner_registration_config: ownerDraft
        });
      }
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Sports registration settings saved.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save sports registration settings', err);
      setMessage({ type: 'error', text: err?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMessage(null);
  };

  const updateField = (idx: number, patch: any) => {
    setDraft((prev: any) => {
      const fields = [...prev.form_fields];
      fields[idx] = { ...fields[idx], ...patch };
      return { ...prev, form_fields: fields };
    });
  };

  const addType = () => {
    const t = prompt('Enter participant type (e.g. Alumnus):');
    if (t) {
      setDraft((prev: any) => ({
        ...prev,
        participant_types: [...(prev.participant_types || []), t]
      }));
    }
  };

  const removeType = (idx: number) => {
     setDraft((prev: any) => ({
        ...prev,
        participant_types: (prev.participant_types || []).filter((_: any, i: number) => i !== idx)
     }));
  };

  if (!isAdmin && !isOwner) {
     return <div className="p-8 text-center text-rose-400">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-transparent border border-white/10 p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-[0.2em]">Sports Domain</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Sports Registration Model</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">Configure fields and types for sports participation.</p>
          </div>

          <button
            onClick={() => setIsEditing(e => !e)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
              isEditing ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-emerald-600 text-white'
            }`}
          >
            {isEditing ? <><X size={14} /> Cancel</> : <><Settings2 size={14} /> Edit Model</>}
          </button>
        </div>
      </div>

      {/* Tabs for Player/Owner Config */}
      <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
        <button
          onClick={() => !isEditing && setConfigMode('player')}
          disabled={isEditing}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${configMode === 'player' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white disabled:opacity-50'}`}
        >
          PLAYER MODEL
        </button>
        <button
          onClick={() => !isEditing && setConfigMode('owner')}
          disabled={isEditing}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${configMode === 'owner' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white disabled:opacity-50'}`}
        >
          OWNER MODEL
        </button>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border animate-in fade-in duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Building2 size={14} className="text-emerald-400" />
                 <h3 className="text-sm font-black text-white tracking-tight uppercase">Registration Fields</h3>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-white/30 uppercase font-black">Status:</span>
                 <button 
                   onClick={() => isEditing && setDraft((p: any) => ({ ...p, registration_open: !p.registration_open }))}
                   className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${draft.registration_open ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                 >
                   {draft.registration_open ? 'OPEN' : 'CLOSED'}
                 </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
               {draft.form_fields.map((field: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 group relative">
                     <div className="flex-1 space-y-3">
                        <div>
                           <label className={labelCls}>Field Label</label>
                           <input 
                             disabled={!isEditing}
                             value={field.label}
                             onChange={e => updateField(idx, { label: e.target.value })}
                             className={inputCls}
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className={labelCls}>Type</label>
                              <select 
                                disabled={!isEditing}
                                value={field.type}
                                onChange={e => updateField(idx, { type: e.target.value })}
                                className={inputCls}
                              >
                                 <option value="text">Short Text</option>
                                 <option value="textarea">Long Text</option>
                                 <option value="tel">Phone</option>
                                 <option value="email">Email</option>
                                 <option value="number">Number</option>
                                 <option value="file">File Upload / Photo</option>
                              </select>
                           </div>
                           <div className="flex items-center pt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                   type="checkbox"
                                   disabled={!isEditing}
                                   checked={field.required}
                                   onChange={e => updateField(idx, { required: e.target.checked })}
                                   className="rounded border-white/10 bg-white/5 text-emerald-500"
                                 />
                                 <span className="text-xs text-white/60">Required</span>
                              </label>
                           </div>
                        </div>
                     </div>
                     {isEditing && (
                        <button 
                          onClick={() => setDraft((p: any) => ({ ...p, form_fields: p.form_fields.filter((_: any, i: number) => i !== idx) }))}
                          className="lg:opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all self-start"
                        >
                           <Trash2 size={16} />
                        </button>
                     )}
                  </div>
               ))}
               
               {isEditing && (
                  <button 
                    onClick={() => setDraft((p: any) => ({ ...p, form_fields: [...p.form_fields, { name: 'custom_' + Date.now(), label: 'New Field', required: false, type: 'text' }] }))}
                    className="w-full py-4 border border-dashed border-white/10 rounded-xl text-xs font-black text-white/30 uppercase tracking-widest hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                  >
                     + Add Custom Field
                  </button>
               )}
            </div>
          </div>
        </div>

        {/* Right: Participant Types */}
        <div className="space-y-6">
           <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
             <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-teal-500/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Sparkles size={14} className="text-teal-400" />
                   <h3 className="text-sm font-black text-white tracking-tight uppercase">Participant Types</h3>
                </div>
                {isEditing && (
                   <button onClick={addType} className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg">
                      <Plus size={14} />
                   </button>
                )}
             </div>
             <div className="p-6 space-y-2">
                {(draft.participant_types || []).map((type: string, idx: number) => (
                   <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-sm text-white font-medium">{type}</span>
                      {isEditing && (
                         <button onClick={() => removeType(idx)} className="text-rose-400/40 hover:text-rose-400">
                            <Trash2 size={14} />
                         </button>
                      )}
                   </div>
                ))}
             </div>
           </div>

           {isEditing && (
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
                 <div className="flex gap-2 text-emerald-400">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                       Dynamic fields will be reflected on the public Sports page. Ensure field names are unique.
                    </p>
                 </div>
                 <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                 >
                    {saving ? 'Saving...' : 'Deploy Changes'}
                 </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
