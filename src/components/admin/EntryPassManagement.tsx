import React, { useRef, useState } from 'react';
import { Crown, History, Palette, QrCode, ShieldCheck } from 'lucide-react';
import { StudentPassPanel } from './passes/StudentPassPanel';
import { VipPassPanel } from './passes/VipPassPanel';
import { PassEditorPanel } from './passes/PassEditorPanel';
import { ValidationRulesPanel } from './passes/ValidationRulesPanel';
import { ScanHistoryPanel } from './passes/ScanHistoryPanel';

type PassTab = 'student' | 'vip' | 'editor' | 'rules' | 'scans';

/**
 * Unified Entry Pass section containing Student Pass, VIP Pass, Pass Editor, Gate Rules, and Gate Scans.
 */
export const EntryPassManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PassTab>('student');
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [vipCount, setVipCount] = useState<number | null>(null);

  const studentTabRef = useRef<HTMLButtonElement>(null);
  const vipTabRef = useRef<HTMLButtonElement>(null);
  const editorTabRef = useRef<HTMLButtonElement>(null);
  const rulesTabRef = useRef<HTMLButtonElement>(null);
  const scansTabRef = useRef<HTMLButtonElement>(null);

  const tabOrder: PassTab[] = ['student', 'vip', 'editor', 'rules', 'scans'];
  const tabRefs: Record<PassTab, React.RefObject<HTMLButtonElement>> = {
    student: studentTabRef,
    vip: vipTabRef,
    editor: editorTabRef,
    rules: rulesTabRef,
    scans: scansTabRef,
  };

  const selectTab = (next: PassTab) => {
    setActiveTab(next);
    tabRefs[next].current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: PassTab) => {
    const idx = tabOrder.indexOf(current);
    let next: PassTab | null = null;
    if (e.key === 'ArrowRight') next = tabOrder[(idx + 1) % tabOrder.length];
    else if (e.key === 'ArrowLeft') next = tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length];
    else if (e.key === 'Home') next = 'student';
    else if (e.key === 'End') next = 'scans';

    if (next) {
      e.preventDefault();
      selectTab(next);
      tabRefs[next].current?.focus();
    }
  };

  const tabs: Array<{
    id: PassTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    badge?: number | null;
  }> = [
    { id: 'student', label: 'Student Pass', icon: QrCode, iconClass: 'text-[#426b52]', badge: studentCount },
    { id: 'vip', label: 'VIP Pass', icon: Crown, iconClass: 'text-[#b45309]', badge: vipCount },
    { id: 'editor', label: 'Pass Editor', icon: Palette, iconClass: 'text-[#426b52]' },
    { id: 'rules', label: 'Gate Rules', icon: ShieldCheck, iconClass: 'text-[#426b52]' },
    { id: 'scans', label: 'Gate Scans', icon: History, iconClass: 'text-[#426b52]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#e2e8df] pb-0">
        <div>
          <p className="text-xs text-[#65726a]">
            Manage student passes, VIP passes, 3-day pass designs, gate validation rules, and live scan history.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Entry pass categories"
          className="ep-tab-list flex items-center gap-1 overflow-x-auto -mb-px"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={tabRefs[tab.id]}
                id={`entry-pass-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                  active
                    ? 'border-[#426b52] text-[#26352e] font-semibold bg-[#eff4ed]/70 rounded-t-lg'
                    : 'border-transparent text-[#65726a] font-medium hover:text-[#26352e] hover:bg-[#f6f8f4] rounded-t-lg'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.iconClass}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#e2e8df] text-[#4a5750]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" aria-labelledby="entry-pass-tab-student" hidden={activeTab !== 'student'}>
        <StudentPassPanel onCountChange={setStudentCount} onOpenEditor={() => selectTab('editor')} />
      </div>

      <div role="tabpanel" aria-labelledby="entry-pass-tab-vip" hidden={activeTab !== 'vip'}>
        <VipPassPanel onCountChange={setVipCount} onOpenEditor={() => selectTab('editor')} />
      </div>

      <div role="tabpanel" aria-labelledby="entry-pass-tab-editor" hidden={activeTab !== 'editor'}>
        <PassEditorPanel />
      </div>

      <div role="tabpanel" aria-labelledby="entry-pass-tab-rules" hidden={activeTab !== 'rules'}>
        <ValidationRulesPanel />
      </div>

      <div role="tabpanel" aria-labelledby="entry-pass-tab-scans" hidden={activeTab !== 'scans'}>
        <ScanHistoryPanel />
      </div>
    </div>
  );
};
