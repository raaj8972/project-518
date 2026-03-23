import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { getDominantColor } from '../../utils/getDominantColor';
const InfiniteMarquee = React.lazy(() => import('../InfiniteMarquee'));
const CoverflowCarousel = React.lazy(() => import('../CoverflowCarousel'));

interface Person {
  id: number;
  name: string;
  image: string;
  title?: string;
  role?: string;
  enabled: boolean;
  committee_id?: string;
  order_position: number;
  is_head?: boolean;
}

interface LeadershipSectionProps {
  homepageSettings: any;
  coreCommittees: any[];
  enabledFacultyHeads: Person[];
  sortedFacultyHeads: Person[];
  sortedCommitteeHeads: Person[];
  windowWidth: number;
  facultyPaused: boolean;
  committeePaused: boolean;
  setFacultyPaused: (v: boolean) => void;
  setCommitteePaused: (v: boolean) => void;
  setSelectedType: (type: 'faculty' | 'committee' | null) => void;
  setSelectedIndex: (idx: number | null) => void;
  setSelectedPerson: (person: any | null) => void;
  setFacultyModalOpen: (open: boolean) => void;
}

const LeadershipSection: React.FC<LeadershipSectionProps> = ({
  homepageSettings,
  coreCommittees,
  enabledFacultyHeads,
  sortedFacultyHeads,
  sortedCommitteeHeads,
  windowWidth,
  facultyPaused,
  committeePaused,
  setFacultyPaused,
  setCommitteePaused,
  setSelectedType,
  setSelectedIndex,
  setSelectedPerson,
  setFacultyModalOpen,
}) => {
  const [clicked, setClicked] = useState<{ type: 'faculty' | 'committee'; id: number } | null>(null);

  if ((enabledFacultyHeads.length === 0 && sortedCommitteeHeads.length === 0) || 
      (!homepageSettings?.show_faculty_heads && !homepageSettings?.show_committee_heads)) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden gsap-fade-up">
      <div className="container mx-auto px-4 relative z-10">
        <div className="scroll-animate-3d">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-6 stranger-title-glow">
              OUR LEADERSHIP
            </h2>
            <div className="w-24 h-1 bg-red-600/40 mx-auto mb-8 rounded-full"></div>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
              Faculty chairs and heads of our core committees. Meet the entire team on our <Link to="/rico-family" className="text-red-500 hover:text-red-400 underline font-bold underline-offset-4 decoration-red-600/30">Rico Family page</Link>.
            </p>
          </div>

          {/* Faculty Heads */}
          {enabledFacultyHeads.length > 0 && homepageSettings?.show_faculty_heads && (
            <div className="mb-12 relative">
              <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-red-600" /> Faculty Heads
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
                  <div className={`w-64 sm:w-72 md:w-80 stranger-card p-5 sm:p-6 rounded-[2.5rem] transition-all duration-500 tilt-3d ${clicked && clicked.type === 'faculty' && clicked.id === head.id ? 'ring-2 ring-red-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(185,28,28,0.2)]'}`}>
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
              <div className="mb-8">
                <h3 className="text-xl md:text-2xl font-black text-white flex items-center leading-none tracking-tight uppercase">
                  <Crown className="w-6 h-6 mr-3 text-red-600" /> COMMITTEE MEMBERS <span className="ml-3 text-[10px] text-white/30 font-black tracking-widest">{sortedCommitteeHeads.length} MEMBERS</span>
                </h3>
              </div>
              <div
                className="relative left-1/2 -translate-x-1/2 w-screen"
                style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
              >
                <div className="relative">
                  <React.Suspense fallback={<div className="h-[72px] flex items-center justify-center text-gray-400">Loading…</div>}>
                    <InfiniteMarquee
                      items={sortedCommitteeHeads}
                      direction={homepageSettings?.committee_marquee_direction ?? 'right'}
                      speedPxPerSec={(homepageSettings?.committee_marquee_speed_px_per_sec ?? 70) * (windowWidth < 640 ? 0.8 : windowWidth < 1024 ? 0.9 : 1)}
                      pauseOnHover={true}
                      paused={committeePaused}
                      pauseOnTouch={true}
                      instantPause={false}
                      glowOnPause
                      itemWrapperClassName="pr-3 sm:pr-4 md:pr-6 first:pl-0"
                      minItemWidthPx={windowWidth < 640 ? 180 : windowWidth < 1024 ? 220 : 280}
                      sideGutterPx={windowWidth < 640 ? 8 : 12}
                      className="py-4 relative"
                      renderItem={(m: any) => {
                        const [glowColor, setGlowColor] = React.useState<string>('rgba(255,255,255,0.22)');
                        useEffect(() => {
                          let mounted = true;
                          getDominantColor(m.image).then((color) => { if (mounted) setGlowColor(color); });
                          return () => { mounted = false; };
                        }, [m.image]);
                        const isCouncil = Boolean((m as any).isCouncil || (m as any).is_council) && !m.is_head;
                        const roleLower = String(m.role || '').toLowerCase();
                        const committee = coreCommittees.find(c => c.id === m.committee_id);
                        const committeeNameLower = String(committee?.name || '').toLowerCase();
                        
                        const isLeadWebDev = ['lead developer','lead web developer','principal developer','principal engineer'].some(p => roleLower.includes(p)) && committeeNameLower.includes('web');
                        const isTechLeadRaaj = m.name.toLowerCase().includes('raaj') && !isLeadWebDev;

                        return (
                          <div
                            className={`w-[200px] sm:w-[240px] md:w-80 stranger-card p-4 sm:p-5 rounded-[2rem] cursor-pointer transition-all duration-500 tilt-3d ${clicked && clicked.type === 'committee' && clicked.id === m.id ? 'ring-2 ring-red-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(185,28,28,0.3)]'}`}
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
                              <div className="absolute top-3 left-3">
                                {isCouncil ? (
                                  <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-white/10 backdrop-blur-xl text-white border border-white/10 tracking-[0.2em] shadow-2xl">COUNCIL</span>
                                ) : isLeadWebDev ? (
                                  <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-red-700/90 text-white border border-red-600/50 tracking-[0.2em] shadow-2xl">FOUNDER</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-white/5 backdrop-blur-xl text-white border border-white/5 tracking-[0.2em] shadow-2xl">HEAD</span>
                                )}
                              </div>
                            </div>
                            <div className={`font-black flex items-center text-sm sm:text-base md:text-lg uppercase tracking-tight ${isCouncil ? 'text-red-400' : (isLeadWebDev ? 'text-red-400' : 'text-white')}`}> 
                              {isCouncil ? (
                                <Crown className="w-5 h-5 mr-2 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                              ) : (
                                <Crown className="w-4 h-4 mr-2 text-red-600" />
                              )}
                              {isTechLeadRaaj ? 'RAAJ' : m.name}
                            </div>
                            <div className={`text-xs sm:text-sm md:text-base ${isCouncil ? 'text-red-300' : (isLeadWebDev ? 'text-red-300' : (isTechLeadRaaj ? 'text-red-300' : 'text-gray-300'))}`}>{isLeadWebDev ? 'Founder of Website' : m.role}</div>
                            <style>{`.im-glow-${m.id} { --im-glow-color: ${glowColor}; }`}</style>
                          </div>
                        );
                      }}
                      glowColor={undefined}
                      glowIntensity={0.38}
                    />
                  </React.Suspense>
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
  );
};

export default LeadershipSection;
