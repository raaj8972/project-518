import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Trophy, Users, ExternalLink, Lock, Unlock, Settings, AlignLeft, Hash, Phone, Mail, ChevronDown } from 'lucide-react';
import { useAnnualSports } from '../../context/AnnualSportsContext';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { AnnualSportsEvent } from '../../types/data';

const inputCls = 'w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20 focus:bg-white/[0.08] transition-all shadow-inner';
const labelCls = 'block text-[11px] font-black text-gold-500/60 uppercase tracking-[0.2em] mb-2.5 ml-1';

export const AnnualEventsManagement: React.FC = () => {
  const { siteSettings } = useData() as any;
  const { annualEvents, addAnnualEvent, updateAnnualEvent, deleteAnnualEvent } = useAnnualSports();
  const savingProgress = useSavingProgress();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const getInitialForm = (): Partial<AnnualSportsEvent> => ({
    name: '',
    category: '',
    description: '',
    image_url: '',
    rules_url: '',
    registration_open: true,
    min_participants: 1,
    max_participants: 1,
    registration_limit: null,
    registration_participant_types: siteSettings?.annual_registration_config?.participant_types || ['Student', 'Faculty'],
    registration_participant_quotas: {},
    registration_timer_enabled: false,
    registration_opens_at: null,
    registration_closes_at: null,
    registration_default_mode: (siteSettings?.annual_registration_config?.registration_default_mode || 'individual') as 'individual' | 'team',
    registration_mode_locked: false,
    team_min_members: 1,
    custom_fields: siteSettings?.annual_registration_config?.form_fields?.filter((f: any) => !['fullName', 'email', 'phone', 'college', 'department', 'year', 'rollNo'].includes(f.name)) || [],
    fee: 0,
    visible: true,
    display_teams: true,
    display_schedule: true,
    require_leader_photo: false,
    require_team_photo: false,
    require_player_photo: false,
    require_team_individual_photos: false
  });

  const [form, setForm] = useState<Partial<AnnualSportsEvent>>(getInitialForm());

  const [newParticipantType, setNewParticipantType] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState<any>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    options: []
  });

  const resetForm = () => {
    setForm(getInitialForm());
    setNewParticipantType('');
    setIsAddingField(false);
    setNewField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      options: []
    });
  };

  const handleSave = async () => {
    if (!form.name) {
      alert('Event name is required');
      return;
    }

    try {
      const steps = savingProgress.withSteps(1, 'Saving event...');
      steps.next('Updating database');
      
      if (editingId) {
        await updateAnnualEvent(editingId, form);
      } else {
        await addAnnualEvent(form);
      }
      
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert(`Error saving event: ${err.message}`);
    } finally {
      savingProgress.done();
    }
  };

  const startEdit = (event: AnnualSportsEvent) => {
    setForm(event);
    setEditingId(event.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all registrations associated with it.')) return;
    try {
      const steps = savingProgress.withSteps(1, 'Deleting event...');
      steps.next('Removing from database');
      await deleteAnnualEvent(id);
    } catch (err: any) {
      alert(`Error deleting event: ${err.message}`);
    } finally {
      savingProgress.done();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Annual Sports Events</h2>
          <p className="text-white/50 text-sm">Manage sports and events for the Annual Sports Mode.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="px-4 py-2 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center border border-gold-500/20 shadow-lg shadow-gold-500/5"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Event
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 md:p-8 border border-gold-500/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-500 to-amber-400 opacity-50"></div>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center">
              {editingId ? 'Edit Annual Event' : 'Add New Annual Event'}
            </h3>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }} 
              className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={labelCls}>Event Name *</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className={inputCls} 
                placeholder="e.g. 100m Sprint, Chess Tournament" 
              />
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select 
                value={form.category || ''} 
                onChange={e => setForm({...form, category: e.target.value})} 
                className={inputCls}
              >
                <option value="">Select Category</option>
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Registration Fee ($)</label>
              <input 
                type="number" 
                value={form.fee} 
                onChange={e => setForm({...form, fee: parseFloat(e.target.value) || 0})} 
                className={inputCls} 
                placeholder="0.00" 
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea 
                value={form.description || ''} 
                onChange={e => setForm({...form, description: e.target.value})} 
                className={`${inputCls} min-h-[100px] resize-none`} 
                placeholder="Briefly describe the event rules or details..."
              />
            </div>

            {/* Standard Registration Settings */}
            <div className="md:col-span-2 grid md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
              {/* Participant Types & Quotas */}
              <div className="space-y-6">
                <div>
                  <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    <Users className="w-3.5 h-3.5 text-gold-500" />
                    Participant Types & Quotas
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(form.registration_participant_types || []).map(type => (
                        <div key={type} className="group flex items-center bg-gold-500/10 border border-gold-500/30 rounded-lg overflow-hidden">
                          <span className="px-3 py-1.5 text-[10px] font-bold text-gold-400 uppercase tracking-wider">{type}</span>
                          <button
                            onClick={() => {
                              const types = form.registration_participant_types || [];
                              const newTypes = types.filter(t => t !== type);
                              const quotas = { ...(form.registration_participant_quotas || {}) };
                              delete quotas[type];
                              setForm({ 
                                ...form, 
                                registration_participant_types: newTypes,
                                registration_participant_quotas: quotas 
                              });
                            }}
                            className="px-2 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border-l border-gold-500/30 transition-all"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new type (e.g. Alumni)"
                        value={newParticipantType}
                        onChange={e => setNewParticipantType(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newParticipantType.trim()) {
                            e.preventDefault();
                            const types = form.registration_participant_types || [];
                            if (!types.includes(newParticipantType.trim())) {
                              setForm({ ...form, registration_participant_types: [...types, newParticipantType.trim()] });
                            }
                            setNewParticipantType('');
                          }
                        }}
                        className={`${inputCls} !py-1.5 !px-3 text-xs`}
                      />
                      <button
                        onClick={() => {
                          if (!newParticipantType.trim()) return;
                          const types = form.registration_participant_types || [];
                          if (!types.includes(newParticipantType.trim())) {
                            setForm({ ...form, registration_participant_types: [...types, newParticipantType.trim()] });
                          }
                          setNewParticipantType('');
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {form.registration_participant_types && form.registration_participant_types.length > 0 && (
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Type-Specific Quotas (Optional)</label>
                        {form.registration_participant_types.map(type => (
                          <div key={type} className="flex items-center justify-between gap-4">
                            <span className="text-xs text-white/60">{type}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="∞"
                                value={form.registration_participant_quotas?.[type] || ''}
                                onChange={e => {
                                  const quotas = { ...(form.registration_participant_quotas || {}) };
                                  if (e.target.value) {
                                    quotas[type] = parseInt(e.target.value);
                                  } else {
                                    delete quotas[type];
                                  }
                                  setForm({ ...form, registration_participant_quotas: quotas });
                                }}
                                className={`${inputCls} !py-1.5 !px-3 w-20 text-center font-mono`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Settings */}
                <div className="pt-6 border-t border-white/5">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    <Users className="w-3.5 h-3.5 text-gold-500" />
                    Registration Mode
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="reg_mode"
                          checked={form.registration_default_mode === 'individual'}
                          onChange={() => setForm({ ...form, registration_default_mode: 'individual' })}
                          className="w-3 h-3 bg-white/5 border-white/10 text-gold-500 focus:ring-0"
                        />
                        <span className={`text-[10px] font-bold uppercase transition-colors ${form.registration_default_mode === 'individual' ? 'text-gold-400' : 'text-white/40 group-hover:text-white/60'}`}>Individual</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="reg_mode"
                          checked={form.registration_default_mode === 'team'}
                          onChange={() => setForm({ ...form, registration_default_mode: 'team' })}
                          className="w-3 h-3 bg-white/5 border-white/10 text-gold-500 focus:ring-0"
                        />
                        <span className={`text-[10px] font-bold uppercase transition-colors ${form.registration_default_mode === 'team' ? 'text-gold-400' : 'text-white/40 group-hover:text-white/60'}`}>Team</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setForm({ ...form, registration_mode_locked: !form.registration_mode_locked })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          form.registration_mode_locked ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 hover:text-white/50'
                        }`}
                      >
                        {form.registration_mode_locked ? <Lock size={12} /> : <Unlock size={12} />}
                        {form.registration_mode_locked ? 'Locked' : 'Unlocked'}
                      </button>
                      <span className="text-[9px] text-white/20 italic">When locked, users cannot switch mode.</span>
                    </div>

                    {form.registration_default_mode === 'team' && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="text-[9px] font-black text-white/30 uppercase block mb-1.5">Min Members</label>
                          <input
                            type="number"
                            value={form.team_min_members || 1}
                            onChange={e => setForm({ ...form, team_min_members: parseInt(e.target.value) || 1 })}
                            className={inputCls}
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-white/30 uppercase block mb-1.5">Max Members</label>
                          <input
                            type="number"
                            value={form.team_max_members || 1}
                            onChange={e => setForm({ ...form, team_max_members: parseInt(e.target.value) || 1 })}
                            className={inputCls}
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
        
              {/* Timing & Logistics */}

              {/* Custom Form Fields */}
              <div className="md:col-span-2 pt-10 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <Settings className="w-3.5 h-3.5 text-gold-500" />
                      Custom Registration Fields
                    </h4>
                    <p className="text-[9px] text-white/30 mt-1">Add extra fields like 'Batch Year', 'Hostel', 'T-shirt Size' etc.</p>
                  </div>
                  <button
                    onClick={() => setIsAddingField(true)}
                    className="px-3 py-1.5 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-gold-500/30"
                  >
                    Add Field
                  </button>
                </div>

                <div className="space-y-4">
                  {(form.custom_fields || []).map((field, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 group/field relative overflow-hidden transition-all hover:bg-white/[0.04]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                            {field.type === 'text' && <AlignLeft size={18} className="text-blue-400" />}
                            {field.type === 'select' && <ChevronDown size={18} className="text-purple-400" />}
                            {field.type === 'number' && <Hash size={18} className="text-emerald-400" />}
                            {field.type === 'tel' && <Phone size={18} className="text-orange-400" />}
                            {field.type === 'email' && <Mail size={18} className="text-indigo-400" />}
                            {field.type === 'textarea' && <AlignLeft size={18} className="text-amber-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-white font-bold">{field.label}</h5>
                              {field.required && <span className="text-[8px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-black uppercase tracking-tighter">Required</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-white/30 font-black uppercase tracking-[0.1em]">{field.type}</span>
                              <span className="text-white/10">•</span>
                              <span className="text-[9px] text-white/30 font-black uppercase tracking-[0.1em]">{field.name}</span>
                            </div>
                            {field.options && field.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {field.options.map(opt => (
                                  <span key={opt} className="px-2 py-0.5 bg-white/5 text-[8px] text-white/40 rounded border border-white/10">{opt}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const fields = [...(form.custom_fields || [])];
                            fields.splice(idx, 1);
                            setForm({ ...form, custom_fields: fields });
                          }}
                          className="p-2 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {isAddingField && (
                    <div className="bg-[#0f0f18] border-2 border-dashed border-gold-500/20 rounded-2xl p-6 animate-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 text-[10px] font-black text-gold-500 uppercase tracking-widest mb-2">Configure New Field</div>
                        
                        <div>
                          <label className={labelCls}>Field Label</label>
                          <input
                            type="text"
                            placeholder="e.g. T-Shirt Size"
                            value={newField.label}
                            onChange={e => {
                              const label = e.target.value;
                              const name = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                              setNewField({ ...newField, label, name });
                            }}
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Field Type</label>
                          <select
                            value={newField.type}
                            onChange={e => setNewField({ ...newField, type: e.target.value })}
                            className={inputCls}
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Paragraph</option>
                            <option value="number">Number</option>
                            <option value="tel">Phone Number</option>
                            <option value="email">Email</option>
                            <option value="select">Dropdown (Select Box)</option>
                          </select>
                        </div>

                        {newField.type === 'select' && (
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Options (One per line)</label>
                            <textarea
                              placeholder="XS&#10;S&#10;M&#10;L&#10;XL"
                              onChange={e => setNewField({ ...newField, options: e.target.value.split('\n').filter(o => o.trim()) })}
                              className={`${inputCls} min-h-[80px]`}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                          <input
                            type="checkbox"
                            id="fieldRequired"
                            checked={newField.required}
                            onChange={e => setNewField({ ...newField, required: e.target.checked })}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-500"
                          />
                          <label htmlFor="fieldRequired" className="text-xs font-bold text-white/50 uppercase tracking-wider cursor-pointer">Required Field</label>
                        </div>

                        <div className="flex justify-end gap-3 sm:col-span-2 mt-4 pt-4 border-t border-white/5">
                          <button
                            onClick={() => setIsAddingField(false)}
                            className="px-4 py-2 text-xs font-bold text-white/40 uppercase hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!newField.label || !newField.name) return;
                              setForm({ 
                                ...form, 
                                custom_fields: [...(form.custom_fields || []), newField] 
                              });
                              setIsAddingField(false);
                              setNewField({ name: '', label: '', type: 'text', required: false, options: [] });
                            }}
                            className="px-6 py-2 bg-gold-500 text-black rounded-xl text-xs font-black uppercase shadow-lg shadow-gold-500/20 active:scale-95"
                          >
                            Add This Field
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Event Image</label>
              <ImageUpload
                currentImage={form.image_url || ''}
                onImageSelect={(url) => setForm({ ...form, image_url: url })}
                bucket="event-images"
                folder="annual"
                enableCropper={true}
                cropAspect={16/9}
              />
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <input 
                type="checkbox" 
                id="regOpen" 
                checked={form.registration_open} 
                onChange={e => setForm({...form, registration_open: e.target.checked})}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-gold-500 focus:ring-gold-500/50"
              />
              <label htmlFor="regOpen" className="text-sm font-medium text-white/70">Manually Open Registration</label>
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <input 
                type="checkbox" 
                id="isVisible" 
                checked={form.visible} 
                onChange={e => setForm({...form, visible: e.target.checked})}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
              />
              <label htmlFor="isVisible" className="text-sm font-medium text-white/70">Show Event to Users</label>
            </div>

            {/* Display Configurations */}
            <div className="md:col-span-2 mt-4 mb-2">
              <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Display Configurations</h4>
            </div>
            
            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <input 
                type="checkbox" 
                id="displayTeams" 
                checked={form.display_teams !== false} 
                onChange={e => setForm({...form, display_teams: e.target.checked})}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
              />
              <label htmlFor="displayTeams" className="text-sm font-medium text-white/70">Show Players/Teams Tab</label>
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
              <input 
                type="checkbox" 
                id="displaySchedule" 
                checked={form.display_schedule !== false} 
                onChange={e => setForm({...form, display_schedule: e.target.checked})}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
              />
              <label htmlFor="displaySchedule" className="text-sm font-medium text-white/70">Show Schedule Tab</label>
            </div>

            {/* Photo Requirements */}
            <div className="md:col-span-2 mt-4 mb-2">
              <h4 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Photo Requirements (Registration)</h4>
            </div>

            {form.registration_default_mode === 'individual' || (!form.registration_mode_locked && form.registration_participant_types?.some(t => t.toLowerCase() !== 'team')) ? (
              <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <input 
                  type="checkbox" 
                  id="reqPlayerPhoto" 
                  checked={form.require_player_photo} 
                  onChange={e => setForm({...form, require_player_photo: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                />
                <label htmlFor="reqPlayerPhoto" className="text-sm font-medium text-white/70">Allow/Require Player Photo</label>
              </div>
            ) : null}

            {form.registration_default_mode === 'team' || (!form.registration_mode_locked && form.registration_participant_types?.some(t => t.toLowerCase() === 'team')) ? (
              <>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <input 
                    type="checkbox" 
                    id="reqLeaderPhoto" 
                    checked={form.require_leader_photo} 
                    onChange={e => setForm({...form, require_leader_photo: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                  />
                  <label htmlFor="reqLeaderPhoto" className="text-sm font-medium text-white/70">Allow/Require Leader Photo</label>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <input 
                    type="checkbox" 
                    id="reqTeamPhoto" 
                    checked={form.require_team_photo} 
                    onChange={e => setForm({...form, require_team_photo: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                  />
                  <label htmlFor="reqTeamPhoto" className="text-sm font-medium text-white/70">Allow/Require Team Logo</label>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  <input 
                    type="checkbox" 
                    id="reqIndividualTeamPhotos" 
                    checked={form.require_team_individual_photos} 
                    onChange={e => setForm({...form, require_team_individual_photos: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                  />
                  <label htmlFor="reqIndividualTeamPhotos" className="text-sm font-medium text-white/70">Allow/Require Individual Member Photos</label>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }} 
              className="px-6 py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="px-6 py-2.5 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </div>
        </div>
      )}

      {isAdding && <div className="my-12 border-b border-white/5" />}

      {annualEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
          {annualEvents.map((event) => (
            <div key={event.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:bg-white/[0.04] transition-all duration-300">
              <div className="aspect-video relative overflow-hidden">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-white/10" />
                  </div>
                )}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${event.registration_open ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                  {event.registration_open ? 'Open' : 'Closed'}
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-gold-500/10 text-[9px] font-black text-gold-500 uppercase tracking-widest border border-gold-500/20">{event.category || 'Event'}</span>
                    <span className="text-sm font-black text-white/80">${event.fee || '0'}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white line-clamp-1">{event.name}</h3>
                </div>

                  <div className="flex items-center gap-4 text-[10px] text-white/40">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.min_participants !== undefined && event.max_participants !== undefined && (
                      event.min_participants === event.max_participants 
                        ? `${event.min_participants} Player${event.min_participants > 1 ? 's' : ''}`
                        : `${event.min_participants}-${event.max_participants} Players`
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(!event.registration_participant_types || event.registration_participant_types.length === 0) ? (
                      <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/40 flex items-center gap-1">
                        <Settings className="w-2.5 h-2.5" />
                        Default Participants
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded px-1.5 py-0.5">
                        {event.registration_participant_types.length} Types
                      </span>
                    )}

                    {(!event.custom_fields || event.custom_fields.length === 0) ? (
                      <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/40 flex items-center gap-1">
                        <Settings className="w-2.5 h-2.5" />
                        Default Fields
                      </span>
                    ) : (
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded px-1.5 py-0.5">
                        {event.custom_fields.length} Extra Fields
                      </span>
                    )}
                  </div>
                  {event.rules_url && (
                    <a href={event.rules_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-gold-400 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      Rules
                    </a>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button 
                    onClick={() => updateAnnualEvent(event.id, { registration_open: !event.registration_open })} 
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all border ${
                      event.registration_open 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {event.registration_open ? (
                      <><Lock className="w-3.5 h-3.5 mr-2" /> Close Reg</>
                    ) : (
                      <><Unlock className="w-3.5 h-3.5 mr-2" /> Open Reg</>
                    )}
                  </button>
                  <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        event.visible
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {event.visible ? 'Visible' : 'Hidden'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(event)}
                          className="p-2 text-white/30 hover:text-gold-400 hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAdding && annualEvents.length === 0 && (
        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
          <Trophy className="w-16 h-16 text-white/5 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No annual events found. Create your first one to get started.</p>
        </div>
      )}
    </div>
  );
};
