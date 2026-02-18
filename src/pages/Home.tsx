import React, { useState, useEffect, startTransition, useCallback, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Calendar, Users, ArrowRight, Zap, Sparkles, Crown, Instagram, Youtube, Music2, X as XIcon, Ticket } from 'lucide-react';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';


import { useData } from '../context/DataContext';
import { MembershipModal } from '../components/MembershipModal';
import HeroBackground from '../components/HeroBackground';
const LogoLoop = React.lazy(() => import('../components/LogoLoop'));
const InfiniteMarquee = React.lazy(() => import('../components/InfiniteMarquee'));
import { getDominantColor } from '../utils/getDominantColor';
const CoverflowCarousel = React.lazy(() => import('../components/CoverflowCarousel')) as unknown as React.ComponentType<any>;
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal'));
const GuestArtistVideoModal = React.lazy(() => import('../components/GuestArtistVideoModal'));
const GuestArtistDetailModal = React.lazy(() => import('../components/GuestArtistDetailModal'));
const AutoCarousel = React.lazy(() => import('../components/AutoCarousel'));
import type { GuestArtist } from '../context/DataContext';
const Roadmap = React.lazy(() => import('../components/Roadmap'));
const WinnersSection = React.lazy(() => import('../components/WinnersSection'));
const InstagramTrailerSection = React.lazy(() => import('../components/InstagramTrailerSection'));
// CountdownTimer and Sparkle3D are not used in the featured artist card preview; keep them commented out in case we re-enable later
// import CountdownTimer from '../components/CountdownTimer';
// import Sparkle3D from '../components/Sparkle3D';
import PreserveNewlines from '../components/PreserveNewlines';

import FeaturedArtistCard from '../components/FeaturedArtistCard';
import { SEO } from '../components/SEO';



export const Home: React.FC = () => {
  // Error boundary to catch dynamic-import chunk load failures and offer a reload
  class ChunkErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children: React.ReactNode }, { hasError: boolean; error: any }>{
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
    componentDidCatch(error: any) { try { console.error('Chunk load failed:', error); } catch {}
    }
    render() {
      if (this.state.hasError) {
        return this.props.fallback || (
          <div className="p-4 text-sm text-red-300 bg-red-900/30 border border-red-800 rounded">
            Failed to load module. This can happen after a rebuild. Please reload the page.
            <button
              onClick={() => window.location.reload()}
              className="ml-3 inline-flex items-center px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
            >Reload</button>
          </div>
        );
      }
      return this.props.children as any;
    }
  }
  const location = useLocation();
  const { 
    events, 
    galleryImages, 
    sponsors,
  guestArtists, 
  chiefGuests,
  facultyHeads,
  coreTeamMembers,
  coreCommittees,
    socialMediaSettings, 
    homepageSettings,
    formSettings,
    aboutSettings,
    securitySettings,
    loading
  } = useData();
  
  // Debug logs to diagnose loading issues
  console.log('Home component render - Loading state:', loading);
  console.log('Home component render - Events count:', events?.length || 0);
  console.log('Home component render - Homepage settings:', homepageSettings);
  console.log('Home component render - Form settings:', formSettings);
  console.log('Home component render - All data:', {
    events: events?.length || 0,
    galleryImages: galleryImages?.length || 0,
    sponsors: sponsors?.length || 0,
    guestArtists: guestArtists?.length || 0,
    facultyHeads: facultyHeads?.length || 0,
    socialMediaSettings: !!socialMediaSettings,
    homepageSettings: !!homepageSettings,
    formSettings: !!formSettings,
    securitySettings: !!securitySettings
  });
  
  
  const [membershipModal, setMembershipModal] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedArtistForVideo, setSelectedArtistForVideo] = useState<GuestArtist | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Selected artist for the detail modal
  const [detailArtist, setDetailArtist] = useState<GuestArtist | null>(null);
  const [glitchActive] = useState(false);
  // Defer mounting heavy interactive sections until browser is idle to improve initial load
  const [showInteractive, setShowInteractive] = useState(false);
  
  useEffect(() => {
    let idleId: number | null = null;
    if (typeof (window as any).requestIdleCallback === 'function') {
      idleId = (window as any).requestIdleCallback(() => setShowInteractive(true), { timeout: 500 });
      return () => { if (idleId != null) (window as any).cancelIdleCallback(idleId); };
    }
    const t = setTimeout(() => setShowInteractive(true), 350);
    return () => clearTimeout(t);
  }, []);

  // Prefetch lazy modals on hover to avoid input-time Suspense
  const prefetchDetailModal = () => {
    import('../components/GuestArtistDetailModal').catch(() => {});
  };
  const prefetchVideoModal = () => {
    import('../components/GuestArtistVideoModal').catch(() => {});
  };
  
  // Prefetch some lazy components shortly after mount so interactions feel snappy
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
  prefetchDetailModal();
  prefetchVideoModal();
  import('../components/FacultyProfileModal').catch(() => {});
  import('../components/AutoCarousel').catch(() => {});
      } catch (e) {
        // ignore
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'faculty' | 'committee' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clicked, setClicked] = useState<{ type: 'faculty' | 'committee'; id: number } | null>(null);
  const [facultyPaused, setFacultyPaused] = useState(false);
  const [committeePaused, setCommitteePaused] = useState(false);
  // Chief Guest modal state
  const [chiefGuestModalOpen, setChiefGuestModalOpen] = useState(false);
  const [selectedChiefGuest, setSelectedChiefGuest] = useState<any | null>(null);

  const detailAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopDetailAudio = useCallback(() => {
    const player = detailAudioRef.current;
    if (!player) return;
    try {
      player.pause();
      player.currentTime = 0;
    } catch {}
  }, []);

  const primeDetailAudio = useCallback((url?: string | null, userInitiated?: boolean) => {
    const src = (url || '').trim();
    if (!src) {
      stopDetailAudio();
      return;
    }
    if (!userInitiated) {
      // Avoid autoplaying without a user gesture to satisfy Safari/iOS policies.
      stopDetailAudio();
      return;
    }
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    let player = detailAudioRef.current;
    if (!player) {
      player = new Audio();
      player.preload = 'auto';
      detailAudioRef.current = player;
    }
    try {
      player.pause();
    } catch {}
    if (player.src !== src) {
      player.src = src;
    }
    player.loop = true;
    try {
      player.currentTime = 0;
    } catch {}
    import('../utils/safePlay').then(({ default: safePlay }) => safePlay(player)).catch(() => { try { player.play(); } catch {} });
  }, [stopDetailAudio]);

  useEffect(() => () => {
    stopDetailAudio();
  }, [stopDetailAudio]);

  const openDetailModal = useCallback((artist: GuestArtist, options?: { userInitiated?: boolean }) => {
    if (!artist) return;
    primeDetailAudio((artist as any)?.detail_music_url, options?.userInitiated ?? false);
    startTransition(() => {
      setDetailArtist(artist);
      setDetailOpen(true);
    });
  }, [primeDetailAudio]);

  const closeDetailModal = useCallback(() => {
    stopDetailAudio();
    startTransition(() => {
      setDetailOpen(false);
      setDetailArtist(null);
    });
  }, [stopDetailAudio]);

  // Heads data and memoized sorted lists (must be before any early return)
  const enabledFacultyHeads = facultyHeads.filter(head => head.enabled && head.image && head.image.trim() !== '');
  const committeeHeads = coreTeamMembers.filter(m => m.enabled && m.is_head && !(m as any).isCouncil && m.image && m.image.trim() !== '');
  // Council members (non-head) are also part of leadership marquee
  const councilMembers = coreTeamMembers.filter(m => m.enabled && (m as any).isCouncil && !m.is_head && m.image && m.image.trim() !== '');
  const sortedFacultyHeads = React.useMemo(() => enabledFacultyHeads.slice().sort((a, b) => a.order_position - b.order_position), [enabledFacultyHeads]);
  // Sorted full list of heads for display and navigation
  const sortedCommitteeHeads = React.useMemo(() => (
    [...committeeHeads, ...councilMembers]
      .slice()
      .sort((a, b) => (a.order_position ?? 0) - (b.order_position ?? 0))
  ), [committeeHeads, councilMembers]);

  // Keyboard navigation within the profile modal (place before early return)
  useEffect(() => {
    if (!facultyModalOpen || selectedType == null || selectedIndex == null) return;
    const handler = (e: KeyboardEvent) => {
  const list = selectedType === 'faculty' ? sortedFacultyHeads : sortedCommitteeHeads;
      if (!list || list.length === 0) return;
      if (e.key === 'ArrowRight') {
        const next = (selectedIndex + 1) % list.length;
        setSelectedIndex(next);
        setSelectedPerson(list[next]);
      } else if (e.key === 'ArrowLeft') {
        const prev = (selectedIndex - 1 + list.length) % list.length;
        setSelectedIndex(prev);
        setSelectedPerson(list[prev]);
      } else if (e.key === 'Escape') {
        setFacultyModalOpen(false);
        setFacultyPaused(false);
        setCommitteePaused(false);
        setSelectedPerson(null);
        setSelectedType(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [facultyModalOpen, selectedType, selectedIndex, sortedFacultyHeads, sortedCommitteeHeads]);

  // Reveal-on-scroll observer (robust to lazy-loaded content)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('animate-in');
          try { observer.unobserve(entry.target); } catch {}
        }
      });
    }, { threshold: 0.12 });

    const attach = () => {
      const nodes = document.querySelectorAll('.scroll-animate, .scroll-animate-3d');
      nodes.forEach((el) => {
        const node = el as HTMLElement & { __observed?: boolean };
        if (!node.__observed) {
          observer.observe(node);
          node.__observed = true;
        }
      });
    };

    attach();
    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 300);

    try {
      const nodesNow = Array.from(document.querySelectorAll('.scroll-animate, .scroll-animate-3d')) as HTMLElement[];
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      nodesNow.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.top < viewportH * 0.9) {
          n.classList.add('animate-in');
          try { (n as any).__observed = true; } catch {}
        }
      });
    } catch (e) { /* ignore */ }

    const safetyTimer = setTimeout(() => {
      document.querySelectorAll('.scroll-animate, .scroll-animate-3d').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
    }, 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safetyTimer); observer.disconnect(); };
  // Re-run when loading flips or data collections change size (new DOM nodes likely)
  }, [loading, events.length, galleryImages.length, sponsors.length, guestArtists.length]);

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
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If navigated with #artist-<id>, try to find and scroll to the artist card and open the detail modal
  useEffect(() => {
    const hash = location.hash;
    if (!hash || !hash.startsWith('#artist-')) return;
    const idStr = hash.replace('#artist-', '');
    const artistId = Number(idStr);
    if (!artistId || !guestArtists?.length) return;
    const artist = guestArtists.find(a => a.id === artistId);
    if (artist) {
      openDetailModal(artist as any, { userInitiated: false });
      // Try to scroll a tile into view if it has the anchor id
      const tile = document.getElementById(`artist-${artistId}`);
      if (tile) setTimeout(() => tile.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [location.hash, guestArtists?.length, openDetailModal]);

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="cyberpunk-theme min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="cyberpunk-spinner mb-6"></div>
          <h2 className="text-2xl font-bold cyberpunk-title mb-4">LOADING RICORRENZA</h2>
          <p className="text-cyan-300 font-mono">Initializing experience...</p>
        </div>
        
        <style>{`
          .cyberpunk-theme {
            background: #0a0a0a;
            color: #ffffff;
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
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

          .cyberpunk-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid transparent;
            border-top: 4px solid #00ffff;
            border-right: 4px solid #ff00ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Filter for featured content
  const featuredEvents = events.filter(event => event.featured && event.visible !== false);
  const featuredImages = galleryImages.filter(image => image.featured);
  const featuredSponsors = sponsors.filter(sponsor => sponsor.featured);
  const featuredGuestArtists = guestArtists.filter(artist => artist.is_featured && artist.enabled);
  const hasManyEvents = events.length > 6;
  const hasManyImages = galleryImages.length > 9;
  const hasManySponsors = sponsors.length > 8;
  

  // Check if social media links should be shown
  // const showInstagram = socialMediaSettings?.instagramEnabled && socialMediaSettings?.instagramUrl;
  // const showYoutube = socialMediaSettings?.youtubeEnabled && socialMediaSettings?.youtubeUrl;

  return (
    <div className="superia-mesh-glow min-h-screen text-white overflow-x-hidden">
      <style>{`
        .superia-mesh-glow {
          background-color: #030712;
          background-image: 
            radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.1) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(245, 158, 11, 0.05) 0px, transparent 50%);
        }
        .superia-title-gradient {
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 30px rgba(99, 102, 241, 0.3));
        }
        .superia-btn-glass {
          @apply relative px-8 py-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 
                 text-white font-bold tracking-widest uppercase text-sm transition-all duration-300
                 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)];
        }
        .superia-btn-primary {
          @apply bg-indigo-600/20 border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500/50 hover:shadow-[0_20px_40px_rgba(79,70,229,0.2)];
        }
      `}</style>
      <SEO />
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Media via unified component */}
        <HeroBackground pageKey="home" />

        {/* Floating Particles removed */}

        {/* Glitch Overlay */}
        <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate-3d animate-in-3d">
            <div className="inline-flex items-center bg-white/[0.03] backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-indigo-300/80">
              <Sparkles className="w-3.5 h-3.5 mr-2.5 text-indigo-400" />
              ANNUAL FESTIVAL {BRAND_YEAR}
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 superia-title-gradient tracking-tighter leading-none">
              {homepageSettings?.hero_title || 'RICORRENZA'}
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-medium max-w-4xl mx-auto leading-relaxed mb-6 text-white/90">
              {homepageSettings?.hero_subtitle || 'Experience the Future'}
            </p>
            <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed mb-12 font-light">
              {homepageSettings?.hero_description || 'Where Healthcare meets Technology and Creativity'}
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-6">
              <a
                href="/events"
                className="superia-btn-glass superia-btn-primary group"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Calendar className="w-5 h-5 transition-transform group-hover:scale-110" />
                  Explore Events
                </span>
              </a>
              
              {securitySettings?.entry_pass_button_enabled && (
                <Link
                  to="/pass-registration"
                  className="superia-btn-glass group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Ticket className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Entry Pass
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sponsor Logos Section */}
        {homepageSettings?.sponsor_section_enabled && sponsors && sponsors.filter(s => s.logo && s.logo.trim() !== '').length > 0 && (
          <div className="absolute bottom-8 left-0 right-0 z-10">
            <div className="text-center">
              <p className="text-gray-100 text-lg sm:text-xl md:text-2xl font-semibold mb-4 font-mono text-glow-strong text-glow-pulse">
                {homepageSettings.sponsor_section_text || 'OUR PARTNERS'}
              </p>
              
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 px-2 sm:px-4 animate-in fade-in zoom-in duration-700">
                {sponsors
                  .filter(s => s.logo && s.logo.trim() !== '' && s.category === 'Title Sponsor')
                  .map((sponsor) => (
                    <div key={sponsor.id} className="relative group p-2">
                      {/* Glow effect behind the logo */}
                      <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {sponsor.website ? (
                        <a 
                          href={sponsor.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative block transform transition-transform duration-300 group-hover:scale-105"
                          title={sponsor.name}
                        >
                          <img 
                            src={sponsor.logo} 
                            alt={sponsor.name} 
                            className="h-16 sm:h-20 md:h-24 lg:h-32 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300"
                          />
                        </a>
                      ) : (
                        <div className="relative transform transition-transform duration-300 group-hover:scale-105" title={sponsor.name}>
                          <img 
                            src={sponsor.logo} 
                            alt={sponsor.name} 
                            className="h-16 sm:h-20 md:h-24 lg:h-32 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Instagram Trailer Section */}
      {homepageSettings?.instagram_trailer_enabled && homepageSettings?.instagram_trailer_url && (
        <React.Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400">Loading trailer...</div>}>
          <InstagramTrailerSection
            url={homepageSettings.instagram_trailer_url}
            title={homepageSettings.instagram_trailer_title || 'OFFICIAL TRAILER'}
            subtitle={homepageSettings.instagram_trailer_subtitle || 'Watch our official event trailer'}
          />
        </React.Suspense>
      )}

      {/* Instagram Aftermovie Section */}
      {homepageSettings?.instagram_aftermovie_enabled && homepageSettings?.instagram_aftermovie_url && (
        <React.Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400">Loading aftermovie...</div>}>
          <InstagramTrailerSection
            url={homepageSettings.instagram_aftermovie_url}
            title={homepageSettings.instagram_aftermovie_title || 'EVENT AFTERMOVIE'}
            subtitle={homepageSettings.instagram_aftermovie_subtitle || 'Relive the best moments from our event'}
          />
        </React.Suspense>
      )}

      {/* Featured Guest Artists */}

      {featuredGuestArtists.length > 0 && (
      <section className="pt-28 pb-14 md:pt-36 md:pb-20 relative overflow-hidden">
          <div className="container mx-auto px-0 sm:px-4 relative z-10">
            <div className="scroll-animate-3d">
              <div className="text-center mb-10 md:mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient">
                  FEATURED ARTISTS
                </h2>
                <div className="w-24 h-1 bg-indigo-500/50 mx-auto mb-8 rounded-full"></div>
                <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto font-light">
                  Meet the incredible artists who will light up {BRAND_NAME} {BRAND_YEAR}
                </p>
              </div>
            </div>

            {showInteractive ? (
              <React.Suspense fallback={<div className="h-[420px] flex items-center justify-center text-gray-400">Preparing featured artists…</div>}>
              <CoverflowCarousel
                items={featuredGuestArtists}
                intervalMs={3200}
                paused={detailOpen || videoModalOpen}
                visibleRange={2}
                pauseOnHover={true}
                pauseOnTouch={true}
                showArrows={true}
                showDots={false}
                onItemClick={(artist: GuestArtist) => openDetailModal(artist, { userInitiated: true })}
                className="mt-6 md:mt-8"
                stageHeight={'var(--featured-stage-height)'}
                renderItem={(artist: GuestArtist, _: number, isActive: boolean) => (
                  <div className="w-[340px] sm:w-[400px] md:w-[450px] lg:w-[500px] h-full px-2 py-4 flex items-center justify-center">
                       <FeaturedArtistCard 
                         artist={artist}
                         priority={isActive}
                         onClick={() => openDetailModal(artist, { userInitiated: true })}
                         onPlayVideo={(a: GuestArtist) => {
                           startTransition(() => {
                             setSelectedArtistForVideo(a);
                             setVideoModalOpen(true);
                           });
                         }}
                         onMouseEnter={prefetchDetailModal}
                       />
                  </div>
                )}
              />
              </React.Suspense>
            ) : (
              <div className="h-[420px] flex items-center justify-center text-gray-400">Preparing featured artists…</div>
            )}
          </div>
        </section>
      )}

      {/* Winners Section */}
      <React.Suspense fallback={null}>
        <WinnersSection />
      </React.Suspense>

      {/* Chief Guest Section (moved below Featured Artists) */}
  {chiefGuests && chiefGuests.filter((c: any)=>c.enabled).length > 0 && (() => {
        const enabledChiefs = chiefGuests.filter((c: any)=>c.enabled);
        const multi = enabledChiefs.length > 1;
        return (
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-indigo-900/30 to-purple-900/20"></div>
            <div className="container mx-auto px-0 relative z-10">
            <div className="scroll-animate-3d">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient">
                    CHIEF GUEST{multi ? 'S' : ''}
                  </h2>
                  <div className="w-24 h-1 bg-blue-500/40 mx-auto mb-8 rounded-full" />
                  <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto font-light">
                    {multi ? 'Honoring our distinguished chief guests' : 'Honoring our distinguished chief guest'} for {BRAND_NAME} {BRAND_YEAR}
                  </p>
                </div>
              </div>
              {multi ? (
                <React.Suspense fallback={<div className="h-[200px] flex items-center justify-center text-gray-400">Loading…</div>}>
                <div className="max-w-6xl mx-auto">
                <AutoCarousel intervalMs={5500} showArrows showDots className="pt-2" paused={detailOpen || videoModalOpen}>
                  {enabledChiefs.map((cg: any) => (
                    <div
                      key={cg.id}
                      onClick={() => { startTransition(() => { setSelectedChiefGuest(cg); setChiefGuestModalOpen(true); }); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); startTransition(() => { setSelectedChiefGuest(cg); setChiefGuestModalOpen(true); }); } }}
                      className="cursor-pointer w-[260px] sm:w-[300px] md:w-[340px] flex flex-col bg-gradient-to-br from-blue-900/40 via-black/50 to-purple-900/40 backdrop-blur-md rounded-xl shadow-xl ring-1 ring-blue-500/30 overflow-hidden group relative hover:ring-blue-400/50 transition"
                    >
                      <div className="relative h-56 sm:h-60 overflow-hidden">
                        <img loading="lazy" decoding="async" src={cg.image} alt={cg.name} className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {cg.specialty && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-70" />
                            <span>{cg.specialty}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg font-extrabold text-white mb-1 tracking-wide group-hover:text-blue-300 transition-colors line-clamp-2">{cg.name}</h3>
                          <p className="text-xs font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 line-clamp-1">{cg.title}</p>
                          <PreserveNewlines text={cg.description} className="text-gray-300 leading-relaxed text-[11px] line-clamp-5" />
                        </div>
                        {cg.achievements && cg.achievements.length > 0 && (
                          <div>
                            <p className="uppercase text-[9px] tracking-wider font-bold text-blue-400 mb-1">Key Highlights</p>
                            <ul className="space-y-1 text-[10px] text-gray-400 list-disc list-inside">
                              {cg.achievements.slice(0, 4).map((a: string, i: number)=>(<li key={i}>{a}</li>))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap mt-auto pt-1">
                          {cg.social_links?.instagram && (
                            <a title="Instagram" href={cg.social_links.instagram} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors">
                              <Instagram className="w-3 h-3" />
                              <span className="hidden sm:inline">Insta</span>
                            </a>
                          )}
                          {cg.social_links?.youtube && (
                            <a title="YouTube" href={cg.social_links.youtube} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors">
                              <Youtube className="w-3 h-3" />
                              <span className="hidden sm:inline">YouTube</span>
                            </a>
                          )}
                          {cg.social_links?.spotify && (
                            <a title="Spotify" href={cg.social_links.spotify} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors">
                              <Music2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Spotify</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </AutoCarousel>
                </div>
                </React.Suspense>
              ) : (
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
                  {enabledChiefs.map((cg: any) => (
                    <React.Fragment key={cg.id}>
                      <div className="relative group overflow-hidden rounded-xl shadow-xl ring-1 ring-blue-500/30 bg-gradient-to-br from-blue-900/40 via-black/50 to-purple-900/40 backdrop-blur-md">
                        <div className="relative h-80 overflow-hidden">
                          <img loading="lazy" decoding="async" src={cg.image} alt={cg.name} className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          {cg.specialty && (
                            <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-70" />
                              <span>{cg.specialty}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-wide">
                            {cg.name}
                          </h3>
                          <p className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                            {cg.title}
                          </p>
                          <PreserveNewlines text={cg.description} className="text-gray-300 leading-relaxed text-sm md:text-base line-clamp-6 md:line-clamp-none" />
                        </div>
                        {cg.achievements && cg.achievements.length > 0 && (
                          <div>
                            <p className="uppercase text-[11px] tracking-wider font-bold text-blue-400 mb-2">Key Highlights</p>
                            <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside">
                              {cg.achievements.slice(0,6).map((a: string, i: number)=>(<li key={i}>{a}</li>))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-3">
                          {cg.social_links?.instagram && (
                            <a href={cg.social_links.instagram} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors inline-flex items-center gap-1">
                              <Instagram className="w-4 h-4" /> Instagram
                            </a>
                          )}
                          {cg.social_links?.youtube && (
                            <a href={cg.social_links.youtube} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors inline-flex items-center gap-1">
                              <Youtube className="w-4 h-4" /> YouTube
                            </a>
                          )}
                          {cg.social_links?.spotify && (
                            <a href={cg.social_links.spotify} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors inline-flex items-center gap-1">
                              <Music2 className="w-4 h-4" /> Spotify
                            </a>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {videoModalOpen && (
        <ChunkErrorBoundary>
          <React.Suspense fallback={null}>
            <GuestArtistVideoModal
              isOpen={videoModalOpen}
              onClose={() => { startTransition(() => { setVideoModalOpen(false); setSelectedArtistForVideo(null); }); }}
              artist={selectedArtistForVideo}
            />
          </React.Suspense>
        </ChunkErrorBoundary>
      )}
      {detailOpen && (
        <ChunkErrorBoundary>
          <React.Suspense fallback={null}>
            <GuestArtistDetailModal
              isOpen={detailOpen}
              onClose={closeDetailModal}
              artist={detailArtist}
            />
          </React.Suspense>
        </ChunkErrorBoundary>
      )}

    {/* Featured Events */}
      {featuredEvents.length > 0 && (
  <section className="py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
      <div className="container mx-auto px-0 relative z-10">
            <div className="scroll-animate-3d">
              <div className="text-center mb-14">
                <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient">
                  FEATURED EVENTS
                </h2>
                <div className="w-24 h-1 bg-indigo-500/50 mx-auto mb-8 rounded-full"></div>
                <p className="text-xl text-white/60 max-w-3xl mx-auto font-light">
                  Don't miss these highlighted experiences at {BRAND_NAME} {BRAND_YEAR}
                </p>
                {hasManyEvents && (
                  <div className="mt-8">
                    <a href="/events" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest text-xs">
                      View all events <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 2D Slider for events using AutoCarousel */}
            <ChunkErrorBoundary fallback={<div className="h-[200px] flex items-center justify-center text-red-300 bg-red-900/30 border border-red-800 rounded">Failed to load slider. <button onClick={() => window.location.reload()} className="ml-2 underline">Reload</button></div>}>
              <React.Suspense fallback={<div className="h-[200px] flex items-center justify-center text-gray-400">Loading events…</div>}>
                <AutoCarousel
                intervalMs={4200}
                pauseOnHover
                showArrows
                showDots
                className="mt-4"
                >
              {featuredEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="w-64 sm:w-72 md:w-80 scroll-animate-3d animate-in-3d group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="superia-glass-card rounded-[2.5rem] p-4 h-full tilt-3d transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                    <div className="relative h-64 md:h-72 mb-6 rounded-[2rem] overflow-hidden bg-black/40">
                      <img
                        src={event.image}
                        alt={event.title}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/80 to-transparent"></div>
                      
                      <div className="absolute top-4 left-4">
                        <div className="px-4 py-1.5 rounded-xl bg-[#030712]/60 backdrop-blur-xl border border-white/10 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Zap size={10} className="text-amber-400" />
                          {event.category || 'EVENT'}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <h3 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight uppercase tracking-tight">
                        {event.title}
                      </h3>
                      <p className="text-sm text-white/50 font-light mb-6 line-clamp-2">
                        {event.description}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <Crown size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Compete Now</span>
                        </div>
                        <a
                          href="/events"
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium group"
                        >
                          More
                          <ArrowRight size={12} className="inline ml-1 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </AutoCarousel>
              </React.Suspense>
            </ChunkErrorBoundary>

            {/* Removed bottom navigation button for Events section as per request */}
          </div>
        </section>
      )}

      {/* Featured Gallery */}
      {featuredImages.length > 0 && (
  <section className="pt-20 pb-16 relative overflow-hidden">
          <div className="container mx-auto px-0 md:px-4 relative z-10">
            <div className="scroll-animate-3d">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient">
                  DIGITAL MEMORIES
                </h2>
                <div className="w-24 h-1 bg-green-500/40 mx-auto mb-8 rounded-full"></div>
                <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto font-light">
                  Glimpses from our journey through the years
                </p>
                {hasManyImages && (
                  <div className="mt-8">
                    <a href="/gallery" className="inline-flex items-center text-green-400 hover:text-green-300 font-bold uppercase tracking-widest text-[10px]">
                      View all photos <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Large Carousel Slider */}
            <ChunkErrorBoundary fallback={<div className="h-[400px] flex items-center justify-center text-red-300 bg-red-900/30 border border-red-800 rounded">Failed to load gallery. <button onClick={() => window.location.reload()} className="ml-2 underline">Reload</button></div>}>
              <React.Suspense fallback={<div className="h-[400px] flex items-center justify-center text-gray-400">Loading gallery…</div>}>
                <AutoCarousel
                  paused={true} // Manual only as per request
                  showArrows
                  showDots
                  className="mt-4"
                >
                  {featuredImages.map((image) => (
                    <div
                      key={image.id}
                      className="w-full max-w-5xl mx-auto"
                    >
                      <div className="cyberpunk-card group overflow-hidden">
                        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
                          <img
                            src={image.src}
                            alt={image.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          
                          {/* Image Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                            <div className="max-w-4xl">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="bg-gradient-to-r from-green-400 to-teal-500 text-black px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-lg">
                                  FEATURED
                                </span>
                                <span className="text-green-300 text-xs md:text-sm font-medium">
                                  {image.category}
                                </span>
                                <span className="text-gray-400 text-xs md:text-sm">
                                  {image.year}
                                </span>
                              </div>
                              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                                {image.title}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </AutoCarousel>
              </React.Suspense>
            </ChunkErrorBoundary>

            {/* View all button added above when lists are long */}
          </div>
        </section>
      )}

      {/* Featured Sponsors */}
  {featuredSponsors.length > 0 && homepageSettings?.featured_partners_enabled && (
  <section className="pt-8 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#0b0f1a]"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  {(homepageSettings && (homepageSettings as any).sponsor_section_title) ? (
                    <>{(homepageSettings as any).sponsor_section_title}</>
                  ) : (
                    <>OUR <span className="neon-blue">PARTNERS</span></>
                  )}
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-cyan-600 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  {(homepageSettings && (homepageSettings as any).sponsor_section_subtitle) ?? 'Powered by industry leaders who believe in our vision'}
                </p>
                {hasManySponsors && (
                  <div className="mt-6">
                    <a href="/sponsors" className="inline-flex items-center text-gray-200 hover:text-white font-semibold">
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
                  ['--logoloop-gap' as any]: 'clamp(24px, 6vw, 40px)',
                  ['--ll-pulse-duration' as any]: '0s',
                  ['--ll-floor-opacity' as any]: 0,
                  ['--ll-glow-color' as any]: 'rgba(0,0,0,0)',
                  ['--ll-rim-alpha' as any]: 0,
                  ['--ll-card-bg' as any]: 'rgba(255,255,255,0.02)',
                  ['--ll-card-border-w' as any]: '1px',
                  ['--ll-card-border-color' as any]: 'rgba(255,255,255,0.05)',
                  ['--ll-card-h' as any]: 'clamp(140px, 22vw, 180px)',
                  ['--ll-card-w' as any]: 'clamp(140px, 22vw, 180px)',
                  ['--ll-logo-max-h' as any]: 'calc(var(--ll-card-h) - 60px)',
                  ['--ll-logo-max-w' as any]: 'calc(var(--ll-card-w) - 60px)',
                  ['--ll-card-radius' as any]: '2rem',
                  ['--logoloop-fadeWidth' as any]: 'clamp(20px, 5vw, 60px)'
                }}
              />
              </React.Suspense>
            </div>
            {/* View all button added above when lists are long */}
          </div>
        </section>
      )}

      {/* Leadership (Faculty + Committee Heads) — placed directly below Partners */}
  {(enabledFacultyHeads.length > 0 || committeeHeads.length > 0) && ((homepageSettings?.show_faculty_heads) || (homepageSettings?.show_committee_heads)) && (
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate-3d">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient">
                  OUR LEADERSHIP
                </h2>
                <div className="w-24 h-1 bg-amber-500/40 mx-auto mb-8 rounded-full"></div>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
                  Faculty chairs and heads of our core committees. Meet the entire team on our <Link to="/rico-family" className="text-indigo-400 hover:text-indigo-300 underline font-bold underline-offset-4 decoration-indigo-500/30">Rico Family page</Link>.
                </p>
              </div>

              {/* Faculty Heads */}
              {enabledFacultyHeads.length > 0 && homepageSettings?.show_faculty_heads && (
                <div className="mb-12 relative">
                  <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-400" /> Faculty Heads
                  </h3>
                  <CoverflowCarousel
                    items={sortedFacultyHeads}
                    intervalMs={homepageSettings?.leadership_carousel_speed_ms ?? 2600}
                    visibleRange={2}
                    stepPx={280}
                    rotateYDeg={42}
                    scaleStep={0.13}
                    translateZStep={-80}
                    pauseOnTouch={true}
                    blurPerStep={2.5}
                    edgeFades={true}
                    centerGlow={true}
                    arrowSize={48}
                    paused={facultyPaused}
                    onItemClick={(item: any) => {
                      // quick click-zoom, then open modal
                      setClicked({ type: 'faculty', id: item.id });
                      const idx = sortedFacultyHeads.findIndex(h => h.id === item.id);
                      setTimeout(() => {
                        setSelectedType('faculty');
                        setSelectedIndex(idx >= 0 ? idx : 0);
                        setSelectedPerson(item);
                        setFacultyModalOpen(true);
                        setFacultyPaused(true);
                        setCommitteePaused(true);
                        setClicked(null);
                      }, 180);
                    }}
                    pauseOnHover={true}
                    showArrows={true}
                    showDots={false}
                    className="py-6"
                    renderItem={(head: any) => (
                      <div className={`w-72 md:w-80 superia-glass-card p-6 rounded-[2.5rem] transition-all duration-500 tilt-3d ${clicked && clicked.type === 'faculty' && clicked.id === head.id ? 'ring-2 ring-indigo-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(0,0,0,0.4)]'}`}>
                        <div className="aspect-square w-full overflow-hidden rounded-2xl mb-6 bg-black/40">
                          <img loading="lazy" decoding="async" src={head.image} alt={head.name} className="w-full h-full object-cover"/>
                        </div>
                        <div className="font-black text-white text-lg md:text-xl text-center uppercase tracking-tight">{head.name}</div>
                        <div className="text-sm md:text-base text-white/50 text-center font-light italic mt-1">{head.title}</div>
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Committee Heads */}
              {sortedCommitteeHeads.length > 0 && homepageSettings?.show_committee_heads && (
                <>
                  {/* Heading aligned with container (matches Faculty Heads) */}
                  <div className="mb-8">
                    <h3 className="text-xl md:text-2xl font-black text-white flex items-center leading-none tracking-tight uppercase">
                      <Crown className="w-6 h-6 mr-3 text-indigo-400" /> COMMITTEE MEMBERS <span className="ml-3 text-[10px] text-white/30 font-black tracking-widest">{sortedCommitteeHeads.length} MEMBERS</span>
                    </h3>
                  </div>
                  {/* Full-bleed marquee below heading */}
                  <div
                    className="relative left-1/2 -translate-x-1/2 w-screen"
                    style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
                  >
                    <div className="relative">
                      <React.Suspense fallback={<div className="h-[72px] flex items-center justify-center text-gray-400">Loading…</div>}>
                      <InfiniteMarquee
                        items={sortedCommitteeHeads}
                        direction={homepageSettings?.committee_marquee_direction ?? 'right'}
                        // Use configured speed but default to a slightly gentler speed to reduce perceived jitter
                        speedPxPerSec={homepageSettings?.committee_marquee_speed_px_per_sec ?? 70}
                        pauseOnHover={true}
                        paused={committeePaused}
                        pauseOnTouch={true}
                        // Disable instantPause so hover/touch pauses are handled via state -> CSS playState for smoother transitions
                        instantPause={false}
                        glowOnPause
                        itemWrapperClassName="pr-3 sm:pr-4 md:pr-6 first:pl-0"
                        // Increase minimum item width to avoid tight wrapping and seam jitter at high speeds
                        minItemWidthPx={220}
                        // Keep a small side gutter to avoid items touching the viewport edge which can reveal seams
                        sideGutterPx={12}
                        className="py-4 relative"
                        renderItem={(m: any) => {
                          const [glowColor, setGlowColor] = React.useState<string>('rgba(255,255,255,0.22)');
                          React.useEffect(() => {
                            let mounted = true;
                            getDominantColor(m.image).then((color) => { if (mounted) setGlowColor(color); });
                            return () => { mounted = false; };
                          }, [m.image]);
                          const isCouncil = Boolean((m as any).isCouncil) && !m.is_head;
                          const roleLower = String(m.role || '').toLowerCase();
                          const committee = coreCommittees.find(c => c.id === m.committee_id);
                          const committeeNameLower = String(committee?.name || '').toLowerCase();
                          
                          // Only treat explicit lead/principal roles as lead web devs AND if they are in a web-related committee
                          const isLeadWebDev = ['lead developer','lead web developer','principal developer','principal engineer'].some(p => roleLower.includes(p)) && committeeNameLower.includes('web');
                          
                          // Special check for RAAJ in Tech Team (non-web) to show green
                          const isTechLeadRaaj = m.name.toLowerCase().includes('raaj') && !isLeadWebDev;

                          return (
                            <div
                              className={`w-[232px] sm:w-[262px] md:w-80 superia-glass-card p-5 rounded-[2rem] cursor-pointer transition-all duration-500 tilt-3d ${clicked && clicked.type === 'committee' && clicked.id === m.id ? 'ring-2 ring-indigo-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)]'}`}
                              onClick={() => {
                                setClicked({ type: 'committee', id: m.id });
                                const idx = sortedCommitteeHeads.findIndex(h => h.id === m.id);
                                setTimeout(() => {
                                  setSelectedType('committee');
                                  setSelectedIndex(idx >= 0 ? idx : 0);
                                  setSelectedPerson(m);
                                  setFacultyModalOpen(true);
                                  setFacultyPaused(true);
                                  setCommitteePaused(true);
                                  setClicked(null);
                                }, 180);
                              }}
                            >
                              <div className="aspect-square w-full overflow-hidden rounded-xl mb-6 bg-black/40 relative">
                                <img loading="lazy" decoding="async" src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                {/* Hover badge for council / committee */}
                                <div className="absolute top-3 left-3">
                                  {isCouncil ? (
                                    <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-white/10 backdrop-blur-xl text-white border border-white/10 tracking-[0.2em] shadow-2xl">COUNCIL</span>
                                  ) : isLeadWebDev ? (
                                    <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-indigo-600/90 text-white border border-indigo-500/50 tracking-[0.2em] shadow-2xl">FOUNDER</span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-white/5 backdrop-blur-xl text-white border border-white/5 tracking-[0.2em] shadow-2xl">HEAD</span>
                                  )}
                                </div>
                              </div>
                              <div className={`font-black flex items-center text-sm sm:text-base md:text-lg uppercase tracking-tight ${isCouncil ? 'text-red-400' : (isLeadWebDev ? 'text-indigo-300' : 'text-white')}`}> 
                                {isCouncil ? (
                                  <Crown className="w-5 h-5 mr-2 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                ) : (
                                  <Crown className="w-4 h-4 mr-2 text-indigo-400" />
                                )}
                                {isTechLeadRaaj ? 'RAAJ' : m.name}
                              </div>
                              <div className={`text-xs sm:text-sm md:text-base ${isCouncil ? 'text-red-300' : (isLeadWebDev ? 'text-cyan-300' : (isTechLeadRaaj ? 'text-green-300' : 'text-gray-300'))}`}>{isLeadWebDev ? 'Founder of Website' : m.role}</div>
                              {/* Pass the dynamic glow color to InfiniteMarquee via a custom prop */}
                              <style>{`.im-glow-${m.id} { --im-glow-color: ${glowColor}; }`}</style>
                            </div>
                          );
                        }}
                        glowColor={undefined} // will be set per-item
                        glowIntensity={0.38} // stronger glow
                      />
                      </React.Suspense>
                      {/* Edge fades for readability — scoped to marquee area only */}
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 right-0 hide-edge-fades-xs"
                        style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
                      >
                        <div className="absolute inset-y-0 left-0 w-1 sm:w-3 md:w-8 lg:w-12 bg-gradient-to-r from-black/25 via-black/5 to-transparent" />
                        <div className="absolute inset-y-0 right-0 w-1 sm:w-3 md:w-8 lg:w-12 bg-gradient-to-l from-black/25 via-black/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

  {/* Roadmap Section */}
  <React.Suspense fallback={<div className="h-[220px] flex items-center justify-center text-gray-400">Loading roadmap…</div>}>
    <Roadmap 
      vehicleImage="/ambulance-side.png" 
      vehicleSize={160} 
      durationMs={40000}
      offsetAlong={12} 
      offsetNormal={-8}
      // vehicleAudio="/ambulance-siren.mp3" // Uncomment when you add the sound file
    />
  </React.Suspense>

  {/* About Section */}
    {aboutSettings?.enabled === true && (
    <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate-3d">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black mb-6 superia-title-gradient uppercase">
                {(aboutSettings?.hero_title) ? aboutSettings.hero_title : 'ABOUT RICORRENZA'}
              </h2>
              <div className="w-24 h-1 bg-indigo-500/40 mx-auto mb-8 rounded-full"></div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* About Content */}
              <div className="scroll-animate-3d" style={{ animationDelay: '0.2s' }}>
                <div className="superia-glass-card p-10 rounded-[3rem]">
                  <h3 className="text-2xl md:text-4xl font-black mb-8 text-white uppercase tracking-tight">
                    {aboutSettings?.hero_heading || 'THE FUTURE IS NOW'}
                  </h3>
                  <div className="space-y-6 text-white/60 leading-relaxed font-light text-lg">
                    {(aboutSettings?.hero_paragraphs && aboutSettings.hero_paragraphs.length > 0
                      ? aboutSettings.hero_paragraphs
                      : [
                        "{BRAND_NAME} {BRAND_YEAR} is not just a festival—it's a revolution that merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.",
                        'Born from the vision of creating a platform where digital dreams meet reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, innovators, and creators from across the digital landscape.',
                        'Our festival celebrates the convergence of disciplines—where medical students become tech innovators, where artists code their creativity, and where the future of human potential is explored through immersive experiences.'
                      ]).map((para, i) => {
                        const html = DOMPurify.sanitize(para, { USE_PROFILES: { html: true } });
                        return (<p key={i} dangerouslySetInnerHTML={{ __html: html }} />);
                      })}
                  </div>
                  
                  {/* Key Features */}
                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-cyan-400 mb-3">FESTIVAL TRACKS</h4>
                      <div className="space-y-2">
                        {(aboutSettings?.tracks?.length ? aboutSettings.tracks : [
                          'Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences'
                        ]).map((track, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 achievement-item"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div className="w-2 h-2 bg-cyan-400 rounded-full pulse-ring flex-shrink-0"></div>
                            <span className="text-gray-300 text-sm">{track}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-pink-400 mb-3">EXPERIENCE ZONES</h4>
                      <div className="space-y-2">
                        {(aboutSettings?.zones?.length ? aboutSettings.zones : [
                          'Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases'
                        ]).map((zone, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 achievement-item"
                            style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
                          >
                            <div className="w-2 h-2 bg-pink-400 rounded-full pulse-ring flex-shrink-0"></div>
                            <span className="text-gray-300 text-sm">{zone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Element */}
              <div className="scroll-animate-3d" style={{ animationDelay: '0.4s' }}>
                <div className="superia-glass-card p-10 rounded-[3rem] text-center">
                  <div className="relative">
                    {/* Animated Stats */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                      {(aboutSettings?.stats?.length ? aboutSettings.stats : [
                        { value: BRAND_YEAR, label: 'FESTIVAL YEAR' },
                        { value: '3+', label: 'DAYS OF EVENTS' },
                        { value: '1000+', label: 'PARTICIPANTS' },
                        { value: '∞', label: 'POSSIBILITIES' }
                      ]).map((s, i) => (
                        <div key={i} className="text-center group">
                          <div className={`text-4xl md:text-5xl font-black mb-3 transition-transform duration-500 group-hover:scale-110 superia-title-gradient`}>{s.value}</div>
                          <div className="text-white/30 text-[9px] font-black tracking-widest uppercase">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Mission Statement */}
                    <div className="border-t border-white/5 pt-8">
                      <h4 className="text-lg font-black mb-6 text-white uppercase tracking-widest">OUR MISSION</h4>
                      <p className="text-white/50 text-base leading-relaxed font-light italic">
                        "{aboutSettings?.hero_heading || 'Merging medicine, tech & culture to inspire, innovate and shape the future of healthcare'}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  </section>
  )}

      {/* Call to Action */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate-3d">
            <h2 className="text-6xl md:text-8xl font-black mb-8 superia-title-gradient uppercase tracking-tighter">
              JOIN THE FUTURE
            </h2>
            <p className="text-xl md:text-2xl text-white/50 mb-16 max-w-3xl mx-auto font-light leading-relaxed">
              Be part of the most innovative festival experience
            </p>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <a
                href="/events"
                className="superia-btn-glass superia-btn-primary px-12 py-5 text-base"
              >
                <span className="relative z-10 flex items-center gap-4">
                  <Zap className="w-6 h-6" />
                  Register Now
                  <ArrowRight className="w-6 h-6" />
                </span>
              </a>
              
              {formSettings?.membership_form_enabled && (
                <button 
                  onClick={() => startTransition(() => setMembershipModal(true))}
                  className="superia-btn-glass px-12 py-5 text-base"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    <Users className="w-6 h-6" />
                    Join the Family
                    <ArrowRight className="w-6 h-6" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Membership Modal */}
      {formSettings?.membership_form_enabled && (
        <MembershipModal
          isOpen={membershipModal}
          onClose={() => startTransition(() => setMembershipModal(false))}
        />
      )}

      {/* Faculty Profile Modal */}
      <FacultyProfileModal
        open={facultyModalOpen}
        onClose={() => { setFacultyModalOpen(false); setFacultyPaused(false); setCommitteePaused(false); setSelectedPerson(null); setSelectedType(null); setSelectedIndex(null); }}
        person={selectedPerson}
      />

      <style>{`
          line-height: 1.1;
        }

        @media (min-width: 768px) {
          .featured-artist-card {
            width: clamp(250px, 32vw, 340px);
            min-height: clamp(420px, 46vw, 560px);
          }
          .featured-artist-card .card-footer {
            font-size: 0.92rem;
          }
          .featured-artist-card .card-footer h3 {
            font-size: 1.15rem;
          }
        }

        @media (min-width: 1280px) {
          .featured-artist-card {
            width: clamp(280px, 22vw, 360px);
            min-height: clamp(440px, 30vw, 600px);
          }
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
          .featured-artist-card .card-footer h3 {
            font-size: 0.95rem;
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
          .featured-artist-card .card-footer {
            font-size: 0.78rem;
          }
          .featured-artist-card .card-footer h3 {
            font-size: 0.88rem;
          }
        }
      `}</style>
      {chiefGuestModalOpen && selectedChiefGuest && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>{ startTransition(() => { setChiefGuestModalOpen(false); setSelectedChiefGuest(null); }); }} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/90 via-black/80 to-purple-950/90 ring-1 ring-blue-500/30 shadow-2xl flex flex-col">
            <div className="flex items-start gap-4 p-5 border-b border-white/10">
              <div className="relative w-40 h-40 rounded-xl overflow-hidden ring-1 ring-blue-400/40 flex-shrink-0">
                <img loading="lazy" decoding="async" src={selectedChiefGuest.image} alt={selectedChiefGuest.name} className="w-full h-full object-cover" />
                {selectedChiefGuest.specialty && (
                  <div className="absolute bottom-2 left-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-70" />
                    <span>{selectedChiefGuest.specialty}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-extrabold text-white tracking-wide mb-1">{selectedChiefGuest.name}</h3>
                {selectedChiefGuest.title && <p className="text-sm font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent mb-3">{selectedChiefGuest.title}</p>}
                {selectedChiefGuest.description && (
                  <PreserveNewlines text={selectedChiefGuest.description} className="text-gray-300 text-sm leading-relaxed" />
                )}
              </div>
              <button
                type="button"
                onClick={()=>{ startTransition(() => { setChiefGuestModalOpen(false); setSelectedChiefGuest(null); }); }}
                aria-label="Close"
                className="ml-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
              {selectedChiefGuest.achievements && selectedChiefGuest.achievements.length > 0 && (
                <div>
                  <h4 className="uppercase text-[11px] tracking-wider font-bold text-blue-300 mb-2">All Highlights</h4>
                  <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                    {selectedChiefGuest.achievements.map((a: string, i: number)=>(<li key={i}>{a}</li>))}
                  </ul>
                </div>
              )}
              {(selectedChiefGuest.social_links?.instagram || selectedChiefGuest.social_links?.youtube || selectedChiefGuest.social_links?.spotify) && (
                <div>
                  <h4 className="uppercase text-[11px] tracking-wider font-bold text-blue-300 mb-2">Connect</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedChiefGuest.social_links?.instagram && (
                      <a href={selectedChiefGuest.social_links.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors">
                        <Instagram className="w-4 h-4" /> Instagram
                      </a>
                    )}
                    {selectedChiefGuest.social_links?.youtube && (
                      <a href={selectedChiefGuest.social_links.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors">
                        <Youtube className="w-4 h-4" /> YouTube
                      </a>
                    )}
                    {selectedChiefGuest.social_links?.spotify && (
                      <a href={selectedChiefGuest.social_links.spotify} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors">
                        <Music2 className="w-4 h-4" /> Spotify
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};