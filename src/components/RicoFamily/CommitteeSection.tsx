import React, { useRef, useEffect, useState } from 'react';
import { Users, Shield, ChevronDown, Cpu } from 'lucide-react';
import CommitteeBackgroundEffect from '../CommitteeBackgroundEffect';
import { CommitteeHeadCard } from './CommitteeHeadCard';
import { TeamMemberCard } from './TeamMemberCard';

import CoverflowCarousel from '../CoverflowCarousel';

interface CommitteeSectionProps {
  committee: any;
  membersByCommittee: Record<string, any[]>;
  isMobile: boolean;
  committeeIndex: number;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const CommitteeSection: React.FC<CommitteeSectionProps> = ({
  committee,
  membersByCommittee,
  isMobile,
  committeeIndex,
  isLeadWebDevRole,
  isOpen = true,
  onToggle
}) => {
  const allCommitteeMembers = membersByCommittee[committee.id] || [];
  const regularMembers = allCommitteeMembers.filter(member => !member.is_head && !(member as any).is_council);
  const committeeHeads = allCommitteeMembers.filter(m => m.is_head);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState('0px');

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setContentHeight(`${contentRef.current.scrollHeight}px`);
    } else {
      setContentHeight('0px');
    }
  }, [isOpen, allCommitteeMembers]);

  if (allCommitteeMembers.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isOpen 
          ? 'bg-[#030712]/80 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-cyan-500/30 clip-angular-br my-8 z-20 box-glow-cyan' 
          : 'bg-[#0a0f1d]/60 border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-[#030712]/80 backdrop-blur-md cursor-pointer my-4 clip-angular-sm'
      } ${!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}`}
      style={!isMobile ? { animationDelay: `${committeeIndex * 0.1}s` } : {}}
    >
      {isOpen && <CommitteeBackgroundEffect committeeName={committee.name} mode="background" />}
      
      {/* Decorative Blast Door Hinge Lines */}
      <div className="absolute top-0 bottom-0 left-2 w-px bg-white/5 pointer-events-none hidden md:block"></div>
      <div className="absolute top-0 bottom-0 right-2 w-px bg-white/5 pointer-events-none hidden md:block"></div>

      {/* Accordion Header (The Tech Panel Tab) */}
      <div 
        onClick={onToggle}
        className={`flex items-center justify-between p-4 md:p-6 transition-all duration-300 relative z-30 ${isOpen ? 'cursor-s-resize border-b border-white/5' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 clip-angular-sm flex items-center justify-center flex-shrink-0 transition-all duration-500 relative"
            style={{ 
              background: isOpen ? `linear-gradient(135deg, ${committee.color}20, transparent)` : 'transparent',
              border: `1px solid ${isOpen ? committee.color : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isOpen ? `0 0 15px ${committee.color}30` : 'none'
            }}
          >
            {isOpen && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>}
            <Users className="w-5 h-5 relative z-10" style={{ color: isOpen ? committee.color : 'rgba(255,255,255,0.5)' }} />
          </div>
          <div>
            <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] mb-1 hud-monospace" style={{ color: isOpen ? committee.color : 'rgba(255,255,255,0.4)' }}>
              {allCommitteeMembers.length}
            </div>
            <h3 
              className={`text-xl md:text-2xl font-black uppercase tracking-widest mcu-title-text transition-all duration-300 ${isOpen ? 'glow-text' : 'opacity-80 group-hover:opacity-100'}`}
              style={{ color: isOpen ? committee.color : 'white' }}
            >
              {committee.name}
            </h3>
          </div>
        </div>
        
        <div 
          className="w-10 h-10 clip-angular-sm bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-500"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', borderColor: isOpen ? `${committee.color}80` : '' }}
        >
          <ChevronDown className="w-5 h-5" style={{ color: isOpen ? committee.color : 'rgba(255,255,255,0.5)' }} />
        </div>
      </div>

      {/* Expandable Content Area */}
      <div 
        className="transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden relative z-10"
        style={{ maxHeight: contentHeight }}
      >
        <div ref={contentRef} className="pb-10 pt-6 px-4 md:px-8 relative">
          
          {/* MASSIVE DISTINCTION: Committee Head(s) Spotlights */}
          {committeeHeads.length > 0 && (
            <div className="mb-12 relative z-10">
              <div className="flex items-center justify-center gap-3 mb-8">
                 <div className="h-px w-24 bg-gradient-to-r from-transparent to-cyan-500/50"></div>
                 <div className="flex items-center gap-2 px-4 py-1.5 clip-angular-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold tracking-[0.2em] uppercase box-glow-cyan hud-monospace">
                    <Shield className="w-3.5 h-3.5" />
                 </div>
                 <div className="h-px w-24 bg-gradient-to-l from-transparent to-cyan-500/50"></div>
              </div>
              
              <div className="w-full">
                <CoverflowCarousel
                  items={committeeHeads}
                  intervalMs={3500}
                  stepPx={isMobile ? 220 : 280}
                  stageHeight={isMobile ? 420 : 540}
                  visibleRange={1}
                  rotateYDeg={30}
                  scaleStep={0.15}
                  translateZStep={-100}
                  pauseOnTouch={true}
                  blurPerStep={2}
                  edgeFades={true}
                  centerGlow={true}
                  showArrows={committeeHeads.length > 1}
                  className="py-4"
                  renderItem={(head: any) => (
                    <div className="w-72 md:w-[22rem] transform transition-transform duration-500">
                      <CommitteeHeadCard
                        head={head}
                        committeeName={committee.name}
                        isLeadWebDevRole={isLeadWebDevRole}
                        isMobile={isMobile}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          )}

          {/* Glowing Laser Divider */}
          {committeeHeads.length > 0 && regularMembers.length > 0 && (
            <div className="relative h-[2px] w-full max-w-lg mx-auto mb-12 my-8">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent clip-path-polygon-[0_0,_100%_0,_98%_100%,_2%_100%]"></div>
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-[#030712] border border-cyan-500/40 text-[8px] text-cyan-400 tracking-[0.3em] font-bold hud-monospace"
              >
                ACCESS GRANTED
              </div>
            </div>
          )}

          {/* Team Members Grid (Compact and neat) */}
          {regularMembers.length > 0 && (
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-8">
                <Cpu className="w-3.5 h-3.5 text-white/30" />
                <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 text-center hud-monospace">
                  FIELD OPERATIVES ARRAY ({regularMembers.length})
                </h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 px-1">
                {regularMembers.map((member, memberIndex) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    committee={committee}
                    isMobile={isMobile}
                    committeeIndex={committeeIndex}
                    memberIndex={memberIndex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isOpen && <CommitteeBackgroundEffect committeeName={committee.name} mode="foreground" />}
    </div>
  );
};

