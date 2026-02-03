import React, { useEffect, useState } from 'react';
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset, 
  Shield, 
  Server,
  Database
} from 'lucide-react';
import { BRAND_NAME_WITH_YEAR } from '../../../constants/brand';

interface WelcomeSplashProps {
  user: any;
  onComplete: () => void;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ user, onComplete }) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Stage 1: Initial Reveal
    setTimeout(() => setStage(1), 100);

    // Stage 2: Progress Bar
    setTimeout(() => setStage(2), 800);

    // Progress Animation
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 150);

    // Cleanup & Complete
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return Sunrise;
    if (hour >= 10 && hour < 16) return Sun;
    if (hour >= 16 && hour < 19) return Sunset;
    return Moon;
  };

  const GreetingIcon = getTimeIcon();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f0f13] flex items-center justify-center overflow-hidden">
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f0f13] to-[#0f0f13]" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      
      <div className="relative z-10 max-w-lg w-full px-6 flex flex-col items-center text-center">
        {/* Animated Icon Container */}
        <div 
          className={`
            mb-12 relative transition-all duration-1000 ease-out
            ${stage >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}
          `}
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-[0_0_40px_rgba(99,102,241,0.3)]">
            <div className="w-full h-full bg-[#0f0f13] rounded-[22px] flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
               <GreetingIcon className="w-10 h-10 text-white relative z-10" />
            </div>
          </div>
          {/* Decorative Rings */}
          <div className="absolute inset-0 -m-4 border border-indigo-500/20 rounded-[40px] animate-spin-slow-reverse pointer-events-none" />
          <div className="absolute inset-0 -m-8 border border-purple-500/10 rounded-[50px] animate-spin-slow pointer-events-none" />
        </div>

        {/* Text Reveal */}
        <div className={`space-y-4 transition-all duration-1000 delay-300 ease-out ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            {getGreeting()}, <span className="text-indigo-400">{user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-gray-400 text-lg tracking-wide font-medium">
             Initializing {BRAND_NAME_WITH_YEAR} OS v2.0
          </p>
        </div>

        {/* System Status Indicators */}
        <div className={`mt-16 w-full transition-all duration-1000 delay-500 ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-center gap-8 mb-6 text-xs font-bold tracking-widest text-gray-500 uppercase">
             <div className="flex items-center gap-2">
               <Server size={12} className="text-emerald-500" />
               <span>Core Systems</span>
             </div>
             <div className="flex items-center gap-2">
               <Database size={12} className="text-blue-500" />
               <span>Data Sync</span>
             </div>
             <div className="flex items-center gap-2">
               <Shield size={12} className="text-purple-500" />
               <span>Secure Gateway</span>
             </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-64 mx-auto bg-gray-800 rounded-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-gradient-x shadow-[0_0_10px_rgba(99,102,241,0.5)]"
               style={{ width: `${Math.min(100, progress)}%`, transition: 'width 0.2s ease-out' }}
             />
          </div>
        </div>
      </div>
    </div>
  );
};
