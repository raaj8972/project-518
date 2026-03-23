import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Settings2, Eye, Building2, Sparkles, AlertCircle, Users } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// ─── Styling tokens ─────────────────────────────
const inputCls = 'w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20 focus:bg-white/[0.08] transition-all shadow-inner';
const labelCls = 'block text-[11px] font-black text-gold-500/60 uppercase tracking-[0.2em] mb-2.5 ml-1';

export const AnnualRegistrationModalSettings: React.FC = () => {
  const { siteSettings, updateSiteSettings, isAdmin, isOwner } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [draft, setDraft] = useLocalStorage('admin_annual_registration_draft', {
    registration_open: siteSettings?.annual_registration_config?.registration_open ?? true,
    photo_required: siteSettings?.annual_registration_config?.photo_required ?? true,
    form_fields: siteSettings?.annual_registration_config?.form_fields || [
      { name: 'fullName', label: 'Full Name', required: true, type: 'text' },
      { name: 'email', label: 'Email', required: true, type: 'email' },
      { name: 'phone', label: 'Phone Number', required: true, type: 'tel' },
      { name: 'college', label: 'College/Institution', required: true, type: 'text' },
      { name: 'department', label: 'Department', required: false, type: 'text' },
      { name: 'year', label: 'Year / Batch', required: false, type: 'text' },
      { name: 'rollNo', label: 'Roll No / SID', required: false, type: 'text' }
    ],
    participant_types: siteSettings?.annual_registration_config?.participant_types || ['Student', 'Faculty', 'Staff', 'Alumni'],
  });

  useEffect(() => {
    if (!isEditing && siteSettings?.annual_registration_config) {
      setDraft(siteSettings.annual_registration_config);
    }
  }, [siteSettings, isEditing, setDraft]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteSettings({
        annual_registration_config: draft
      });
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Annual registration settings saved.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setMessage({ type: 'error', text: err?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (idx: number, patch: any) => {
    setDraft((prev: any) => {
      const fields = [...prev.form_fields];
      fields[idx] = { ...fields[idx], ...patch };
      return { ...prev, form_fields: fields };
    });
  };

  const addField = () => {
    setDraft((prev: any) => ({
      ...prev,
      form_fields: [...prev.form_fields, { name: 'custom_' + Date.now(), label: 'New Field', required: false, type: 'text' }]
    }));
  };

  const removeField = (idx: number) => {
    setDraft((prev: any) => ({
      ...prev,
      form_fields: prev.form_fields.filter((_: any, i: number) => i !== idx)
    }));
  };

  const addType = () => {
    const t = prompt('Enter batch (e.g. 2024):');
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
     return <div className="p-8 text-center text-rose-400 font-bold uppercase tracking-widest bg-rose-500/5 rounded-3xl border border-rose-500/10">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#0c0c14] via-[#08080c] to-[#0c0c14] border border-white/10 p-10 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gold-500/20 rounded-lg border border-gold-500/30">
                <Settings2 size={16} className="text-gold-400" />
              </div>
              <span className="text-xs font-black text-gold-400 uppercase tracking-widest">Annual Domain</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-3">Annual Batch Model</h2>
            <p className="text-base text-white/40 font-medium max-w-xl italic">Architect the data ingestion matrix for annual sports. Define criteria, custom fields, and access levels.</p>
          </div>

          <button
            onClick={() => setIsEditing(e => !e)}
            className={`px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all border shadow-2xl ${
              isEditing ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' : 'bg-gold-500 text-black border-gold-400 shadow-gold-500/20 hover:scale-105 active:scale-95'
            }`}
          >
            {isEditing ? <><X size={18} /> Discard Protocol</> : <><Settings2 size={18} /> Initialize Override</>}
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl px-6 py-4 text-sm font-bold border animate-in slide-in-from-top-4 duration-500 flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <Eye size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Form Fields */}
        <div className="lg:col-span-8 space-y-8">
          <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-gold-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Building2 size={20} className="text-gold-500" />
                 <h3 className="text-lg font-black text-white tracking-widest uppercase">Field Matrix</h3>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Photo Required:</span>
                 <button 
                   onClick={() => isEditing && setDraft((p: any) => ({ ...p, photo_required: !p.photo_required }))}
                   className={`px-5 py-2 rounded-full text-[10px] font-black transition-all border ${draft.photo_required ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-white/5 text-white/40 border border-white/10'}`}
                 >
                   {draft.photo_required ? 'REQUIRED' : 'OPTIONAL'}
                 </button>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Master Switch:</span>
                 <button 
                   onClick={() => isEditing && setDraft((p: any) => ({ ...p, registration_open: !p.registration_open }))}
                   className={`px-5 py-2 rounded-full text-[10px] font-black transition-all border ${draft.registration_open ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                 >
                   {draft.registration_open ? 'INGESTION ACTIVE' : 'SYSTEM OFFLINE'}
                 </button>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-1 gap-4">
                {draft.form_fields.map((field: any, idx: number) => (
                    <div key={idx} className="group relative flex flex-col md:flex-row gap-6 p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-gold-500/20 transition-all duration-500">
                      <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Field Label</label>
                                <input 
                                  disabled={!isEditing}
                                  value={field.label}
                                  onChange={e => updateField(idx, { label: e.target.value })}
                                  className={inputCls}
                                  placeholder="e.g. Blood Group"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Data Type</label>
                                <select 
                                  disabled={!isEditing}
                                  value={field.type}
                                  onChange={e => updateField(idx, { type: e.target.value })}
                                  className={inputCls}
                                >
                                    <option value="text">Textual / String</option>
                                    <option value="textarea">Extended Text</option>
                                    <option value="tel">Telecommunication</option>
                                    <option value="email">Electronic Mail</option>
                                    <option value="number">Numeric Scalar</option>
                                    <option value="select">Selection Dropdown</option>
                                </select>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 pt-2">
                              <label className="flex items-center gap-3 cursor-pointer group/check">
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${field.required ? 'bg-gold-500 border-gold-500' : 'bg-white/5 border-white/10 group-hover/check:border-gold-500/50'}`}>
                                    {field.required && <Plus size={14} className="text-black rotate-45" />}
                                  </div>
                                  <input 
                                    type="checkbox"
                                    className="hidden"
                                    disabled={!isEditing}
                                    checked={field.required}
                                    onChange={e => updateField(idx, { required: e.target.checked })}
                                  />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${field.required ? 'text-gold-400' : 'text-white/20'}`}>Required Data</span>
                              </label>

                              {field.type === 'select' && (
                                <div className="flex-1">
                                  <input 
                                    disabled={!isEditing}
                                    value={field.options?.join('\n') || ''}
                                    onChange={e => updateField(idx, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                    className={`${inputCls} !py-1 text-[10px] h-8`}
                                    placeholder="Options (one per line)..."
                                  />
                                </div>
                              )}
                          </div>
                      </div>
                      {isEditing && (
                          <button 
                            onClick={() => removeField(idx)}
                            className="p-3 text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 hover:scale-110 transition-all self-center shadow-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                      )}
                    </div>
                ))}
               </div>
               
               {isEditing && (
                  <button 
                    onClick={addField}
                    className="w-full py-6 border-2 border-dashed border-white/5 rounded-3xl text-[10px] font-black text-white/20 uppercase tracking-[0.5em] hover:border-gold-500/40 hover:text-gold-400 hover:bg-gold-500/5 transition-all duration-500"
                  >
                     + Expand Matrix Model
                  </button>
               )}
            </div>
          </div>
        </div>

        {/* Right: Batches & Actions */}
        <div className="lg:col-span-4 space-y-8">
           <div className="rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden shadow-2xl">
             <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-teal-500/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <Sparkles size={20} className="text-teal-400" />
                   <h3 className="text-sm font-black text-white tracking-widest uppercase">Batches</h3>
                </div>
                {isEditing && (
                   <button onClick={addType} className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 hover:bg-teal-500/30 transition-all">
                      <Plus size={16} />
                   </button>
                )}
             </div>
             <div className="p-8 space-y-3">
                {(draft.participant_types || []).map((type: string, idx: number) => (
                   <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                      <div className="flex items-center gap-3">
                        <Users size={14} className="text-teal-500/50" />
                        <span className="text-sm text-white font-bold tracking-tight">{type}</span>
                      </div>
                      {isEditing && (
                         <button onClick={() => removeType(idx)} className="text-rose-500/30 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-all">
                            <Trash2 size={14} />
                         </button>
                      )}
                   </div>
                ))}
             </div>
           </div>

           {isEditing && (
              <div className="bg-gold-500/5 border border-gold-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl"></div>
                 <div className="flex gap-4 text-gold-400 relative z-10">
                    <AlertCircle size={24} className="shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest mb-1">Warning: Production Override</h4>
                      <p className="text-[11px] font-medium leading-[1.6] opacity-60 italic">
                        Deploying these changes will re-map the global registration matrix for all annual events. This action is logged.
                      </p>
                    </div>
                 </div>
                 <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-5 bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-gold-500/20 transition-all disabled:opacity-50 active:scale-95 relative z-10"
                 >
                    {saving ? 'Syncing...' : 'Initiate Deployment'}
                 </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
