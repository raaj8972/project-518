import React, { useEffect, useRef, useState, startTransition } from 'react';
import { Heart, Users, Zap, Shield, ArrowRight, Instagram, Phone, Facebook } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { FacultyHead } from '../types/data';

import { MembershipModal } from '../components/MembershipModal';
import ScrollHint from '../components/ScrollHint';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

// RicoFamily Sub-components
import { FounderCard } from '../components/RicoFamily/FounderCard';

import { CommitteeSection } from '../components/RicoFamily/CommitteeSection';

import '../styles/RicoFamily.css';

const InfiniteMarquee = React.lazy(() => import('../components/InfiniteMarquee'));
const CoverflowCarousel = React.lazy(() => import('../components/CoverflowCarousel'));
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal'));
// gsap removed for marquee adornments to avoid Safari flicker; CSS keyframes used instead
// FounderCard extracted to separate component

export const RicoFamily: React.FC = () => {
  const { facultyHeads, coreCommittees, coreTeamMembers, bandMembers, formSettings, homepageSettings } = useData();
  // Refined developer role detection: only show cyan styling for lead developer tier
  const isLeadWebDevRole = (role?: string | null, committeeName?: string) => {
    const rl = String(role || '').toLowerCase();
    const cn = String(committeeName || '').toLowerCase();
    if (!rl) return false;
    // Must be a lead role AND in a web-related committee
    return ['lead developer','lead web developer','principal developer','principal engineer'].some(p => rl.includes(p)) && cn.includes('web');
  };

  // Determine Mobile State (Moved up to prevent hoisting issues)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); 
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [membershipModal, setMembershipModal] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyHead | null>(null);
  const [facultyPaused, setFacultyPaused] = useState(false);
  const committeeHeadsMarqueeRef = useRef<HTMLDivElement | null>(null);

  // Filter enabled faculty heads and sort by order
  const enabledFacultyHeads = (facultyHeads || [])
    .filter(faculty => faculty.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Filter enabled committees and sort by order
  const enabledCommittees = (coreCommittees || [])
    .filter(committee => committee.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Track open committee for accordion layout
  const [openCommitteeId, setOpenCommitteeId] = useState<number | null>(null);

  // All team data is managed via Admin → Core Team Management
  const allTeamMembersCombined = [...(coreTeamMembers || [])];

  // Group members by committee
  const membersByCommittee = allTeamMembersCombined.reduce((acc, member) => {
    if (member.enabled && member.committee_id) {
      if (!acc[member.committee_id]) {
        acc[member.committee_id] = [];
      }
      acc[member.committee_id].push(member);
    }
    return acc;
  }, {} as Record<string, any[]>);

  // Sort members within each committee by order position
  Object.keys(membersByCommittee).forEach(committee_id => {
    membersByCommittee[committee_id].sort((a, b) => a.order_position - b.order_position);
  });

  // Committee heads across all committees (for marquee)
  const committeeHeads = allTeamMembersCombined
    .filter(m => m.enabled && m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Council members (non-head) — fully database-driven
  const councilMembers = (coreTeamMembers || [])
    .filter(m => m.enabled && (m as any).is_council && !m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Founders extraction (Curated + Dynamic)
  const founders = [
    {
      id: 'founder-raaj-legacy',
      name: 'RAAJ',
      role: 'Founder of Website',
      image: '/storage/uploads/raaj_founder.png', 
      social_links: {
        instagram: 'https://www.instagram.com/i_amraaj__?igsh=a2ZxaTBubnpmYmhu&utm_source=qr'
      }
    },
    ...(coreTeamMembers || [])
      .filter(m => 
        m.enabled && 
        isLeadWebDevRole(m.role, coreCommittees.find(c => c.id === m.committee_id)?.name) &&
        !m.name.toLowerCase().includes('raaj') // Avoid duplication if re-added
      )
      .sort((a, b) => a.order_position - b.order_position)
  ];

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
  }, [enabledFacultyHeads, enabledCommittees, coreTeamMembers, bandMembers]);

  // Parallax effect
  // Parallax effect (Optimized with requestAnimationFrame)
  useEffect(() => {
    let ticking = false;
    
    const onScroll = () => {
      if (isMobile) return; // Disable parallax on mobile to prevent scroll crashes
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const parallaxElements = document.querySelectorAll('.parallax');
          
          parallaxElements.forEach((element) => {
            const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
            const yPos = -(scrolled * speed);
            (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);



  return (
  <div className="bg-[#030712] bg-hex-grid text-[#e2e8f0] selection:bg-cyan-500/30 min-h-screen font-sans antialiased overflow-x-hidden relative">
    {/* Global Top J.A.R.V.I.S. HUD Scanline */}
    <div className="animate-scanline absolute inset-0 pointer-events-none z-50"></div>
    <SEO 
      title={`Rico Family — ${BRAND_NAME} ${BRAND_YEAR}`} 
      description={`Meet the team behind ${BRAND_NAME} ${BRAND_YEAR} - Faculty, Council, and Committee members.`} 
      canonical="https://ricorrenza.fun/rico-family" 
    />
    <ScrollHint />


      {/* Founder Section — Compact Spotlight / Slider */}
      {founders.length > 0 && (
        <section className="pt-20 pb-16 md:pt-32 md:pb-24 relative overflow-hidden bg-[#030712] border-b border-white/5">
          {/* Cyberpunk Background Ambience */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] animate-pulse"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Section Header */}
            <div className="scroll-animate opacity-0 transform translate-y-10 flex flex-col items-center mb-12 md:mb-16">

              <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-2 text-center leading-none mcu-title-text mcu-title-glow">
                INITIATIVE <br className="md:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-red-600">CREATOR</span>
              </h2>
            </div>

            {/* Conditional Layout: Slider if > 1, Centered if 1 */}
            <div className="max-w-7xl mx-auto">
              {founders.length > 1 ? (
                <div className="scroll-animate opacity-0 transform translate-y-10">
                  <React.Suspense fallback={<div className="h-[500px] flex items-center justify-center text-cyan-500/50 uppercase tracking-widest text-xs font-black animate-pulse">Initializing Platform...</div>}>
                    <CoverflowCarousel 
                      items={founders}
                      stageHeight={isMobile ? 500 : 540}
                      visibleRange={isMobile ? 1 : 2}
                      stepPx={isMobile ? 280 : 400}
                      scaleStep={0.15}
                      renderItem={(founder, _, isActive) => (
                        <FounderCard founder={founder} compact={true} isActive={isActive} />
                      )}
                    />
                  </React.Suspense>
                </div>
              ) : (
                <div className="scroll-animate opacity-0 transform translate-y-10 flex justify-center">
                   <FounderCard founder={founders[0]} compact={false} isActive={true} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Faculty Head Section — 3D coverflow autoplay */}
      {enabledFacultyHeads.length > 0 && (
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
          {/* S.H.I.E.L.D Tech Glows */}
          <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[200px] pointer-events-none mix-blend-screen"></div>
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-12 md:mb-16">

                <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                  FACULTY
                </h2>
                <p className="text-sm md:text-lg text-cyan-100/50 max-w-2xl mx-auto font-light hud-monospace">
                  Guiding the vision of {BRAND_NAME}
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
              onItemClick={(item: any) => { startTransition(() => { setSelectedFaculty(item); setFacultyModalOpen(true); setFacultyPaused(true); }); }}
              pauseOnHover={true}
              showArrows={true}
              className="py-6"
              renderItem={(head: any) => (
                <div className="w-72 md:w-[22rem] p-6 shield-dossier clip-angular-br border-cyan-500/30 backdrop-blur-2xl box-glow-cyan transition-all duration-500 hover:-translate-y-2 bg-black">
                  <div className="aspect-[4/5] w-full overflow-hidden clip-angular-sm mb-6 bg-black/80 border border-cyan-500/40 relative group">
                    <img src={isMobile && head.image?.includes('supabase') ? `${head.image}?width=400` : head.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
                    <img loading="lazy" decoding="async" src={isMobile && head.image?.includes('supabase') ? `${head.image}?width=400` : head.image} alt={head.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10  grayscale opacity-80 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                    {/* Corner Targeting Brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                       <div className="w-8 h-8 clip-angular-br bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.8)]">
                          <Shield className="w-4 h-4 text-cyan-300" />
                       </div>
                    </div>
                  </div>
                  <div className="mcu-title-text text-xl md:text-2xl text-center glow-text text-cyan-50 mt-2">{head.name}</div>
                  <div className="text-xs text-cyan-400 font-mono text-center mt-3 tracking-[0.2em] uppercase font-bold hud-monospace mb-4">{head.title}</div>
                  
                  {/* Social Links Centered — only show if data exists */}
                  {((head.social_links?.instagram || (head as any).phone || head.social_links?.facebook || (head as any).email)) && (
                    <div onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-cyan-500/20 w-full relative z-20">
                       {head.social_links?.instagram && (
                         <a
                           href={head.social_links.instagram}
                           target="_blank" rel="noopener noreferrer"
                           className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:border-[#E1306C] shadow-[0_0_15px_rgba(225,48,108,0.3)] hover:shadow-[0_0_20px_rgba(225,48,108,0.5)] transition-all"
                         >
                           <Instagram size={16} />
                         </a>
                       )}
                       {(head as any).phone && (
                         <a
                           href={`tel:${(head as any).phone}`}
                           className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 hover:border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all"
                         >
                           <Phone size={16} />
                         </a>
                       )}
                       {head.social_links?.facebook && (
                         <a href={head.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 clip-angular-sm flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20 hover:border-[#1877F2] shadow-[0_0_15px_rgba(24,119,242,0.3)] hover:shadow-[0_0_20px_rgba(24,119,242,0.5)] transition-all"><Facebook size={16} /></a>
                       )}
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </section>
      )}

      {/* Council Section (restored) */}
      {councilMembers.length > 0 && (
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712] border-t border-red-500/20">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-16 flex flex-col items-center">
                <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                  THE <span className="text-red-500/80 font-light">COUNCIL</span>
                </h2>
                <p className="text-sm md:text-lg text-red-100/50 max-w-3xl mx-auto mt-2 font-light hud-monospace">
                  Strategic leadership and global oversight
                </p>
              </div>

              <CoverflowCarousel
                items={councilMembers}
                intervalMs={3000}
                visibleRange={2}
                stepPx={240}
                rotateYDeg={38}
                scaleStep={0.15}
                translateZStep={-100}
                stageHeight={400}
                pauseOnTouch={true}
                blurPerStep={2.5}
                edgeFades={true}
                centerGlow={true}
                arrowSize={48}
                pauseOnHover={true}
                showArrows={true}
                className="py-6"
                renderItem={(member: any) => {
                  const getCouncilTheme = (colorKey: string) => {
                    const themes: Record<string, { color: string; border: string; glow: string; accent: string; bg: string }> = {
                      red:     { color: 'red',     border: 'border-red-500/30',     glow: 'box-glow-red',     accent: 'text-red-500',     bg: 'from-red-600/10' },
                      emerald: { color: 'emerald', border: 'border-emerald-500/30', glow: 'box-glow-emerald', accent: 'text-emerald-500', bg: 'from-emerald-600/10' },
                      blue:    { color: 'blue',    border: 'border-blue-500/30',    glow: 'box-glow-blue',    accent: 'text-blue-500',    bg: 'from-blue-600/10' },
                      amber:   { color: 'amber',   border: 'border-amber-500/30',   glow: 'box-glow-amber',   accent: 'text-amber-500',   bg: 'from-amber-600/10' },
                      violet:  { color: 'violet',  border: 'border-violet-500/30',  glow: 'box-glow-violet',  accent: 'text-violet-500',  bg: 'from-violet-600/10' },
                      cyan:    { color: 'cyan',    border: 'border-cyan-500/30',    glow: 'box-glow-cyan',    accent: 'text-cyan-500',    bg: 'from-cyan-600/10' },
                      rose:    { color: 'rose',    border: 'border-rose-500/30',    glow: 'box-glow-rose',    accent: 'text-rose-500',    bg: 'from-rose-600/10' },
                      orange:  { color: 'orange',  border: 'border-orange-500/30',  glow: 'box-glow-orange',  accent: 'text-orange-500',  bg: 'from-orange-600/10' },
                    };
                    return themes[colorKey] || themes.red;
                  };
                  const theme = getCouncilTheme(member.color || 'red');
                  return (
                    <div className={`w-72 md:w-[22rem] p-6 shield-dossier clip-angular-br ${theme.border} backdrop-blur-2xl ${theme.glow} transition-all duration-500 hover:-translate-y-2 group bg-black`}>
                      <div className={`aspect-[4/5] w-full overflow-hidden clip-angular-sm mb-6 bg-black/80 border ${theme.border.replace('/30', '/40')} relative`}>
                        <img src={member.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
                    <img loading="lazy" decoding="async" src={member.image} alt={member.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10  grayscale opacity-80 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-100" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                        
                        {/* Corner Targeting Brackets */}
                        <div className={`absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 ${theme.accent.replace('text-', 'border-')}`}></div>
                        <div className={`absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 ${theme.accent.replace('text-', 'border-')}`}></div>
                        <div className={`absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 ${theme.accent.replace('text-', 'border-')}`}></div>
                        <div className={`absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 ${theme.accent.replace('text-', 'border-')}`}></div>
                        
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                           <div className={`w-8 h-8 clip-angular-br ${theme.accent.replace('text-', 'bg-')}/20 border ${theme.accent.replace('text-', 'border-')}/60 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.8)]`}>
                              <Shield className={`w-4 h-4 ${theme.accent.replace('text-', 'text-').replace('-500', '-300')}`} />
                           </div>
                        </div>
                      </div>
                      <div className={`mcu-title-text text-xl md:text-2xl text-center glow-text text-white mt-2`}>{member.name}</div>
                      <div className={`text-xs ${theme.accent} font-mono text-center mt-3 tracking-[0.2em] uppercase font-bold hud-monospace`}>{member.role}</div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </section>
      )}

    {/* Committee Heads marquee */}
      {committeeHeads.length > 0 && (
        <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
          <div className="absolute inset-0 bg-transparent"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-12">

                <h2 className="text-4xl sm:text-5xl mb-4 mcu-title-text mcu-title-glow">
                  COMMITTEE
                </h2>
                <p className="text-sm md:text-lg text-blue-100/50 max-w-2xl mx-auto font-light hud-monospace">
                  Commanding the specialized squads of {BRAND_NAME}
                </p>
              </div>
            </div>
            <div ref={committeeHeadsMarqueeRef} className="relative overflow-hidden w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] rounded-none">
              <div className="pointer-events-none absolute inset-0 rounded-none bg-gradient-to-b from-[#030712] via-transparent to-[#030712] z-10 opacity-50"></div>
              <InfiniteMarquee
                items={committeeHeads as any[]}
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
                  <div className="w-64 p-5 shield-dossier clip-angular-sm box-glow-cyan transition-all duration-300">
                    <div className="aspect-square w-full overflow-hidden clip-angular-br mb-4 bg-black/50 border border-cyan-500/20 relative">
                      <img src={m.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
                    <img loading="lazy" decoding="async" src={m.image} alt={m.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10  grayscale opacity-90" />
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                      <div className="tech-divider absolute bottom-0 left-0 w-full"></div>
                    </div>
                    <div className="font-bold text-cyan-50 flex items-center mb-1 mcu-title-text text-lg">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 mr-2" /> {m.name}
                    </div>
                    <div className="text-xs text-cyan-300/70 tracking-widest uppercase font-semibold hud-monospace">{m.role}</div>
                  </div>
                )}
              />
              {/* edge fades to hide seams and reduce perceived flicker */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-32 bg-gradient-to-r from-[#030712] to-transparent z-20" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-32 bg-gradient-to-l from-[#030712] to-transparent z-20" />
            </div>
          </div>
        </section>
      )}

      {/* Core Committees Section */}
      {enabledCommittees.length > 0 && (
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none translate-y-[-50%]"></div>
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-16 md:mb-24">

                <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                  CORE <span className="text-purple-500/80 font-light">DIVISIONS</span>
                </h2>
                <p className="text-sm md:text-lg text-purple-100/50 max-w-3xl mx-auto font-light hud-monospace">
                  The operative wings managing {BRAND_NAME}'s global presence
                </p>
              </div>
            </div>

            {/* Committees Accordion */}
            <div className="space-y-4">
              {enabledCommittees.map((committee, committeeIndex) => (
                <CommitteeSection 
                  key={committee.id}
                  committee={committee}
                  membersByCommittee={membersByCommittee}
                  isMobile={isMobile}
                  committeeIndex={committeeIndex}
                  isLeadWebDevRole={isLeadWebDevRole}
                  isOpen={openCommitteeId === committee.id}
                  onToggle={() => setOpenCommitteeId(prev => (prev === committee.id ? null : committee.id))}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Legacy Core Team Section (fallback if no committees) */}
      {enabledCommittees.length === 0 && (
        <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                  CORE <span className="text-cyan-500/80 font-light">TEAM</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mb-8 expand-width"></div>
                <p className="text-sm md:text-lg text-cyan-100/50 max-w-3xl mx-auto hud-monospace">
                  Team information will be managed through the admin dashboard. Pending S.H.I.E.L.D. clearance.
                </p>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="shield-dossier clip-angular-br border-cyan-500/30 bg-black/60 backdrop-blur-md box-glow-cyan max-w-md mx-auto p-8 relative">
                {/* Corner Targets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50"></div>
                
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-cyan-500/10 border border-cyan-500/50 clip-angular-sm">
                  <Users className="text-cyan-500 w-8 h-8 pulse-glow" />
                </div>
                <h3 className="mcu-title-text text-xl text-cyan-50 tracking-widest mb-2">NO COMMITTEES ACTIVE</h3>
                <p className="text-cyan-100/50 text-xs font-mono tracking-widest">
                  Core team directives are awaiting admin initialization.
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

        /* Green glow for Raaj in Tech Team */
        .committee-head-card.tech-lead-raaj {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2);
        }
        .committee-head-card.tech-lead-raaj:hover {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3);
        }
        
        /* Green text glow for Raaj name in Tech Team */
        .tech-lead-raaj-name {
          animation: techLeadRaajNameGlow 2s ease-in-out infinite alternate;
        }
        @keyframes techLeadRaajNameGlow {
          from {
            text-shadow: 
              0 0 5px #22c55e,
              0 0 10px #22c55e;
          }
          to {
            text-shadow: 
              0 0 15px #22c55e,
              0 0 25px #22c55e,
              0 0 35px #22c55e;
          }
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
      <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                CORE <span className="text-cyan-500/80 font-light">DIRECTIVES</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mb-8 expand-width"></div>
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
              <div key={index} className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20 hover-float" : "hover-float"} style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="shield-dossier clip-angular-br border-cyan-500/30 bg-black/60 backdrop-blur-md box-glow-cyan p-8 group transition-all duration-300 relative">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                  {/* Corner Target Markers */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50"></div>
                  
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-cyan-500/10 border border-cyan-500/50 clip-angular-sm group-hover:bg-cyan-500/20 transition-colors">
                    <value.icon size={32} className="text-cyan-400 group-hover:text-cyan-300 pulse-glow" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 mcu-title-text text-cyan-50 tracking-wider">{value.title}</h3>
                  <p className="text-cyan-100/60 font-light font-mono text-sm leading-relaxed">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Family CTA */}
      <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
            <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
              JOIN THE <span className="text-cyan-500/80 font-light">INITIATIVE</span>
            </h2>
            <p className="text-sm md:text-lg text-cyan-100/50 mb-8 max-w-3xl mx-auto font-light hud-monospace">
              Become part of the RICORRENZA legacy and help shape the future of medical education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.membership_form_enabled ? (
                <button 
                  onClick={() => startTransition(() => setMembershipModal(true))}
                  className="relative px-8 py-4 bg-cyan-500/10 border border-cyan-500 text-cyan-400 font-bold tracking-[0.2em] uppercase box-glow-cyan clip-angular-sm transition-all hover:bg-cyan-500/30 hover:text-white group hover:-translate-y-1"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-3 w-5 h-5 text-cyan-300" />
                    ENLIST NOW
                    <ArrowRight className="ml-3 w-5 h-5 text-cyan-300 group-hover:translate-x-2 transition-transform" />
                  </span>
                </button>
              ) : (
                <div className="shield-dossier clip-angular-br border-red-500/30 bg-black/60 backdrop-blur-md box-glow-red p-8 max-w-md mx-auto">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-red-500/10 border border-red-500/50 clip-angular-sm">
                    <Shield className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="mcu-title-text text-red-400 text-xl mb-2">ACCESS RESTRICTED</h3>
                  <p className="text-red-300/70 hud-monospace text-xs">
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
          onClose={() => startTransition(() => setMembershipModal(false))}
        />
      )}

      {/* Faculty Profile Modal */}
      <FacultyProfileModal
        open={facultyModalOpen}
        onClose={() => { startTransition(() => { setFacultyModalOpen(false); setFacultyPaused(false); }); }}
        person={selectedFaculty ? {
          name: selectedFaculty.name,
          title: selectedFaculty.title,
          image: selectedFaculty.image,
          email: (selectedFaculty as any).email,
          phone: (selectedFaculty as any).phone,
          social_links: (selectedFaculty as any).social_links,
        } : null}
      />
    </div>
  );
};
