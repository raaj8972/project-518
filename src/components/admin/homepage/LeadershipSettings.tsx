import React from 'react';

interface LeadershipSettingsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const LeadershipSettings: React.FC<LeadershipSettingsProps> = ({ form, setForm }) => {
  return (
    <div className="space-y-8 mt-12 p-8 rounded-3xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-white uppercase tracking-widest">Leadership Display</h4>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-8 h-5 rounded-full p-1 transition-colors duration-300 ${form.show_faculty_heads ? 'bg-blue-500' : 'bg-white/10'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.show_faculty_heads ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
            <input
              type="checkbox"
              checked={form.show_faculty_heads}
              onChange={(e) => setForm(prev => ({ ...prev, show_faculty_heads: e.target.checked }))}
              className="hidden"
            />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Faculty</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-8 h-5 rounded-full p-1 transition-colors duration-300 ${form.show_committee_heads ? 'bg-blue-500' : 'bg-white/10'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.show_committee_heads ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
            <input
              type="checkbox"
              checked={form.show_committee_heads}
              onChange={(e) => setForm(prev => ({ ...prev, show_committee_heads: e.target.checked }))}
              className="hidden"
            />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Committee</span>
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Carousel Speed (ms)</label>
          <div className="relative group">
            <input
              type="number"
              min={1000}
              step={100}
              value={form.leadership_carousel_speed_ms || ''}
              onChange={(e) => {
                const v = e.target.value;
                setForm(prev => ({ ...prev, leadership_carousel_speed_ms: v === '' ? '' : parseInt(v, 10) }));
              }}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 text-sm font-mono"
            />
            <div className="absolute right-4 top-3 text-[10px] font-bold text-blue-500/40">ms</div>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed italic">Wait time between card rotations.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Marquee Speed (px/s)</label>
          <div className="relative group">
            <input
              type="number"
              min={1}
              max={800}
              step={1}
              value={form.committee_marquee_speed_px_per_sec || ''}
              onChange={(e) => {
                const v = e.target.value;
                setForm(prev => ({ ...prev, committee_marquee_speed_px_per_sec: v === '' ? '' : parseInt(v, 10) }));
              }}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 text-sm font-mono"
            />
            <div className="absolute right-4 top-3 text-[10px] font-bold text-blue-500/40">px</div>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed italic">Horizontal scroll velocity.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Marquee Direction</label>
          <select
            value={form.committee_marquee_direction}
            onChange={(e) => setForm(prev => ({ ...prev, committee_marquee_direction: (e.target.value as 'left' | 'right') }))}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 appearance-none text-xs font-bold tracking-widest transition-all"
          >
            <option value="left" className="bg-gray-900">LEFTWARD</option>
            <option value="right" className="bg-gray-900">RIGHTWARD</option>
          </select>
        </div>
      </div>
    </div>
  );
};
