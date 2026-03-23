import React from 'react';
import { Users, Crown } from 'lucide-react';
import PreserveNewlines from '../PreserveNewlines';
import CommitteeBackgroundEffect from '../CommitteeBackgroundEffect';
import { CommitteeHeadCard } from './CommitteeHeadCard';
import { TeamMemberCard } from './TeamMemberCard';

interface CommitteeSectionProps {
  committee: any;
  membersByCommittee: Record<string, any[]>;
  isMobile: boolean;
  committeeIndex: number;
  isLeadWebDevRole: (role?: string | null, committeeName?: string) => boolean;
  expandedMembers: Set<number>;
  bootingMembers: Set<number>;
  toggleMemberExpanded: (id: number) => void;
}

export const CommitteeSection: React.FC<CommitteeSectionProps> = ({
  committee,
  membersByCommittee,
  isMobile,
  committeeIndex,
  isLeadWebDevRole,
  expandedMembers,
  bootingMembers,
  toggleMemberExpanded
}) => {
  const allCommitteeMembers = membersByCommittee[committee.id] || [];
  // Exclude council members and heads from regular members list if needed
  // In the original code, heads are shown separately, then regular members.
  // Regular members = not head AND not council
  const regularMembers = allCommitteeMembers.filter(member => !member.is_head && !((member as any).isCouncil || (member as any).is_council));
  const committeeHeads = allCommitteeMembers.filter(m => m.is_head);

  if (allCommitteeMembers.length === 0) return null;

  return (
    <div
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
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-4 font-serif committee-title" style={{ color: committee.color }}>
          {committee.name.toUpperCase()}
        </h3>
        <PreserveNewlines as="div" text={committee.description} className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto" />
      </div>

      {/* Committee Head */}
      {committeeHeads.length > 0 && (
        <div className="mb-8 relative z-10">
          <h4 className="text-lg font-semibold text-gray-300 mb-4 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-500 mr-2" />
            Committee Heads ({committeeHeads.length})
          </h4>
          <div className="grid md:grid-cols-2 gap-8">
            {committeeHeads.map(head => (
              <CommitteeHeadCard
                key={head.id}
                head={head}
                committeeName={committee.name}
                isLeadWebDevRole={isLeadWebDevRole}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Team Members Grid */}
      {regularMembers.length > 0 && (
        <div className="relative z-10">
          <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center mt-6 sm:mt-0">Team Members</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-1 sm:px-0">
            {regularMembers.map((member, memberIndex) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                committee={committee}
                isExpanded={expandedMembers.has(member.id)}
                isBooting={bootingMembers.has(member.id)}
                toggleMemberExpanded={toggleMemberExpanded}
                isMobile={isMobile}
                committeeIndex={committeeIndex}
                memberIndex={memberIndex}
              />
            ))}
          </div>
        </div>
      )}
      <CommitteeBackgroundEffect committeeName={committee.name} mode="foreground" />
    </div>
  );
};
