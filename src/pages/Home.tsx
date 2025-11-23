import React, { useState, useEffect, startTransition } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Users, Star, ArrowRight, Zap, Sparkles, Crown, Instagram, Youtube, Music2, X as XIcon } from 'lucide-react';
import WatchLiveButton from '../components/WatchLiveButton';
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
// CountdownTimer and Sparkle3D are not used in the featured artist card preview; keep them commented out in case we re-enable later
// import CountdownTimer from '../components/CountdownTimer';
// import Sparkle3D from '../components/Sparkle3D';
import PreserveNewlines from '../components/PreserveNewlines';
import InlineArtistPreview from '../components/InlineArtistPreview';

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
    socialMediaSettings, 
    homepageSettings,
    formSettings,
    aboutSettings,
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
    formSettings: !!formSettings
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
  const prefetchDetailModal = () => { import('../components/GuestArtistDetailModal'); };
  const prefetchVideoModal = () => { import('../components/GuestArtistVideoModal'); };
  
  // Prefetch some lazy components shortly after mount so interactions feel snappy
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        prefetchDetailModal();
        prefetchVideoModal();
        import('../components/FacultyProfileModal');
        import('../components/AutoCarousel');
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

  // Heads data and memoized sorted lists (must be before any early return)
  const enabledFacultyHeads = facultyHeads.filter(head => head.enabled);
  const committeeHeads = coreTeamMembers.filter(m => m.enabled && m.is_head && !(m as any).isCouncil);
  // Council members (non-head) are also part of leadership marquee
  const councilMembers = coreTeamMembers.filter(m => m.enabled && (m as any).isCouncil && !m.is_head);
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
      const nodes = document.querySelectorAll('.scroll-animate');
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
      const nodesNow = Array.from(document.querySelectorAll('.scroll-animate')) as HTMLElement[];
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
      document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
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
      setDetailArtist(artist as any);
      setDetailOpen(true);
      // Try to scroll a tile into view if it has the anchor id
      const tile = document.getElementById(`artist-${artistId}`);
      if (tile) setTimeout(() => tile.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [location.hash, guestArtists?.length]);

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
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Media via unified component */}
        <HeroBackground pageKey="home" />

        {/* Floating Particles removed */}

        {/* Glitch Overlay */}
        <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate animate-in">
            <div className="inline-flex items-center bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              FESTIVAL 2025
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              {homepageSettings?.hero_title || 'RICORRENZA'}
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              {homepageSettings?.hero_subtitle || 'Experience the Future'}
            </p>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
              {homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity'}
            </p>
            
            <div className="flex justify-center items-center">
              <a
                href="/events"
                className="cyberpunk-btn cyberpunk-btn-primary group hover-float"
              >
                <span className="relative z-10 flex items-center">
                  <Calendar className="mr-2 group-hover:animate-pulse" size={20} />
                  EXPLORE EVENTS
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Sponsor Logos Section */}
        {homepageSettings?.sponsor_section_enabled && homepageSettings?.sponsor_logos && homepageSettings.sponsor_logos.length > 0 && (
          <div className="absolute bottom-8 left-0 right-0 z-10">
            <div className="text-center">
              <p className="text-gray-100 text-lg sm:text-xl md:text-2xl font-semibold mb-4 font-mono text-glow-strong text-glow-pulse">
                {homepageSettings.sponsor_section_text}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 px-2 sm:px-4">
                {homepageSettings.sponsor_logos
                  .filter((logo: any) => logo.enabled && logo.logo_url && (logo.show_on_homepage ?? true))
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((logo: any) => {
                    const key = logo.updated_at || logo.updatedAt || homepageSettings?.updated_at || '';
                    const src = (() => {
                      if (!logo.logo_url) return '';
                      const sep = logo.logo_url.includes('?') ? '&' : '?';
                      return key ? `${logo.logo_url}${sep}v=${encodeURIComponent(key)}` : logo.logo_url;
                    })();
                    return (
                    <div key={`${logo.id}-${logo.logo_url}`} className="logo-no-bg">
                      {logo.website ? (
                        <a
                          href={logo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block home-sponsor-glow"
                        >
                          <img
                            src={src}
                            alt={logo.name}
                            className="h-16 sm:h-16 md:h-20 lg:h-24 object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                      ) : (
                        <div className="home-sponsor-glow">
                          <img
                            src={src}
                            alt={logo.name}
                            className="h-16 sm:h-16 md:h-20 lg:h-24 object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                    </div>
                  );})}
              </div>
            </div>
          </div>
        )}
      </section>

      

      {/* Featured Guest Artists */}

      {featuredGuestArtists.length > 0 && (
      <section className="pt-28 pb-14 md:pt-36 md:pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-0 sm:px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-10 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  FEATURED <span className="neon-pink">ARTISTS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-6 md:mb-8 expand-width"></div>
                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
                  Meet the incredible artists who will light up RICORRENZA 2025
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
                onItemClick={(artist: GuestArtist) => { startTransition(() => { setDetailArtist(artist); setDetailOpen(true); }); }}
                className="mt-6 md:mt-8"
                stageHeight={'var(--featured-stage-height)'}
                renderItem={(artist: GuestArtist) => (
                <div
                  id={`artist-${artist.id}`}
                  className="cyberpunk-card group w-full sm:w-[310px] md:w-[360px] max-w-[360px] mx-auto overflow-hidden mt-20 sm:mt-6"
                  onMouseEnter={prefetchDetailModal}
                  onTouchStart={() => { try { prefetchDetailModal(); } catch {} }}
                >
                  {/* Top: static hero/poster image */}
                  <div className="relative h-56 md:h-64 overflow-hidden">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute top-4 right-4">
                      <Star className="w-6 h-6 text-pink-400 animate-pulse pulse-ring" />
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
                        FEATURED ARTIST
                      </div>
                    </div>

                    {(artist as any).watch_live_url && (artist as any).performance_at && (
                      <div
                        className="absolute top-4 left-4 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <WatchLiveButton
                          url={(artist as any).watch_live_url}
                          startTime={(artist as any).performance_at}
                          leadMinutes={60}
                          forceLive={(artist as any).live_now_enabled || (artist as any).is_featured}
                          size="xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom strip: either video preview OR image, plus Details */}
                  <div className="p-0 border-t border-pink-500/20">
                    <div className="relative h-40 md:h-44 overflow-hidden bg-black">
                      <InlineArtistPreview
                        videoUrl={(artist as any).video_url}
                        poster={artist.image}
                        imgSrc={artist.image}
                        youtubeUrl={(artist as any).youtube_url}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                        <div className="space-y-0">
                          <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">{artist.name}</h3>
                          <p className="text-xs text-pink-300">{artist.title}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          {(artist.video_url || artist.youtube_url) && (
                            <button
                              onMouseEnter={prefetchVideoModal}
                              onTouchStart={() => {
                                try {
                                  prefetchVideoModal();
                                } catch {}
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                startTransition(() => {
                                  setSelectedArtistForVideo(artist);
                                  setVideoModalOpen(true);
                                });
                              }}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white border border-white/20 shadow-lg hover:ring-2 hover:ring-pink-400/40 transition"
                              aria-label={`Play video for ${artist.name}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-4 h-4 ml-0.5"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                          )}

                          <button
                            type="button"
                            onMouseEnter={prefetchDetailModal}
                            onTouchStart={() => {
                              try {
                                prefetchDetailModal();
                              } catch {}
                            }}
                            onClick={() => {
                              startTransition(() => {
                                setDetailArtist(artist as any);
                                setDetailOpen(true);
                              });
                            }}
                            className="btn-fade-gradient text-black font-semibold text-xs px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400/60 active:scale-[0.98] transition-transform"
                            aria-label={`Read more about ${artist.name}`}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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

      {/* Chief Guest Section (moved below Featured Artists) */}
  {chiefGuests && chiefGuests.filter((c: any)=>c.enabled).length > 0 && (() => {
        const enabledChiefs = chiefGuests.filter((c: any)=>c.enabled);
        const multi = enabledChiefs.length > 1;
        return (
          <section className="py-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-indigo-900/30 to-purple-900/20"></div>
            <div className="container mx-auto px-0 relative z-10">
              <div className="scroll-animate opacity-0 transform translate-y-20">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                    CHIEF <span className="neon-blue">GUEST{multi ? 'S' : ''}</span>
                  </h2>
                  <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6 expand-width" />
                  <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
                    {multi ? 'Honoring our distinguished chief guests' : 'Honoring our distinguished chief guest'} for RICORRENZA 2025
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
                        <img src={cg.image} alt={cg.name} className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110" />
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
                          <img src={cg.image} alt={cg.name} className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110" />
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
              onClose={() => { startTransition(() => { setDetailOpen(false); setDetailArtist(null); }); }}
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
            <div className="scroll-animate animate-in">
              <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  FEATURED <span className="neon-blue">EVENTS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Don't miss these highlighted experiences at RICORRENZA 2025
                </p>
                {hasManyEvents && (
                  <div className="mt-6">
                    <a href="/events" className="inline-flex items-center text-blue-400 hover:text-blue-300 font-semibold">
                      View all events <ArrowRight className="ml-1 h-4 w-4" />
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
                  className="hover-float w-72 md:w-96 scroll-animate animate-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="cyberpunk-card group h-full overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg pulse-ring">
                          FEATURED
                        </span>
                      </div>

                      <div className="absolute top-3 right-4 z-10 pointer-events-none">
                        {/* Top-right small category pill (glass effect). */}
                        <span className="inline-flex items-center text-xs font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full shadow-sm opacity-100 transition-opacity">
                          {event.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{event.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {event.date} • {event.venue}
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
  <section className="pt-20 pb-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-teal-900/30 to-blue-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate animate-in">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  DIGITAL <span className="neon-green">MEMORIES</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-teal-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Glimpses from our journey through the years
                </p>
                {hasManyImages && (
                  <div className="mt-6">
                    <a href="/gallery" className="inline-flex items-center text-green-300 hover:text-green-200 font-semibold">
                      View all photos <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featuredImages.map((image, index) => (
                <div
                  key={image.id}
                  className="scroll-animate opacity-0 transform translate-y-20 hover-float"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="cyberpunk-card group overflow-hidden">
                    <div className="aspect-w-4 aspect-h-3 relative overflow-hidden">
                      <img
                        src={image.src}
                        alt={image.title}
                        className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                      
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <h4 className="text-white text-sm font-semibold">{image.title}</h4>
                        <p className="text-gray-300 text-xs">{image.category} • {image.year}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
                logos={featuredSponsors.map(s => ({ src: s.logo, alt: s.name ?? '', href: s.website ?? undefined, title: s.name ?? undefined }))}
                speed={Math.min(800, Math.max(1, Math.abs(homepageSettings?.sponsors_belt_speed_px_per_sec ?? 140)))}
                direction={homepageSettings?.sponsors_belt_direction ?? 'left'}
                pauseOnHover={true}
                pauseInstantOnHover={false}
                smoothTauSec={0.6}
                scaleOnHover={false}
                fadeOut={true}
                fadeOutColor="#0b0f1a"
                glow={true}
                cardRadius={24}
                cardPaddingX={18}
                cardPaddingY={0}
                ariaLabel="Our partners"
                className=""
                style={{
                  background: '#0b0f1a',
                  paddingTop: 0,
                  paddingBottom: 0,
                  isolation: 'isolate',
                  // Allow hover events to pause the belt when hovering
                  pointerEvents: 'auto',
                  // Responsive sizing like the reference: bigger on phones, capped on desktop
                  ['--logoloop-logoHeight' as any]: 'clamp(70px, 16vw, 110px)',
                  ['--logoloop-gap' as any]: 'clamp(18px, 4.5vw, 28px)',
                  // Belt background removed so only inner card is filled
                  // Disable any pulse/glow animation
                  ['--ll-pulse-duration' as any]: '0s',
                  // Disable floor glow entirely
                  ['--ll-floor-opacity' as any]: 0,
                  ['--ll-floor-width' as any]: '66%',
                  // Remove any base glow
                  ['--ll-glow-color' as any]: 'rgba(0,0,0,0)',
                  ['--ll-border-blur' as any]: '0em',
                  ['--ll-border-spread' as any]: '0em',
                  ['--ll-outer-blur' as any]: '0em',
                  ['--ll-outer-spread' as any]: '0em',
                  ['--ll-pulse-outer-blur' as any]: '0em',
                  ['--ll-pulse-outer-spread' as any]: '0em',
                  ['--ll-rim-alpha' as any]: 0,
                  ['--ll-glow-spread-color' as any]: 'rgba(0,0,0,0)',
                  // Disable glass sheen overlay
                  ['--ll-glass-blur' as any]: '0px',
                  ['--ll-glass-saturate' as any]: '100%',
                  ['--ll-glass-sheen' as any]: 0,
                  // Enable subtle white glow on hover + gentle lift
                  ['--ll-hover-outer-color' as any]: 'rgba(255,255,255,0.6)',
                  ['--ll-hover-outer-blur' as any]: '0.75em',
                  ['--ll-hover-outer-spread' as any]: '0.18em',
                  ['--ll-card-scale-hover' as any]: 1.04,
                  // Disable card depth shadow to avoid any banding across the row
                  ['--ll-depth-shadow-fn' as any]: '0 0 0 rgba(0,0,0,0)',
                  // Darker inner container (pure black)
                  ['--ll-card-bg' as any]: '#000000',
                  // Remove border line for a cleaner pill
                  ['--ll-card-border-w' as any]: '0px',
                  // Square rounded tiles: fixed equal H & W
                  ['--ll-card-min-h' as any]: 'unset',
                  ['--ll-card-h' as any]: 'clamp(140px, 24vw, 200px)',
                  ['--ll-card-w' as any]: 'clamp(140px, 24vw, 200px)',
                  // Center logos inside square without cropping
                  ['--ll-logo-h' as any]: 'auto',
                  ['--ll-logo-w' as any]: 'auto',
                  ['--ll-logo-fit' as any]: 'contain',
                  ['--ll-logo-max-h' as any]: 'calc(var(--ll-card-h) - 4px)',
                  ['--ll-logo-max-w' as any]: 'calc(var(--ll-card-w) - 4px)',
                  // Remove inner image rounding and extra shadows for a crisp tile
                  ['--ll-logo-radius' as any]: '8px',
                  ['--ll-logo-filter' as any]: 'none',
                  ['--ll-logo-filter-hover' as any]: 'none',
                  // Narrow edge fades to frame the belt subtly
                  ['--logoloop-fadeWidth' as any]: 'clamp(8px, 3vw, 28px)'
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
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black mb-4 cyberpunk-title">
                  OUR <span className="neon-white">LEADERSHIP</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 mx-auto mb-4 expand-width"></div>
                <p className="text-gray-300">Faculty leadership and heads of our core committees</p>
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
                      <div className={`w-72 md:w-80 cyberpunk-card p-5 transition-shadow duration-150 ${clicked && clicked.type === 'faculty' && clicked.id === head.id ? 'ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-500/25' : ''}`}>
                        <div className="aspect-square w-full overflow-hidden rounded-lg mb-4 bg-black/30 flex items-center justify-center">
                          <img src={head.image} alt={head.name} loading="lazy" decoding="async" className="w-full h-full object-cover"/>
                        </div>
                        <div className="font-bold text-white text-base md:text-lg text-center">{head.name}</div>
                        <div className="text-sm md:text-base text-gray-300 text-center">{head.title}</div>
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Committee Heads */}
              {sortedCommitteeHeads.length > 0 && homepageSettings?.show_committee_heads && (
                <>
                  {/* Heading aligned with container (matches Faculty Heads) */}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-200 flex items-center leading-[1.2] md:leading-[1.25] pt-1 relative z-10">
                      <Crown className="w-5 h-5 mr-2 text-yellow-400" /> Leadership <span className="ml-2 text-sm text-gray-400 font-normal">(Heads + Council: {sortedCommitteeHeads.length})</span>
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
                          // Only treat explicit lead/principal roles as lead web devs
                          const isLeadWebDev = ['lead developer','lead web developer','principal developer','principal engineer'].some(p => roleLower.includes(p));
                          
                          return (
                            <div
                              className={`w-[232px] sm:w-[262px] md:w-80 cyberpunk-card p-4 sm:p-5 cursor-pointer transition-shadow duration-150 ${clicked && clicked.type === 'committee' && clicked.id === m.id ? 'ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-500/25' : ''}`}
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
                              <div className="aspect-square w-full overflow-hidden rounded-lg mb-3 sm:mb-4 bg-black/30 flex items-center justify-center">
                                <img src={m.image} alt={m.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                {/* Hover badge for council / committee */}
                                <div className="absolute top-2 left-2">
                                  {isCouncil ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/90 text-white shadow shadow-red-500/40 ring-1 ring-red-400/70 backdrop-blur-sm leadership-badge">COUNCIL</span>
                                  ) : isLeadWebDev ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow shadow-cyan-400/40 ring-1 ring-cyan-300/70 backdrop-blur-sm leadership-badge">COMMITTEE HEAD</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/90 text-black shadow shadow-yellow-400/40 ring-1 ring-yellow-300/70 backdrop-blur-sm leadership-badge">COMMITTEE HEAD</span>
                                  )}
                                </div>
                              </div>
                              <div className={`font-bold flex items-center text-sm sm:text-base md:text-lg ${isCouncil ? 'text-red-400' : (isLeadWebDev ? 'text-cyan-300' : 'text-white')}`}> 
                                {isCouncil ? (
                                  <Crown className="w-5 h-5 mr-1 text-red-500 drop-shadow-[0_0_6px_rgba(255,0,0,0.7)] council-crown" />
                                ) : isLeadWebDev ? (
                                  <span className="webdev-crown-wrapper mr-1" title='Lead Web Developer'>
                                    <Crown className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)] webdev-crown" />
                                  </span>
                                ) : (
                                  <Crown className="w-4 h-4 mr-1 text-yellow-400 head-crown" />
                                )}
                                {m.name}
                              </div>
                              <div className={`text-xs sm:text-sm md:text-base ${isCouncil ? 'text-red-300' : (isLeadWebDev ? 'text-cyan-300' : 'text-gray-300')}`}>{m.role}</div>
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
    <Roadmap vehicleImage="/rickshaw.svg" vehicleSize={110} offsetAlong={12} offsetNormal={-8} />
  </React.Suspense>

  {/* About Section */}
    {aboutSettings?.enabled === true && (
    <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/30 to-purple-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                {(aboutSettings?.hero_title) ? aboutSettings.hero_title : (<>
                  ABOUT <span className="neon-cyan">RICORRENZA</span>
                </>)}
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto mb-8 expand-width"></div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* About Content */}
              <div className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: '0.2s' }}>
                <div className="cyberpunk-card p-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-6 neon-cyan">
                    {aboutSettings?.hero_heading || 'THE FUTURE IS NOW'}
                  </h3>
                  <div className="space-y-4 text-gray-300 leading-relaxed">
                    {(aboutSettings?.hero_paragraphs && aboutSettings.hero_paragraphs.length > 0
                      ? aboutSettings.hero_paragraphs
                      : [
                        "RICORRENZA 2025 is not just a festival—it's a revolution that merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.",
                        'Born from the vision of creating a platform where digital dreams meet reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, innovators, and creators from across the digital landscape.',
                        'Our festival celebrates the convergence of disciplines—where medical students become tech innovators, where artists code their creativity, and where the future of human potential is explored through immersive experiences.'
                      ]).map((para, i) => {
                        // Lazy import dompurify to keep bundle size in check; fall back to raw if unavailable
                        let html = para;
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-var-requires
                          const DOMPurify = require('dompurify');
                          html = DOMPurify.sanitize(para, { USE_PROFILES: { html: true } });
                        } catch {}
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
              <div className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: '0.4s' }}>
                <div className="cyberpunk-card p-8 text-center">
                  <div className="relative">
                    {/* Animated Stats */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {(aboutSettings?.stats?.length ? aboutSettings.stats : [
                        { value: '2025', label: 'FESTIVAL YEAR' },
                        { value: '3+', label: 'DAYS OF EVENTS' },
                        { value: '1000+', label: 'PARTICIPANTS' },
                        { value: '∞', label: 'POSSIBILITIES' }
                      ]).map((s, i) => (
                        <div key={i} className="text-center">
                          <div className={`text-4xl font-black mb-2 counter-animation ${i===0?'neon-cyan':i===1?'neon-pink':i===2?'neon-purple':'neon-blue'}`}>{s.value}</div>
                          <div className="text-gray-400 text-sm">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Mission Statement */}
                    <div className="border-t border-cyan-500/30 pt-6">
                      <h4 className="text-xl font-bold mb-4 cyberpunk-title">OUR MISSION</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {aboutSettings?.hero_heading || 'Merging medicine, tech & culture to inspire, innovate and shape the future of healthcare'}
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
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-purple-900/60 to-blue-900/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 cyberpunk-title">
              JOIN THE <span className="neon-pink">FUTURE</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Be part of the most innovative  festival experience
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <a
                href="/events"
                className="cyberpunk-btn cyberpunk-btn-primary group text-lg px-8 py-4 hover-float"
              >
                <span className="relative z-10 flex items-center">
                  <Zap className="mr-2 group-hover:animate-pulse" size={24} />
                  REGISTER FOR EVENTS
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                </span>
              </a>
              
              {formSettings?.membership_form_enabled && (
                <button 
                  onClick={() => startTransition(() => setMembershipModal(true))}
                  className="cyberpunk-btn cyberpunk-btn-secondary group text-lg px-8 py-4 hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-2 group-hover:animate-pulse" size={24} />
                    JOIN RICO FAMILY
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
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

        .neon-green {
          color: #00ff00;
          text-shadow: 
            0 0 2px #00ff00,
            0 0 4px #00ff00;
        }

        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 2px #ffff00,
            0 0 4px #ffff00;
        }

        .neon-white {
          color: #ffffff;
          text-shadow: 
            0 0 2px #ffffff,
            0 0 4px #ffffff;
        }

        .neon-cyan {
          color: #00ffff;
          text-shadow: 
            0 0 2px #00ffff,
            0 0 4px #00ffff;
        }

        .counter-animation {
          animation: counterPulse 2s ease-in-out infinite alternate;
        }

        @keyframes counterPulse {
          from {
            text-shadow: 
              0 0 2px currentColor,
              0 0 4px currentColor;
          }
          to {
            text-shadow: 
              0 0 4px currentColor,
              0 0 8px currentColor,
              0 0 12px currentColor;
          }
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

        .cyberpunk-btn-secondary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.2),
            inset 0 0 10px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
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
      {chiefGuestModalOpen && selectedChiefGuest && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>{ startTransition(() => { setChiefGuestModalOpen(false); setSelectedChiefGuest(null); }); }} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/90 via-black/80 to-purple-950/90 ring-1 ring-blue-500/30 shadow-2xl flex flex-col">
            <div className="flex items-start gap-4 p-5 border-b border-white/10">
              <div className="relative w-40 h-40 rounded-xl overflow-hidden ring-1 ring-blue-400/40 flex-shrink-0">
                <img src={selectedChiefGuest.image} alt={selectedChiefGuest.name} className="w-full h-full object-cover" />
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