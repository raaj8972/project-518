import React, { useRef } from 'react';
import { School, UserCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import IQMGRosterManagement from './IQMGRosterManagement';
import { StudentApprovals } from './StudentApprovals';

type StudentSection = 'verifications' | 'iqmg';

/**
 * Students workspace section: Student Approvals and College ID Roster.
 */
export const StudentManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const activeSubTab: StudentSection = requested === 'iqmg' ? 'iqmg' : 'verifications';

  const setActiveSubTab = (section: StudentSection) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('section', section);
      return next;
    });

  const tabRefs: Record<StudentSection, React.RefObject<HTMLButtonElement>> = {
    verifications: useRef<HTMLButtonElement>(null),
    iqmg: useRef<HTMLButtonElement>(null),
  };

  const subTabs: Array<{
    id: StudentSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'verifications', label: 'Approvals', icon: UserCheck },
    { id: 'iqmg', label: 'College ID Roster', icon: School },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: StudentSection) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const next: StudentSection =
        e.key === 'Home'
          ? 'verifications'
          : e.key === 'End'
          ? 'iqmg'
          : current === 'verifications'
          ? 'iqmg'
          : 'verifications';
      setActiveSubTab(next);
      tabRefs[next].current?.focus();
      tabRefs[next].current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#e2e8df] pb-0">
        <p className="text-xs text-[#65726a]">
          Approve registered student accounts and verify college IQMG ID numbers against the official roster.
        </p>

        <div
          role="tablist"
          aria-label="Student management sections"
          className="ep-tab-list flex items-center gap-1 overflow-x-auto -mb-px"
        >
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={tabRefs[tab.id]}
                id={`students-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveSubTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                  active
                    ? 'border-[#426b52] text-[#26352e] font-semibold bg-[#eff4ed]/70 rounded-t-lg'
                    : 'border-transparent text-[#65726a] font-medium hover:text-[#26352e] hover:bg-[#f6f8f4] rounded-t-lg'
                }`}
              >
                <Icon className="w-4 h-4 text-[#426b52]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" aria-labelledby="students-tab-verifications" hidden={activeSubTab !== 'verifications'}>
        <StudentApprovals />
      </div>

      <div role="tabpanel" aria-labelledby="students-tab-iqmg" hidden={activeSubTab !== 'iqmg'}>
        <IQMGRosterManagement />
      </div>
    </div>
  );
};
