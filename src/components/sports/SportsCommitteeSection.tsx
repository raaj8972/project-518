import React from 'react';
import { Activity } from 'lucide-react';
import { SportsCommittee, SportsTeamMember } from '../../types/data';

const CommitteeBackgroundEffect: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] select-none pointer-events-none flex items-center justify-center overflow-hidden mix-blend-overlay">
      <div className="text-[20rem] font-black transform rotate-12 translate-x-20">COMMITTEE</div>
    </div>
    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px]" />
    <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-orange-950/10 rounded-full blur-[120px]" />
  </div>
);

interface SportsCommitteeSectionProps {
  sportsCommittees: SportsCommittee[];
  sportsTeamMembers: SportsTeamMember[];
  onMemberClick: (member: SportsTeamMember) => void;
}

const SportsCommitteeSection: React.FC<SportsCommitteeSectionProps> = ({
  sportsCommittees,
  sportsTeamMembers,
  onMemberClick,
}) => {
  return (
    <section id="committee" className="py-32 relative bg-black/60">
      <CommitteeBackgroundEffect />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-12 mb-20">
          <div className="max-w-2xl">
            <h2 className="text-5xl md:text-8xl font-black mb-8 leading-none tracking-tighter">
              THE <span className="text-red-600 italic">COMMITTEE</span>
            </h2>
            <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed uppercase tracking-widest">
              The architects of the arena. Managing excellence behind every play.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {sportsCommittees.filter(c => c.enabled).map((committee) => {
            const head = sportsTeamMembers.find(m => m.committee_id === committee.id && m.is_head && m.enabled);
            return (
              <div 
                key={committee.id}
                onClick={() => head && onMemberClick(head)}
                className="group relative h-60 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2.5rem] p-8 cursor-pointer overflow-hidden transition-all hover:border-red-600/50 hover:-translate-y-2"
              >
                <div className="relative h-full flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black group-hover:text-red-500 transition-colors uppercase tracking-widest leading-tight">
                      {committee.name}
                    </h4>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default React.memo(SportsCommitteeSection);
