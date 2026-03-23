import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import * as LucideIcons from 'lucide-react';
import { Mail } from 'lucide-react';

interface SponsorshipPackageCardProps {
  tier: {
    tier: string;
    price: string;
    icon: string;
    color: string;
    benefits: string[];
  };
  index: number;
}

const SponsorshipPackageCard: React.FC<SponsorshipPackageCardProps> = ({ tier, index }) => {
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Mail;
  };

  const IconComponent = getIconComponent(tier.icon);

  return (
    <div
      className="scroll-animate-3d hover-float animate-in-3d"
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <SpotlightCard className="stranger-card group h-full tilt-3d sponsor-zoom-card card-3d">
        <div className={`bg-gradient-to-r ${tier.color} p-6 text-center rounded-t-lg`}>
          <IconComponent className="w-12 h-12 mx-auto mb-4 text-white pulse-ring" />
          <h3 className="text-xl font-bold text-white mb-2">{tier.tier}</h3>
          <div className="text-2xl font-black text-white">{tier.price}</div>
        </div>
        <div className="p-6">
          <ul className="space-y-3">
            {tier.benefits.map((benefit, benefitIndex) => (
              <li key={benefitIndex} className="flex items-start">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="text-sm text-gray-300">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </SpotlightCard>
    </div>
  );
};

export default SponsorshipPackageCard;
