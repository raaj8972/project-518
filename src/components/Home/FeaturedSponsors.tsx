import React from 'react';
import { ArrowRight } from 'lucide-react';
const LogoLoop = React.lazy(() => import('../LogoLoop'));

interface Sponsor {
  id: number;
  name: string;
  logo: string;
  website?: string;
  featured: boolean;
}

interface FeaturedSponsorsProps {
  featuredSponsors: Sponsor[];
  homepageSettings: any;
  hasManySponsors: boolean;
}

const FeaturedSponsors: React.FC<FeaturedSponsorsProps> = ({
  featuredSponsors,
  homepageSettings,
  hasManySponsors
}) => {
  if (featuredSponsors.length === 0 || !homepageSettings?.featured_partners_enabled) return null;

  return (
    <section className="pt-8 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0b0f1a]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="scroll-animate opacity-0 transform translate-y-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
              {homepageSettings?.sponsor_section_title ? (
                <>{homepageSettings.sponsor_section_title}</>
              ) : (
                <>OUR <span className="stranger-flicker-text text-red-600">PARTNERS</span></>
              )}
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-red-600 to-orange-600 mx-auto mb-8 expand-width"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {homepageSettings?.sponsor_section_subtitle ?? 'Powered by industry leaders who believe in our vision'}
            </p>
            {hasManySponsors && (
              <div className="mt-6">
                <a href="/sponsors" className="inline-flex items-center text-red-400 hover:text-red-300 font-semibold stranger-flicker">
                  View all partners <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div
          className="relative left-1/2 -translate-x-1/2 w-screen"
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <React.Suspense fallback={<div className="h-[160px] flex items-center justify-center text-gray-400">Loading partners…</div>}>
            <LogoLoop
              logos={featuredSponsors
                .filter(s => s.logo && s.logo.trim() !== '')
                .map(s => ({ src: s.logo, alt: s.name ?? '', href: s.website ?? undefined, title: s.name ?? undefined }))}
              speed={Math.min(800, Math.max(1, Math.abs(homepageSettings?.sponsors_belt_speed_px_per_sec ?? 140)))}
              direction={homepageSettings?.sponsors_belt_direction ?? 'left'}
              pauseOnHover={true}
              pauseInstantOnHover={false}
              smoothTauSec={0.6}
              scaleOnHover={false}
              fadeOut={true}
              fadeOutColor="#030712"
              glow={true}
              cardRadius={32}
              cardPaddingX={18}
              cardPaddingY={0}
              ariaLabel="Our partners"
              className=""
              style={{
                background: 'transparent',
                paddingTop: 0,
                paddingBottom: 0,
                isolation: 'isolate',
                pointerEvents: 'auto',
                ['--logoloop-logoHeight' as any]: 'clamp(60px, 14vw, 100px)',
                ['--logoloop-gap' as any]: 'clamp(16px, 4vw, 40px)',
                ['--ll-pulse-duration' as any]: '0s',
                ['--ll-floor-opacity' as any]: 0,
                ['--ll-glow-color' as any]: 'rgba(0,0,0,0)',
                ['--ll-rim-alpha' as any]: 0,
                ['--ll-card-bg' as any]: 'rgba(255,255,255,0.02)',
                ['--ll-card-border-w' as any]: '1px',
                ['--ll-card-border-color' as any]: 'rgba(255,255,255,0.05)',
                ['--ll-card-h' as any]: 'clamp(120px, 22vw, 180px)',
                ['--ll-card-w' as any]: 'clamp(120px, 22vw, 180px)',
                ['--ll-logo-max-h' as any]: 'calc(var(--ll-card-h) - 40px)',
                ['--ll-logo-max-w' as any]: 'calc(var(--ll-card-w) - 40px)',
                ['--ll-card-radius' as any]: '2rem',
                ['--logoloop-fadeWidth' as any]: 'clamp(20px, 5vw, 60px)'
              }}
            />
          </React.Suspense>
        </div>
      </div>
    </section>
  );
};

export default FeaturedSponsors;
