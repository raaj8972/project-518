import React from 'react';
import SponsorshipPackageCard from './SponsorshipPackageCard';

interface SponsorshipPackagesProps {
  packages: Array<{
    tier: string;
    price: string;
    icon: string;
    color: string;
    benefits: string[];
  }>;
}

const SponsorshipPackages: React.FC<SponsorshipPackagesProps> = ({ packages }) => {
  if (packages.length === 0) {
    return (
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20 animate-in">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
                BECOME A <span className="stranger-flicker-text text-orange-600">SPONSOR</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-red-600 to-orange-600 mx-auto mb-8 expand-width"></div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Sponsorship packages are being configured. Please check back soon!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 relative sponsors-zoom-scope">
      <div className="container mx-auto px-4">
        <div className="scroll-animate opacity-0 transform translate-y-20 animate-in">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
              BECOME A <span className="stranger-flicker-text text-orange-600">SPONSOR</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-red-600 to-orange-600 mx-auto mb-8 expand-width"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Join the future of innovation and be part of the most exciting festival
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {packages.map((tier, index) => (
            <SponsorshipPackageCard key={index} tier={tier} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SponsorshipPackages;
