import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, Shield, Crown, Trophy } from 'lucide-react';

interface XPRingProps {
  profile: {
    full_name?: string;
    phone?: string;
    college?: string;
    batch?: string;
    avatar_url?: string;
  } | null;
  registrationsCount: number;
  sportsCount: number;
  realXP?: number;
  realTier?: string;
  rank?: number; // New rank prop
}

const XPRing: React.FC<XPRingProps> = ({ profile, registrationsCount, sportsCount, realXP, realTier, rank }) => {
  const isLegendary = rank !== undefined && rank > 0 && rank <= 5;
  const auraGradients = [
    'from-red-600 via-rose-500 to-orange-500', // #1 Primal Red
    'from-rose-600 via-red-500 to-rose-400',   // #2 Crimson
    'from-red-700 via-rose-600 to-red-500',    // #3 Ruby
    'from-rose-500 via-pink-600 to-red-600',   // #4 Blush
    'from-red-800 via-red-900 to-rose-900'     // #5 Maroon
  ];
  const aura = isLegendary ? auraGradients[(rank - 1) % 5] : null;

  const { xp, level, percent, tier, color } = useMemo(() => {
    let total = realXP ?? 0;
    if (realXP === undefined) {
      if (profile?.full_name) total += 10;
      if (profile?.phone) total += 10;
      if (profile?.college) total += 10;
      if (profile?.batch) total += 10;
      if (profile?.avatar_url) total += 20;
      total += registrationsCount * 10;
      total += sportsCount * 15;
    }

    let t = realTier?.toLowerCase() || 'bronze';
    let lvl = 1;
    let clr = '#fb7185'; 
    let maxForLevel = 200;
    
    if (total >= 1000 || t === 'platinum') {
      t = 'platinum'; lvl = 4; clr = '#a855f7'; maxForLevel = 2000;
    } else if (total >= 500 || t === 'gold') {
      t = 'gold'; lvl = 3; clr = '#fbbf24'; maxForLevel = 1000;
    } else if (total >= 200 || t === 'silver') {
      t = 'silver'; lvl = 2; clr = '#94a3b8'; maxForLevel = 500;
    } else {
      t = 'bronze'; lvl = 1; clr = '#ef4444'; maxForLevel = 200;
    }

    const pct = Math.min((total / maxForLevel) * 100, 100);
    return { xp: total, level: lvl, percent: pct, tier: t.toUpperCase(), color: clr, max: maxForLevel };
  }, [profile, registrationsCount, sportsCount, realXP, realTier]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percent / 100) * circumference;

  const glowColor = isLegendary ? 'shadow-2xl brightness-125' : 
                    tier === 'PLATINUM' ? 'shadow-purple-500/50' : 
                    tier === 'GOLD' ? 'shadow-yellow-500/50' : 
                    tier === 'SILVER' ? 'shadow-slate-400/50' : 'shadow-red-500/30';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-28 h-28 rounded-full transition-all duration-700 ${glowColor}`}>
        {/* Legendary Spinning Ring */}
        {isLegendary && (
          <div className={`absolute inset-0 -m-2 rounded-[2.5rem] bg-gradient-to-tr ${aura} animate-spin-slow opacity-60 blur-[2px]`} />
        )}
        
        {/* SVG Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 z-10" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          <motion.circle
            cx="60" cy="60" r={radius}
            stroke={isLegendary ? 'white' : color}
            strokeWidth={isLegendary ? '4' : '6'}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - strokeDash }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            filter="url(#xp-glow)"
          />
          <defs>
            <filter id="xp-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>

        {/* Avatar */}
        <div className="absolute inset-[10px] rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center z-20 border-2 border-white/10 shadow-inner group/avatar">
          {isLegendary && (
            <motion.div 
              animate={{ 
                borderRadius: ["30% 70% 70% 30% / 30% 30% 70% 70%", "50% 50% 20% 80% / 25% 80% 20% 75%", "30% 70% 70% 30% / 30% 30% 70% 70%"],
                rotate: [0, 90, 180, 270, 360]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className={`absolute -inset-8 bg-gradient-to-tr ${aura} opacity-50 blur-2xl z-20 scale-125`} 
            />
          )}
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover relative z-10" />
          ) : (
            <span className="text-white text-2xl font-black relative z-10">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
          {isLegendary && (
            <div className="absolute -bottom-1 -right-1 z-30 transform scale-110 group-hover/avatar:scale-125 transition-transform duration-500">
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)] border-2 border-black transform -rotate-6 rotate-x-12 shadow-xl group/trophy overflow-hidden">
                {/* 3D Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/trophy:translate-x-full transition-transform duration-1000" />
                <Trophy size={14} className="text-black drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.3)]" />
              </div>
            </div>
          )}
        </div>

        {/* Level badge */}
        <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white border-2 border-[#0a0a0a] z-30 transition-all ${isLegendary ? `bg-gradient-to-br ${aura}` : ''}`}
          style={{ backgroundColor: isLegendary ? undefined : color }}>
          {isLegendary ? `#${rank}` : level}
        </div>
      </div>

      {/* Tier label */}
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-700 ${
        isLegendary ? `bg-gradient-to-r ${aura} border-white/20 text-black` : 'bg-white/5 border-white/10'
      }`}>
        {isLegendary ? <Crown size={12} className="fill-current animate-bounce" /> : (
          <>
            {tier === 'PLATINUM' && <Crown size={12} className="text-purple-400 fill-purple-400" />}
            {tier === 'GOLD' && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
            {tier === 'SILVER' && <Shield size={12} className="text-slate-400 fill-slate-400" />}
            {tier === 'BRONZE' && <Zap size={12} className="text-red-400 fill-red-400" />}
          </>
        )}
        <span className={`text-[10px] font-black tracking-widest ${isLegendary ? '' : ''}`} style={{ color: isLegendary ? undefined : color }}>
          {isLegendary ? 'RICO STAR' : tier}
        </span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}} />
    </div>
  );
};

export default XPRing;
