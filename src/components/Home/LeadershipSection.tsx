import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
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
            <div className="w-24 h-1 bg-indigo-500/40 mx-auto mb-8 rounded-full"></div>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
              Faculty chairs and heads of our core committees. Meet the entire team on our <Link to="/rico-family" className="text-indigo-400 hover:text-indigo-300 underline font-bold underline-offset-4 decoration-indigo-600/30">Rico Family page</Link>.
            </p>
          </div>

          {/* Faculty Heads */}
          {enabledFacultyHeads.length > 0 && homepageSettings?.show_faculty_heads && (
            <div className="mb-12 relative">
              <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-indigo-400" /> Faculty Heads
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
                  <div className={`w-64 sm:w-72 md:w-80 stranger-card p-5 sm:p-6 rounded-[2.5rem] transition-all duration-500 tilt-3d ${clicked && clicked.type === 'faculty' && clicked.id === head.id ? 'ring-2 ring-indigo-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(79,70,229,0.2)]'}`}>
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

          {sortedCommitteeHeads.length > 0 && homepageSettings?.show_committee_heads && (
            <div className="mb-12 relative">
              <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-indigo-400" /> Committee Heads & Council
              </h3>
              <CoverflowCarousel
                items={sortedCommitteeHeads}
                intervalMs={homepageSettings?.leadership_carousel_speed_ms ?? 3000}
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
                paused={committeePaused}
                onItemClick={(item: any) => {
                  setClicked({ type: 'committee', id: item.id });
                  const idx = sortedCommitteeHeads.findIndex(h => h.id === item.id);
                  setTimeout(() => {
                    setSelectedType('committee');
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
                renderItem={(m: any) => {
                  const isCouncil = Boolean(m.is_council) && !m.is_head;
                  const roleLower = String(m.role || '').toLowerCase();
                  const committee = coreCommittees.find(c => c.id === m.committee_id);
                  const isLeadWebDev = ['lead developer','lead web developer','principal developer','principal engineer'].some(p => roleLower.includes(p)) && String(committee?.name || '').toLowerCase().includes('web');
                  const isTechLeadRaaj = String(m.name || '').toLowerCase().includes('raaj') && isLeadWebDev;
                  const colorMap: Record<string, { badge: string, name: string }> = {
                    red:     { badge: 'bg-red-700/80 border-red-500/30',     name: 'text-red-400' },
                    emerald: { badge: 'bg-emerald-700/80 border-emerald-500/30', name: 'text-emerald-400' },
                    blue:    { badge: 'bg-blue-700/80 border-blue-500/30',    name: 'text-blue-400' },
                    amber:   { badge: 'bg-amber-700/80 border-amber-500/30',   name: 'text-amber-400' },
                    violet:  { badge: 'bg-violet-700/80 border-violet-500/30',  name: 'text-violet-400' },
                    cyan:    { badge: 'bg-cyan-700/80 border-cyan-500/30',    name: 'text-cyan-400' },
                    rose:    { badge: 'bg-rose-700/80 border-rose-500/30',    name: 'text-rose-400' },
                    orange:  { badge: 'bg-orange-700/80 border-orange-500/30',  name: 'text-orange-400' },
                  };
                  const color = colorMap[m.color] || colorMap.red;

                  return (
                    <div className={`w-64 sm:w-72 md:w-80 stranger-card p-5 sm:p-6 rounded-[2.5rem] transition-all duration-500 tilt-3d ${clicked && clicked.type === 'committee' && clicked.id === m.id ? 'ring-2 ring-indigo-500/50 shadow-2xl' : 'hover:shadow-[0_40px_80px_rgba(79,70,229,0.2)]'}`}>
                      <div className="aspect-square w-full overflow-hidden rounded-2xl mb-6 bg-black/40 relative">
                        <img loading="lazy" decoding="async" src={m.image} alt={m.name} className="w-full h-full object-cover"/>
                        <div className="absolute top-3 left-3">
                          {isCouncil ? (
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black ${color.badge} text-white tracking-[0.2em] shadow-2xl`}>COUNCIL</span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-white/10 backdrop-blur-xl text-white border border-white/10 tracking-[0.2em] shadow-2xl">HEAD</span>
                          )}
                        </div>
                      </div>
                      <div className={`font-black text-lg md:text-xl text-center uppercase tracking-tight ${isCouncil ? color.name : (isLeadWebDev ? 'text-indigo-400' : 'text-white')}`}>
                        {isTechLeadRaaj ? 'RAAJ' : m.name}
                      </div>
                      <div className="text-sm md:text-base text-white/50 text-center font-light italic mt-1">
                        {isLeadWebDev ? 'Founder of Website' : m.role}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeadershipSection;
