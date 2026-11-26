import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, ChevronDownIcon, FileTextIcon, MixerHorizontalIcon, PersonIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import type { TabType } from '../layout/AdminLayout';
import '../../../styles/ParticipantsWorkspace.css';

export const participantSections = new Set<string>(['registrations', 'auditions', 'registration-modal', 'form-settings']);

export function ParticipantWorkspaceNavigation({ activeTab, available, onNavigate, badges = {} }: {
  activeTab: TabType; available: ReadonlySet<string>; onNavigate: (id: string) => void; badges?: Record<string, number>;
}) {
  const tabs = [
    { id: 'registrations', label: 'Event registrations', icon: CalendarIcon },
    { id: 'auditions', label: 'Band auditions', icon: SpeakerLoudIcon },
  ].filter(tab => available.has(tab.id));
  return <section className="participants-context" aria-label="Registration and audition workspace">
    <div className="participants-context__heading">
      <div><span className="participants-eyebrow"><PersonIcon />PARTICIPANT WORKSPACE</span><h1>Registrations & auditions<span>.</span></h1><p>Every application, in one place. A clear view from entry to approval.</p></div>
      {(available.has('registration-modal') || available.has('form-settings')) && <ParticipantMenu label="Form setup" icon={<MixerHorizontalIcon />}>
        {available.has('registration-modal') && <button onClick={() => onNavigate('registration-modal')}><FileTextIcon />Event registration form</button>}
        {available.has('form-settings') && <button onClick={() => onNavigate('form-settings')}><MixerHorizontalIcon />Application form settings</button>}
      </ParticipantMenu>}
    </div>
    <nav className="participants-navigation" aria-label="Participant workspace sections">
      {tabs.map(tab => <button key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => onNavigate(tab.id)}><tab.icon />{tab.label}{badges[tab.id] > 0 && <span aria-label={`${badges[tab.id]} pending`}>{badges[tab.id]}</span>}</button>)}
      {['registration-modal', 'form-settings'].includes(activeTab) && <span className="participants-navigation__current"><MixerHorizontalIcon />{activeTab === 'registration-modal' ? 'Registration form' : 'Application settings'}</span>}
      <span className="participants-navigation__hint">Separate applications. One workspace.</span>
    </nav>
  </section>;
}

export function ParticipantMenu({ label, icon, children, align = 'right', compact = false, disabled = false }: { label: string; icon?: ReactNode; children: ReactNode; align?: 'left' | 'right'; compact?: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState<{ top: number; left: number; bottom?: number } | null>(null);
  useEffect(() => {
    if (!position) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setPosition(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPosition(null); ref.current?.focus(); } };
    const dismiss = (event: Event) => { if (!panel.current?.contains(event.target as Node)) setPosition(null); };
    panel.current?.querySelector<HTMLElement>('button:not(:disabled),a[href]')?.focus();
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    window.addEventListener('scroll', dismiss, true); window.addEventListener('resize', dismiss);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', dismiss, true); window.removeEventListener('resize', dismiss); };
  }, [position]);
  return <div className="participants-menu">
    <button ref={ref} type="button" disabled={disabled} className={compact ? 'participants-icon' : 'participants-button'} aria-label={compact ? label : undefined} aria-expanded={!!position} aria-controls={position ? id : undefined} onClick={() => {
      if (position) { setPosition(null); return; }
      const rect = ref.current!.getBoundingClientRect();
      const width = Math.min(235, window.innerWidth - 40);
      const left = Math.max(16, Math.min(align === 'right' ? rect.right - width : rect.left, window.innerWidth - width - 16));
      const above = window.innerHeight - rect.bottom < 280 && rect.top > 300;
      setPosition({ top: above ? 0 : rect.bottom + 7, left, ...(above ? { bottom: window.innerHeight - rect.top + 7 } : {}) });
    }}>{icon}{!compact && <>{label}<ChevronDownIcon /></>}</button>
    {position && createPortal(<div ref={panel} id={id} className="participants-menu__items" style={{ position: 'fixed', left: position.left, right: 'auto', top: position.bottom ? 'auto' : position.top, bottom: position.bottom, maxHeight: 'min(420px, 70dvh)', overflowY: 'auto', zIndex: 80 }} aria-label={label} onKeyDown={event => {
      if (event.key !== 'Tab' || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');
      if ((event.shiftKey && event.target === items[0]) || (!event.shiftKey && event.target === items[items.length - 1])) { event.preventDefault(); setPosition(null); ref.current?.focus(); }
    }} onClick={event => { if ((event.target as HTMLElement).closest('button,a')) { setPosition(null); ref.current?.focus(); } }}>{children}</div>, document.body)}
  </div>;
}

export function ParticipantMetrics({ items, loading = false, value, onChange }: {
  items: { id: string; label: string; count: number; description: string }[]; loading?: boolean; value: string; onChange: (id: string) => void;
}) {
  return <div className="participants-metrics" aria-label="Application status filters">{items.map(item => <button key={item.id} aria-pressed={value === item.id} onClick={() => onChange(item.id)}>
    <span><i className={`participants-dot participants-dot--${item.id}`} />{item.label}</span><strong>{loading ? '—' : item.count.toLocaleString('en-IN')}</strong><small>{item.description}</small>
  </button>)}</div>;
}

export function ParticipantStatus({ status }: { status: string }) {
  return <span className={`participants-status participants-status--${status}`}><i />{status.replace(/_/g, ' ')}</span>;
}

export function ParticipantLoading({ label }: { label: string }) {
  return <div className="participants-loading" role="status" aria-label={label}>{[0, 1, 2, 3].map(index => <div key={index}><i /><span /><span /><span /></div>)}</div>;
}

export function participantDate(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export function participantInitials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
