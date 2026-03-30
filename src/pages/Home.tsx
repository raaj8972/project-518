import React, { useState, useEffect, startTransition, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';


import { useData } from '../context/DataContext';
import { MembershipModal } from '../components/MembershipModal';
import HomeHero from '../components/HomeHero';
import { SEO } from '../components/SEO';
import ChunkErrorBoundary from '../components/ChunkErrorBoundary.tsx';
import type { GuestArtist } from '../types/data';

// Extracted Components
// Extracted Components (deferred via lazy)
const ArtistCarousel = React.lazy(() => import('../components/Home/ArtistCarousel'));
const ChiefGuestSection = React.lazy(() => import('../components/Home/ChiefGuestSection'));
const FeaturedEventsSection = React.lazy(() => import('../components/Home/FeaturedEventsSection'));
const FeaturedSponsors = React.lazy(() => import('../components/Home/FeaturedSponsors'));
const LeadershipSection = React.lazy(() => import('../components/Home/LeadershipSection'));
const AboutSection = React.lazy(() => import('../components/Home/AboutSection'));
const CTASection = React.lazy(() => import('../components/Home/CTASection'));
const ChiefGuestModal = React.lazy(() => import('../components/Home/ChiefGuestModal'));
const TopLegendsSection = React.lazy(() => import('../components/Home/TopLegendsSection'));


// Lazy Loaded Components
const WinnersSection = React.lazy(() => import('../components/WinnersSection'));
const InstagramTrailerSection = React.lazy(() => import('../components/InstagramTrailerSection'));
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal'));
const GuestArtistVideoModal = React.lazy(() => import('../components/GuestArtistVideoModal'));
const GuestArtistDetailModal = React.lazy(() => import('../components/GuestArtistDetailModal'));
const Roadmap = React.lazy(() => import('../components/Roadmap'));

import '../styles/Home.css';

export const Home: React.FC = () => {
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
  
  
  // Modal states
  const [membershipModal, setMembershipModal] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [chiefGuestModalOpen, setChiefGuestModalOpen] = useState(false);
  
  // Selection states
  const [selectedArtistForVideo, setSelectedArtistForVideo] = useState<GuestArtist | null>(null);
  const [detailArtist, setDetailArtist] = useState<GuestArtist | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [selectedChiefGuest, setSelectedChiefGuest] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'faculty' | 'committee' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Animation/Interaction states
  const [facultyPaused, setFacultyPaused] = useState(false);
  const [committeePaused, setCommitteePaused] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showInteractive, setShowInteractive] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    let idleId: number | null = null;
    if (typeof (window as any).requestIdleCallback === 'function') {
      idleId = (window as any).requestIdleCallback(() => setShowInteractive(true), { timeout: 500 });
      return () => { 
        window.removeEventListener('resize', handleResize);
        if (idleId != null) (window as any).cancelIdleCallback(idleId); 
      };
    }
    const t = setTimeout(() => setShowInteractive(true), 350);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t);
    };
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

  const detailAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        setTimeout(() => {
          const fadeUpElements = gsap.utils.toArray('.gsap-fade-up') as HTMLElement[];
          if (fadeUpElements.length > 0) {
            ScrollTrigger.batch(fadeUpElements, {
              start: "top 85%",
              onEnter: (elements) => {
                gsap.to(elements, {
                  y: 0,
                  opacity: 1,
                  stagger: 0.15,
                  duration: 0.8,
                  ease: "power3.out",
                  overwrite: "auto"
                });
              },
              once: true
            });
            gsap.set(fadeUpElements, { y: 50, opacity: 0 });
          }
        }, 500);
      });
    });
    return () => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach(t => {
          if (t.vars.trigger && (t.vars.trigger as HTMLElement).classList?.contains('gsap-fade-up')) {
            t.kill();
          }
        });
      });
    };
  }, [showInteractive, loading]);

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
  const committeeHeads = coreTeamMembers.filter(m => m.enabled && m.is_head && !((m as any).isCouncil || (m as any).is_council) && m.image && m.image.trim() !== '');
  // Council members (non-head) are also part of leadership marquee
  const councilMembers = coreTeamMembers.filter(m => m.enabled && ((m as any).isCouncil || (m as any).is_council) && !m.is_head && m.image && m.image.trim() !== '');
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
  // Only show the full-page preloader if we have NO data. If we have events, 
  // it means it's a background refresh and we should keep showing the page.
  const hasCriticalData = events.length > 0 || (homepageSettings as any)?.hero_title;
  if (loading && !hasCriticalData) {
    return (
      <div className="stranger-things-theme min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="stranger-spinner mb-6"></div>
          <h2 className="text-2xl font-bold stranger-title mb-4 tracking-tighter">ENTERING THE EXPERIENCE</h2>
          <p className="text-red-500 font-serif brightness-75">Initializing performance...</p>
        </div>
        
        <style>{`
          .stranger-things-theme {
            background: #050000;
            color: #ffffff;
            font-family: 'Benguiat', 'Crimson Text', serif;
          }

          .stranger-title {
            background: linear-gradient(180deg, #ff0000, #7f0000);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
            text-transform: uppercase;
          }

          .stranger-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid transparent;
            border-top: 4px solid #ff0000;
            border-right: 4px solid #450a0a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
            filter: drop-shadow(0 0 15px #ff0000);
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
  const featuredSponsors = sponsors.filter(sponsor => sponsor.featured);
  const featuredGuestArtists = guestArtists.filter(artist => artist.is_featured && artist.enabled);
  const hasManyEvents = events.length > 6;
  const hasManySponsors = sponsors.length > 8;
  

  // Check if social media links should be shown
  // const showInstagram = socialMediaSettings?.instagramEnabled && socialMediaSettings?.instagramUrl;
  // const showYoutube = socialMediaSettings?.youtubeEnabled && socialMediaSettings?.youtubeUrl;

  return (
    <div className="stranger-mesh-glow min-h-screen text-white overflow-x-hidden">
      <style>{`
        .stranger-mesh-glow {
          background-color: #000000;
          background-image: 
            radial-gradient(at 0% 0%, rgba(153, 27, 27, 0.2) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(0, 0, 0, 0.9) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(69, 10, 10, 0.15) 0px, transparent 50%);
        }
        .stranger-title-gradient {
          background: linear-gradient(to bottom, #ffffff 0%, #ff0000 40%, #7f0000 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 20px rgba(255, 0, 0, 0.4));
          font-family: serif;
        }
        .stranger-btn-glass {
          @apply relative px-8 py-4 rounded-lg bg-black/40 backdrop-blur-3xl border border-red-900/30 
                 text-white font-serif tracking-widest uppercase text-sm transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.8)]
                 hover:bg-red-950/20 hover:border-red-600/50 hover:shadow-[0_0_30px_rgba(255,0,0,0.3)] hover:-translate-y-1;
        }
        .stranger-btn-primary {
          @apply bg-red-950/40 border-red-600/40 hover:bg-red-900/60 hover:border-red-500 hover:shadow-[0_0_40px_rgba(255,0,0,0.4)];
        }
      `}</style>
      <SEO />
      {/* Hero Section */}
      <HomeHero />

      {/* RICO STARS / Hall of Fame */}
      <React.Suspense fallback={<div className="h-64 bg-black/20 animate-pulse" />}>
        <TopLegendsSection />
      </React.Suspense>


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
      <React.Suspense fallback={<div className="h-[500px] bg-black/20 animate-pulse" />}>
        <ArtistCarousel
          artists={featuredGuestArtists}
          openDetailModal={openDetailModal}
          setVideoModalOpen={setVideoModalOpen}
          setSelectedArtistForVideo={setSelectedArtistForVideo}
          detailOpen={detailOpen}
          videoModalOpen={videoModalOpen}
          showInteractive={showInteractive}
          prefetchDetailModal={prefetchDetailModal}
        />
      </React.Suspense>

      
      {/* Winners Section */}
      <React.Suspense fallback={null}>
        <WinnersSection />
      </React.Suspense>

      {/* Chief Guest Section */}
      <React.Suspense fallback={<div className="h-64 bg-black/20 animate-pulse" />}>
        <ChiefGuestSection
          chiefGuests={chiefGuests as any}
          setSelectedChiefGuest={setSelectedChiefGuest}
          setChiefGuestModalOpen={setChiefGuestModalOpen}
          detailOpen={detailOpen}
          videoModalOpen={videoModalOpen}
        />
      </React.Suspense>

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
      <React.Suspense fallback={<div className="h-96 bg-black/20 animate-pulse" />}>
        <FeaturedEventsSection
          featuredEvents={featuredEvents}
          hasManyEvents={hasManyEvents}
        />
      </React.Suspense>


      {/* Featured Partners */}
      <React.Suspense fallback={<div className="h-48 bg-black/20 animate-pulse" />}>
        <FeaturedSponsors
          featuredSponsors={featuredSponsors as any}
          homepageSettings={homepageSettings}
          hasManySponsors={hasManySponsors}
        />
      </React.Suspense>


      {/* Leadership Section */}
      <React.Suspense fallback={<div className="h-screen bg-black/20 animate-pulse" />}>
        <LeadershipSection
          homepageSettings={homepageSettings}
          coreCommittees={coreCommittees}
          enabledFacultyHeads={enabledFacultyHeads as any}
          sortedFacultyHeads={sortedFacultyHeads as any}
          sortedCommitteeHeads={sortedCommitteeHeads as any}
          windowWidth={windowWidth}
          facultyPaused={facultyPaused}
          committeePaused={committeePaused}
          setFacultyPaused={setFacultyPaused}
          setCommitteePaused={setCommitteePaused}
          setSelectedType={setSelectedType}
          setSelectedIndex={setSelectedIndex}
          setSelectedPerson={setSelectedPerson}
          setFacultyModalOpen={setFacultyModalOpen}
        />
      </React.Suspense>


      {/* Roadmap Section */}
      {homepageSettings?.roadmap_enabled && (
        <React.Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400">Loading roadmap...</div>}>
          <Roadmap />
        </React.Suspense>
      )}

      {/* About Section */}
      <React.Suspense fallback={<div className="h-96 bg-black/20 animate-pulse" />}>
        <AboutSection aboutSettings={aboutSettings as any} />
      </React.Suspense>


      {/* CTA Section */}
      <React.Suspense fallback={<div className="h-64 bg-black/20 animate-pulse" />}>
        <CTASection
          formSettings={formSettings}
          setMembershipModal={setMembershipModal}
        />
      </React.Suspense>


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

        .stranger-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #b91c1c, #f97316, #b91c1c);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        
        .stranger-card:hover::before {
          transform: translateX(0);
        }
        
        .stranger-card:hover {
          border-color: rgba(185, 28, 28, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(185, 28, 28, 0.1);
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
          border: 2px solid rgba(185, 28, 28, 0.3);
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
          .stranger-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          /* particles CSS removed */
          
          .stranger-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
          }
          
          .stranger-card {
            margin: 0 4px;
          }
          .featured-artist-card .card-footer h3 {
            font-size: 0.95rem;
          }
        }
        
        @media (max-width: 480px) {
          .stranger-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .stranger-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
          }
          .featured-artist-card .card-footer {
            font-size: 0.78rem;
          }
          .featured-artist-card .card-footer h3 {
            font-size: 0.88rem;
          }
        }
      `}</style>
      {/* Chief Guest Modal */}
      <ChiefGuestModal
        isOpen={chiefGuestModalOpen}
        selectedChiefGuest={selectedChiefGuest}
        onClose={() => { startTransition(() => { setChiefGuestModalOpen(false); setSelectedChiefGuest(null); }); }}
      />
    </div>
  );
};