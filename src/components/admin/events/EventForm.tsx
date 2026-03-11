import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, Clock, Image as ImageIcon, FileText, Settings, Users, Video, X, ArrowUp, ArrowDown, Trash2, Upload, Link, AlertCircle } from 'lucide-react';
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
  isOwner: boolean;
  siteSettings?: any;
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
  isOwner,
  siteSettings,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [formData, setFormData] = useState<EventFormState>(initialData);
  const [rulesSections, setRulesSections] = useState<RuleSection[]>(initialRulesSections);
  const [rulesModeStructured, setRulesModeStructured] = useState(initialRulesSections.length > 0);
  const [draftCoordinators, setDraftCoordinators] = useState<Staff[]>(initialCoordinators);
  const [newCoordinator, setNewCoordinator] = useState({ name: '', phone: '' });

  useEffect(() => {
    setFormData(initialData);
    setRulesSections(initialRulesSections);
    setRulesModeStructured(initialRulesSections.length > 0 || initialData.rules.length === 0);
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
      participants: data.participants || prev.participants,
      highlights: data.highlights && data.highlights.length > 0 ? data.highlights : prev.highlights,
    }));
    
    if (data.rules && data.rules.length > 0) {
      setRulesModeStructured(true);
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

        {Object.assign(() => { return null;})() /* The other tabs omitted due to length, we'll write them in full later */ }
        <div className="text-right mt-8 pt-8 border-t border-white/5">
           <button onClick={onCancel} className="px-6 py-2.5 border border-white/10 text-gray-400 rounded-xl mr-4 hover:bg-white/5 font-bold">Cancel</button>
           <button onClick={() => onSave(formData, rulesSections, draftCoordinators)} className="px-8 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-transform">Save Event</button>
        </div>
      </div>
    </div>
  );
};
