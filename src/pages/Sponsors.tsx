import React, { useEffect, useState } from 'react';
import { ExternalLink, Download, Building, Star, Crown, Mail, Phone, MapPin } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useData } from '../context/DataContext';
import HeroBackground from '../components/HeroBackground';
import PreserveNewlines from '../components/PreserveNewlines';
import ScrollHint from '../components/ScrollHint';

export const Sponsors: React.FC = () => {
  const { sponsors, sponsorshipSettings, sponsorshipPackages, eventCategories } = useData();
  // removed unused ref to satisfy TypeScript
  const [glitchActive, setGlitchActive] = useState(false);

  // Helpers to compute glow color/intensity per tier without breaking mix-blend-mode
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

  const titleSponsors = sponsors.filter(s => s.category === 'Title Sponsor' && s.logo && s.logo.trim() !== '');
  const coSponsors = sponsors.filter(s => s.category === 'Co Sponsor' && s.logo && s.logo.trim() !== '');
  
  // Filter out title and co-sponsors to get other sponsors
  const otherSponsors = sponsors.filter(s => s.category !== 'Title Sponsor' && s.category !== 'Co Sponsor' && s.logo && s.logo.trim() !== '');

  // Group other sponsors by category
  const groupedOtherSponsors = otherSponsors.reduce((acc, sponsor) => {
    if (!acc[sponsor.category]) {
      acc[sponsor.category] = [];
    }
    acc[sponsor.category].push(sponsor);
    return acc;
  }, {} as Record<string, typeof sponsors>);

  // Sort categories alphabetically
  const otherCategories = Object.keys(groupedOtherSponsors).sort();

  // Glitch effect trigger
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 15000);
    return () => clearInterval(glitchTimer);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            if (entry.target.classList.contains('scroll-animate-3d')) entry.target.classList.add('animate-in-3d');
            try { observer.unobserve(entry.target); } catch {}
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const attach = () => {
      const animatedElements = document.querySelectorAll('.scroll-animate, .scroll-animate-3d');
      animatedElements.forEach((el) => {
        const node = el as HTMLElement & { __observed?: boolean };
        if (!node.__observed) {
          observer.observe(node);
          node.__observed = true;
        }
      });
    };

    attach();

    // Immediately reveal in-viewport nodes so content appears after data/filter updates
    try {
      const nodesNow = Array.from(document.querySelectorAll('.scroll-animate, .scroll-animate-3d')) as HTMLElement[];
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      nodesNow.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.top < viewportH * 0.9) {
          n.classList.add('animate-in');
          if (n.classList.contains('scroll-animate-3d')) n.classList.add('animate-in-3d');
          try { (n as any).__observed = true; } catch {}
        }
      });
    } catch (e) { /* ignore */ }

    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 300);
    const safety = setTimeout(() => {
      document.querySelectorAll('.scroll-animate, .scroll-animate-3d').forEach((el) => {
        (el as HTMLElement).classList.add('animate-in');
        if (el.classList.contains('scroll-animate-3d')) el.classList.add('animate-in-3d');
      });
    }, 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); observer.disconnect(); };
  }, [sponsors.length, sponsorshipPackages.length, eventCategories.length]);


  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });

      // Spotlight zoom logic
      const scopes = document.querySelectorAll<HTMLElement>('.sponsors-zoom-scope');
      scopes.forEach((scope) => {
        const rect = scope.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const cards = scope.querySelectorAll<HTMLElement>('.sponsor-zoom-card');
        cards.forEach((card) => {
          // The first child is the inner wrapper we animate for better composition with hover effects
          const inner = card.firstElementChild as HTMLElement | null;
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.top + cardRect.height / 2;
          const distance = Math.abs(cardCenter - centerY);
          const maxDist = Math.max(120, rect.height * 0.5);
          let t = 1 - Math.min(distance / maxDist, 1); // 1 at center, 0 far

          // Ease it for a softer ramp
          t = t * t * (3 - 2 * t); // smoothstep

          const scale = 0.92 + t * 0.16; // from ~0.92 to ~1.08 for subtler pop
          const z = t * 180; // less Z for a calmer zoom

          card.classList.toggle('is-spotlit', t > 0.54);
          if (inner) {
            inner.style.transform = `translateZ(${z}px) scale(${scale})`;
            // Remove blur entirely to avoid blurred containers
            inner.style.filter = 'none';
          }
        });
      });
    };

    // Run once to initialize based on starting scroll
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll as any);
      window.removeEventListener('resize', handleScroll as any);
    };
  }, []);

  const enabledContactSections = sponsorshipSettings?.contactSections?.filter(section => section.enabled) || [];

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Mail;
  };

  const handleBrochureDownload = () => {
    if (sponsorshipSettings?.brochure_url) {
      window.open(sponsorshipSettings.brochure_url, '_blank');
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = eventCategories.find(cat => cat.name === categoryName);
    return category ? category.color : '#6B7280';
  };

  // Check if social media links should be shown
  // social media flags not used on this page currently
  // derived flag was unused; remove to satisfy TypeScript

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* One-time mobile scroll hint */}
      <ScrollHint />
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="sponsors" />

        {/* Floating Particles removed */}

        {/* Glitch Overlay */}
        <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Building className="w-4 h-4 mr-2 animate-pulse" />
              PARTNERSHIPS
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              {(sponsorshipSettings as any)?.page_title || (
                <>OUR <span className="neon-blue">SPONSORS</span></>
              )}
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              {sponsorshipSettings?.intro_text || 'RICORRENZA 2026 is powered by our incredible partners who believe in the future of innovation and technology.'}
            </p>
          </div>
        </div>
      </section>

      {/* Title Sponsors */}
      {titleSponsors.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-8 md:mb-10">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  TITLE <span className="neon-pink">SPONSORS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto expand-width"></div>
                {/* Big animated crown centered under the title */}
                <div className="mt-2 md:mt-3 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-lg scale-125 animate-pulse"></div>
                    <Crown className="relative text-yellow-400 w-16 h-16 md:w-20 md:h-20 animate-pulse pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div
              className={
                titleSponsors.length === 1
                  ? 'grid grid-cols-1 gap-8 place-items-center'
                  : titleSponsors.length === 2
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-8 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
              }
            >
              {titleSponsors.map((sponsor, index) => (
                <div
                  key={sponsor.id}
                  className={`scroll-animate-3d hover-float ${
                    titleSponsors.length === 1
                      ? 'w-full mx-auto md:max-w-2xl lg:max-w-3xl'
                      : titleSponsors.length === 2
                      ? 'w-full mx-auto md:max-w-2xl lg:max-w-3xl'
                      : ''
                  }`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="cyberpunk-card group h-full tilt-3d sponsor-zoom-card card-3d card-glow-hover">
                    <div className="relative p-8">
                      {/* Crown moved to the section header; removed from individual cards */}
                      
                      <div className="flex items-center mb-6">
                        <div
                          className="mr-6 logo-no-bg logo-tier-glow tier-glow-medium tier-pulse sponsor-interactive w-28 h-28 md:w-32 md:h-32 p-2 rounded-xl border-2 border-pink-500/50 group-hover:border-pink-500 transition-colors bg-transparent"
                          style={{
                            ['--tier-glow' as any]: hexToRgba('#FFD700', 0.55),
                            ['--tier-opacity' as any]: 0.55,
                            ['--tier-blur' as any]: '10px',
                            ['--tier-opacity-min' as any]: 0.38,
                            ['--tier-blur-min' as any]: '8px',
                            ['--tier-speed' as any]: '3.2s',
                          }}
                        >
                          <img
                            src={sponsor.logo}
                            alt={sponsor.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white group-hover:text-pink-400 transition-colors break-words">
                            {sponsor.name}
                          </h3>
                          <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full font-bold leading-tight px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm break-words max-w-full">
                            {sponsor.category}
                          </span>
                        </div>
                      </div>
                      
                      {sponsor.description && sponsor.description.trim().length > 0 && (
                        <PreserveNewlines text={sponsor.description} className="text-gray-300 mb-6 leading-relaxed" />
                      )}
                      
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-pink-400 hover:text-pink-300 font-medium transition-colors group"
                        >
                          Visit Website
                          <ExternalLink size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Co Sponsors */}
      {coSponsors.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  CO <span className="neon-blue">SPONSORS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto expand-width"></div>
              </div>
            </div>

            <div
              className={
                coSponsors.length === 1
                  ? 'grid grid-cols-1 gap-8 place-items-center'
                  : coSponsors.length === 2
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-8 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
              }
            >
              {coSponsors.map((sponsor, index) => (
                <div
                  key={sponsor.id}
                  className={`scroll-animate-3d hover-float ${
                    coSponsors.length === 1
                      ? 'w-full mx-auto md:max-w-2xl lg:max-w-3xl'
                      : coSponsors.length === 2
                      ? 'w-full mx-auto md:max-w-2xl lg:max-w-3xl'
                      : ''
                  }`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="cyberpunk-card group h-full tilt-3d sponsor-zoom-card card-3d card-glow-hover">
                    <div className="relative p-8">
                      {/* Star Icon */}
                      <div className="absolute top-4 right-4">
                        <Star className="w-6 h-6 text-blue-400 animate-pulse pulse-ring" />
                      </div>
                      
                      <div className="flex items-center mb-6">
                        <div
                          className="mr-6 logo-no-bg logo-tier-glow tier-glow-medium tier-pulse sponsor-interactive w-28 h-28 md:w-32 md:h-32 p-2 rounded-xl border-2 border-blue-500/50 group-hover:border-blue-500 transition-colors bg-transparent"
                          style={{
                            ['--tier-glow' as any]: hexToRgba('#60A5FA', 0.8),
                            ['--tier-opacity' as any]: 0.7,
                            ['--tier-blur' as any]: '11px',
                            ['--tier-opacity-min' as any]: 0.45,
                            ['--tier-blur-min' as any]: '9px',
                            ['--tier-speed' as any]: '3.4s',
                          }}
                        >
                          <img
                            src={sponsor.logo}
                            alt={sponsor.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors break-words">
                            {sponsor.name}
                          </h3>
                          <span className="inline-block bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-full font-bold leading-tight px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm break-words max-w-full">
                            {sponsor.category}
                          </span>
                        </div>
                      </div>
                      
                      {sponsor.description && sponsor.description.trim().length > 0 && (
                        <PreserveNewlines text={sponsor.description} className="text-gray-300 mb-6 leading-relaxed" />
                      )}
                      
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium transition-colors group"
                        >
                          Visit Website
                          <ExternalLink size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other Sponsors Grid */}
      {otherCategories.length > 0 && (
        <section className="py-20 relative sponsors-zoom-scope">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  PARTNER <span className="neon-purple">NETWORK</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto expand-width"></div>
              </div>
            </div>

            {otherCategories.map((categoryName, categoryIndex) => (
              <div key={categoryName} className="mb-16 last:mb-0">
                <div className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${categoryIndex * 0.1}s` }}>
                  <h3 className="text-3xl font-bold text-center mb-8 neon-purple">
                    {categoryName}
                  </h3>
                </div>
                <div
                  className={(() => {
                    const count = groupedOtherSponsors[categoryName].length;
                    if (count === 1) return 'grid grid-cols-1 gap-6 place-items-center';
                    if (count === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-6 place-items-center';
                    if (count === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
                    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
                  })()}
                >
                  {groupedOtherSponsors[categoryName].sort((a, b) => a.order_position - b.order_position).map((sponsor, index) => (
                    <div
                      key={sponsor.id}
                      className={`scroll-animate-3d hover-float ${
                        groupedOtherSponsors[categoryName].length === 1
                          ? 'w-full mx-auto md:max-w-xl lg:max-w-2xl'
                          : groupedOtherSponsors[categoryName].length === 2
                          ? 'w-full mx-auto md:max-w-xl lg:max-w-2xl'
                          : ''
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="cyberpunk-card group h-full tilt-3d sponsor-zoom-card card-3d card-glow-hover">
                        <div className="p-6">
                          <div className="text-center mb-4">
                            <div
                              className={`logo-no-bg logo-tier-glow tier-pulse sponsor-interactive inline-flex mb-4 w-24 h-24 md:w-28 md:h-28 p-2 rounded-xl border border-purple-500/40 group-hover:border-purple-500 transition-colors bg-transparent tier-glow-${intensityFromTier(sponsor.category)}`}
                              style={{
                                ['--tier-glow' as any]: hexToRgba(getCategoryColor(sponsor.category), 0.78),
                                ['--tier-opacity-min' as any]: 0.42,
                                ['--tier-blur-min' as any]: '8px',
                                ['--tier-speed' as any]: '3.6s',
                              }}
                            >
                              <img
                                src={sponsor.logo}
                                alt={sponsor.name}
                                className="w-full h-full object-contain rounded-lg"
                              />
                            </div>
                            <h4 className="font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                              {sponsor.name}
                            </h4>
                            <span 
                              className="inline-block px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium text-white whitespace-nowrap leading-tight"
                              style={{ backgroundColor: getCategoryColor(sponsor.category) }}
                            >
                              {sponsor.category}
                            </span>
                          </div>
                          
                          {sponsor.description && sponsor.description.trim().length > 0 && (
                            <PreserveNewlines text={sponsor.description} className="text-gray-300 text-sm mb-4 line-clamp-3" />
                          )}
                          
                          {sponsor.website && (
                            <div className="text-center">
                              <a
                                href={sponsor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sponsorship Packages */}
  <section className="py-20 relative sponsors-zoom-scope">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                BECOME A <span className="neon-pink">SPONSOR</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-8 expand-width"></div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join the future of innovation and be part of the most exciting  festival
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {sponsorshipPackages.map((tier, index) => {
              const IconComponent = getIconComponent(tier.icon);
              return (
                <div
                  key={index}
                  className="scroll-animate-3d hover-float"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="cyberpunk-card group h-full tilt-3d sponsor-zoom-card card-3d">
                    <div className={`bg-gradient-to-r ${tier.color} p-6 text-center rounded-t-lg`}>
                      <IconComponent className="w-12 h-12 mx-auto mb-4 text-white pulse-ring" />
                      <h3 className="text-xl font-bold text-white mb-2">{tier.tier}</h3>
                      <div className="text-2xl font-black text-white">{tier.price}</div>
                    </div>
                    <div className="p-6">
                      <ul className="space-y-3">
                        {tier.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-start">
                            <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <span className="text-sm text-gray-300">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* No Sponsorship Packages Fallback */}
      {sponsorshipPackages.length === 0 && (
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  BECOME A <span className="neon-pink">SPONSOR</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Sponsorship packages are being configured. Please check back soon!
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="cyberpunk-card max-w-4xl mx-auto">
            <div className="p-8 md:p-12">
              <div className="scroll-animate opacity-0 transform translate-y-20">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                    {sponsorshipSettings?.call_to_action_text || 'INTERESTED IN SPONSORING?'}
                  </h2>
                  <p className="text-xl text-gray-300">Connect with our sponsorship team</p>
                </div>
                
                {enabledContactSections.length > 0 && (
                  <div className={`grid ${enabledContactSections.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-8 text-center mb-12`}>
                    {enabledContactSections.map((section, index) => {
                      const IconComponent = getIconComponent(section.icon);
                      return (
                        <div key={section.id} className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: `${index * 0.1}s` }}>
                          <div className="mb-4">
                            <IconComponent className="w-8 h-8 mx-auto text-pink-400 pulse-ring" />
                          </div>
                          <div className="font-semibold mb-2 text-white">{section.title}</div>
                          <div className="text-sm text-gray-300">{section.content}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fallback contact info if no contact sections */}
                {enabledContactSections.length === 0 && (
                  <div className="grid md:grid-cols-3 gap-8 text-center mb-12">
                    <div className="scroll-animate opacity-0 transform translate-y-20 hover-float">
                      <div className="mb-4">
                        <Mail className="w-8 h-8 mx-auto text-pink-400 pulse-ring" />
                      </div>
                      <div className="font-semibold mb-2 text-white">Email</div>
                      <div className="text-sm text-gray-300">ricorrenza2025@college.edu</div>
                    </div>
                    <div className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: '0.1s' }}>
                      <div className="mb-4">
                        <Phone className="w-8 h-8 mx-auto text-pink-400 pulse-ring" />
                      </div>
                      <div className="font-semibold mb-2 text-white">Phone</div>
                      <div className="text-sm text-gray-300">+91 98765 43210</div>
                    </div>
                    <div className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: '0.2s' }}>
                      <div className="mb-4">
                        <MapPin className="w-8 h-8 mx-auto text-pink-400 pulse-ring" />
                      </div>
                      <div className="font-semibold mb-2 text-white">Address</div>
                      <div className="text-sm text-gray-300">Medical College Campus</div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <button 
                    onClick={handleBrochureDownload}
                    disabled={!sponsorshipSettings?.brochure_url}
                    className={`cyberpunk-btn cyberpunk-btn-primary text-lg px-8 py-4 hover-float ${
                      !sponsorshipSettings?.brochure_url ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="relative z-10 flex items-center">
                      <Download className="mr-2" size={20} />
                      {sponsorshipSettings?.brochure_title || 'Download Sponsorship Brochure'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

  <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        /* particles CSS removed */
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 2px #ff00ff,
            0 0 4px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 2px #00ffff,
            0 0 4px #00ffff;
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 2px #8a2be2,
            0 0 4px #8a2be2;
        }

        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite alternate;
        }

        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(255, 0, 255, 0.3);
          }
          to {
            box-shadow: 0 0 15px rgba(255, 0, 255, 0.6);
          }
        }

        .glitch-active {
          animation: glitch 0.3s ease-in-out;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .glitch-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 0, 255, 0.1) 50%,
            transparent 100%
          );
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .glitch-overlay.active {
          opacity: 1;
          animation: glitchSweep 0.3s ease-in-out;
        }

        @keyframes glitchSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #ff00ff;
          color: #ff00ff;
          box-shadow: 
            0 0 10px rgba(255, 0, 255, 0.2),
            inset 0 0 10px rgba(255, 0, 255, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(255, 0, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 0, 255, 0.4),
            inset 0 0 20px rgba(255, 0, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .cyberpunk-card:hover::before {
          transform: translateX(0);
        }

        .cyberpunk-card:hover {
          border-color: rgba(255, 0, 255, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(255, 0, 255, 0.1);
          transform: translateY(-5px);
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .hover-float:hover {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .expand-width {
          animation: expandWidth 1s ease-out 0.8s both;
        }

        @keyframes expandWidth {
          from {
            width: 0;
          }
          to {
            width: 8rem;
          }
        }

        .pulse-ring {
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(255, 0, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          /* particles CSS removed */
          
          .cyberpunk-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .cyberpunk-card {
            margin: 0 4px;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }
      `}</style>
    </div>
  );
};