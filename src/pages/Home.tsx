import React, { useState, useEffect } from 'react';
import { Calendar, Users, Star, ArrowRight, Zap, Sparkles, Crown, Instagram, Youtube } from 'lucide-react';
import { useData } from '../context/DataContext';
import { MembershipModal } from '../components/MembershipModal';
import HeroBackground from '../components/HeroBackground';
import InfiniteLogoCarousel from '../components/InfiniteLogoCarousel';
import InfiniteMarquee from '../components/InfiniteMarquee';
import CoverflowCarousel from '../components/CoverflowCarousel';
import AutoCarousel from '../components/AutoCarousel';
import FacultyProfileModal from '../components/FacultyProfileModal';
import GuestArtistVideoModal from '../components/GuestArtistVideoModal';
import GuestArtistDetailModal from '../components/GuestArtistDetailModal';
import type { GuestArtist } from '../context/DataContext';
import Roadmap from '../components/Roadmap';

export const Home: React.FC = () => {
  const { 
    events, 
    galleryImages, 
    sponsors, 
    guestArtists, 
  facultyHeads,
  coreTeamMembers,
    socialMediaSettings, 
    homepageSettings,
    formSettings,
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
  const [detailArtist, setDetailArtist] = useState<GuestArtist | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'faculty' | 'committee' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [clicked, setClicked] = useState<{ type: 'faculty' | 'committee'; id: number } | null>(null);
  const [facultyPaused, setFacultyPaused] = useState(false);
  const [committeePaused, setCommitteePaused] = useState(false);

  // Heads data and memoized sorted lists (must be before any early return)
  const enabledFacultyHeads = facultyHeads.filter(head => head.enabled);
  const committeeHeads = coreTeamMembers.filter(m => m.enabled && m.is_head);
  const sortedFacultyHeads = React.useMemo(() => enabledFacultyHeads.slice().sort((a, b) => a.order_position - b.order_position), [enabledFacultyHeads]);
  const sortedCommitteeHeads = React.useMemo(() => committeeHeads.slice().sort((a, b) => a.order_position - b.order_position), [committeeHeads]);

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

    // Safety fallback: ensure content becomes visible even if the observer doesn't fire
    const safetyTimer = setTimeout(() => {
      animatedElements.forEach((el) => (el as HTMLElement).classList.add('animate-in'));
    }, 2000);

    return () => { clearTimeout(safetyTimer); observer.disconnect(); };
  }, [loading]);

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

        {/* Floating Particles */}
        <div className="particles-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              ></div>
            ))}
        </div>

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
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a
                href="/events"
                className="cyberpunk-btn cyberpunk-btn-primary group hover-float"
              >
                <span className="relative z-10 flex items-center">
                  <Calendar className="mr-2 group-hover:animate-pulse" size={20} />
                  EXPLORE EVENTS
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </span>
              </a>
              
              {formSettings?.membership_form_enabled && (
                <button 
                  onClick={() => setMembershipModal(true)}
                  className="cyberpunk-btn cyberpunk-btn-secondary group hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-2 group-hover:animate-pulse" size={20} />
                    JOIN RICO FAMILY
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sponsor Logos Section */}
        {homepageSettings?.sponsor_section_enabled && homepageSettings?.sponsor_logos && homepageSettings.sponsor_logos.length > 0 && (
          <div className="absolute bottom-8 left-0 right-0 z-10">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4 font-mono">
                {homepageSettings.sponsor_section_text}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-6 px-4">
                {homepageSettings.sponsor_logos
                  .filter((logo: any) => logo.enabled && logo.logo_url)
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((logo: any) => (
                    <div key={logo.id} className="hover-float">
                      {logo.website ? (
                        <a
                          href={logo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block transition-transform hover:scale-110"
                        >
                          <img
                            src={logo.logo_url}
                            alt={logo.name}
                            className="h-14 md:h-10 opacity-90 hover:opacity-100 transition-opacity"
                          />
                        </a>
                      ) : (
                        <img
                          src={logo.logo_url}
                          alt={logo.name}
                          className="h-8 md:h-10 opacity-80"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </section>

      

      {/* Featured Guest Artists */}
      {featuredGuestArtists.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  FEATURED <span className="neon-pink">ARTISTS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Meet the incredible artists who will light up RICORRENZA 2025
                </p>
              </div>
            </div>

            <CoverflowCarousel<GuestArtist>
              items={featuredGuestArtists}
              intervalMs={3200}
              visibleRange={2}
              pauseOnHover={true}
              showArrows={true}
              showDots={false}
              onItemClick={(artist) => { setDetailArtist(artist); setDetailOpen(true); }}
              className="mt-2"
              renderItem={(artist) => (
                <div className="cyberpunk-card group w-[310px] md:w-[360px] overflow-hidden">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                    <div className="absolute top-4 right-4">
                      <Star className="w-6 h-6 text-pink-400 animate-pulse pulse-ring" />
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
                        FEATURED ARTIST
                      </div>
                    </div>

                    {(artist.video_url || artist.youtube_url) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedArtistForVideo(artist); setVideoModalOpen(true); }}
                        className="absolute top-4 left-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white border border-white/30 shadow-lg ring-1 ring-pink-400/40 hover:ring-pink-300/70 transition-all animate-pulse"
                        aria-label={`Play video for ${artist.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                      {artist.name}
                    </h3>
                    <p className="text-pink-400 font-semibold mb-3">{artist.title}</p>
                    <div className="mb-3">
                      <span className="inline-block bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
                        {artist.specialty}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3">
                      {artist.description}
                    </p>

                    {artist.social_links && Object.keys(artist.social_links).length > 0 && (
                      <div className="flex space-x-3 mb-1">
                        {artist.social_links.instagram && (
                          <a href={artist.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 transition-colors hover:scale-110">
                            <Instagram size={20} />
                          </a>
                        )}
                        {artist.social_links.youtube && (
                          <a href={artist.social_links.youtube} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors hover:scale-110">
                            <Youtube size={20} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        </section>
      )}

      <GuestArtistVideoModal
        isOpen={videoModalOpen}
        onClose={() => { setVideoModalOpen(false); setSelectedArtistForVideo(null); }}
        artist={selectedArtistForVideo}
      />
      <GuestArtistDetailModal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailArtist(null); }}
        artist={detailArtist}
      />

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
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
                  className="scroll-animate opacity-0 transform translate-y-20 hover-float w-72 md:w-96"
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

                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-blue-400 text-sm">{event.category}</p>
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

            {/* Removed bottom navigation button for Events section as per request */}
          </div>
        </section>
      )}

      {/* Featured Gallery */}
      {featuredImages.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-teal-900/30 to-blue-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
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
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/40 via-slate-900/60 to-zinc-900/40"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  OUR <span className="neon-white">PARTNERS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-gray-500 to-slate-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Powered by industry leaders who believe in our vision
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

            <InfiniteLogoCarousel
              items={featuredSponsors.map(s => ({ id: s.id, name: s.name, logo: s.logo, website: s.website }))}
              speedPxPerSec={140}
              pauseOnHover={true}
              className="py-2"
              heightClass="h-16"
            />
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
                    blurPerStep={2.5}
                    edgeFades={true}
                    centerGlow={true}
                    arrowSize={48}
                    paused={facultyPaused}
                    onItemClick={(item) => {
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
                    renderItem={(head) => (
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
              {committeeHeads.length > 0 && homepageSettings?.show_committee_heads && (
                <div className="relative">
                  <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-400" /> Committee Heads
                  </h3>
                  <InfiniteMarquee
                    items={sortedCommitteeHeads}
                    direction="right"
                    speedPxPerSec={75}
                    pauseOnHover={true}
                    paused={committeePaused}
                    pauseOnTouch={false}
                    itemWrapperClassName="px-4 md:px-6"
                    className="py-4 relative"
                    renderItem={(m) => (
                      <div
                        className={`w-72 md:w-80 cyberpunk-card p-5 cursor-pointer transition-shadow duration-150 ${clicked && clicked.type === 'committee' && clicked.id === m.id ? 'ring-2 ring-yellow-400/80 shadow-lg shadow-yellow-500/25' : ''}`}
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
                        onMouseEnter={() => setCommitteePaused(true)}
                        onMouseLeave={() => setCommitteePaused(false)}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg mb-4 bg-black/30 flex items-center justify-center">
                          <img src={m.image} alt={m.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                        <div className="font-bold text-white flex items-center text-base md:text-lg">
                          <Crown className="w-4 h-4 text-yellow-400 mr-1" /> {m.name}
                        </div>
                        <div className="text-sm md:text-base text-gray-300">{m.role}</div>
                      </div>
                    )}
                  />
                  {/* Edge fades for readability */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 md:w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent"></div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 md:w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent"></div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

  {/* Roadmap Section */}
  <Roadmap vehicleImage="/rickshaw.svg" vehicleSize={110} offsetAlong={12} offsetNormal={-8} />

  {/* About Section */}

      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/30 to-purple-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                ABOUT <span className="neon-cyan">RICORRENZA</span>
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
                    THE FUTURE IS NOW
                  </h3>
                  <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                      RICORRENZA 2025 is not just a festival—it's a <span className="neon-pink font-semibold"> revolution</span> that 
                      merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.
                    </p>
                    <p>
                      Born from the vision of creating a platform where <span className="neon-blue font-semibold">digital dreams</span> meet 
                      reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, 
                      innovators, and creators from across the digital landscape.
                    </p>
                    <p>
                      Our festival celebrates the <span className="neon-purple font-semibold">convergence of disciplines</span>—where medical 
                      students become tech innovators, where artists code their creativity, and where the future of human potential 
                      is explored through immersive experiences.
                    </p>
                  </div>
                  
                  {/* Key Features */}
                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-cyan-400 mb-3">INNOVATION TRACKS</h4>
                      <div className="space-y-2">
                        {[
                          'Healthcare Technology',
                          'Digital Arts & Media',
                          'Music',
                          'Interactive Experiences'
                        ].map((track, index) => (
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
                        {[
                          'Virtual Reality Labs',
                          'AI Demonstration Pods',
                          'Art Galleries',
                          'Future Tech Showcases'
                        ].map((zone, index) => (
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
                      <div className="text-center">
                        <div className="text-4xl font-black neon-cyan mb-2 counter-animation">2025</div>
                        <div className="text-gray-400 text-sm">FESTIVAL YEAR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black neon-pink mb-2 counter-animation">3+</div>
                        <div className="text-gray-400 text-sm">DAYS OF EVENTS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black neon-purple mb-2 counter-animation">1000+</div>
                        <div className="text-gray-400 text-sm">PARTICIPANTS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black neon-blue mb-2 counter-animation">∞</div>
                        <div className="text-gray-400 text-sm">POSSIBILITIES</div>
                      </div>
                    </div>
                    
                    {/* Mission Statement */}
                    <div className="border-t border-cyan-500/30 pt-6">
                      <h4 className="text-xl font-bold mb-4 cyberpunk-title">OUR MISSION</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                       Merging medicine  ,      Tech & culture to inspire, innovate and shape the future of healthcare
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                  onClick={() => setMembershipModal(true)}
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
          onClose={() => setMembershipModal(false)}
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

        .particles-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 50%;
          animation: particleFloat linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
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

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 5px #ff00ff,
            0 0 10px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 5px #00ffff,
            0 0 10px #00ffff;
        }

        .neon-green {
          color: #00ff00;
          text-shadow: 
            0 0 5px #00ff00,
            0 0 10px #00ff00;
        }

        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 5px #ffff00,
            0 0 10px #ffff00;
        }

        .neon-white {
          color: #ffffff;
          text-shadow: 
            0 0 5px #ffffff,
            0 0 10px #ffffff;
        }

        .neon-cyan {
          color: #00ffff;
          text-shadow: 
            0 0 5px #00ffff,
            0 0 10px #00ffff;
        }

        .counter-animation {
          animation: counterPulse 2s ease-in-out infinite alternate;
        }

        @keyframes counterPulse {
          from {
            text-shadow: 
              0 0 5px currentColor,
              0 0 10px currentColor;
          }
          to {
            text-shadow: 
              0 0 10px currentColor,
              0 0 20px currentColor,
              0 0 30px currentColor;
          }
        }

        .glow-text {
          text-shadow: 
            0 0 3px currentColor,
            0 0 6px currentColor;
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
          
          .particles-container {
            display: none;
          }
          
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