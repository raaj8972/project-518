import React, { useEffect, useRef, useState, startTransition } from 'react';
import { Users, Heart, Star, Crown, AlignJustify as Spotify, Zap, ArrowRight, Shield, Instagram, Youtube, Facebook, Mail, Phone, UsersRound } from 'lucide-react';
import Instagram3DButtonLink from '../components/Instagram3DButtonLink';
import YouTube3DButtonLink from '../components/YouTube3DButtonLink';
import Phone3DButtonLink from '../components/Phone3DButtonLink';
import Email3DButtonLink from '../components/Email3DButtonLink';
import PreserveNewlines from '../components/PreserveNewlines';
import DescriptionHeaderBody from '../components/DescriptionHeaderBody';
import { useData } from '../context/DataContext';

import { MembershipModal } from '../components/MembershipModal';
import ScrollHint from '../components/ScrollHint';
import { SEO } from '../components/SEO';
import CommitteeBackgroundEffect from '../components/CommitteeBackgroundEffect';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { KineticText } from '../components/ui/KineticText';
const InfiniteMarquee = React.lazy(() => import('../components/InfiniteMarquee'));
const CoverflowCarousel = React.lazy(() => import('../components/CoverflowCarousel'));
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal'));
// gsap removed for marquee adornments to avoid Safari flicker; CSS keyframes used instead
  const FounderCard: React.FC<{ founder: any; compact: boolean; isActive: boolean }> = ({ founder, compact, isActive }) => {
    const isRaaj = founder.name.toLowerCase().includes('raaj');
    
    return (
      <div 
        className={`w-full ${compact ? 'max-w-[420px]' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center transition-all duration-700 ${!isActive ? 'opacity-40 grayscale blur-[2px] scale-90' : 'opacity-100 grayscale-0 blur-0 scale-100'}`}
      >
        {/* Portrait Frame */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end order-1">
          <div className="relative group w-full max-w-[320px] md:max-w-[380px]">
            <div className="absolute -inset-4 border border-cyan-500/10 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative overflow-hidden rounded-[2rem] bg-black/40 border-2 border-white/10 shadow-[0_0_40px_-10px_rgba(6,182,212,0.2)] group-hover:border-cyan-500/30 transition-all duration-700">
              <div className="hologram-scanline opacity-20"></div>
              <img 
                loading="lazy" 
                src={founder.image} 
                alt={founder.name} 
                className="w-full aspect-[4/5] object-cover object-top transition-transform duration-[2s] group-hover:scale-110 grayscale-[0.1] group-hover:grayscale-0" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent opacity-50"></div>
              
              <div className="absolute top-4 right-4 hidden md:flex items-center justify-center">
                 <div className="w-10 h-10 rounded-xl bg-black/60 border border-cyan-500/40 backdrop-blur-2xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <Crown className="w-5 h-5 text-cyan-400" />
                 </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 md:-right-6 px-4 py-2.5 rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 backdrop-blur-3xl shadow-xl z-20 hidden md:block">
               <p className="text-xs font-bold text-white flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                 Lead Architect
               </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left order-2">
           <div className="mb-0 overflow-hidden">
              {isRaaj ? (
                <KineticText as="h3" className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter mb-1">
                  RAAJ
                </KineticText>
              ) : (
                <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-1">
                  {founder.name}
                </h3>
              )}
           </div>
           
           <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 mb-6">
             <div className="inline-flex items-center gap-2 text-cyan-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] py-1 border-b border-cyan-500/20">
                Founder of Website
             </div>
             <div className="text-white/40 text-[9px] md:text-[10px] font-mono uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
                <Shield className="w-3 h-3 text-white/20" />
                System Sovereign
             </div>
           </div>

           <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed font-light mb-8 italic">
             "Building the digital infrastructure for excellence. The architect behind the platform, ensuring every byte serves the vision."
           </p>

           <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {founder.social_links?.instagram && (
                 <a href={founder.social_links.instagram} target="_blank" rel="noopener noreferrer" className="group/social relative flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 overflow-hidden">
                   <Instagram className="w-4 h-4 text-pink-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-pink-50/80">Instagram</span>
                 </a>
              )}
              {founder.social_links?.youtube && (
                 <a href={founder.social_links.youtube} target="_blank" rel="noopener noreferrer" className="group/social relative flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 overflow-hidden">
                   <Youtube className="w-4 h-4 text-red-100" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-red-50/80">YouTube</span>
                 </a>
              )}
              <div className="flex gap-2">
                 {founder.social_links?.facebook && (
                    <a href={founder.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/5 border border-blue-500/20 text-blue-400 hover:border-blue-500/40 transition-all duration-300"><Facebook size={16} /></a>
                 )}
                 {founder.social_links?.spotify && (
                    <a href={founder.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/5 border border-green-500/20 text-green-400 hover:border-green-500/40 transition-all duration-300"><Spotify size={16} /></a>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  };

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
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
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

  // Track expanded member cards (non-head)
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());
  const [bootingMembers, setBootingMembers] = useState<Set<number>>(new Set());

  const toggleMemberExpanded = (id: number) => {
    const isExpanding = !expandedMembers.has(id);
    
    if (isExpanding) {
      setBootingMembers(prev => new Set(prev).add(id));
      setTimeout(() => {
        setBootingMembers(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 400); // Match hologram-boot animation duration
    }

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

  // Committee heads across all committees (for marquee)
  const committeeHeads = (coreTeamMembers || [])
    .filter(m => m.enabled && m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Council members (non-head)
  const councilMembers = (coreTeamMembers || [])
    .filter(m => m.enabled && ((m as any).isCouncil || (m as any).is_council) && !m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

  // Founders extraction (Hardcoded + Dynamic)
  const HARDCODED_FOUNDERS = [
    {
      id: 'founder-raaj-legacy',
      name: 'RAAJ',
      role: 'Founder of Website',
      // Using the provided photo
      // Using the high-quality portrait provided by the founder
      image: '/storage/uploads/raaj_founder.png', 
      description: '',
      specialty: 'Platform Architect',
      social_links: {
        instagram: 'https://www.instagram.com/i_amraaj__?igsh=a2ZxaTBubnpmYmhu&utm_source=qr'
      }
    }
  ];

  const founders = [
    ...HARDCODED_FOUNDERS,
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
  <div className="bg-[#030712] text-[#e2e8f0] selection:bg-cyan-500/30 min-h-screen font-sans antialiased overflow-x-hidden">
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
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 backdrop-blur-xl mb-6 md:mb-8 group hover:border-cyan-500/40 transition-all duration-500 focus-within:border-cyan-500/40">
                <Crown className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] md:text-xs font-black tracking-[0.3em] uppercase text-cyan-50/90 whitespace-nowrap">The Visionary Backend</span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-2 tracking-tighter text-center leading-none">
                FOUNDER OF <br className="md:hidden" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20">WEBSITE</span>
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
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712] border-t border-white/5">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-12 md:mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 md:mb-8 font-mono">
                   <Star className="w-4 h-4 text-indigo-400" />
                   <span className="text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase text-indigo-50">Leadership</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 tracking-tighter text-white">
                  FACULTY <span className="text-white/50 font-light">LEADERSHIP</span>
                </h2>
                <p className="text-sm md:text-lg text-white/50 max-w-2xl mx-auto font-light">
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
                <div className="w-72 md:w-80 p-6 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl transition-all duration-300 hover:bg-white/[0.05]">
                  <div className="aspect-square w-full overflow-hidden rounded-xl mb-6 bg-black/50 border border-white/10">
                    <img loading="lazy" decoding="async" src={isMobile && head.image?.includes('supabase') ? `${head.image}?width=400&resize=cover` : head.image} alt={head.name} className="w-full h-full object-cover" />
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
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712]">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-16 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 md:mb-8 font-mono">
                   <Crown className="w-4 h-4 text-red-500" />
                   <span className="text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase text-red-50">Core Team</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 tracking-tighter text-white">
                  THE <span className="text-white/50 font-light">COUNCIL</span>
                </h2>
                <p className="text-sm md:text-lg text-white/50 max-w-3xl mx-auto mt-2 font-light">
                  Strategic leadership and executive oversight
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {councilMembers.map((member, idx) => { const lead = isLeadWebDevRole(member.role); return (
                <div key={member.id} className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className={`group overflow-hidden border bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] shadow-2xl relative flex flex-col md:grid md:grid-cols-12 gap-0 h-full ${lead ? 'border-cyan-500/20' : 'border-white/5'}`}> 
                    {/* Image */}
                    <div className="relative aspect-[4/5] sm:aspect-square md:aspect-auto md:col-span-4 md:h-full overflow-hidden">
                      <img decoding="async" src={member.image} alt={member.name} className="w-full h-full object-cover object-top transition-transform duration-[1.5s] group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] md:from-transparent to-transparent opacity-90"></div>
                      <div className="absolute top-4 right-4 md:right-auto md:left-4">
                         <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
                            <Crown className={`w-3.5 h-3.5 ${lead ? 'text-cyan-400' : 'text-red-500'}`} />
                         </div>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md ${lead ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>COUNCIL</div>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="px-6 pb-8 pt-4 md:p-8 flex flex-col justify-center relative md:col-span-8">
                      <h3 className={`text-2xl sm:text-3xl font-bold mb-1 tracking-tight ${lead ? 'text-cyan-50' : 'text-white'}`}>{member.name}</h3>
                      <p className={`text-[11px] font-bold uppercase tracking-widest mb-6 ${lead ? 'text-cyan-400/80' : 'text-red-400/80'}`}>{lead ? 'Founder of Website' : (member.role || 'Member')}</p>
                              {member.description && (
                                (() => {
                                  // Simplified clear highlighting
                                  const isTreasurer = String(member.role || '').toLowerCase().includes('treasur');
                                  const headerClass = isTreasurer
                                    ? 'text-white font-semibold mb-2'
                                    : 'text-white/80 font-semibold mb-2';
                                  return (
                                    <DescriptionHeaderBody
                                      text={member.description}
                                      headerClassName={headerClass}
                                      bodyClassName="text-white/60 mb-6 leading-relaxed text-sm font-light"
                                      highlights={["I Treasure Ricorrenza", "Treasure"]}
                                      headerHighlightRules={[
                                        // General Secretary header line highlight (red glow) — match full phrase
                                        {
                                          pattern: new RegExp(`^\\s*as\\s+the\\s+(?:(?:g(?:\\.\\s*)?s(?:\\.|\\b))(?:\\s*\\/\\s*gen(?:e)?ral\\s+secretary)?|gen(?:e)?ral\\s+secretary)\\s+of\\s+${BRAND_NAME.toLowerCase()}\\s*${BRAND_YEAR}`, 'i'),
                                          className: 'text-white font-semibold'
                                        },
                                        // President header line highlight (blue glow) — match full phrase
                                        {
                                          pattern: new RegExp(`^\\s*as\\s+the\\s+president\\s+of\\s+${BRAND_NAME.toLowerCase()}\\s*${BRAND_YEAR}`, 'i'),
                                          className: 'text-white font-semibold'
                                        }
                                      ]}
                                    />
                                  );
                                })()
                              )}
                      {member.specialty && (
                        <div className="mb-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-white/70`}>
                            {member.specialty}
                          </span>
                        </div>
                      )}
                      {member.social_links && Object.values(member.social_links).some(l => l) && (
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                           {member.social_links.instagram && (
                             <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"><Instagram size={18} /></a>
                           )}
                           {member.social_links.youtube && (
                             <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"><Youtube size={18} /></a>
                           )}
                           {member.social_links.facebook && (
                             <a href={member.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"><Facebook size={18} /></a>
                           )}
                           {member.social_links.spotify && (
                             <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"><Spotify size={18} /></a>
                           )}
                        </div>
                      )}
                      {(Boolean((member as any).email) || Boolean((member as any).phone)) && (
                        <div className="mb-6">
                          <div className="flex flex-wrap items-center gap-3">
                            {Boolean((member as any).email) && (
                               <a href={`mailto:${(member as any).email}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"><Mail size={18} /></a>
                            )}
                            {Boolean((member as any).phone) && (
                               <a href={`tel:${(member as any).phone}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"><Phone size={18} /></a>
                            )}
                          </div>
                        </div>
                      )}
                      {member.achievements && member.achievements.length > 0 && (
                        <div>
                          <h6 className={`text-xs font-bold mb-4 tracking-widest uppercase text-white/50`}>Key Achievements</h6>
                          <div className="space-y-3">
                            {member.achievements.map((a, i2) => (
                              <div key={i2} className="flex items-start space-x-3 achievement-item" style={{ animationDelay: `${i2 * 0.18}s` }}>
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-white/30`}></div>
                                <span className="text-white/60 text-sm font-light leading-snug">{a}</span>
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

    {/* Committee Heads marquee */}
      {committeeHeads.length > 0 && (
        <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-[#030712] to-blue-900/10"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 font-mono">
                   <UsersRound className="w-4 h-4 text-cyan-400" />
                   <span className="text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase text-cyan-50">Team Leaders</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tighter text-white">
                  COMMITTEE <span className="text-white/50 font-light">HEADS</span>
                </h2>
                <p className="text-sm md:text-lg text-white/50 max-w-2xl mx-auto font-light">
                  Leading the specialized teams driving {BRAND_NAME}'s innovation
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
                  <div className="w-64 p-5 bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-[2rem] shadow-2xl transition-all duration-300 hover:bg-white/[0.05]">
                    <div className="aspect-square w-full overflow-hidden rounded-xl mb-4 bg-black/50 border border-white/10">
                      <img loading="lazy" decoding="async" src={m.image} alt={m.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="font-bold text-white flex items-center mb-1">
                      <Crown className="w-3.5 h-3.5 text-cyan-400 mr-2" /> {m.name}
                    </div>
                    <div className="text-xs text-white/50 tracking-widest uppercase font-semibold">{m.role}</div>
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
        <section className="py-20 md:py-32 relative overflow-hidden bg-[#030712] border-t border-white/5">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none translate-y-[-50%]"></div>
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-16 md:mb-24">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 md:mb-8 font-mono">
                   <Star className="w-4 h-4 text-purple-400" />
                   <span className="text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase text-purple-50">Operations</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 tracking-tighter text-white">
                  CORE <span className="text-white/50 font-light">COMMITTEES</span>
                </h2>
                <p className="text-sm md:text-lg text-white/50 max-w-3xl mx-auto font-light">
                  The specialized teams managing {BRAND_NAME}'s operations
                </p>
              </div>
            </div>

            {/* Committees */}
            <div className="space-y-16">
              {enabledCommittees.map((committee, committeeIndex) => {
                const allCommitteeMembers = membersByCommittee[committee.id] || [];
                // Exclude council members so they don't appear twice (in Council section + their committee)
                const regularMembers = allCommitteeMembers.filter(member => !member.is_head && !((member as any).isCouncil || (member as any).is_council));
                
                if (allCommitteeMembers.length === 0) return null;

                return (
                  <div
                    key={committee.id}
                    className={`relative overflow-hidden rounded-3xl ${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}`}
                    style={!isMobile ? { animationDelay: `${committeeIndex * 0.3}s` } : {}}
                  >
                    <CommitteeBackgroundEffect committeeName={committee.name} mode="background" />
                    {/* Committee Header */}
                    <div className="text-center mb-12 relative z-10">
                      <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-6 backdrop-blur-sm shadow-xl">
                        <Users className="w-4 h-4 mr-2" />
                        {committee.is_core ? 'CORE COMMITTEE' : 'SPECIALIZED TEAM'}
                      </div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-4 neon-title committee-title" style={{ color: committee.color }}>
                        {committee.name.toUpperCase()}
                      </h3>
                      <PreserveNewlines as="div" text={committee.description} className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto" />
                    </div>

                    {/* Committee Head */}
                    {allCommitteeMembers.filter(m => m.is_head).length > 0 && (
                      <div className="mb-8 relative z-10">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                          Committee Heads ({allCommitteeMembers.filter(m => m.is_head).length})
                        </h4>
                        <div className="grid md:grid-cols-2 gap-8">
                          {allCommitteeMembers.filter(m => m.is_head).map(head => {
                            const lead = isLeadWebDevRole(head.role, committee.name);
                            // Special check for RAAJ in Tech Team (non-web) to show green
                            const isTechLeadRaaj = head.name.toLowerCase().includes('raaj') && !lead;

                            return (
                              <div
                                key={head.id}
                                className={`group overflow-hidden bg-white/[0.02] border backdrop-blur-2xl rounded-3xl shadow-2xl transition-all duration-500 hover:bg-white/[0.04] ${isTechLeadRaaj ? 'border-green-500/20' : 'border-white/5'} hologram-card hologram-flicker hologram-reveal ${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}`}
                                style={!isMobile ? { animationDelay: `${(committeeIndex * 0.3) + 0.1}s` } : {}}
                              >
                                <div className="hologram-scanline"></div>
                                <div className="grid md:grid-cols-2 gap-0 relative z-10">
                                  {/* Image Section */}
                                  <div className="relative h-72 md:h-auto overflow-hidden">
                                    <img loading="lazy" decoding="async" src={head.image} alt={head.name} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" />
                                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] md:from-transparent to-transparent opacity-90"></div>
                                    <div className="absolute top-4 right-4">
                                      <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md">
                                        <Crown className={`w-3.5 h-3.5 ${lead ? 'text-cyan-400' : isTechLeadRaaj ? 'text-green-400' : 'text-yellow-400'}`} />
                                      </div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md inline-block ${lead ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : isTechLeadRaaj ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                        COMMITTEE HEAD
                                      </div>
                                    </div>
                                  </div>
                                  {/* Content Section */}
                                  <div className="p-6 md:p-8 flex flex-col justify-center">
                                    <h5 className={`text-xl md:text-2xl font-bold mb-2 ${lead ? 'text-cyan-50' : isTechLeadRaaj ? 'text-white' : 'text-white'}`}>{isTechLeadRaaj ? 'RAAJ' : head.name}</h5>
                                    <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${lead ? 'text-cyan-400/80' : isTechLeadRaaj ? 'text-green-400/80' : 'text-yellow-400/80'}`}>{lead ? 'Founder of Website' : head.role}</p>
                                    <PreserveNewlines text={head.description} className="text-white/60 mb-6 leading-relaxed text-sm font-light hologram-text-reveal" />
                                    {head.specialty && (
                                      <div className="mb-6">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-white/10 bg-white/5 text-white/70`}>
                                          {head.specialty}
                                        </span>
                                      </div>
                                    )}
                                    {head.social_links && Object.values(head.social_links).some(link => link) && (
                                      <div className="flex flex-wrap items-center gap-2 mb-4">
                                         {head.social_links.instagram && (
                                           <a href={head.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"><Instagram size={18} /></a>
                                         )}
                                         {head.social_links.youtube && (
                                           <a href={head.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"><Youtube size={18} /></a>
                                         )}
                                         {head.social_links.facebook && (
                                           <a href={head.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all"><Facebook size={18} /></a>
                                         )}
                                         {head.social_links.spotify && (
                                           <a href={head.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"><Spotify size={18} /></a>
                                         )}
                                      </div>
                                    )}
                                    {(Boolean((head as any).phone) || Boolean((head as any).email)) && (
                                      <div className="mb-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                          {Boolean((head as any).email) && (
                                             <a href={`mailto:${(head as any).email}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"><Mail size={18} /></a>
                                          )}
                                          {Boolean((head as any).phone) && (
                                             <a href={`tel:${(head as any).phone}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"><Phone size={18} /></a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {head.achievements.length > 0 && (
                                      <div>
                                        <h6 className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3">Key Achievements</h6>
                                        <div className="space-y-3">
                                          {head.achievements.map((achievement, achievementIndex) => (
                                            <div key={achievementIndex} className="flex items-start space-x-3 achievement-item" style={{ animationDelay: `${achievementIndex * 0.2}s` }}>
                                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-white/30`}></div>
                                              <span className="text-white/60 text-sm font-light leading-snug">{achievement}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="hologram-projection-light"></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Team Members Grid */}
                    {regularMembers.length > 0 && (
                      <div className="relative z-10">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center mt-6 sm:mt-0">Team Members</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-1 sm:px-0">
                          {regularMembers.map((member, memberIndex) => {
                            const isExpanded = expandedMembers.has(member.id);
                            const isBooting = bootingMembers.has(member.id);
                            return (
                              <div
                                key={member.id}
                                className={`${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""} transition-all duration-500 ${isExpanded ? 'z-20' : 'hover:-translate-y-1 hover:z-10'}`}
                                style={!isMobile ? { animationDelay: `${(committeeIndex * 0.3) + (memberIndex * 0.15)}s` } : {}}
                              >
                                <div className={`group h-full overflow-hidden bg-white/[0.02] border backdrop-blur-xl transition-all duration-500 rounded-2xl ${isExpanded ? 'scale-105 border-cyan-400/50 shadow-2xl shadow-cyan-900/20' : 'border-white/5'} hologram-card hologram-flicker ${isBooting ? 'hologram-booting' : ''}`}>
                                  <div className={`hologram-scanline ${isBooting ? 'opacity-100 scale-y-150 brightness-200' : 'opacity-50'}`}></div>
                                  <div className={`relative z-10 h-full flex flex-col ${isBooting ? 'hologram-glitch-active' : ''}`}>
                                    {/* Member Image (always visible) */}
                                    <div className={`relative overflow-hidden ${isExpanded ? 'h-80' : 'h-64'}`}>
                                      <img
                                        src={member.image}
                                        alt={member.name}
                                        className={`w-full h-full object-cover object-top transition-transform duration-700 ${isExpanded ? 'scale-105' : 'group-hover:scale-110'} team-member-image hologram-tint`}
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
                                    <div className="p-4 flex-1">
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
                                            className="ml-auto text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
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
                                            className="ml-auto text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
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
                                      {isExpanded && (
                                      <div className="mt-0.5" />
                                    )}
                                  </div>
                                </div>
                                  <div className={`hologram-projection-light ${isExpanded ? 'hologram-projection-light-expanded' : ''}`}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <CommitteeBackgroundEffect committeeName={committee.name} mode="foreground" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Legacy Core Team Section (fallback if no committees) */}
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
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
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
              <div key={index} className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20 hover-float" : "hover-float"} style={{ animationDelay: `${index * 0.2}s` }}>
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
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
            <h2 className="text-5xl md:text-7xl font-black mb-6 neon-title">
              JOIN THE <span className="neon-pink">FAMILY</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Become part of the RICORRENZA legacy and help shape the future of medical education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.membership_form_enabled ? (
                <button 
                  onClick={() => startTransition(() => setMembershipModal(true))}
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
        .faculty-name.tech-lead-raaj-name { animation: nameGlowGreen 3s ease-in-out infinite alternate; }

        @keyframes nameGlowYellow {
          from { text-shadow: 0 0 2px #ffff00, 0 0 4px #ffff00; }
          to { text-shadow: 0 0 4px #ffff00, 0 0 8px #ffff00, 0 0 12px #ffff00; }
        }
        @keyframes nameGlowCyan {
          from { text-shadow: 0 0 2px #22d3ee, 0 0 4px #22d3ee; }
          to { text-shadow: 0 0 4px #22d3ee, 0 0 8px #06b6d4, 0 0 14px #0891b2; }
        }
        @keyframes nameGlowGreen {
          from { text-shadow: 0 0 2px #22c55e, 0 0 4px #22c55e; }
          to { text-shadow: 0 0 4px #22c55e, 0 0 8px #16a34a, 0 0 14px #15803d; }
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