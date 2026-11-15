import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '../ToastProvider';
import type { SiteTheme } from '../../utils/siteTheme';

const choices: Array<{ id: SiteTheme; title: string; description: string; accent: string; background: string }> = [
  { id: 'spiderman', title: 'Ricorrenza · Emerald & Gold', description: 'Cinematic emerald city, metallic gold titles and a glowing mechanical spider.', accent: '#9ae77b', background: 'linear-gradient(135deg, #153923, #080e09)' },
  { id: 'cyberpunk', title: 'Cyberpunk', description: 'Dark surfaces with neon pink and violet accents.', accent: '#f472b6', background: 'linear-gradient(135deg, #241027, #08080d)' },
  { id: 'bollywood', title: 'Cyberpunk Cyan', description: 'Cyan accents and a cinematic festival atmosphere.', accent: '#67e8f9', background: 'linear-gradient(135deg, #082b35, #08080d)' },
  { id: 'vaporwave', title: 'Vaporwave', description: 'Purple and blue colour with a retro atmosphere.', accent: '#c4b5fd', background: 'linear-gradient(135deg, #30194f, #101d3c)' },
];

export const ThemeManagement: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const handleSetTheme = async (choice: SiteTheme) => {
    if (choice === theme || isUpdating) return;
    setIsUpdating(true);
    try {
      await setTheme(choice);
      push({ message: `Theme updated to ${choices.find(item => item.id === choice)?.title}.`, type: 'success' });
    } catch {
      push({ message: 'Could not update the theme. Please try again.', type: 'error' });
    } finally { setIsUpdating(false); }
  };
  return (
    <section className="space-y-6" aria-labelledby="appearance-title">
      <header><h2 id="appearance-title" className="text-2xl text-white">Website appearance</h2><p className="mt-2 text-sm text-gray-400">Choose the colours and typography visitors see throughout RICO.</p></header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {choices.map(choice => {
          const active = theme === choice.id;
          return <button key={choice.id} type="button" disabled={isUpdating} aria-pressed={active} onClick={() => handleSetTheme(choice.id)}
            className="relative rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left transition-colors hover:border-white/30 disabled:opacity-60"
            style={{ borderColor: active ? choice.accent : undefined }}>
            <div className="mb-5 flex h-24 items-center justify-between rounded-lg border border-white/10 px-5" style={{ background: choice.background }} aria-hidden="true">
              <span style={{ color: '#f5f5f7', fontFamily: 'Anton, sans-serif', fontSize: 30, letterSpacing: '.02em' }}>RICO<span style={{ color: choice.accent }}>.</span></span>
              <span className="flex gap-2">{['#050506', '#28282f', '#f5f5f7', choice.accent].map(colour => <span key={colour} className="h-5 w-5 rounded-full border border-white/20" style={{ background: colour }} />)}</span>
            </div>
            <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-white">{choice.title}</h3>{active && <Check className="h-5 w-5 shrink-0" style={{ color: choice.accent }} aria-label="Active theme" />}</div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{choice.description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold" style={{ color: active ? choice.accent : '#b9b9c6' }}>{isUpdating ? <><Loader2 className="h-3 w-3 animate-spin" /> Updating…</> : active ? 'Active theme' : 'Apply theme'}</span>
          </button>;
        })}
      </div>
      <p className="text-xs leading-relaxed text-gray-400">The festival theme applies to the public site and student experience. Staff workspaces keep their independent appearance.</p>
    </section>
  );
};
