import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Wand2, Type } from 'lucide-react';
import { ImageUpload } from '../../ImageUpload';

interface SponsorLogo {
  id: string;
  name: string;
  logo_url: string;
  website?: string;
  enabled: boolean;
  order: number;
}

interface PartnersSectionSettingsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleRemoveLogoBg: (logoId: string) => Promise<void>;
  bgRemoveBusyId: string | null;
  addSponsorLogo: () => void;
  updateSponsorLogo: (id: string, updates: Partial<SponsorLogo>) => void;
  removeSponsorLogo: (id: string) => void;
  moveSponsorLogo: (id: string, direction: 'up' | 'down') => void;
}

export const PartnersSectionSettings: React.FC<PartnersSectionSettingsProps> = ({
  form,
  setForm,
  handleRemoveLogoBg,
  bgRemoveBusyId,
  addSponsorLogo,
  updateSponsorLogo,
  removeSponsorLogo,
  moveSponsorLogo
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold text-white">Partners & Sponsors</h4>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.featured_partners_enabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.featured_partners_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <input
            type="checkbox"
            checked={form.featured_partners_enabled}
            onChange={(e) => setForm(prev => ({ ...prev, featured_partners_enabled: e.target.checked }))}
            className="hidden"
          />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Title</label>
          <input
            type="text"
            value={form.sponsor_section_title || ''}
            onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_title: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold"
            placeholder="OUR PARTNERS"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Section Subtitle</label>
          <input
            type="text"
            value={form.sponsor_section_subtitle || ''}
            onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_subtitle: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
            placeholder="Powered by industry leaders"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Animation Speed (px/sec)</label>
          <input
            type="number"
            min={1}
            max={800}
            value={form.sponsors_belt_speed_px_per_sec || ''}
            onChange={(e) => setForm(prev => ({ ...prev, sponsors_belt_speed_px_per_sec: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Scroll Direction</label>
          <select
            value={form.sponsors_belt_direction}
            onChange={(e) => setForm(prev => ({ ...prev, sponsors_belt_direction: (e.target.value as 'left' | 'right') }))}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
          >
            <option value="left" className="bg-gray-900">Left</option>
            <option value="right" className="bg-gray-900">Right</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sponsor Logos</label>
          <button
            type="button"
            onClick={addSponsorLogo}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/30 transition-all text-xs font-bold"
          >
            <Plus size={14} /> Add Sponsor
          </button>
        </div>

        <div className="grid gap-4">
          {form.sponsor_logos.map((logo: SponsorLogo, index: number) => (
            <div key={logo.id} className="group p-5 rounded-2xl border border-white/5 bg-black/40 hover:bg-black/60 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-indigo-500/20">
                    {index + 1}
                  </div>
                  <span className="text-sm font-bold text-white uppercase tracking-wider">{logo.name || 'New Sponsor'}</span>
                </div>
                <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveSponsorLogo(logo.id, 'up')} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-20"><ArrowUp size={16} /></button>
                  <button onClick={() => moveSponsorLogo(logo.id, 'down')} disabled={index === form.sponsor_logos.length - 1} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-20"><ArrowDown size={16} /></button>
                  <button onClick={() => removeSponsorLogo(logo.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={logo.name}
                      onChange={(e) => updateSponsorLogo(logo.id, { name: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Website URL</label>
                    <input
                      type="url"
                      value={logo.website || ''}
                      onChange={(e) => updateSponsorLogo(logo.id, { website: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/30"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group mt-2">
                    <div className={`w-8 h-5 rounded-full p-1 transition-colors duration-300 ${logo.enabled ? 'bg-indigo-500' : 'bg-white/10'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${logo.enabled ? 'translate-x-3' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      checked={logo.enabled}
                      onChange={(e) => updateSponsorLogo(logo.id, { enabled: e.target.checked })}
                      className="hidden"
                    />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visibility</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Logo Image</label>
                  <ImageUpload
                    onImageSelect={(url) => updateSponsorLogo(logo.id, { logo_url: url })}
                    currentImage={logo.logo_url}
                    bucket="sponsor-logos"
                    folder="homepage-sponsors"
                    acceptedTypes="image/*"
                    fileTypeLabel="PNG, JPG, SVG"
                    className="h-28"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLogoBg(logo.id)}
                    disabled={!logo.logo_url || bgRemoveBusyId === logo.id}
                    className={`
                      w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all
                      ${!logo.logo_url || bgRemoveBusyId === logo.id
                        ? 'bg-gray-800/50 text-gray-600 border-white/5 cursor-not-allowed'
                        : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                      }
                    `}
                  >
                    <Wand2 size={12} />
                    {bgRemoveBusyId === logo.id ? 'Processing...' : 'Auto Remove Background'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {form.sponsor_logos.length === 0 && (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
              <p className="text-gray-500 text-sm font-medium">No sponsors added yet. Click "Add Sponsor" to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
