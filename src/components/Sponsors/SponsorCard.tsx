import React from 'react';
import { ExternalLink, Crown, Star } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import PreserveNewlines from '../PreserveNewlines';

interface SponsorCardProps {
  sponsor: {
    id: string;
    name: string;
    logo: string;
    category: string;
    description?: string;
    website?: string;
  };
  index: number;
  type: 'title' | 'co' | 'regular';
  hexToRgba: (hex: string, alpha?: number) => string;
  getCategoryColor?: (category: string) => string;
  intensityFromTier?: (tier: string) => 'strong' | 'medium' | 'soft';
}

const SponsorCard: React.FC<SponsorCardProps> = ({ 
  sponsor, 
  index, 
  type, 
  hexToRgba, 
  getCategoryColor,
  intensityFromTier
}) => {
  const isTitle = type === 'title';
  const isCo = type === 'co';

  return (
    <div
      className={`scroll-animate-3d hover-float animate-in-3d ${
        isTitle || isCo ? 'w-full mx-auto md:max-w-2xl lg:max-w-3xl' : ''
      }`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <SpotlightCard className="stranger-card group h-full tilt-3d sponsor-zoom-card card-3d card-glow-hover">
        <div className={`relative ${isTitle || isCo ? 'p-8' : 'p-6'}`}>
          {isCo && (
            <div className="absolute top-4 right-4">
              <Star className="w-6 h-6 text-red-600 animate-pulse pulse-ring" />
            </div>
          )}
          
          <div className={`flex ${isTitle || isCo ? 'items-center mb-6' : 'flex-col items-center mb-4 text-center'}`}>
            <div
              className={`logo-no-bg logo-tier-glow tier-pulse sponsor-interactive p-2 rounded-xl border-2 transition-colors bg-transparent ${
                isTitle || isCo ? 'mr-6 w-28 h-28 md:w-32 md:h-32' : 'inline-flex mb-4 w-24 h-24 md:w-28 md:h-28'
              } ${isTitle ? 'border-red-600/50 group-hover:border-red-600' : isCo ? 'border-red-700/50 group-hover:border-red-600' : 'border-orange-600/40 group-hover:border-red-600'}`}
              style={{
                ['--tier-glow' as any]: isTitle 
                  ? hexToRgba('#FFD700', 0.55) 
                  : isCo 
                    ? hexToRgba('#DC2626', 0.8) 
                    : hexToRgba(getCategoryColor ? getCategoryColor(sponsor.category) : '#6B7280', 0.78),
                ['--tier-opacity' as any]: isTitle ? 0.55 : isCo ? 0.7 : 0.42,
                ['--tier-blur' as any]: isTitle ? '10px' : isCo ? '11px' : '8px',
                ['--tier-opacity-min' as any]: isTitle ? 0.38 : isCo ? 0.45 : 0.42,
                ['--tier-blur-min' as any]: isTitle ? '8px' : isCo ? '9px' : '8px',
                ['--tier-speed' as any]: isTitle ? '3.2s' : isCo ? '3.4s' : '3.6s',
              }}
            >
              <img
                src={sponsor.logo}
                alt={sponsor.name}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className={isTitle || isCo ? 'flex-1 min-w-0 space-y-2' : ''}>
              <h3 className={`font-bold text-white transition-colors break-words ${isTitle || isCo ? 'text-lg sm:text-xl md:text-2xl group-hover:text-orange-500' : 'mb-2 group-hover:text-red-500'}`}>
                {sponsor.name}
              </h3>
              <span className={`inline-block rounded-full font-bold leading-tight break-words max-w-full ${
                isTitle 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm' 
                  : isCo 
                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm' 
                    : 'px-2.5 py-1 text-xs sm:text-sm font-medium text-white whitespace-nowrap'
              }`}
              style={!isTitle && !isCo && getCategoryColor ? { backgroundColor: getCategoryColor(sponsor.category) } : {}}
              >
                {sponsor.category}
              </span>
            </div>
          </div>
          
          {sponsor.description && sponsor.description.trim().length > 0 && (
            <PreserveNewlines 
              text={sponsor.description} 
              className={`text-gray-300 leading-relaxed ${isTitle || isCo ? 'mb-6' : 'text-sm mb-4 line-clamp-3'}`} 
            />
          )}
          
          {sponsor.website && (
            <div className={isTitle || isCo ? '' : 'text-center'}>
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center font-medium transition-colors group ${
                   isTitle ? 'text-orange-500 hover:text-orange-400' : isCo ? 'text-red-500 hover:text-red-400' : 'text-orange-500 hover:text-orange-400'
                }`}
              >
                {isTitle || isCo ? 'Visit Website' : ''}
                <ExternalLink size={16} className={isTitle || isCo ? 'ml-2 group-hover:translate-x-1 transition-transform' : ''} />
              </a>
            </div>
          )}
        </div>
      </SpotlightCard>
    </div>
  );
};

export default SponsorCard;
