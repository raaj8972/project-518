import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../ToastProvider';

export const ThemeManagement: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { push } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSetTheme = async (newTheme: 'cyberpunk' | 'bollywood' | 'vaporwave') => {
    if (theme === newTheme) return;
    setIsUpdating(true);
    try {
      await setTheme(newTheme);
      push({ message: `Global theme has been set to ${newTheme} for all users.`, type: 'success' });
    } catch (err) {
      console.error(err);
      push({ message: 'Could not update global theme', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-pink-500">
          Global Theme Management
        </h2>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-amber-500/10 rounded-lg shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Caution: Live Site Update</h3>
            <p className="text-white/60">
              Changing the theme here will instantly update the appearance of the entire website for all users globally. 
              The change propagates in real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cyberpunk Theme */}
          <button 
            disabled={isUpdating}
            onClick={() => handleSetTheme('cyberpunk')}
            className={`relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all ${
              theme === 'cyberpunk' 
                ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {theme === 'cyberpunk' && (
              <div className="absolute top-4 right-4 text-pink-500">
                <Check className="w-6 h-6" />
              </div>
            )}
            <Sparkles className={`w-16 h-16 ${theme === 'cyberpunk' ? 'text-pink-500' : 'text-white/40'}`} />
            <div className="text-center">
              <h4 className="text-xl font-bold text-white mb-2">Cyberpunk (Current)</h4>
              <p className="text-sm text-white/50">Neon lights, dark UI, synthwave aesthetics and intense Stranger Things glow.</p>
            </div>
          </button>

          {/* Cyberpunk v2 Theme (Cyan) */}
          <button 
            disabled={isUpdating}
            onClick={() => handleSetTheme('bollywood')}
            className={`relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all ${
              theme === 'bollywood' 
                ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {theme === 'bollywood' && (
              <div className="absolute top-4 right-4 text-cyan-500">
                <Check className="w-6 h-6" />
              </div>
            )}
            <Sparkles className={`w-16 h-16 ${theme === 'bollywood' ? 'text-cyan-500 animate-pulse' : 'text-white/40'}`} />
            <div className="text-center">
              <h4 className="text-xl font-bold text-white mb-2">Cyberpunk v2 (Cyan)</h4>
              <p className="text-sm text-white/50">Holographic blue overlays, system-grid backgrounds, and high-tech UI components.</p>
            </div>
          </button>

          {/* Vaporwave Theme (Purple/Blue) */}
          <button 
            disabled={isUpdating}
            onClick={() => handleSetTheme('vaporwave')}
            className={`relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all ${
              theme === 'vaporwave' 
                ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {theme === 'vaporwave' && (
              <div className="absolute top-4 right-4 text-purple-500">
                <Check className="w-6 h-6" />
              </div>
            )}
            <Sparkles className={`w-16 h-16 ${theme === 'vaporwave' ? 'text-purple-500' : 'text-white/40'}`} />
            <div className="text-center">
              <h4 className="text-xl font-bold text-white mb-2">Vaporwave (Original)</h4>
              <p className="text-sm text-white/50">Retro purple & blue gradients, nostalgic synthwave colors, and softer neon glows.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
