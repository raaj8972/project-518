import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, Crown } from 'lucide-react';

interface DynamicBadgeProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const DynamicBadge: React.FC<DynamicBadgeProps> = ({ tier, size = 'md', showLabel = false }) => {
  const getTierConfig = (tierName: string) => {
    switch (tierName?.toLowerCase()) {
      case 'platinum':
        return {
          icon: Crown,
          color: 'from-cyan-300 via-white to-blue-400',
          glow: 'shadow-[0_0_20px_rgba(103,232,249,0.5)]',
          label: 'Platinum',
          secondary: 'text-cyan-200'
        };
      case 'gold':
        return {
          icon: Trophy,
          color: 'from-yellow-300 via-amber-400 to-yellow-600',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
          label: 'Gold',
          secondary: 'text-amber-200'
        };
      case 'silver':
        return {
          icon: Star,
          color: 'from-slate-300 via-gray-100 to-slate-500',
          glow: 'shadow-[0_0_20px_rgba(203,213,225,0.5)]',
          label: 'Silver',
          secondary: 'text-slate-200'
        };
      default:
        return {
          icon: Shield,
          color: 'from-orange-400 via-orange-600 to-red-700',
          glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
          label: 'Bronze',
          secondary: 'text-orange-200'
        };
    }
  };

  const config = getTierConfig(tier);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-16 h-16 p-3.5'
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        whileHover={{ scale: 1.1, rotateY: 180 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        style={{ perspective: 1000 }}
        className={`relative ${sizeClasses[size]} rounded-xl bg-gradient-to-br ${config.color} ${config.glow} flex items-center justify-center border border-white/30 backdrop-blur-sm`}
      >
        <div className="absolute inset-0 bg-white/10 rounded-xl overflow-hidden">
          <motion.div
            animate={{ 
              x: [-100, 200],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatDelay: 3 
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          />
        </div>
        
        <Icon className="w-full h-full text-black/80 drop-shadow-sm" />
        
        {/* Particle Glow */}
        <div className={`absolute -inset-1 bg-gradient-to-br ${config.color} opacity-20 blur-xl -z-10`} />
      </motion.div>
      
      {showLabel && (
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.secondary} drop-shadow-md`}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export default DynamicBadge;
