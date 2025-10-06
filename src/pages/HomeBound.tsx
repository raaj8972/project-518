import React, { useEffect, useState } from 'react';
import { Music, Star, Instagram, Youtube, AlignJustify as Spotify, ArrowRight, Mic, Guitar, Headphones, Volume2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import HeroBackground from '../components/HeroBackground';
import { AuditionModal } from '../components/AuditionModal';
import FlipCard, { FlipCardHandle } from '../components/FlipCard';

export const HomeBound: React.FC = () => {
  const { bandMembers, formSettings, homeboundSettings } = useData();
  const [glitchActive, setGlitchActive] = useState(false);
  const [auditionModal, setAuditionModal] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  // Removed hover-heavy reveal interactions to improve mobile scroll usability

  // Filter enabled band members and sort by order
  const enabledBandMembers = (bandMembers || [])
    .filter(member => member.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Get featured members (singers/main performers)
  const featuredMembers = enabledBandMembers.filter(member => member.is_featured);
  const regularMembers = enabledBandMembers.filter(member => !member.is_featured);

  // Detect touch device once on mount
  useEffect(() => {
    try {
      const mq = typeof window !== 'undefined' ? window.matchMedia('(hover: none), (pointer: coarse)') : null;
      const detected = !!(
        (mq && mq.matches) ||
        (typeof window !== 'undefined' && 'ontouchstart' in window)
      );
      setIsTouch(detected);
    } catch {
      setIsTouch(false);
    }
  }, []);

  // Glitch effect trigger (skip on mobile to save battery)
  useEffect(() => {
    if (isTouch) return;
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 12000);
    return () => clearInterval(glitchTimer);
  }, [isTouch]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [enabledBandMembers]);

  // Track mouse position over cards to move the glow (desktop only)
  useEffect(() => {
    if (isTouch) return;
    const handleMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('.glitch-card') as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--mx', `${mx}%`);
      target.style.setProperty('--my', `${my}%`);
    };
    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [isTouch]);

  // Parallax effect (desktop only)
  useEffect(() => {
    if (isTouch) return;
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isTouch]);

  // Check if social media links should be shown
  // Prefer HomeBound-specific Instagram if configured

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="homebound" />

        {/* Floating Particles removed */}

        {/* Glitch Overlay */}
        <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Music className="w-4 h-4 mr-2 animate-pulse" />
               BAND
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              HOME <span className="neon-purple">BOUND</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              The <span className="neon-pink">official band</span> of RICORRENZA 2025, bringing 
              <span className="neon-blue">  beats</span> and 
              <span className="neon-purple">  melodies</span> to life
            </p>
          </div>
        </div>
      </section>

      {/* Featured Members (Singers/Main Performers) */}
      {featuredMembers.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/30 to-blue-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  FEATURED <span className="neon-pink">ARTISTS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Meet the voices and talents that define our  sound
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {featuredMembers.map((member, index) => {
                const cardRef = React.createRef<FlipCardHandle>();
                return (
                <div
                  key={member.id}
                  className="scroll-animate opacity-0 transform translate-y-20"
                  style={{ animationDelay: `${index * 0.3}s` }}
                >
                  <FlipCard
                    className="group glitch-card hover-flip w-full mx-auto md:max-w-xl lg:max-w-[40rem] xl:max-w-[42rem] h-[30rem] md:h-[34rem] lg:h-[40rem] xl:h-[44rem]"
                    ref={cardRef}
                    disableWrapperTap={false}
                    enableClickToggleOnDesktop
                    front={(
                      <div className="relative overflow-hidden w-full h-full">
                        <div className="glitch-bg" aria-hidden="true"></div>
                        <div className="glitch-lines" aria-hidden="true"></div>
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover artist-image"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute top-4 right-4">
                          <Star className="w-6 h-6 text-pink-400 animate-pulse pulse-ring" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
                            FEATURED ARTIST
                          </div>
                        </div>
                        {/* More button */}
                        <button
                          type="button"
                          onClick={(e)=>{ e.stopPropagation(); cardRef.current?.toggle(); }}
                          className="absolute bottom-4 right-4 px-4 py-2 rounded-full text-sm font-semibold text-white more-btn-glow"
                          aria-label="More details"
                        >
                          More
                        </button>
                      </div>
                    )}
                    back={(
                      <div className="w-full h-full bg-gradient-to-b from-black/70 via-black/60 to-black/80">
                        <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-center h-full">
                          <h3 className="text-2xl md:text-3xl font-black text-white mb-2 neon-pink artist-name">{member.name}</h3>
                          <p className="text-lg text-pink-400 mb-3 font-semibold">{member.role}</p>
                          <div className="mb-3">
                            <span className="inline-block bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">{member.specialty}</span>
                          </div>
                          <p className="text-gray-200 mb-4 leading-relaxed text-sm md:text-base">{member.description}</p>
                          {member.social_links && Object.keys(member.social_links).length > 0 && (
                            <div className="flex space-x-4 mb-4 items-center">
                              {member.social_links.instagram && (
                                <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 transition-colors ig-anim" aria-label="Instagram">
                                  <Instagram size={36} />
                                </a>
                              )}
                              {member.social_links.youtube && (
                                <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors" aria-label="YouTube">
                                  <Youtube size={22} />
                                </a>
                              )}
                              {member.social_links.spotify && (
                                <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors" aria-label="Spotify">
                                  <Spotify size={22} />
                                </a>
                              )}
                            </div>
                          )}
                          {/* Back button removed; tap/click card to flip back */}
                        </div>
                      </div>
                    )}
                  />
                </div>
              );})}
             </div>
           </div>
         </section>
       )}

      {/* Band Members Section */}
      {regularMembers.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  BAND <span className="neon-blue">MEMBERS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  The talented musicians and artists behind our  sound
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularMembers.map((member, index) => {
                const cardRef = React.createRef<FlipCardHandle>();
                return (
                <div
                  key={member.id}
                  className="scroll-animate opacity-0 transform translate-y-20 band-card"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <FlipCard
                    className="group overflow-hidden glitch-card hover-flip w-full mx-auto md:max-w-sm lg:max-w-md xl:max-w-lg h-80 md:h-96 lg:h-[28rem]"
                    ref={cardRef}
                    disableWrapperTap={false}
                    enableClickToggleOnDesktop
                    front={(
                      <div className="relative w-full h-full overflow-hidden">
                        <div className="glitch-bg" aria-hidden="true"></div>
                        <div className="glitch-lines" aria-hidden="true"></div>
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover band-member-image"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        {/* Specialty Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pulse-glow">
                            {member.category}
                          </span>
                        </div>
                        {/* Category Badge */}
                        <div className="absolute bottom-4 left-4">
                          <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            {member.specialty}
                          </span>
                        </div>
                        {/* Floating Icon */}
                        <div className="absolute top-4 right-4 floating-icon">
                          <Volume2 className="w-6 h-6 text-cyan-400 animate-pulse" />
                        </div>
                        {/* More button */}
                        <button
                          type="button"
                          onClick={(e)=>{ e.stopPropagation(); cardRef.current?.toggle(); }}
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold text-white more-btn-glow"
                          aria-label="More details"
                        >
                          More
                        </button>
                      </div>
                    )}
                    back={(
                      <div className="w-full h-full bg-gradient-to-b from-black/70 via-black/60 to-black/80">
                        <div className="p-6">
                          <h4 className="text-xl font-bold text-white mb-2 member-name">{member.name}</h4>
                          <p className="text-blue-400 font-semibold mb-3 text-sm">{member.role}</p>
                          <p className="text-gray-200 text-sm leading-relaxed mb-2">{member.description}</p>
                          {/* Back button removed; tap/click card to flip back */}
                        </div>
                      </div>
                    )}
                  />
                </div>
               );
             })}
             </div>
          </div>
        </section>
      )}

      {/* No Band Members Message */}
      {enabledBandMembers.length === 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  BAND <span className="neon-blue">MEMBERS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="cyberpunk-card max-w-md mx-auto p-8">
                <Music size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Band Members Yet</h3>
                <p className="text-gray-500">
                  Band members will be managed through the admin dashboard
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About the Band */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                OUR <span className="neon-purple">SOUND</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-8 expand-width"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Mic, 
                title: 'VOCALS', 
                desc: 'Powerful voices that blend traditional melodies with futuristic electronic beats' 
              },
              { 
                icon: Guitar, 
                title: 'INSTRUMENTS', 
                desc: 'Master musicians creating the perfect fusion of acoustic and digital soundscapes' 
              },
              { 
                icon: Headphones, 
                title: 'PRODUCTION', 
                desc: 'Cutting-edge audio engineering and production that defines our aesthetic' 
              }
            ].map((item, index) => (
              <div key={index} className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="cyberpunk-card group text-center p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:scale-110 transition-transform pulse-ring">
                    <item.icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 neon-text">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Band CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-purple-900/60 to-blue-900/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 cyberpunk-title">
              JOIN THE <span className="neon-pink">BAND</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Become part of Home Bound and help create the soundtrack for RICORRENZA 2025
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.audition_form_enabled ? (
                <button 
                  onClick={() => setAuditionModal(true)}
                  className="cyberpunk-btn cyberpunk-btn-primary group text-lg px-8 py-4 hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Music className="mr-2 group-hover:animate-pulse" size={24} />
                    AUDITION NOW
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                  </span>
                </button>
              ) : (
                <div className="cyberpunk-card p-6 text-center max-w-md">
                  <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Auditions Closed</h3>
                  <p className="text-gray-500 text-sm">
                    {formSettings?.audition_form_message || 'Auditions are currently closed. Please check back later.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

  {/* Audition Modal */}
  {/* HomeBound Instagram Link (footer-like section) */}
      {(homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url) && (
        <section className="py-8 bg-black/60 border-t border-pink-500/20">
          <div className="container mx-auto px-4 text-center">
            <a
              href={homeboundSettings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors"
            >
              <Instagram className="w-6 h-6" />
              <span className="font-medium">Follow Home Bound on Instagram</span>
            </a>
          </div>
        </section>
      )}
      {formSettings?.audition_form_enabled && (
        <AuditionModal
          isOpen={auditionModal}
          onClose={() => setAuditionModal(false)}
        />
      )}

      <style>{`
        /* Flip 3D base (mirrors Events page) */
  .flip-3d { perspective: 1200px; position: relative; }
  .flip-3d-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; -webkit-transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.8,.2,1); z-index: 10; will-change: transform; }
  /* Our FlipCard toggles is-flipped on the inner element */
  .flip-3d-inner.is-flipped { transform: rotateY(180deg); }
  .flip-3d-front, .flip-3d-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: block; will-change: transform; transform: translateZ(0); }
  /* Safari/iOS: explicit 0deg + slight Z nudge to ensure front paints */
  .flip-3d-front { transform: rotateY(0deg) translateZ(0.02px); }
    .flip-3d-back { transform: rotateY(180deg) translateZ(0.02px); }
    @media (max-width: 480px) { .flip-3d { min-height: 18rem; } }

        /* Readability tweaks: reduce neon glow on member names within Home Bound */
        .cyberpunk-theme .artist-name,
        .cyberpunk-theme .member-name {
          /* Remove heavy neon glow that hurts legibility on darker panels */
          text-shadow: none !important;
          filter: none !important;
        }
        /* Provide a very subtle glow only (optional) */
        .cyberpunk-theme .artist-name::selection,
        .cyberpunk-theme .member-name::selection { background: rgba(255, 255, 255, 0.18); }

        /* Hover flip behavior only on hover-capable devices */
        @media (hover: hover) and (pointer: fine) {
          .hover-flip .flip-3d-inner { transition: transform 600ms cubic-bezier(.2,.8,.2,1); }
          /* Only apply hover flip if not already flipped via click */
          .hover-flip:hover .flip-3d-inner:not(.is-flipped) { transform: rotateY(180deg); }
        }

        /* Glitch Hover Effect */
        .glitch-card {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
        }
        /* Reveal behavior */
        .reveal-card { position: relative; }
        .reveal-card .reveal-details {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.22));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transform: translateY(5%);
          opacity: 0;
          pointer-events: none;
          transition: transform .35s ease, opacity .35s ease;
          border-radius: 12px;
          display: flex;
          overflow: auto;
          /* scroll hint */
          position: absolute;
        }
        .reveal-card:hover .reveal-details,
        .reveal-card.revealed .reveal-details {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .reveal-trigger { cursor: pointer; }
        .reveal-close {
          position: absolute; top: 8px; right: 10px; z-index: 50;
          width: 40px; height: 40px; border-radius: 9999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.45); color: #fff; font-size: 22px; line-height: 1;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 4px 14px rgba(0,0,0,0.35), 0 0 10px rgba(236,72,153,0.35);
          backdrop-filter: blur(4px);
        }
        .reveal-close:active { transform: scale(0.95); }
        @media (max-width: 768px) {
          .reveal-card .reveal-details { transform: translateY(7%); padding-bottom: 20px; padding-top: 60px; }
        }
        /* Ensure names are always visible, especially on mobile */
        .reveal-card .reveal-details .artist-name,
        .reveal-card .reveal-details .member-name {
          color: #ffffff !important;
          opacity: 1 !important;
          visibility: visible !important;
          text-shadow: 0 0 6px rgba(255, 0, 200, 0.6), 0 0 14px rgba(255, 0, 200, 0.35);
          /* normal flow, not sticky */
          position: relative;
          padding-top: 4px;
          padding-bottom: 8px;
          background: transparent;
        }
        /* Instagram icon animation */
        .ig-anim { position: relative; display:inline-flex; }
  .ig-anim svg { filter: drop-shadow(0 0 6px rgba(236,72,153,0.5)); transition: transform .22s ease, color .22s ease; }
        .ig-anim::after {
          content: '';
          position: absolute; inset: -6px; border-radius: 9999px;
          border: 1px solid rgba(236,72,153,0.35);
          opacity: 0; transform: scale(0.9);
          transition: all .35s ease;
        }
        .ig-anim:hover::after { opacity: 1; transform: scale(1); }
        .ig-anim:hover svg { filter: drop-shadow(0 0 10px rgba(236,72,153,0.8)); }
  .ig-anim.ig-click svg { animation: igBounce .5s ease; color: #ff6ad5; }
  .ig-anim.ig-click::after { opacity: 1; transform: scale(1.25); animation: igRipple .55s ease; }
        @keyframes igBounce {
          0% { transform: scale(1); }
          25% { transform: scale(0.88); }
          60% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes igRipple {
          0% { opacity: 0.9; transform: scale(0.85); }
          100% { opacity: 0; transform: scale(1.45); }
        }
        /* create space under sticky header so next text doesn't feel overlapped */
        .reveal-card .reveal-details .artist-name + p,
        .reveal-card .reveal-details .member-name + p {
          margin-top: 6px;
        }
        /* Bottom scroll hint */
        .reveal-card .reveal-details::after {
          content: '';
          position: sticky;
          bottom: 0;
          display: block;
          height: 36px;
          background: linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0));
          pointer-events: none;
        }
        .glitch-card .glitch-bg {
          position: absolute;
          inset: -20%;
          background: radial-gradient(800px 400px at var(--mx, 60%) var(--my, 60%), rgba(96, 165, 250, 0.22), transparent 60%),
                      radial-gradient(600px 300px at calc(var(--mx, 40%)) calc(var(--my, 40%)), rgba(236, 72, 153, 0.18), transparent 60%);
          filter: blur(18px) saturate(120%);
          opacity: 0;
          transform: translateZ(0);
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .glitch-card:hover .glitch-bg { opacity: 1; }
        .glitch-card .glitch-lines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.05) 0px,
            rgba(255,255,255,0.05) 1px,
            transparent 2px,
            transparent 4px
          );
          mix-blend-mode: overlay;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .glitch-card:hover .glitch-lines { opacity: 0.35; animation: scan 2.2s linear infinite; }
        @keyframes scan {
          0% { transform: translateY(-10%); }
          100% { transform: translateY(10%); }
        }
        .glitch-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.35), 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(236, 72, 153, 0.25);
          border-color: rgba(236, 72, 153, 0.5);
        }
        /* Track mouse for glow position */
        .glitch-card { --mx: 50%; --my: 50%; }
        .glitch-card:hover { cursor: pointer; }

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
          }
          90% {
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

        .neon-text {
          color: #00ffff;
          text-shadow: 
            0 0 2px #00ffff,
            0 0 4px #00ffff;
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

        .glow-text {
          text-shadow: 
            0 0 2px currentColor,
            0 0 4px currentColor;
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

        /* Neon glow for More/Back buttons */
        .more-btn-glow {
          position: relative;
          background: rgba(0, 0, 0, 0.38);
          border: 1px solid rgba(236, 72, 153, 0.45); /* pink */
          border-radius: 9999px;
          box-shadow:
            0 0 0 1px rgba(168, 85, 247, 0.28) inset,  /* purple inner */
            0 0 12px rgba(236, 72, 153, 0.35),        /* pink glow */
            0 0 24px rgba(59, 130, 246, 0.22);         /* blue glow */
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          text-shadow: 0 0 6px rgba(255,255,255,0.35);
          transition: transform .18s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease;
        }
        .more-btn-glow::before {
          content: '';
          position: absolute; inset: -6px;
          border-radius: inherit;
          background:
            radial-gradient(75% 75% at var(--mx, 60%) var(--my, 40%), rgba(236,72,153,0.25), transparent 60%),
            radial-gradient(75% 75% at calc(var(--mx, 40%)) calc(var(--my, 60%)), rgba(59,130,246,0.20), transparent 60%);
          filter: blur(12px);
          opacity: 0; pointer-events: none;
          transition: opacity .28s ease;
        }
        .more-btn-glow:hover,
        .more-btn-glow:focus-visible {
          transform: translateY(-1px) scale(1.02);
          border-color: rgba(236, 72, 153, 0.7);
          box-shadow:
            0 0 0 1px rgba(236, 72, 153, 0.45) inset,
            0 0 16px rgba(236, 72, 153, 0.55),
            0 0 32px rgba(59, 130, 246, 0.35);
        }
        .more-btn-glow:hover::before,
        .more-btn-glow:focus-visible::before { opacity: 1; }
        .more-btn-glow:active { transform: translateY(0) scale(0.98); }
        .more-btn-glow:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 2px rgba(255,255,255,0.20),
            0 0 0 4px rgba(236, 72, 153, 0.45),
            0 0 22px rgba(236, 72, 153, 0.55);
        }
        .more-btn-glow.pulse { animation: btnPulse 2.2s ease-in-out infinite; }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.26) inset, 0 0 10px rgba(236, 72, 153, 0.32), 0 0 20px rgba(59, 130, 246, 0.18); }
          50%      { box-shadow: 0 0 0 1px rgba(236, 72, 153, 0.40) inset, 0 0 16px rgba(236, 72, 153, 0.50), 0 0 30px rgba(59, 130, 246, 0.30); }
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

        .scroll-animate { transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .scroll-animate.animate-in { opacity: 1 !important; transform: translateY(0) !important; }
        @media (max-width: 768px) {
          /* Mobile fallback if IntersectionObserver timing delays the reveal */
          .scroll-animate { opacity: 1 !important; transform: none !important; }
        }

        /* Limit hover float to hover-capable devices to avoid scroll issues on mobile */
        @media (hover: hover) and (pointer: fine) {
          .hover-float:hover { animation: float 3s ease-in-out infinite; }
          .group:hover .band-member-image { transform: none; }
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

        /* Featured Artist Specific Styles */
        .featured-artist {
          position: relative;
          overflow: hidden;
        }

        .featured-artist::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 0, 255, 0.05) 50%, transparent 70%);
          animation: artistShine 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes artistShine {
          0%, 100% { transform: translateX(-100%) rotate(45deg); }
          50% { transform: translateX(100%) rotate(45deg); }
        }

        .artist-image {
          transition: all 0.5s ease;
          filter: grayscale(20%) contrast(110%);
        }

        .featured-artist:hover .artist-image {
          filter: grayscale(0%) contrast(120%);
          transform: scale(1.05);
        }

        .artist-name {
          animation: nameGlow 3s ease-in-out infinite alternate;
        }

        @keyframes nameGlow {
          from {
            text-shadow: 
              0 0 2px #ff00ff,
              0 0 4px #ff00ff;
          }
          to {
            text-shadow: 
              0 0 4px #ff00ff,
              0 0 8px #ff00ff,
              0 0 12px #ff00ff;
          }
        }

        /* Band Member Specific Styles */
        .band-card {
          position: relative;
        }

        .band-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
          z-index: 1;
        }

        @media (hover: hover) and (pointer: fine) {
          .band-card:hover::before { opacity: 1; animation: bandCardSweep 1s ease-in-out; }
          .band-card:hover .member-name::after { width: 100%; }
        }

        @keyframes bandCardSweep {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .band-member-image {
          filter: grayscale(30%) contrast(110%);
          transition: all 0.5s ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .band-card:hover .band-member-image { filter: grayscale(0%) contrast(120%); }
        }

        .member-name {
          position: relative;
          overflow: hidden;
        }

        .member-name::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #00ffff, #ff00ff);
          transition: width 0.5s ease;
        }

        /* member-name underline grows on hover only on hover devices (handled above) */

        .floating-icon {
          animation: floatingIcon 3s ease-in-out infinite;
        }

        @keyframes floatingIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }

        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite alternate;
        }

        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }
          to {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
          }
        }

        .achievement-item {
          opacity: 0;
          animation: achievementSlideIn 0.6s ease-out forwards;
        }

        @keyframes achievementSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
          
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
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
          
          .container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
        }
      `}</style>

      {/* Interactions handled by useRevealCardInteractions() */}
    </div>
  );
};