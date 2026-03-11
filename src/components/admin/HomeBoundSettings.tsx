import React, { useState } from 'react';
import { Instagram, Save, X, ExternalLink, Eye, EyeOff, Home, Link2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const HomeBoundSettings: React.FC = () => {
  const { homeboundSettings, updateHomeboundSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingProgress = useSavingProgress();
  const [form, setForm] = useState({
    instagram_url: homeboundSettings?.instagram_url || '',
    instagram_enabled: homeboundSettings?.instagram_enabled !== false,
  });

  const ensureHttps = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const validateInstagram = (url: string) => {
    if (!url) return true;
    try {
      const candidate = ensureHttps(url);
      const u = new URL(candidate);
      return u.hostname === 'instagram.com' || u.hostname === 'www.instagram.com';
    } catch { return false; }
  };

  const handleSave = async () => {
    if (form.instagram_url && !validateInstagram(form.instagram_url)) return;
    setSaving(true);
    const steps = savingProgress.withSteps(3, 'Preparing…');
    try {
      steps.next('Validating');
      const normalizedUrl = form.instagram_url ? ensureHttps(form.instagram_url) : null;
      steps.next('Updating settings');
      await updateHomeboundSettings({
        instagram_url: normalizedUrl,
        instagram_enabled: form.instagram_enabled,
      } as any);
      steps.next('Finalizing');
      setIsEditing(false);
      alert('HomeBound settings updated');
      steps.done();
    } catch (e: any) {
      console.error('Failed to update HomeBound settings:', e);
      alert(`Failed to update HomeBound settings: ${e?.message || e}`);
      savingProgress.done();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      instagram_url: homeboundSettings?.instagram_url || '',
      instagram_enabled: homeboundSettings?.instagram_enabled !== false,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">

      {/* ═══ Hero Header ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600/20 via-orange-600/10 to-transparent border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Home size={14} className="text-pink-400" />
              <span className="text-[10px] font-black text-pink-400/80 uppercase tracking-[0.2em]">Configuration</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Home Bound – Instagram</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">Control the Instagram link shown on the Home Bound page</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing((prev) => {
                const next = !prev;
                if (next) {
                  setForm({
                    instagram_url: homeboundSettings?.instagram_url || '',
                    instagram_enabled: homeboundSettings?.instagram_enabled !== false,
                  });
                }
                return next;
              });
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
              isEditing
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                : 'bg-gradient-to-r from-pink-600 to-pink-500 border-pink-500/30 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02]'
            }`}
          >
            {isEditing ? <><X size={14} /> Cancel</> : <><Save size={14} /> Edit</>}
          </button>
        </div>
      </div>

      {/* ═══ Settings Card ═══ */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-pink-500/10 to-transparent flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Instagram size={14} className="text-white" />
          </div>
          <h3 className="text-sm font-black text-white tracking-tight">Instagram Settings</h3>
          {!isEditing && (
            homeboundSettings?.instagram_enabled ? (
              <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
                <Eye size={12} /> Visible
              </span>
            ) : (
              <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/20 text-rose-400">
                <EyeOff size={12} /> Hidden
              </span>
            )
          )}
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="space-y-6">
              {/* Enable toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="hb-ig-enabled"
                    checked={form.instagram_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-pink-500/30 peer-checked:border-pink-500/30 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-pink-400 transition-all shadow-sm" />
                </div>
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Show Instagram link on Home Bound page</span>
              </label>

              {/* URL input */}
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2">Instagram Profile URL</label>
                <div className="relative group">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pink-400 transition-colors" size={16} />
                  <input
                    type="url"
                    value={form.instagram_url}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://www.instagram.com/your_profile"
                    className={`w-full bg-white/[0.04] border rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:bg-white/[0.07] focus:ring-1 transition-all ${
                      form.instagram_url && !validateInstagram(form.instagram_url)
                        ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/30'
                        : 'border-white/10 focus:border-pink-500/50 focus:ring-pink-500/30'
                    }`}
                  />
                </div>
                {form.instagram_url && !validateInstagram(form.instagram_url) && (
                  <p className="text-rose-400 text-xs mt-2 font-medium">Enter a valid Instagram URL (instagram.com)</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={handleCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-center gap-2">
                  <X size={14} /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (form.instagram_url !== '' && !validateInstagram(form.instagram_url))}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">Profile URL</span>
                {homeboundSettings?.instagram_url ? (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm text-gray-300 font-medium break-all">{homeboundSettings.instagram_url}</span>
                    <a
                      href={homeboundSettings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:border-pink-500/20 hover:bg-pink-500/10 text-gray-500 hover:text-pink-400 transition-all shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-1 font-medium italic">Not set</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
