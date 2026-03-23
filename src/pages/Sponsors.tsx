import React, { useEffect } from 'react';
import { Crown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

// Extracted Components
import SponsorCard from '../components/Sponsors/SponsorCard';
import SponsorshipPackages from '../components/Sponsors/SponsorshipPackages';
import SponsorshipContact from '../components/Sponsors/SponsorshipContact';

import '../styles/Sponsors.css';

export const Sponsors: React.FC = () => {
  const { sponsors, sponsorshipSettings, sponsorshipPackages, eventCategories } = useData();

  // Helpers
  const hexToRgba = (hex: string, alpha = 0.75) => {
    try {
      let h = hex.replace('#', '');
      if (h.length === 3) {
        h = h.split('').map((c) => c + c).join('');
      }
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(255,255,255,${alpha})`;
    }
  };

  const intensityFromTier = (tier: string): 'strong' | 'medium' | 'soft' => {
    const t = (tier || '').toLowerCase();
    if (/title/.test(t) || /diamond/.test(t) || /platinum/.test(t)) return 'strong';
    if (/co\s*-?\s*sponsor/.test(t) || /gold/.test(t) || /silver/.test(t)) return 'medium';
    return 'soft';
  };

  const getCategoryColor = (categoryName: string) => {
    const category = eventCategories.find(cat => cat.name === categoryName);
    return category ? category.color : '#6B7280';
  };

  const titleSponsors = sponsors.filter(s => s.category === 'Title Sponsor' && s.logo && s.logo.trim() !== '');
  const coSponsors = sponsors.filter(s => s.category === 'Co Sponsor' && s.logo && s.logo.trim() !== '');
  const otherSponsors = sponsors.filter(s => s.category !== 'Title Sponsor' && s.category !== 'Co Sponsor' && s.logo && s.logo.trim() !== '');

  const groupedOtherSponsors = otherSponsors.reduce((acc, sponsor) => {
    if (!acc[sponsor.category]) {
      acc[sponsor.category] = [];
    }
    acc[sponsor.category].push(sponsor);
    return acc;
  }, {} as Record<string, typeof sponsors>);

  const otherCategories = Object.keys(groupedOtherSponsors).sort();

  // Effects
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });

      const scopes = document.querySelectorAll<HTMLElement>('.sponsors-zoom-scope');
      scopes.forEach((scope) => {
        const rect = scope.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const cards = scope.querySelectorAll<HTMLElement>('.sponsor-zoom-card');
        cards.forEach((card) => {
          const inner = card.firstElementChild as HTMLElement | null;
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.top + cardRect.height / 2;
          const distance = Math.abs(cardCenter - centerY);
          const maxDist = Math.max(120, rect.height * 0.5);
          let t = 1 - Math.min(distance / maxDist, 1);
          t = t * t * (3 - 2 * t);
          const scale = 0.92 + t * 0.16;
          const z = t * 180;
          card.classList.toggle('is-spotlit', t > 0.54);
          if (inner) {
            inner.style.transform = `translateZ(${z}px) scale(${scale})`;
            inner.style.filter = 'none';
          }
        });
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll as any);
      window.removeEventListener('resize', handleScroll as any);
    };
  }, []);

  const enabledContactSections = sponsorshipSettings?.contactSections?.filter(section => section.enabled) || [];

  const handleBrochureDownload = () => {
    if (sponsorshipSettings?.brochure_url) {
      window.open(sponsorshipSettings.brochure_url, '_blank');
    }
  };

  return (
    <div className="stranger-theme min-h-screen relative overflow-hidden pt-32">
      <SEO />
      <SEO 
        title="Sponsors" 
        description={`Our valued partners and sponsors for ${BRAND_NAME} ${BRAND_YEAR}.`} 
        canonical="https://ricorrenza.fun/sponsors" 
      />

      {/* Title Sponsors */}
      {titleSponsors.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20 animate-in mb-10">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
                  TITLE <span className="stranger-flicker-text text-orange-600">SPONSORS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-red-600 to-orange-600 mx-auto expand-width mb-4"></div>
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-lg scale-125 animate-pulse"></div>
                    <Crown className="relative text-yellow-400 w-16 h-16 md:w-20 md:h-20 animate-pulse pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid gap-8 place-items-center ${
              titleSponsors.length === 1 ? 'grid-cols-1' : titleSponsors.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {titleSponsors.map((sponsor, index) => (
                <SponsorCard 
                  key={sponsor.id}
                  sponsor={{...sponsor, id: String(sponsor.id), website: sponsor.website || undefined}}
                  index={index}
                  type="title"
                  hexToRgba={hexToRgba}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Co Sponsors */}
      {coSponsors.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20 animate-in mb-16">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
                  CO <span className="stranger-flicker-text text-red-600">SPONSORS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-red-700 to-red-500 mx-auto expand-width"></div>
              </div>
            </div>

            <div className={`grid gap-8 place-items-center ${
              coSponsors.length === 1 ? 'grid-cols-1' : coSponsors.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {coSponsors.map((sponsor, index) => (
                <SponsorCard 
                  key={sponsor.id}
                  sponsor={{...sponsor, id: String(sponsor.id), website: sponsor.website || undefined}}
                  index={index}
                  type="co"
                  hexToRgba={hexToRgba}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other Sponsors Grid */}
      {otherCategories.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20 animate-in mb-16">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
                  PARTNER <span className="stranger-flicker-text text-orange-600">NETWORK</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-orange-700 to-red-600 mx-auto expand-width"></div>
              </div>
            </div>

            {otherCategories.map((categoryName, categoryIndex) => (
              <div key={categoryName} className="mb-16 last:mb-0">
                <div className="scroll-animate opacity-0 transform translate-y-20 animate-in mb-8" style={{ animationDelay: `${categoryIndex * 0.1}s` }}>
                  <h3 className="text-3xl font-bold text-center stranger-flicker-text text-orange-500">
                    {categoryName}
                  </h3>
                </div>
                <div className={(() => {
                  const count = groupedOtherSponsors[categoryName].length;
                  if (count === 1) return 'grid grid-cols-1 gap-6 place-items-center';
                  if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-6 place-items-center';
                  if (count === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
                  return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
                })()}>
                  {groupedOtherSponsors[categoryName].sort((a, b) => a.order_position - b.order_position).map((sponsor, index) => (
                    <SponsorCard 
                      key={sponsor.id}
                      sponsor={{...sponsor, id: String(sponsor.id), website: sponsor.website || undefined}}
                      index={index}
                      type="regular"
                      hexToRgba={hexToRgba}
                      getCategoryColor={getCategoryColor}
                      intensityFromTier={intensityFromTier}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <SponsorshipPackages packages={sponsorshipPackages} />

      <SponsorshipContact 
        sponsorshipSettings={sponsorshipSettings ? { ...sponsorshipSettings, brochure_url: sponsorshipSettings.brochure_url || undefined } : {}}
        enabledContactSections={enabledContactSections.map(s => ({...s, id: String(s.id)}))}
        brandName={BRAND_NAME}
        brandYear={BRAND_YEAR}
        onBrochureDownload={handleBrochureDownload}
      />
    </div>
  );
};

export default Sponsors;