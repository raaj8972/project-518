import React, { useState } from 'react';
import { Users, Crown, Shield, Layers, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { FacultyHeadsManagement } from './FacultyHeadsManagement';
import { CouncilManagement } from './CouncilManagement';
import { CommitteesManagement } from './CommitteesManagement';
import { TeamMembersManagement } from './TeamMembersManagement';
import { useData } from '../../context/DataContext';

type Section = 'faculty' | 'council' | 'committees' | 'heads' | 'members';

const SECTIONS: { id: Section; label: string; subtitle: string; icon: React.ElementType; color: string; gradient: string }[] = [
  { id: 'faculty', label: 'FACULTY', subtitle: 'Faculty leadership profiles & information', icon: Crown, color: 'amber', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'council', label: 'THE COUNCIL', subtitle: 'Council members who guide the organization', icon: Shield, color: 'red', gradient: 'from-red-500 to-rose-500' },
  { id: 'committees', label: 'CORE DIVISIONS', subtitle: 'Create structural divisions (Committees)', icon: Layers, color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'heads', label: 'COMMITTEE HEADS', subtitle: 'Leaders of each committee division', icon: Crown, color: 'violet', gradient: 'from-violet-500 to-purple-500' },
  { id: 'members', label: 'TEAM MEMBERS', subtitle: 'Core members within each committee', icon: Users, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
];

export const RicoFamilyManagement: React.FC = () => {
  const [openSection, setOpenSection] = useState<Section>('faculty');
  const { facultyHeads, coreTeamMembers, coreCommittees } = useData() as any;

  const councilCount = (coreTeamMembers || []).filter((m: any) => m.is_council).length;
  const headsCount = (coreTeamMembers || []).filter((m: any) => m.is_head && !m.is_council).length;
  const membersCount = (coreTeamMembers || []).filter((m: any) => !m.is_head && !m.is_council).length;

  const counts: Record<Section, number> = {
    faculty: (facultyHeads || []).length,
    council: councilCount,
    committees: (coreCommittees || []).length,
    heads: headsCount,
    members: membersCount,
  };

  const toggle = (s: Section) => setOpenSection(prev => prev === s ? s : s);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-400 to-violet-600 rounded-full" />
          Rico Family Management
        </h2>
        <p className="text-gray-400 mt-1 text-sm">Organized linearly: Council → Committees → Heads → Team Members.</p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setOpenSection(s.id)}
            className={`p-3 rounded-2xl border transition-all text-left group ${
              openSection === s.id
                ? `bg-${s.color}-500/10 border-${s.color}-500/30`
                : 'bg-white/[0.02] border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={openSection === s.id ? `text-${s.color}-400` : 'text-gray-500'} />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-tight">{s.label}</span>
            </div>
            <div className={`text-xl font-black ${openSection === s.id ? 'text-white' : 'text-gray-400'}`}>
              {counts[s.id]}
            </div>
          </button>
        ))}
      </div>

      {/* Section Accordions */}
      {SECTIONS.map(s => {
        const isOpen = openSection === s.id;
        return (
          <div key={s.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            isOpen ? `border-white/10 bg-white/[0.02]` : 'border-white/5 bg-white/[0.01]'
          }`}>
            {/* Section Header - Clickable */}
            <button
              onClick={() => toggle(s.id)}
              className="w-full px-6 py-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}>
                  <s.icon size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-white tracking-tight text-lg">{s.label}</h3>
                  <p className="text-gray-500 text-xs hidden md:block">{s.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-black bg-white/5 border border-white/10 text-gray-400`}>
                  {counts[s.id]}
                </span>
                {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </div>
            </button>

            {/* Section Content */}
            {isOpen && (
              <div className="px-4 pb-6 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                {s.id === 'faculty' && <FacultyHeadsManagement />}
                {s.id === 'council' && <CouncilManagement />}
                {s.id === 'committees' && <CommitteesManagement />}
                {s.id === 'heads' && <TeamMembersManagement isHeadMode={true} />}
                {s.id === 'members' && <TeamMembersManagement isHeadMode={false} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
