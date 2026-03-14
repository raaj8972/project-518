import React from 'react';

interface InstagramIntegrationSettingsProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const InstagramIntegrationSettings: React.FC<InstagramIntegrationSettingsProps> = ({ form, setForm }) => {
  return (
    <div className="grid lg:grid-cols-2 gap-8 mt-12">
      {/* Trailer */}
      <div className="p-8 rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-pink-500 rounded-2xl shadow-lg shadow-pink-500/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-black text-white tracking-widest uppercase">Trailer</h4>
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Landing Visual</p>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.instagram_trailer_enabled ? 'bg-pink-500' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.instagram_trailer_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input
              type="checkbox"
              checked={form.instagram_trailer_enabled || false}
              onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_enabled: e.target.checked }))}
              className="hidden"
            />
          </label>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Instagram Reel URL</label>
            <input
              type="url"
              value={form.instagram_trailer_url || ''}
              onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_url: e.target.value }))}
              placeholder="https://instagram.com/reel/..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Custom Title</label>
              <input
                type="text"
                value={form.instagram_trailer_title || ''}
                onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_title: e.target.value }))}
                placeholder="OFFICIAL TRAILER"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Subtitle</label>
              <input
                type="text"
                value={form.instagram_trailer_subtitle || ''}
                onChange={(e) => setForm(prev => ({ ...prev, instagram_trailer_subtitle: e.target.value }))}
                placeholder="Experience the hype"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Aftermovie */}
      <div className="p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-purple-500 rounded-2xl shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-black text-white tracking-widest uppercase">Aftermovie</h4>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Memories Visual</p>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${form.instagram_aftermovie_enabled ? 'bg-purple-500' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${form.instagram_aftermovie_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input
              type="checkbox"
              checked={form.instagram_aftermovie_enabled || false}
              onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_enabled: e.target.checked }))}
              className="hidden"
            />
          </label>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Instagram Aftermovie URL</label>
            <input
              type="url"
              value={form.instagram_aftermovie_url || ''}
              onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_url: e.target.value }))}
              placeholder="https://instagram.com/reel/..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Custom Title</label>
              <input
                type="text"
                value={form.instagram_aftermovie_title || ''}
                onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_title: e.target.value }))}
                placeholder="EVENT AFTERMOVIE"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Subtitle</label>
              <input
                type="text"
                value={form.instagram_aftermovie_subtitle || ''}
                onChange={(e) => setForm(prev => ({ ...prev, instagram_aftermovie_subtitle: e.target.value }))}
                placeholder="Relive the moments"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
