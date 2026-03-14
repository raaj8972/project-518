import React from 'react';
import { Type, FileText } from 'lucide-react';

interface HeroContentSettingsProps {
  form: {
    hero_title: string;
    hero_subtitle: string;
    hero_description: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const HeroContentSettings: React.FC<HeroContentSettingsProps> = ({ form, setForm }) => {
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-bold text-white mb-4">Hero Copy</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Title</label>
          <div className="relative group">
            <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              value={form.hero_title}
              onChange={(e) => setForm(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="RICORRENZA"
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold tracking-wide"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Subtitle</label>
          <div className="relative group">
            <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              value={form.hero_subtitle}
              onChange={(e) => setForm(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="Experience the Future"
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hero Description</label>
          <div className="relative group">
            <FileText className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
            <textarea
              value={form.hero_description}
              onChange={(e) => setForm(prev => ({ ...prev, hero_description: e.target.value }))}
              placeholder="Experience the future of Healthcare, Technology, and Creativity"
              rows={4}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
