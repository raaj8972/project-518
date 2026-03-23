import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, MapPin, Clock, Users,
  AlertCircle, Settings,
  Image as ImageIcon, FileText, Link
} from 'lucide-react';
import { ImageUpload } from '../../ImageUpload';
import { VideoUpload } from '../../VideoUpload';
import { EventAIGenerator, EventFormState } from './EventAIGenerator';
import { StructuredRulesEditor } from './StructuredRulesEditor';
import { RuleSection } from '../../../utils/rulesUtils';

interface Staff {
  name: string;
  phone?: string | null;
}

export interface EventFormProps {
  initialData: EventFormState;
  initialRulesSections: RuleSection[];
  initialCoordinators: Staff[];
  isEditing: boolean;
  eventCategories: { id: string; name: string }[];
  onSave: (data: EventFormState, rulesSections: RuleSection[], coordinators: Staff[]) => void;
  onCancel: () => void;
}

type TabKey = 'general' | 'media' | 'registration' | 'rules' | 'staff';

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  initialRulesSections,
  initialCoordinators,
  isEditing,
  eventCategories,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [formData, setFormData] = useState<EventFormState>(initialData);
  const [rulesSections, setRulesSections] = useState<RuleSection[]>(initialRulesSections);
  const [draftCoordinators, setDraftCoordinators] = useState<Staff[]>(initialCoordinators);
  const [newCoordinator, setNewCoordinator] = useState({ name: '', phone: '' });

  useEffect(() => {
    setFormData(initialData);
    setRulesSections(initialRulesSections);
    setDraftCoordinators(initialCoordinators);
  }, [initialData, initialRulesSections, initialCoordinators]);

  const handleAiGenerated = (data: Partial<EventFormState>) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      category: data.category || prev.category,
      description: data.description || prev.description,
      date: data.date || prev.date,
      time: data.time || prev.time,
      venue: data.venue || prev.venue,
      max_participants: data.max_participants || prev.max_participants,
      highlights: data.highlights && data.highlights.length > 0 ? data.highlights : prev.highlights,
    }));
    
    if (data.rules && data.rules.length > 0) {
      setRulesSections([{
        heading: "Event Guidelines",
        blocks: [{ kind: 'points', style: 'number', title: "General Rules", items: data.rules }]
      }]);
    }
  };

  const updateField = (field: keyof EventFormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addHighlight = () => updateField('highlights', [...formData.highlights, '']);
  const updateHighlight = (idx: number, val: string) => updateField('highlights', formData.highlights.map((h, i) => i === idx ? val : h));
  const removeHighlight = (idx: number) => updateField('highlights', formData.highlights.filter((_, i) => i !== idx));

  return (
    <div className="bg-black/40 border border-white/5 shadow-2xl rounded-[2rem] p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-x-1/4 -translate-y-1/4 blur-[100px]"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
            {isEditing ? <Settings className="w-6 h-6 text-purple-400" /> : <Plus className="w-6 h-6 text-purple-400" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{isEditing ? 'Edit Event' : 'Add New Festival Event'}</h3>
            <p className="text-sm text-gray-400 mt-1">{isEditing ? 'Update event parameters' : 'Configure all parameters for your new event'}</p>
          </div>
        </div>
        
        <EventAIGenerator onGenerated={handleAiGenerated} />
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 custom-scrollbar relative z-10">
        {[
          { id: 'general', label: 'General Info', icon: FileText },
          { id: 'media', label: 'Media Assets', icon: ImageIcon },
          { id: 'registration', label: 'Registration & Logistics', icon: Users },
          { id: 'rules', label: 'Rules & Highlights', icon: AlertCircle },
          { id: 'staff', label: 'Staff & Team', icon: Link }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-black/20 text-gray-500 hover:bg-black/40 hover:text-white border border-white/5'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* FORM CONTENT */}
      <div className="space-y-8 relative z-10 min-h-[400px]">
        {activeTab === 'general' && (
          <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="e.g., Battle of Bands"
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all font-bold"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => updateField('category', e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all appearance-none"
                  >
                    <option value="" className="bg-[#181824]">Select</option>
                    {eventCategories.map(c => <option key={c.id} value={c.name} className="bg-[#181824]">{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 mt-auto pb-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={formData.is_workshop || false} 
                        onChange={e => updateField('is_workshop', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-black/40 border border-white/10 rounded-full peer-checked:bg-purple-500/20 peer-checked:border-purple-500/50 transition-all shadow-inner" />
                      <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-purple-400 transition-all shadow-md" />
                    </div>
                    <span className="text-xs text-gray-400 font-bold tracking-wider group-hover:text-gray-300">Is Workshop</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Watch Live URL (Optional)</label>
                <input
                  type="url"
                  value={formData.watch_live_url || ''}
                  onChange={e => updateField('watch_live_url', e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all font-mono text-sm"
                />
              </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Description *</label>
                <textarea
                  value={formData.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Describe the magic of this event..."
                  rows={5}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all leading-relaxed"
                />
              </div>
            </div>
            <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-6">
               <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time & Location</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => updateField('date', e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Start/End Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={e => updateField('time', e.target.value)}
                    placeholder="e.g., 10:00 AM - 2:00 PM"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Venue</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={e => updateField('venue', e.target.value)}
                      placeholder="Main Auditorium"
                      className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600 transition-all"
                    />
                  </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Event Poster (Image)</label>
                  <ImageUpload
                    currentImage={formData.image}
                    onImageSelect={(url: string) => updateField('image', url)}
                    bucket="event-images"
                  />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Motion Poster (Video - Max 10MB)</label>
                  <VideoUpload
                    currentVideo={formData.motion_poster_url || ''}
                    onVideoSelect={(url: string) => updateField('motion_poster_url', url)}
                    bucket="event-videos"
                  />
                  {formData.motion_poster_url && (
                    <div className="mt-4 flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={formData.motion_poster_autoplay || false} 
                            onChange={e => updateField('motion_poster_autoplay', e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-black/40 border border-white/10 rounded-full peer-checked:bg-purple-500/20 peer-checked:border-purple-500/50 transition-all shadow-inner" />
                          <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-purple-400 transition-all shadow-md" />
                        </div>
                        <span className="text-xs text-gray-400 font-bold tracking-wider group-hover:text-gray-300">Autoplay when scrolled into view</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registration' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visibility & Access</h4>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={formData.registration_open} 
                          onChange={e => updateField('registration_open', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-black/40 border border-white/10 rounded-full peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500/50 transition-all shadow-inner" />
                        <div className="absolute top-[2px] left-[2px] w-5 h-5 bg-gray-400 rounded-full peer-checked:translate-x-5 peer-checked:bg-emerald-400 transition-all shadow-md" />
                      </div>
                      <span className="text-xs text-gray-400 font-bold tracking-wider group-hover:text-gray-300">Registration Open</span>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Capacity (Max Participants)</label>
                      <input
                        type="number"
                        value={formData.max_participants || ''}
                        onChange={e => updateField('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Unlimited"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">WhatsApp Group Link</label>
                      <input
                        type="url"
                        value={formData.whatsapp_group_link || ''}
                        onChange={e => updateField('whatsapp_group_link', e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Size Limits</h4>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Min Members Per Team</label>
                      <input
                        type="number"
                        value={formData.team_min_members || ''}
                        onChange={e => updateField('team_min_members', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="1"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Max Members Per Team</label>
                      <input
                        type="number"
                        value={formData.team_max_members || ''}
                        onChange={e => updateField('team_max_members', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="1"
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-6 h-fit">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Registration Timer</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={formData.registration_timer_enabled} 
                        onChange={e => updateField('registration_timer_enabled', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-black/40 border border-white/10 rounded-full peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500/50 transition-all shadow-inner" />
                      <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-indigo-400 transition-all shadow-md" />
                    </div>
                  </label>
                </div>

                <div className={`space-y-6 transition-all ${formData.registration_timer_enabled ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Starts At (IST)</label>
                    <input
                      type="datetime-local"
                      value={formData.registration_opens_at || ''}
                      onChange={e => updateField('registration_opens_at', e.target.value)}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white transition-all font-mono"
                    />
                  </div>
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <p className="text-[10px] text-indigo-300 leading-relaxed font-medium">
                      <AlertCircle size={10} className="inline mr-1 mb-0.5" />
                      When enabled, registration will automatically unlock at this time regardless of the "Open" toggle status above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-black/20 border border-white/5 rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                     <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">Structured Guidelines</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Configure sections, bullet points and details</p>
                  </div>
                </div>
              </div>

              <StructuredRulesEditor
                sections={rulesSections}
                onChange={setRulesSections}
              />
            </div>

            <div className="bg-black/20 border border-white/5 rounded-[1.5rem] p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Key Highlights</h4>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {formData.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2 group animate-in zoom-in-95 duration-200">
                    <input
                      type="text"
                      value={h}
                      onChange={e => updateHighlight(i, e.target.value)}
                      placeholder="e.g., Prize pool of 50K"
                      className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-sm text-white placeholder-gray-700 transition-all font-bold"
                    />
                    <button onClick={() => removeHighlight(i)} className="p-2.5 text-gray-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={addHighlight} className="flex items-center justify-center gap-2 p-3 border border-white/5 border-dashed rounded-xl text-xs font-bold text-gray-500 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all">
                  <Plus size={14} /> Add Highlight
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                       <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Event Coordinators</h4>
                  </div>

                  <div className="space-y-3 mb-6">
                    {draftCoordinators.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center text-[10px] font-black text-blue-300 border border-blue-500/20">
                              {c.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{c.phone || 'No phone provided'}</p>
                           </div>
                        </div>
                        <button onClick={() => setDraftCoordinators(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {draftCoordinators.length === 0 && (
                      <div className="text-center py-8 border border-white/5 border-dashed rounded-2xl">
                         <p className="text-xs text-gray-600 font-medium">No coordinators added yet</p>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Coordinator Name"
                        value={newCoordinator.name}
                        onChange={e => setNewCoordinator(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                       <input
                        type="tel"
                        placeholder="Phone Number"
                        value={newCoordinator.phone}
                        onChange={e => setNewCoordinator(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (newCoordinator.name.trim()) {
                          setDraftCoordinators(prev => [...prev, { name: newCoordinator.name.trim(), phone: newCoordinator.phone.trim() || null }]);
                          setNewCoordinator({ name: '', phone: '' });
                        }
                      }}
                      className="px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-rose-500 rounded-full" />
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Access Control</h4>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Coordinator Access Pin</label>
                    <input
                      type="text"
                      value={formData.coordinator_password || ''}
                      onChange={e => updateField('coordinator_password', e.target.value)}
                      placeholder="e.g., 5566"
                      maxLength={8}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-white transition-all font-mono tracking-[0.5em] text-center text-lg"
                    />
                    <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
                      Custom password for coordinators to access the scanner app and manage entries for this specific event.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="text-right mt-8 pt-8 border-t border-white/5">
           <button onClick={onCancel} className="px-6 py-2.5 border border-white/10 text-gray-400 rounded-xl mr-4 hover:bg-white/5 font-bold">Cancel</button>
           <button onClick={() => onSave(formData, rulesSections, draftCoordinators)} className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-transform">Save Event</button>
        </div>
      </div>
    </div>
  );
};
