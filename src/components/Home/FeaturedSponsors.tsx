import React from 'react';
import { ArrowRight } from 'lucide-react';
import SponsorSmoke from '../Sponsors/SponsorSmoke';
import '../../styles/FestivalSections.css';
import '../../styles/FestivalPartners.css';
const LogoLoop = React.lazy(() => import('../LogoLoop'));

function PartnerWeb({ className }: { className: string }) {
  return <svg className={`festival-partner-web ${className}`} viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false">
    <path d="M4 4 236 81M4 4 174 174M4 4 81 236M64 4Q58 24 61 23Q51 41 46 46Q24 51 23 61Q14 61 4 64M124 4Q112 43 118 42Q99 78 89 89Q45 99 42 118Q23 118 4 124M184 4Q166 63 175 62Q147 115 132 132Q66 147 62 175Q33 175 4 184M238 4Q215 81 227 80Q190 149 171 171Q85 190 80 227Q43 227 4 238" />
    <circle cx="89" cy="89" r="2" /><circle cx="175" cy="62" r="2" /><circle cx="62" cy="175" r="2" />
  </svg>;
}

interface Sponsor {
  id: number;
  name: string;
  logo: string;
  website?: string | null;
  featured: boolean;
}

interface FeaturedSponsorsProps {
  featuredSponsors: Sponsor[];
  homepageSettings: any;
  hasManySponsors: boolean;
  partnerPeriod?: 'previous' | 'current';
}

const FeaturedSponsors: React.FC<FeaturedSponsorsProps> = ({
  featuredSponsors,
  homepageSettings,
  hasManySponsors,
  partnerPeriod = 'current'
}) => {
  if (featuredSponsors.length === 0 || homepageSettings?.featured_partners_enabled === false) return null;

  return (
    <section className="festival-partners pt-8 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0b0f1a]"></div>
      <PartnerWeb className="festival-partner-web--left" />
      <PartnerWeb className="festival-partner-web--right" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="festival-partner-heading">
          <div className="festival-section-heading text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-4">{partnerPeriod === 'previous' ? 'Previous partners · current edition coming soon' : 'Current-edition partners'}</p>
            <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
              {homepageSettings?.sponsor_section_title ? (
                <>{homepageSettings.sponsor_section_title}</>
              ) : (
                <>OUR <span className="stranger-flicker-text text-indigo-400">PARTNERS</span></>
              )}
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 mx-auto mb-8 expand-width"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {homepageSettings?.sponsor_section_subtitle ?? 'Powered by industry leaders who believe in our vision'}
            </p>
            {hasManySponsors && (
              <div className="mt-6">
                <a href="/sponsors" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-semibold stranger-flicker">
                  View all partners <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div
          className="festival-partner-belt relative left-1/2 -translate-x-1/2 w-screen"
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <SponsorSmoke />
          <React.Suspense fallback={<div className="h-[160px] flex items-center justify-center text-gray-400">Loading partners…</div>}>
            <LogoLoop
              logos={featuredSponsors
                .filter(s => s.logo && s.logo.trim() !== '')
                .map(s => ({ src: s.logo, alt: s.name ?? '', href: s.website ?? undefined, title: s.name ?? undefined }))}
              speed={Math.min(60, Math.max(20, Math.abs(Number(homepageSettings?.sponsors_belt_speed_px_per_sec) || 44)))}
              direction={homepageSettings?.sponsors_belt_direction ?? 'left'}
              pauseOnHover={true}
              pauseInstantOnHover={false}
              smoothTauSec={0.6}
              scaleOnHover={false}
              fadeOut={false}
              glow={true}
              spotlight={true}
              showTitles={true}
              cardRadius={18}
              cardPaddingX={0}
              cardPaddingY={0}
              ariaLabel="Our partners"
              className="festival-partner-logos"
              style={{
                background: 'transparent',
                paddingTop: 0,
                paddingBottom: 0,
                isolation: 'isolate',
                pointerEvents: 'auto',
                ['--logoloop-gap' as any]: 'clamp(20px, 4vw, 44px)'
              }}
            />
          </React.Suspense>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSponsors;
