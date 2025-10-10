import React, { useEffect, useRef, useState } from 'react';
import { Users, Heart, Star, Crown, AlignJustify as Spotify, Zap, ArrowRight, Shield } from 'lucide-react';
import Instagram3DButtonLink from '../components/Instagram3DButtonLink';
import Facebook3DButtonLink from '../components/Facebook3DButtonLink';
import YouTube3DButtonLink from '../components/YouTube3DButtonLink';
import Phone3DButtonLink from '../components/Phone3DButtonLink';
import Email3DButtonLink from '../components/Email3DButtonLink';
import PreserveNewlines from '../components/PreserveNewlines';
import DescriptionHeaderBody from '../components/DescriptionHeaderBody';
import { useData } from '../context/DataContext';
import HeroBackground from '../components/HeroBackground';
import { MembershipModal } from '../components/MembershipModal';
const InfiniteMarquee = React.lazy(() => import('../components/InfiniteMarquee')) as unknown as React.ComponentType<any>;
const SportsProfileModal = React.lazy(() => import('../components/SportsProfileModal')) as unknown as React.ComponentType<any>;
const CoverflowCarousel = React.lazy(() => import('../components/CoverflowCarousel')) as unknown as React.ComponentType<any>;
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal')) as unknown as React.ComponentType<any>;
// gsap removed for marquee adornments to avoid Safari flicker; CSS keyframes used instead

// Local FacultyHead type removed; rely on DataContext types instead

export const RicoFamily: React.FC = () => {
  const { facultyHeads, coreCommittees, coreTeamMembers, sportsCommittees, sportsTeamMembers, formSettings, homepageSettings } = useData();
  // Minimal web dev role detection (fallback to config if present)
  const webDevPhraseList = (homepageSettings as any)?.web_dev_role_phrases && Array.isArray((homepageSettings as any).web_dev_role_phrases) && (homepageSettings as any).web_dev_role_phrases.length > 0
    ? (homepageSettings as any).web_dev_role_phrases.map((p: string) => String(p).toLowerCase())
    : ['web developer','lead developer','web design & maintenance','web design and maintenance','web design','developer'];
  // Refined developer role detection: only show cyan styling for lead developer tier
  const isLeadWebDevRole = (role?: string | null) => {
    const rl = String(role || '').toLowerCase();
    if (!rl) return false;
    return ['lead developer','lead web developer','principal developer','principal engineer'].some(p => rl.includes(p));
  };
  const isAnyWebDevRole = (role?: string | null) => {
    const rl = String(role || '').toLowerCase();
    if (!rl) return false;
    return webDevPhraseList.some((p: string) => rl.includes(p));
  };
  const [glitchActive, setGlitchActive] = useState(false);
  const [membershipModal, setMembershipModal] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [facultyPaused, setFacultyPaused] = useState(false);
  const committeeHeadsMarqueeRef = useRef<HTMLDivElement | null>(null);
  const sportsHeadsMarqueeRef = useRef<HTMLDivElement | null>(null);

  // Filter enabled faculty heads and sort by order
  const enabledFacultyHeads = (facultyHeads || [])
    .filter(faculty => faculty.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Filter enabled committees and sort by order
  const enabledCommittees = (coreCommittees || [])
    .filter(committee => committee.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Sports committees section data
  const enabledSportsCommittees = (sportsCommittees || [])
    .filter(c => c.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Detect the Organising/Organizing Committee with flexible matching
  // Note: This runs only on sports committees, so we don't require the word "sports" in the name.
  const isOrganisingName = (name?: string | null) => {
    const s = String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!s) return false;
    // Common variants and misspellings
    const organKeywords = [
      'organising',
      'organizing',
      'organisation',
      'organization',
      'organiser',
      'organizer',
      'organisers',
      'organizers',
      'org team',
      'org. team',
      'org committee',
      'org. committee',
    ];
    // If it contains any of the above, consider it the organising committee
    if (organKeywords.some(k => s.includes(k))) return true;
    // Fallback: broad match on "organ" + (committee|team)
    if (s.includes('organ') && (s.includes('committee') || s.includes('team'))) return true;
    return false;
  };
  const organisingCommittee = enabledSportsCommittees.find(c => isOrganisingName(c.name)) || null;

  // Track expanded member cards (non-head)
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());

  const toggleMemberExpanded = (id: number) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Group members by committee
  const membersByCommittee = (coreTeamMembers || []).reduce((acc, member) => {
    if (member.enabled && member.committee_id) {
      if (!acc[member.committee_id]) {
        acc[member.committee_id] = [];
      }
      acc[member.committee_id].push(member);
    }
    return acc;
  }, {} as Record<string, typeof coreTeamMembers>);

  // Sort members within each committee by order position
  Object.keys(membersByCommittee).forEach(committee_id => {
    membersByCommittee[committee_id].sort((a, b) => a.order_position - b.order_position);
  });

  // Sports members grouped by sports committee
  const sportsMembersByCommittee = (sportsTeamMembers || []).reduce((acc, m) => {
    if (m.enabled && m.committee_id) {
      if (!acc[m.committee_id]) acc[m.committee_id] = [];
      acc[m.committee_id].push(m);
    }
    return acc;
  }, {} as Record<string, typeof sportsTeamMembers>);
  Object.keys(sportsMembersByCommittee).forEach(cid => {
    sportsMembersByCommittee[cid].sort((a, b) => a.order_position - b.order_position);
  });

  // Committee heads across all committees (for marquee)
  const committeeHeads = (coreTeamMembers || [])
    .filter(m => m.enabled && m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Council members (non-head)
  const councilMembers = (coreTeamMembers || [])
    .filter(m => m.enabled && (m as any).isCouncil && !m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Glitch effect trigger
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 12000);
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

    return () => observer.disconnect();
  }, [enabledFacultyHeads, enabledCommittees]); // Re-run when faculty heads or committees change

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

  // Stable, GPU-friendly marquee adornments (Safari-safe)
  // We avoid animating CSS filter on the marquee container to prevent flicker.
  // Scanline and neon glow are handled via CSS keyframes instead of JS timelines.
  useEffect(() => {
    // No imperative animation needed; styles handled in CSS.
    // This effect is kept in case we later need to toggle classes or measure.
  }, []);

  // Check if social media links should be shown
  // Social media settings available via context if needed

  // Sports profile modal state
  const [sportsModalOpen, setSportsModalOpen] = useState(false);
  const [selectedSportsPerson, setSelectedSportsPerson] = useState<any | null>(null);

  return (
  <div className="neon-theme min-h-screen">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="ricofamily" />

        {/* Floating Particles removed */}

        {/* Glitch Overlay */}
        <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Users className="w-5 h-4 mr-2 animate-pulse" />
              Fest Architects
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 neon-title ${glitchActive ? 'glitch-active' : ''}`}>
              RICO <span className="neon-blue">FAMILY</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Meet the <span className="neon-pink">visionaries</span>, 
              <span className="neon-purple"> innovators</span>, and 
              <span className="neon-blue"> leaders</span> who make RICORRENZA possible
            </p>
          </div>
        </div>
      </section>

      {/* Faculty Head Section — 3D coverflow autoplay */}
      {enabledFacultyHeads.length > 0 && (
        <section className="py-13 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-orange-900/30 to-red-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-4xl font-black mb-4 neon-title">
                  FACULTY <span className="neon-yellow">LEADERSHIP</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-yellow-300 to-orange-500 mx-auto mb-4 expand-width"></div>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                  Leading the revolution in medical education
                </p>
              </div>
            </div>

            <CoverflowCarousel
              items={[...enabledFacultyHeads].sort((a, b) => a.order_position - b.order_position)}
              intervalMs={2600}
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
              onItemClick={(item: any) => { setSelectedFaculty(item); setFacultyModalOpen(true); setFacultyPaused(true); }}
              pauseOnHover={true}
              showArrows={true}
              className="py-6"
              renderItem={(head: any) => (
                <div className="w-72 md:w-80 neon-card p-5">
                  <div className="aspect-square w-full overflow-hidden rounded-lg mb-4 bg-black/30">
                    <img src={head.image} alt={head.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                  <div className="font-bold text-white text-center">{head.name}</div>
                  <div className="text-sm text-gray-300 text-center">{head.title}</div>
                </div>
              )}
            />
          </div>
        </section>
      )}

      {/* Council Section (restored) */}
      {councilMembers.length > 0 && (
        <section className="py-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-rose-900/50 to-orange-900/40"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-10 flex flex-col items-center translate-x-2 md:translate-x-4">
                <h2 className="text-4xl md:text-5xl font-black mb-4 neon-title tracking-wide text-center">
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.55)]">
                    COUNCIL
                  </span>
                </h2>
                <div className="w-52 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 mx-auto mb-4 rounded-full shadow-[0_0_12px_rgba(255,120,60,0.65)]"></div>
                <p className="text-lg text-gray-300 max-w-3xl mx-auto mt-4">
                  Strategic leadership and executive oversight
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {councilMembers.map((member, idx) => { const lead = isLeadWebDevRole(member.role); const anyDev = !lead && isAnyWebDevRole(member.role); return (
                <div key={member.id} className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className={`neon-card overflow-hidden grid md:grid-cols-2 gap-0 group border border-red-500/30 bg-black/40 backdrop-blur-sm ${lead ? 'ring-1 ring-cyan-500/40' : ''}`}> 
                    {/* Image */}
                    <div className="relative h-80 md:h-full overflow-hidden">
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <Crown className={`w-7 h-7 ${lead ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'} animate-pulse`} />
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <div className={`px-4 py-1 rounded-full text-sm font-bold tracking-wide inline-block shadow-md ${lead ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black' : 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-black'}`}>COUNCIL</div>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-6 flex flex-col justify-center">
                      <h3 className={`text-2xl font-extrabold mb-2 flex items-center gap-2 ${lead ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'text-white drop-shadow-[0_0_6px_rgba(255,80,80,0.5)] council-name'}`}>{member.name}</h3>
                      <p className={`text-lg font-semibold mb-4 ${lead ? 'text-cyan-400' : anyDev ? 'text-yellow-400' : 'text-red-400'}`}>{member.role || 'Member'}</p>
                              {member.description && (
                                (() => {
                                  // Make the header glow green for Treasurer role (only in the Council section)
                                  const isTreasurer = String(member.role || '').toLowerCase().includes('treasur');
                                  const headerClass = isTreasurer
                                    ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] font-semibold mb-2 text-lg'
                                    : 'text-gray-300 font-semibold mb-2 text-lg';
                                  return (
                                    <DescriptionHeaderBody
                                      text={member.description}
                                      headerClassName={headerClass}
                                      bodyClassName="text-gray-300 mb-4 leading-relaxed text-sm"
                                      highlights={["I Treasure Ricorrenza", "Treasure"]}
                                      headerHighlightRules={[
                                        // General Secretary header line highlight (red glow) — match full phrase
                                        {
                                          pattern: /^\s*as\s+the\s+(?:(?:g(?:\.\s*)?s(?:\.|\b))(?:\s*\/\s*gen(?:e)?ral\s+secretary)?|gen(?:e)?ral\s+secretary)\s+of\s+ricorrenza\s*2025/i,
                                          className: 'text-red-400 font-semibold drop-shadow-[0_0_12px_rgba(248,113,113,1)] drop-shadow-[0_0_28px_rgba(248,113,113,0.55)]'
                                        },
                                        // President header line highlight (blue glow) — match full phrase
                                        {
                                          pattern: /^\s*as\s+the\s+president\s+of\s+ricorrenza\s*2025/i,
                                          className: 'text-blue-400 font-semibold drop-shadow-[0_0_12px_rgba(96,165,250,1)] drop-shadow-[0_0_28px_rgba(96,165,250,0.55)]'
                                        }
                                      ]}
                                    />
                                  );
                                })()
                              )}
                      {member.specialty && (
                        <div className="mb-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium border tracking-wide ${lead ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : anyDev ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-red-500/15 text-red-300 border-red-500/40'}`}>{member.specialty}</span>
                        </div>
                      )}
                      {member.social_links && Object.values(member.social_links).some(l => l) && (
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className={`text-[11px] uppercase tracking-wide ${lead ? 'text-cyan-400' : anyDev ? 'text-yellow-400' : 'text-red-400'} font-semibold mr-1`}>Social Media:</span>
                          {member.social_links.instagram && (
                            <Instagram3DButtonLink href={member.social_links.instagram} iconSize={36} buttonSize={56} ariaLabel={`Instagram of ${member.name}`} />
                          )}
                          {member.social_links.youtube && (
                            <YouTube3DButtonLink href={member.social_links.youtube} iconSize={30} buttonSize={48} ariaLabel={`YouTube of ${member.name}`} />
                          )}
                          {member.social_links.facebook && (
                            <Facebook3DButtonLink href={member.social_links.facebook} iconSize={30} buttonSize={48} ariaLabel={`Facebook of ${member.name}`} />
                          )}
                          {member.social_links.spotify && (
                            <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors hover:scale-110"><Spotify size={30} /></a>
                          )}
                        </div>
                      )}
                      {(Boolean((member as any).email) || Boolean((member as any).phone)) && (
                        <div className="mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[11px] uppercase tracking-wide ${lead ? 'text-cyan-400' : anyDev ? 'text-yellow-400' : 'text-red-400'} font-semibold`}>Contact:</span>
                            {Boolean((member as any).email) && (
                              <Email3DButtonLink href={`mailto:${(member as any).email}`} iconSize={26} buttonSize={42} ariaLabel={`Email ${member.name}`} />
                            )}
                            {Boolean((member as any).phone) && (
                              <Phone3DButtonLink href={`tel:${(member as any).phone}`} iconSize={24} buttonSize={40} ariaLabel={`Call ${member.name}`} />
                            )}
                          </div>
                        </div>
                      )}
                      {member.achievements && member.achievements.length > 0 && (
                        <div>
                          <h6 className={`text-sm font-bold mb-3 ${lead ? 'text-cyan-400' : anyDev ? 'text-yellow-400' : 'text-red-400'}`}>KEY ACHIEVEMENTS</h6>
                          <div className="space-y-2">
                            {member.achievements.map((a, i2) => (
                              <div key={i2} className="flex items-start space-x-2 achievement-item" style={{ animationDelay: `${i2 * 0.18}s` }}>
                                <div className={`w-2 h-2 rounded-full mt-2 pulse-ring flex-shrink-0 ${lead ? 'bg-cyan-400' : anyDev ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                                <span className="text-gray-300 text-xs">{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        </section>
      )}

      {/* Committee Heads marquee — opposite direction */}
      {committeeHeads.length > 0 && (
        <section className="py-13 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-4xl font-black mb-4 neon-title">
                  COMMITTEE <span className="neon-blue">HEADS</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4 expand-width"></div>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                  Leading the specialized teams driving RICORRENZA's innovation
                </p>
              </div>
            </div>
            <div ref={committeeHeadsMarqueeRef} className="neon-marquee relative overflow-hidden w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] rounded-none">
              <div className="pointer-events-none absolute inset-0 rounded-none neon-inner-glow"></div>
              <div className="pointer-events-none absolute inset-0 rounded-none scanline-overlay"></div>
              <InfiniteMarquee
                items={committeeHeads}
                direction={homepageSettings?.committee_marquee_direction ?? 'right'}
                speedPxPerSec={homepageSettings?.committee_marquee_speed_px_per_sec ?? 90}
                glowOnPause
                glowColor="rgba(255,255,255,0.14)"
                adaptiveGlowOnPause
                adaptiveGlowOpacity={0.26}
                itemWrapperClassName="px-3"
                className="py-2"
                instantPause={true}
                renderItem={(m: any) => (
                  <div className="w-64 neon-card borderless p-4">
                    <div className="aspect-square w-full overflow-hidden rounded-lg mb-3 bg-black/30">
                      <img src={m.image} alt={m.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="font-bold text-white flex items-center">
                      <Crown className="w-4 h-4 text-yellow-400 mr-1" /> {m.name}
                    </div>
                    <div className="text-sm text-gray-300">{m.role}</div>
                  </div>
                )}
              />
              {/* edge fades to hide seams and reduce perceived flicker */}
              {/* Hide edge fades on small screens to avoid a visible inner border */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-2 sm:w-16 bg-gradient-to-r from-[#0b0b0b] to-transparent opacity-60" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-2 sm:w-16 bg-gradient-to-l from-[#0b0b0b] to-transparent opacity-60" />
            </div>
          </div>
        </section>
      )}

      {/* Core Committees Section */}
      {enabledCommittees.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black mb-6 neon-title">
                  CORE <span className="neon-blue">COMMITTEES</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  The specialized teams driving RICORRENZA's innovation
                </p>
              </div>
            </div>

            {/* Committees */}
            <div className="space-y-16">
              {enabledCommittees.map((committee, committeeIndex) => {
                const allCommitteeMembers = membersByCommittee[committee.id] || [];
                // Exclude council members so they don't appear twice (in Council section + their committee)
                const regularMembers = allCommitteeMembers.filter(member => !member.is_head && !(member as any).isCouncil);
                
                if (allCommitteeMembers.length === 0) return null;

                return (
                  <div
                    key={committee.id}
                    className="scroll-animate opacity-0 transform translate-y-20"
                    style={{ animationDelay: `${committeeIndex * 0.3}s` }}
                  >
                    {/* Committee Header */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                        <Users className="w-4 h-4 mr-2" />
                        {committee.is_core ? 'CORE COMMITTEE' : 'SPECIALIZED TEAM'}
                      </div>
                      <h3 className="text-4xl md:text-5xl font-black mb-4 neon-title committee-title" style={{ color: committee.color }}>
                        {committee.name.toUpperCase()}
                      </h3>
                      <PreserveNewlines as="div" text={committee.description} className="text-lg text-gray-300 max-w-2xl mx-auto" />
                    </div>

                    {/* Committee Head */}
                    {allCommitteeMembers.filter(m => m.is_head).length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                          Committee Heads ({allCommitteeMembers.filter(m => m.is_head).length})
                        </h4>
                        <div className="grid md:grid-cols-2 gap-8">
                          {allCommitteeMembers.filter(m => m.is_head).map(head => {
                            const lead = isLeadWebDevRole(head.role);
                            const anyDev = !lead && isAnyWebDevRole(head.role);
                            return (
                              <div key={head.id} className="committee-head-card neon-card overflow-hidden faculty-spotlight">
                                <div className="grid md:grid-cols-2 gap-0">
                                  {/* Image Section */}
                                  <div className="relative h-85 md:h-auto overflow-hidden">
                                    <img src={head.image} alt={head.name} className="w-full h-full object-cover faculty-image" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                    <div className="absolute top-4 right-4">
                                      <Crown className={`w-6 h-6 animate-pulse pulse-ring ${lead ? 'text-cyan-300' : 'text-yellow-400'}`} />
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                      {lead ? (
                                        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-black px-4 py-1 rounded-full text-sm font-bold inline-block">COMMITTEE HEAD</div>
                                      ) : (
                                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold inline-block">COMMITTEE HEAD</div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Content Section */}
                                  <div className="p-6 flex flex-col justify-center">
                                    <h5 className={`text-2xl font-bold mb-2 faculty-name ${lead ? 'webdev text-cyan-300' : 'text-white'}`}>{head.name}</h5>
                                    <p className={`text-lg mb-3 font-semibold ${lead ? 'text-cyan-400' : anyDev ? 'text-yellow-400' : 'text-yellow-400'}`}>{head.role}</p>
                                    <PreserveNewlines text={head.description} className="text-gray-300 mb-4 leading-relaxed text-sm" />
                                    {head.specialty && (
                                      <div className="mb-4">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${lead ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>{head.specialty}</span>
                                      </div>
                                    )}
                                    {head.social_links && Object.values(head.social_links).some(link => link) && (
                                      <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="text-[11px] uppercase tracking-wide text-cyan-400 font-semibold mr-1">Social Media:</span>
                                        {head.social_links.instagram && <Instagram3DButtonLink href={head.social_links.instagram} iconSize={36} buttonSize={56} ariaLabel={`Instagram of ${head.name}`} />}
                                        {head.social_links.youtube && <YouTube3DButtonLink href={head.social_links.youtube} iconSize={30} buttonSize={48} ariaLabel={`YouTube of ${head.name}`} />}
                                        {head.social_links.facebook && <Facebook3DButtonLink href={head.social_links.facebook} iconSize={30} buttonSize={48} ariaLabel={`Facebook of ${head.name}`} />}
                                        {head.social_links.spotify && (
                                          <a href={head.social_links.spotify} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors hover:scale-110">
                                            <Spotify size={30} />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {(Boolean((head as any).phone) || Boolean((head as any).email)) && (
                                      <div className="mb-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[11px] uppercase tracking-wide text-cyan-400 font-semibold">Contact:</span>
                                          {Boolean((head as any).email) && <Email3DButtonLink href={`mailto:${(head as any).email}`} iconSize={26} buttonSize={42} ariaLabel={`Email ${head.name}`} />}
                                          {Boolean((head as any).phone) && <Phone3DButtonLink href={`tel:${(head as any).phone}`} iconSize={24} buttonSize={40} ariaLabel={`Call ${head.name}`} />}
                                        </div>
                                      </div>
                                    )}
                                    {head.achievements.length > 0 && (
                                      <div>
                                        <h6 className="text-sm font-bold text-cyan-400 mb-3">KEY ACHIEVEMENTS</h6>
                                        <div className="space-y-2">
                                          {head.achievements.map((achievement, achievementIndex) => (
                                            <div key={achievementIndex} className="flex items-start space-x-2 achievement-item" style={{ animationDelay: `${achievementIndex * 0.2}s` }}>
                                              <div className={`w-2 h-2 rounded-full mt-2 pulse-ring flex-shrink-0 ${lead ? 'bg-cyan-400' : 'bg-yellow-400'}`}></div>
                                              <span className="text-gray-300 text-xs">{achievement}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );})}
                        </div>
                      </div>
                    )}

                    {/* Team Members Grid */}
                    {regularMembers.length > 0 && (
                      <>
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center">Team Members</h4>
                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {regularMembers.map((member, memberIndex) => {
                            const isExpanded = expandedMembers.has(member.id);
                            return (
                            <div
                              key={member.id}
                              className={`scroll-animate opacity-0 transform translate-y-20 team-card transition-all duration-500 ${isExpanded ? 'z-20' : 'hover-float'}`}
                              style={{ animationDelay: `${(committeeIndex * 0.3) + (memberIndex * 0.15)}s` }}
                            >
                              <div className={`neon-card group h-full overflow-hidden transition-all duration-500 ${isExpanded ? 'scale-105 ring-2 ring-blue-400 shadow-2xl shadow-blue-500/30' : ''}`}>
                                {/* Member Image (always visible) */}
                                <div className={`relative overflow-hidden ${isExpanded ? 'h-80' : 'h-64'}`}>
                                  <img
                                    src={member.image}
                                    alt={member.name}
                                    className={`w-full h-full object-cover object-top transition-transform duration-700 ${isExpanded ? 'scale-105' : 'group-hover:scale-110'} team-member-image`}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                  {/* Specialty Badge (overlay) */}
                                  {member.specialty && (
                                    <div
                                      className="absolute top-2 left-2 opacity-0 translate-y-1 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
                                      title={member.specialty}
                                    >
                                      <span
                                        className="text-white px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm border shadow-lg"
                                        style={{
                                          backgroundColor: committee.color + 'CC',
                                          borderColor: committee.color,
                                          boxShadow: `0 0 6px ${committee.color}, 0 0 14px ${committee.color}55`
                                        }}
                                      >
                                        {member.specialty}
                                      </span>
                                    </div>
                                  )}
                                  {/* Floating Icon */}
                                  <div className="absolute top-2 right-2 floating-icon">
                                    <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
                                  </div>
                                </div>

                                {/* Collapsed Basic Info */}
                                <div className="p-4">
                                  <h4 className="text-base font-bold text-white mb-0.5 member-name">
                                    {member.name}
                                  </h4>
                                  <p className="text-blue-400 font-semibold mb-2 text-xs">
                                    {member.role}
                                  </p>
                                  {/* Social Links + More/Less button row */}
                                  {((member.social_links && Object.values(member.social_links).some(link => Boolean(link))) || Boolean((member as any).phone)) ? (
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      {member.social_links?.instagram && (
                                        <Instagram3DButtonLink href={member.social_links.instagram} iconSize={24} buttonSize={40} ariaLabel={`Instagram of ${member.name}`} />
                                      )}
                                      {member.social_links?.youtube && (
                                        <YouTube3DButtonLink href={member.social_links.youtube} iconSize={22} buttonSize={38} ariaLabel={`YouTube of ${member.name}`} />
                                      )}
                                      {member.social_links?.spotify && (
                                        <a
                                          href={member.social_links.spotify}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-400 hover:text-green-300 transition-colors hover:scale-110"
                                        >
                                          <Spotify size={22} />
                                        </a>
                                      )}
                                      {Boolean((member as any).phone) && (
                                        <Phone3DButtonLink href={`tel:${(member as any).phone}`} iconSize={18} buttonSize={30} ariaLabel={`Call ${member.name}`} variant="ring" />
                                      )}
                                      {/* Spacer pushes button to right */}
                                      <button
                                        type="button"
                                        onClick={() => toggleMemberExpanded(member.id)}
                                        className="ml-auto text-[11px] px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:brightness-110 shadow-md shadow-blue-500/30 transition-all"
                                        aria-label={isExpanded ? `Show less about ${member.name}` : `Show more about ${member.name}`}
                                      >
                                        {isExpanded ? 'Less' : 'More'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center mb-3">
                                      <button
                                        type="button"
                                        onClick={() => toggleMemberExpanded(member.id)}
                                        className="ml-auto text-[11px] px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:brightness-110 shadow-md shadow-blue-500/30 transition-all"
                                        aria-label={isExpanded ? `Show less about ${member.name}` : `Show more about ${member.name}`}
                                      >
                                        {isExpanded ? 'Less' : 'More'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Expanded Details */}
                                  {isExpanded && (
                                    <div className="text-xs text-gray-300 space-y-3 mb-4 animate-fade-in">
                                      {member.description && (
                                        <PreserveNewlines text={member.description} className="leading-relaxed" />
                                      )}
                                      {member.specialty && (
                                        <p><span className="text-cyan-400 font-semibold">Specialty:</span> {member.specialty}</p>
                                      )}
                                      {Boolean((member as any).email) && (
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Email3DButtonLink href={`mailto:${(member as any).email}`} iconSize={20} buttonSize={32} ariaLabel={`Email ${member.name}`} variant="ring" />
                                        </div>
                                      )}
                                      {member.achievements.length > 0 && (
                                        <div>
                                          <p className="text-xs font-bold text-cyan-400 uppercase tracking-wide mb-1">
                                            Achievements
                                          </p>
                                          <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-400">
                                            {member.achievements.map((ach, i) => (
                                              <li key={i}>{ach}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Button moved into social row above; keeping slight top spacing when expanded for visual balance */}
                                  {isExpanded && (
                                    <div className="mt-0.5" />
                                  )}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sports Committees Section */}
      {enabledSportsCommittees.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-teal-900/30 to-blue-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black mb-6 neon-title">
                  SPORT <span className="neon-green">COMMITTEE</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-teal-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Fast-paced teams, electric energy — game on.
                </p>
              </div>
            </div>

            {/* Sports Organising Committee — always at the top if present */}
            {organisingCommittee && (
              <div className="scroll-animate opacity-0 transform translate-y-20 mb-16">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                    <Shield className="w-4 h-4 mr-2" /> SPORT ORGANISING COMMITTEE
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black mb-4 neon-title committee-title" style={{ color: organisingCommittee.color }}>
                    {String(organisingCommittee.name || '').toUpperCase()}
                  </h3>
                  {organisingCommittee.description && (
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto">{organisingCommittee.description}</p>
                  )}
                </div>

                {/* Heads marquee for Organising Committee */}
                {(() => {
                  const heads = (sportsMembersByCommittee[organisingCommittee.id] || []).filter(m => m.is_head);
                  return heads.length > 0 ? (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center">
                        <Crown className="w-5 h-5 text-yellow-500 inline mr-2" /> Heads
                      </h4>
                      <div ref={sportsHeadsMarqueeRef} className="overflow-hidden relative neon-marquee w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] rounded-none">
                        <div className="pointer-events-none absolute inset-0 rounded-none neon-inner-glow"></div>
                        <div className="pointer-events-none absolute inset-0 rounded-none scanline-overlay"></div>
                        <InfiniteMarquee
                          items={heads}
                          direction={homepageSettings?.committee_marquee_direction ?? 'right'}
                          speedPxPerSec={homepageSettings?.committee_marquee_speed_px_per_sec ?? 90}
                          pauseOnHover={true}
                          pauseOnTouch={true}
                          instantPause={true}
                          sideGutterPx={8}
                          glowOnPause={true}
                          adaptiveGlowOnPause={false}
                          itemWrapperClassName="px-3"
                          className="py-2"
                          renderItem={(head: any) => (
                            <div className="w-64 neon-card borderless p-4">
                              <div className="aspect-square w-full overflow-hidden rounded-lg mb-3 bg-black/30">
                                <img src={head.image} alt={head.name} loading="lazy" className="w-full h-full object-cover" />
                              </div>
                              <div className="font-bold text-white flex items-center"><Crown className="w-4 h-4 text-yellow-400 mr-1" /> {head.name}</div>
                              <div className="text-sm text-gray-300">{head.role}</div>
                              <div className="mt-3 text-center">
                                <button
                                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-500 text-white"
                                  onClick={() => { setSelectedSportsPerson(head); setSportsModalOpen(true); }}
                                >
                                  More
                                </button>
                              </div>
                            </div>
                          )}
                        />
                        {/* gradient fades (hidden on mobile to remove inner border look) */}
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-2 sm:w-16 bg-gradient-to-r from-[#0b0b0b] to-transparent opacity-60" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-2 sm:w-16 bg-gradient-to-l from-[#0b0b0b] to-transparent opacity-60" />
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Regular members grid for Organising Committee */}
                {(() => {
                  const regularMembers = (sportsMembersByCommittee[organisingCommittee.id] || []).filter(m => !m.is_head);
                  return regularMembers.length > 0 ? (
                    <>
                      <h4 className="text-base sm:text-lg font-semibold text-gray-300 mb-3 text-center">Team Members</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {regularMembers.map((member, idx) => (
                          <div key={member.id} className="scroll-animate opacity-0 transform translate-y-20 team-card hover-float" style={{ animationDelay: `${idx * 0.12}s` }}>
                            <div className="neon-card h-full overflow-hidden p-2">
                              <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                                <img src={member.image} alt={member.name} className="w-full h-full object-cover object-top" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute top-1.5 right-1.5">
                                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 animate-pulse" />
                                </div>
                              </div>
                              <div className="p-2 sm:p-3">
                                <div className="text-sm sm:text-base font-bold text-white leading-tight">{member.name}</div>
                                <div className="text-green-400 font-semibold text-[10px] sm:text-xs">{member.role}</div>
                                <div className="mt-2 text-center">
                                  <button
                                    className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-md bg-green-600 hover:bg-green-500 text-white"
                                    onClick={() => { setSelectedSportsPerson(member); setSportsModalOpen(true); }}
                                    aria-label={`More about ${member.name}`}
                                  >
                                    More
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}

            {/* Committees */}
            <div className="space-y-16">
              {enabledSportsCommittees
                .filter(c => !organisingCommittee || c.id !== organisingCommittee.id)
                .map((committee, committeeIndex) => {
                const allCommitteeMembers = sportsMembersByCommittee[committee.id] || [];
                const regularMembers = allCommitteeMembers.filter(member => !member.is_head);
                if (allCommitteeMembers.length === 0) return null;

                return (
                  <div key={committee.id} className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${committeeIndex * 0.25}s` }}>
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                        <Shield className="w-4 h-4 mr-2" /> SPORT COMMITTEE
                      </div>
                      <h3 className="text-4xl md:text-5xl font-black mb-4 neon-title committee-title" style={{ color: committee.color }}>
                        {committee.name.toUpperCase()}
                      </h3>
                      <p className="text-lg text-gray-300 max-w-2xl mx-auto">{committee.description}</p>
                    </div>

                    {/* Heads (marquee-like row) */}
                    {allCommitteeMembers.filter(m => m.is_head).length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center">
                          <Crown className="w-5 h-5 text-yellow-500 inline mr-2" /> Heads
                        </h4>
                        <div ref={sportsHeadsMarqueeRef} className="overflow-hidden relative neon-marquee w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] rounded-none">
                          <div className="pointer-events-none absolute inset-0 rounded-none neon-inner-glow"></div>
                          <div className="pointer-events-none absolute inset-0 rounded-none scanline-overlay"></div>
                          <InfiniteMarquee
                            items={allCommitteeMembers.filter(m => m.is_head)}
                            direction={homepageSettings?.committee_marquee_direction ?? 'right'}
                            speedPxPerSec={homepageSettings?.committee_marquee_speed_px_per_sec ?? 90}
                            pauseOnHover={true}
                            pauseOnTouch={true}
                            instantPause={true}
                            sideGutterPx={8}
                            glowOnPause={true}
                            adaptiveGlowOnPause={false}
                            itemWrapperClassName="px-3"
                            className="py-2"
                            renderItem={(head: any) => (
                              <div key={head.id} className="w-64 neon-card borderless p-4">
                                <div className="aspect-square w-full overflow-hidden rounded-lg mb-3 bg-black/30">
                                  <img src={head.image} alt={head.name} loading="lazy" className="w-full h-full object-cover" />
                                </div>
                                <div className="font-bold text-white flex items-center"><Crown className="w-4 h-4 text-yellow-400 mr-1" /> {head.name}</div>
                                <div className="text-sm text-gray-300">{head.role}</div>
                                <div className="mt-3 text-center">
                                  <button
                                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-500 text-white"
                                    onClick={() => { setSelectedSportsPerson(head); setSportsModalOpen(true); }}
                                  >
                                    More
                                  </button>
                                </div>
                              </div>
                            )}
                          />
                          {/* gradient fades (hidden on mobile to remove inner border look) */}
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 sm:w-16 bg-gradient-to-r from-[#0b0b0b] to-transparent opacity-60" />
                          <div className="pointer-events-none absolute inset-y-0 right-0 w-2 sm:w-16 bg-gradient-to-l from-[#0b0b0b] to-transparent opacity-60" />
                        </div>
                      </div>
                    )}

                    {/* Team grid */}
                    {regularMembers.length > 0 && (
                      <>
                        <h4 className="text-base sm:text-lg font-semibold text-gray-300 mb-3 text-center">Team Members</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {regularMembers.map((member, idx) => (
                            <div key={member.id} className="scroll-animate opacity-0 transform translate-y-20 team-card hover-float" style={{ animationDelay: `${(committeeIndex * 0.25) + (idx * 0.12)}s` }}>
                              <div className="neon-card h-full overflow-hidden p-2">
                                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                                  <img src={member.image} alt={member.name} className="w-full h-full object-cover object-top" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                  <div className="absolute top-1.5 right-1.5">
                                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 animate-pulse" />
                                  </div>
                                </div>
                                <div className="p-2 sm:p-3">
                                  <div className="text-sm sm:text-base font-bold text-white leading-tight">{member.name}</div>
                                  <div className="text-green-400 font-semibold text-[10px] sm:text-xs">{member.role}</div>
                                  <div className="mt-2 text-center">
                                    <button
                                      className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-md bg-green-600 hover:bg-green-500 text-white"
                                      onClick={() => { setSelectedSportsPerson(member); setSportsModalOpen(true); }}
                                      aria-label={`More about ${member.name}`}
                                    >
                                      More
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Legacy Core Team Section (fallback if no committees) */}
  {/* Sports profile modal */}
  <SportsProfileModal open={sportsModalOpen} onClose={() => setSportsModalOpen(false)} person={selectedSportsPerson} />
      {enabledCommittees.length === 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black mb-6 neon-title">
                  CORE <span className="neon-blue">TEAM</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Team information will be managed through the admin dashboard
                </p>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="neon-card max-w-md mx-auto p-8">
                <Users size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Committees Yet</h3>
                <p className="text-gray-500">
                  Core team committees will be managed through the admin dashboard
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Styles */}
      <style>{`
        .animate-badge-enter { animation: badgeEnter 0.5s ease-out; }
        @keyframes badgeEnter { from { opacity:0; transform: translateY(-6px) scale(.9);} to { opacity:1; transform: translateY(0) scale(1);} }
        .animate-fade-in { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }
        .committee-title {
          text-shadow: 
            0 0 10px currentColor,
            0 0 20px currentColor;
          animation: committeeGlow 3s ease-in-out infinite alternate;
        }

        @keyframes committeeGlow {
          from {
            text-shadow: 
              0 0 5px currentColor,
              0 0 10px currentColor;
          }
          to {
            text-shadow: 
              0 0 15px currentColor,
              0 0 25px currentColor,
              0 0 35px currentColor;
          }
        }

        .committee-head-card {
          position: relative;
          overflow: hidden;
        }
        
        .committee-head-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .committee-head-card:hover::before {
          left: 100%;
        }

        @keyframes headNameGlow {
          from {
            text-shadow: 
              0 0 5px #ffff00,
              0 0 10px #ffff00;
          }
          to {
            text-shadow: 
              0 0 15px #ffff00,
              0 0 25px #ffff00,
              0 0 35px #ffff00;
          }
        }

        /* Neon marquee container styling */
        .neon-marquee {
          box-shadow:
            0 0 0px rgba(0,255,200,0.0),
            inset 0 0 0px rgba(0,255,200,0.0);
          transition: box-shadow 0.3s ease;
          backdrop-filter: blur(1px);
          /* Safari flicker mitigation */
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          contain: paint;
          will-change: transform;
        }
        .neon-inner-glow {
          box-shadow: inset 0 0 30px rgba(0,255,200,0.08), inset 0 0 60px rgba(0,180,255,0.06);
          border-radius: inherit;
          animation: neonPulse 4s ease-in-out infinite alternate;
        }
        @keyframes neonPulse {
          from { opacity: 0.9; }
          to { opacity: 0.7; }
        }
        .scanline-overlay {
          background: repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.02) 0px,
            rgba(255,255,255,0.02) 2px,
            transparent 2px,
            transparent 6px
          );
          mix-blend-mode: screen;
          opacity: 0.28;
          /* Avoid moving the element; animate background-position instead */
          background-size: 8px 100%;
          animation: scanlineMove 6s linear infinite;
          will-change: background-position;
        }
        @keyframes scanlineMove {
          0% { background-position: 0 0; }
          100% { background-position: 100% 0; }
        }

      `}</style>

      {/* Values Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black mb-6 neon-title">
                OUR <span className="neon-pink">VALUES</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-8 expand-width"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Heart, 
                title: 'COMPASSION', 
                desc: 'We believe in the healing power of empathy and human connection in healthcare' 
              },
              { 
                icon: Zap, 
                title: 'INNOVATION', 
                desc: 'Pushing the boundaries of medical science through technology and creative thinking' 
              },
              { 
                icon: Shield, 
                title: 'INTEGRITY', 
                desc: 'Maintaining the highest ethical standards in all our endeavors and relationships' 
              }
            ].map((value, index) => (
              <div key={index} className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="neon-card group text-center p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 group-hover:scale-110 transition-transform pulse-ring">
                    <value.icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 neon-text">{value.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Family CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-purple-900/60 to-blue-900/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 neon-title">
              JOIN THE <span className="neon-pink">FAMILY</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Become part of the RICORRENZA legacy and help shape the future of medical education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.membership_form_enabled ? (
                <button 
                  onClick={() => setMembershipModal(true)}
                  className="neon-btn neon-btn-primary group text-lg px-8 py-4 hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-2 group-hover:animate-pulse" size={24} />
                    BECOME A MEMBER
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                  </span>
                </button>
              ) : (
                <div className="neon-card p-6 text-center max-w-md">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Membership Closed</h3>
                  <p className="text-gray-500 text-sm">
                    {formSettings?.membership_form_message || 'Membership applications are currently closed. Please check back later.'}
                  </p>
                </div>
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
        onClose={() => { setFacultyModalOpen(false); setFacultyPaused(false); }}
        person={selectedFaculty ? {
          name: selectedFaculty.name,
          title: selectedFaculty.title,
          image: selectedFaculty.image,
          description: selectedFaculty.description,
          specialty: (selectedFaculty as any).specialty,
          email: (selectedFaculty as any).email,
          phone: (selectedFaculty as any).phone,
          achievements: selectedFaculty.achievements,
          social_links: (selectedFaculty as any).social_links,
        } : null}
      />

      <style>{`
        .neon-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .neon-grid {
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
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .neon-title {
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

        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 2px #ffff00,
            0 0 4px #ffff00;
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

        .neon-btn {
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

        .neon-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .neon-btn:hover::before {
          left: 100%;
        }

        .neon-btn-primary {
          border-color: #ff00ff;
          color: #ff00ff;
          box-shadow: 
            0 0 10px rgba(255, 0, 255, 0.2),
            inset 0 0 10px rgba(255, 0, 255, 0.05);
        }

        .neon-btn-primary:hover {
          background: rgba(255, 0, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 0, 255, 0.4),
            inset 0 0 20px rgba(255, 0, 255, 0.1);
          transform: translateY(-2px);
        }

        .neon-btn-secondary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.2),
            inset 0 0 10px rgba(0, 255, 255, 0.05);
        }

        .neon-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .neon-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .neon-card::before {
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

        .neon-card:hover::before {
          transform: translateX(0);
        }

        .neon-card:hover {
          border-color: rgba(255, 0, 255, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(255, 0, 255, 0.1);
          transform: translateY(-5px);
        }

        /* Borderless variant for marquee cards */
        .neon-card.borderless {
          border: none !important;
          box-shadow: none !important;
        }
        .neon-card.borderless::before {
          display: none !important;
        }
        .neon-card.borderless:hover {
          border: none !important;
          box-shadow: none !important;
          transform: none !important;
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

        /* Faculty Head Specific Styles */
        .faculty-spotlight {
          position: relative;
          overflow: hidden;
        }

        .faculty-spotlight::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 0, 0.05) 50%, transparent 70%);
          animation: facultyShine 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes facultyShine {
          0%, 100% { transform: translateX(-100%) rotate(45deg); }
          50% { transform: translateX(100%) rotate(45deg); }
        }

        .faculty-image {
          transition: all 0.5s ease;
          filter: grayscale(20%) contrast(110%);
        }

        .faculty-spotlight:hover .faculty-image {
          filter: grayscale(0%) contrast(120%);
          transform: scale(1.05);
        }

        .faculty-name { animation: nameGlowYellow 3s ease-in-out infinite alternate; }
        .faculty-name.webdev { animation: nameGlowCyan 3s ease-in-out infinite alternate; }

        @keyframes nameGlowYellow {
          from { text-shadow: 0 0 2px #ffff00, 0 0 4px #ffff00; }
          to { text-shadow: 0 0 4px #ffff00, 0 0 8px #ffff00, 0 0 12px #ffff00; }
        }
        @keyframes nameGlowCyan {
          from { text-shadow: 0 0 2px #22d3ee, 0 0 4px #22d3ee; }
          to { text-shadow: 0 0 4px #22d3ee, 0 0 8px #06b6d4, 0 0 14px #0891b2; }
        }

        /* Council red glow */
        .council-name { animation: nameGlowRed 3s ease-in-out infinite alternate; }
        @keyframes nameGlowRed {
          from { text-shadow: 0 0 2px #f87171, 0 0 4px #f87171; }
          to { text-shadow: 0 0 4px #f87171, 0 0 8px #ef4444, 0 0 14px #dc2626; }
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

        /* Core Team Specific Styles */
        .team-card {
          position: relative;
        }

        .team-card::before {
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

        .team-card:hover::before {
          opacity: 1;
          animation: teamCardSweep 1s ease-in-out;
        }

        @keyframes teamCardSweep {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .team-member-image {
          filter: grayscale(30%) contrast(110%);
          transition: all 0.5s ease;
        }

        .team-card:hover .team-member-image {
          filter: grayscale(0%) contrast(120%);
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

        .team-card:hover .member-name::after {
          width: 100%;
        }

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

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .neon-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          /* particles CSS removed */
          
          .neon-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .neon-card {
            margin: 0 4px;
          }
          
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .neon-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .neon-btn {
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
    </div>
  );
};