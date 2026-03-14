import React from 'react';
import { ImageUpload } from '../../ImageUpload';

interface BrandingSettingsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  saveBranding: () => Promise<void>;
  resetBrandingDraft: () => void;
  savingBranding: boolean;
  savingPage: boolean;
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  form,
  setForm,
  saveBranding,
  resetBrandingDraft,
  savingBranding,
  savingPage,
  setMessage
}) => {
  const clamp = (v: any, min: number, max: number) => (typeof v === 'number' && !isNaN(v) ? Math.min(max, Math.max(min, v)) : null);

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-bold text-white mb-4">Event Branding</h4>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand Year</label>
          <input
            type="number"
            min={2000}
            max={2999}
            value={form.brand_year ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
              setForm(prev => ({ ...prev, brand_year: val }));
            }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            placeholder={`${new Date().getFullYear()}`}
          />
          <p className="text-xs text-gray-500 mt-1">Draft only. Click “Save Branding” to apply.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand Logo (PNG)</label>
          <ImageUpload
            onImageSelect={(url) => {
              setForm(prev => ({ ...prev, brand_logo_url: url }));
              setMessage({ type: 'success', text: 'Logo selected. Click Save Branding to apply.' });
              setTimeout(() => setMessage(null), 2000);
            }}
            currentImage={form.brand_logo_url}
            bucket="hero-media"
            folder="brand"
            acceptedTypes="image/png,image/webp,image/jpeg"
            fileTypeLabel="PNG/JPG/WEBP up to 5MB (PNG preferred for transparency)"
            enableCropper={false}
            autoSave={true}
          />
          {form.brand_logo_url && (
            <button
              type="button"
              className="mt-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              onClick={() => {
                setForm(prev => ({ ...prev, brand_logo_url: '' }));
                setMessage({ type: 'success', text: 'Removed from draft. Click Save Branding to apply.' });
                setTimeout(() => setMessage(null), 2500);
              }}
            >
              Remove logo
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo Size (px)</label>
          <input
            type="range"
            min={16}
            max={256}
            step={1}
            value={form.brand_logo_size_px ?? 36}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              setForm(prev => ({ ...prev, brand_logo_size_px: raw }));
            }}
            className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 font-mono">
            <span>Height</span>
            <span>{form.brand_logo_size_px ?? 36}px</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Glow Strength</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={form.brand_logo_glow_strength ?? 1}
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              setForm(prev => ({ ...prev, brand_logo_glow_strength: raw }));
            }}
            className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 font-mono">
            <span>Intensity</span>
            <span>{form.brand_logo_glow_strength ?? 1}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Glow Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brand_logo_glow_color || '#ff00ff'}
              onChange={(e) => {
                const val = e.target.value;
                setForm(prev => ({ ...prev, brand_logo_glow_color: val }));
              }}
              className="w-12 h-12 p-0 border-0 rounded-lg overflow-hidden cursor-pointer"
              title="Pick the glow color"
            />
            <span className="text-xs text-gray-500 max-w-[150px]">Default blends nicely with dark theme.</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-2">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo Side</label>
          <select
            value={form.brand_logo_side || 'left'}
            onChange={(e) => {
              const val = e.target.value as 'left' | 'right';
              setForm(prev => ({ ...prev, brand_logo_side: val }));
            }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all"
          >
            <option value="left" className="bg-gray-900 text-white">Left of text</option>
            <option value="right" className="bg-gray-900 text-white">Right of text</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Offset X (px)</label>
          <input
            type="range"
            min={-200}
            max={200}
            step={1}
            value={form.brand_logo_offset_x_px ?? 0}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              setForm(prev => ({ ...prev, brand_logo_offset_x_px: raw }));
            }}
            className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
            <span>Left/Right</span>
            <span>{form.brand_logo_offset_x_px ?? 0}px</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Offset Y (px)</label>
          <input
            type="range"
            min={-200}
            max={200}
            step={1}
            value={form.brand_logo_offset_y_px ?? 0}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              setForm(prev => ({ ...prev, brand_logo_offset_y_px: raw }));
            }}
            className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
            <span>Up/Down</span>
            <span>{form.brand_logo_offset_y_px ?? 0}px</span>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h5 className="text-sm font-bold text-white uppercase tracking-widest">Responsive Overrides</h5>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Optional</span>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {/* sm */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 w-fit px-2 py-1 rounded">Small (&lt;768px)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">X Offset</label>
                <input type="number" value={form.brand_logo_offset_x_sm_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_x_sm_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Y Offset</label>
                <input type="number" value={form.brand_logo_offset_y_sm_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_y_sm_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
            </div>
          </div>
          {/* md */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 w-fit px-2 py-1 rounded">Medium (≥768px)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">X Offset</label>
                <input type="number" value={form.brand_logo_offset_x_md_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_x_md_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Y Offset</label>
                <input type="number" value={form.brand_logo_offset_y_md_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_y_md_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
            </div>
          </div>
          {/* lg */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest bg-pink-500/10 w-fit px-2 py-1 rounded">Large (≥1024px)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">X Offset</label>
                <input type="number" value={form.brand_logo_offset_x_lg_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_x_lg_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Y Offset</label>
                <input type="number" value={form.brand_logo_offset_y_lg_px ?? ''} onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setForm(p => ({ ...p, brand_logo_offset_y_lg_px: v }));
                }} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="0" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={saveBranding}
            disabled={savingBranding || savingPage}
            className={`
              px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all
              ${savingBranding || savingPage 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
              }
            `}
          >
            {savingBranding ? 'Deploying...' : 'Save Branding'}
          </button>
          <button
            type="button"
            onClick={resetBrandingDraft}
            disabled={savingBranding || savingPage}
            className={`
              px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all
              ${savingBranding || savingPage 
                ? 'text-gray-600 cursor-not-allowed border-gray-800/50' 
                : 'text-gray-400 hover:text-white border border-white/10 hover:bg-white/5'
              }
            `}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};
