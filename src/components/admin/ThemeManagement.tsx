import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Film, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../ToastProvider';

export const ThemeManagement: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSetTheme = async (newTheme: 'cyberpunk' | 'bollywood') => {
    if (theme === newTheme) return;
    setIsUpdating(true);
    try {
      await setTheme(newTheme);
      showToast({ title: 'Theme Updated', description: `Global theme has been set to ${newTheme} for all users.`, type: 'success' });
    } catch (err) {
      console.error(err);
      showToast({ title: 'Update Failed', description: 'Could not update global theme', type: 'error' });
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Bollywood Theme */}
          <button 
            disabled={isUpdating}
            onClick={() => handleSetTheme('bollywood')}
            className={`relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all ${
              theme === 'bollywood' 
                ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {theme === 'bollywood' && (
              <div className="absolute top-4 right-4 text-amber-500">
                <Check className="w-6 h-6" />
              </div>
            )}
            <Film className={`w-16 h-16 ${theme === 'bollywood' ? 'text-amber-500 animate-pulse' : 'text-white/40'}`} />
            <div className="text-center">
              <h4 className="text-xl font-bold text-white mb-2">Bollywood Gala</h4>
              <p className="text-sm text-white/50">A golden, cinematic theme with 3D clapperboard loaders, film reels, and warm highlights.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
