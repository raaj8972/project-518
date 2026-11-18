import { ProfileContactLinks } from '../components/RicoFamily/ProfileContactLinks';
import { personBatch } from '../utils/familyPeople';
import React, { useEffect, useState, startTransition } from 'react';
import { Shield } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { FacultyHead } from '../types/data';

import { MembershipModal } from '../components/MembershipModal';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR, DESIGNER_INSTAGRAM_URL } from '../constants/brand';

// RicoFamily Sub-components
import { FounderCard } from '../components/RicoFamily/FounderCard';

import { FamilyTeams } from '../components/RicoFamily/FamilyTeams';

import '../styles/RicoFamily.css';

const CoverflowCarousel = React.lazy(() => import('../components/CoverflowCarousel'));
const FacultyProfileModal = React.lazy(() => import('../components/FacultyProfileModal'));
// gsap removed for marquee adornments to avoid Safari flicker; CSS keyframes used instead
// FounderCard extracted to separate component

export const RicoFamily: React.FC = () => {
  const { facultyHeads, coreCommittees, coreTeamMembers, bandMembers, formSettings, loading } = useData();
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

  // Filter enabled faculty heads and sort by order
  const enabledFacultyHeads = (facultyHeads || [])
    .filter(faculty => faculty.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Filter enabled committees and sort by order
  const enabledCommittees = (coreCommittees || [])
    .filter(committee => committee.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Founders extraction (Curated + Dynamic)
  const founders = [
    {
      id: 'founder-raaj-legacy',
      name: 'RAAJ',
      role: 'System Designer',
      image: '/storage/uploads/raaj_founder.png', 
      social_links: {
        instagram: DESIGNER_INSTAGRAM_URL
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
  <div className="rico-family-page bg-[#030712] bg-hex-grid text-[#e2e8f0] selection:bg-cyan-500/30 min-h-screen font-sans antialiased overflow-x-hidden relative">
    {/* Global Top J.A.R.V.I.S. HUD Scanline */}
    <div className="animate-scanline absolute inset-0 pointer-events-none z-50"></div>
    <SEO 
      title={`Rico Family — ${BRAND_NAME} ${BRAND_YEAR}`} 
      description={`Meet the team behind ${BRAND_NAME} ${BRAND_YEAR} - Faculty, Council, and Committee members.`} 
      canonical="https://ricorrenza.fun/rico-family" 
    />


      {/* Designer attribution stays compact above the full-size family sections. */}
      {founders.length > 0 && <section className="family-designer-strip" aria-label="System design team"><div className={`family-designers ${founders.length > 1 ? 'family-designers--multiple' : ''}`}>{founders.map(founder => <FounderCard key={founder.id} founder={founder} />)}</div></section>}

      {/* Faculty Head Section — 3D coverflow autoplay */}
      {enabledFacultyHeads.length > 0 && (
        <section className="py-8 md:py-12 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
          {/* S.H.I.E.L.D Tech Glows */}
          <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[200px] pointer-events-none mix-blend-screen"></div>
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20 flex flex-col items-center">
              <div className="text-center mb-4 md:mb-6">

                <h2 className="text-3xl sm:text-4xl md:text-5xl mb-2 mcu-title-text mcu-title-glow">
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
              stepPx={isMobile ? 220 : 270}
              rotateYDeg={36}
              scaleStep={0.12}
              translateZStep={-70}
              pauseOnTouch={true}
              blurPerStep={2.5}
              edgeFades={true}
              centerGlow={true}
              arrowSize={48}
              stageHeight={isMobile ? 510 : 540}
              paused={facultyPaused}
              onItemClick={(item: any) => { startTransition(() => { setSelectedFaculty(item); setFacultyModalOpen(true); setFacultyPaused(true); }); }}
              pauseOnHover={true}
              showArrows={true}
              className="py-4"
              renderItem={(head: any) => (
                <div className="w-[74vw] max-w-[290px] sm:w-[50vw] sm:max-w-[310px] md:w-72 lg:w-80 p-5 shield-dossier clip-angular-br border-cyan-500/30 backdrop-blur-2xl box-glow-cyan transition-all duration-500 hover:-translate-y-2 bg-black">
                  <div className="aspect-[4/5] w-full overflow-hidden clip-angular-sm mb-4 bg-black/80 border border-cyan-500/40 relative group">
                    <img src={isMobile && head.image?.includes('supabase') ? `${head.image}?width=400` : head.image} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125 saturate-150 pointer-events-none" />
                    <img loading="lazy" decoding="async" src={isMobile && head.image?.includes('supabase') ? `${head.image}?width=400` : head.image} alt={head.name} className="absolute inset-0 w-full h-full object-cover object-top relative z-10  grayscale opacity-80 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                    {/* Corner Targeting Brackets */}
                    <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-500"></div>
                    
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                       <div className="w-7 h-7 clip-angular-br bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.8)]">
                          <Shield className="w-3.5 h-3.5 text-cyan-300" />
                       </div>
                    </div>
                  </div>
                  <div className="mcu-title-text text-lg md:text-xl text-center glow-text text-cyan-50 mt-1">{head.name}</div>
                  <div className="text-xs text-cyan-400 font-mono text-center mt-2 tracking-[0.16em] uppercase font-bold hud-monospace mb-3">{head.title}</div>
                  
                  {personBatch(head) && <p className="family-profile-batch">Batch {personBatch(head)}</p>}
                  <div className="pt-3 border-t border-cyan-500/20 relative z-20"><ProfileContactLinks name={head.name} instagram={head.social_links?.instagram} facebook={head.social_links?.facebook} phone={head.phone} showFacebook showPhone compact /></div>
                </div>
              )}
            />
          </div>
        </section>
      )}

      <FamilyTeams committees={coreCommittees || []} members={coreTeamMembers || []} loading={loading} />

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
