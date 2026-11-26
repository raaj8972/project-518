import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  Globe,
  GripVertical,
  Home,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Lock,
  Unlock,
  MessageSquareOff,
  Minus,
  Music,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { SITE_FEATURES } from '../../constants/siteFeatures';
import { useData } from '../../context/DataContext';
import { useApprovals } from '../../hooks/useApprovals';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ComingSoon } from '../../pages/ComingSoon';
import { WebsitePreviewFrame } from './layout/WebsitePreviewFrame';
import '../../styles/SiteSettingsWorkspace.css';

type SettingsTab = 'access' | 'navigation' | 'locks';

interface SiteSettingsDraft {
  site_closed: boolean;
  coming_soon_enabled: boolean;
  chat_locked: boolean;
  locked_pages: Record<string, boolean>;
  coming_soon_until: string;
  coming_soon_title: string;
  coming_soon_message: string;
  coming_soon_ended_text: string;
  show_timer: boolean;
  homepage_hero_title: string;
  sports_instagram_url: string;
  locked_pages_until: Record<string, string | null>;
  show_page_timers: Record<string, boolean>;
  default_landing_page: string;
  navigation_order: string[];
  _is_draft: boolean;
}

interface PublicPageDef {
  key: string;
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ALL_PUBLIC_PAGES: PublicPageDef[] = [
  { key: 'home', path: '/', label: 'Home', description: 'Main landing page & festival hero', icon: Home },
  { key: 'events', path: '/events', label: 'Events', description: 'Competitions, rules & sign-ups', icon: Calendar },
  { key: 'schedule', path: '/schedule', label: 'Schedule', description: 'Festival dates, times & venues', icon: Clock },
  { key: 'gallery', path: '/gallery', label: 'Gallery', description: 'Photo library & event albums', icon: ImageIcon },
  { key: 'home-bound', path: '/home-bound', label: 'Home Bound', description: 'College band & stage showcase', icon: Music },
  { key: 'rico-family', path: '/rico-family', label: 'Rico Family', description: 'Faculty, council & committees', icon: Users },
  { key: 'sports', path: '/sports', label: 'Sports', description: 'Leagues, matches & team standings', icon: Trophy },
  { key: 'sponsors', path: '/sponsors', label: 'Sponsors', description: 'Festival partners & supporters', icon: Star },
];

const VISIBLE_PUBLIC_PAGES = ALL_PUBLIC_PAGES.filter(page => SITE_FEATURES.sports || page.key !== 'sports');
const DEFAULT_NAV_ORDER = VISIBLE_PUBLIC_PAGES.map(page => page.key);

const INITIAL_LOCAL_STATE: SiteSettingsDraft = {
  site_closed: false,
  coming_soon_enabled: false,
  chat_locked: false,
  locked_pages: {},
  coming_soon_until: '',
  coming_soon_title: '',
  coming_soon_message: '',
  coming_soon_ended_text: '',
  show_timer: false,
  homepage_hero_title: '',
  sports_instagram_url: '',
  locked_pages_until: {},
  show_page_timers: {},
  default_landing_page: '/',
  navigation_order: [],
  _is_draft: false,
};

function toLocalDateTimeInputValue(isoValue: string | null | undefined): string {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromLocalInput(localValue: string): string | null {
  if (!localValue) return null;
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatRemainingDuration(isoOrLocal: string | null | undefined, nowMs: number): string {
  if (!isoOrLocal) return '';
  const target = new Date(isoOrLocal).getTime();
  if (Number.isNaN(target)) return '';
  const diff = target - nowMs;
  if (diff <= 0) return 'Expired';
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function formatLocalTime(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeVisibleOrder(order: unknown): string[] {
  const validKeys = new Set(DEFAULT_NAV_ORDER);
  const custom = Array.isArray(order)
    ? order.filter((item): item is string => typeof item === 'string' && validKeys.has(item))
    : [];
  return [...new Set([...custom, ...DEFAULT_NAV_ORDER])];
}

function buildBaselineFromServer(siteSettings: any): SiteSettingsDraft {
  if (!siteSettings) return INITIAL_LOCAL_STATE;
  const lockedPagesUntil = (siteSettings.locked_pages_until || {}) as Record<string, string | null>;
  return {
    site_closed: !!siteSettings.site_closed,
    coming_soon_enabled: !!siteSettings.coming_soon_enabled,
    chat_locked: !!siteSettings.chat_locked,
    locked_pages: { ...(siteSettings.locked_pages || {}) },
    coming_soon_until: toLocalDateTimeInputValue(siteSettings.coming_soon_until),
    coming_soon_title: siteSettings.coming_soon_title || '',
    coming_soon_message: siteSettings.coming_soon_message || '',
    coming_soon_ended_text: siteSettings.coming_soon_ended_text || '',
    show_timer: !!siteSettings.coming_soon_until,
    homepage_hero_title: siteSettings.homepage_hero_title || '',
    sports_instagram_url: siteSettings.sports_instagram_url || '',
    locked_pages_until: { ...lockedPagesUntil },
    show_page_timers: Object.keys(lockedPagesUntil).reduce((acc, page) => {
      const value = lockedPagesUntil[page];
      acc[page] = !!value && new Date(value).getTime() > Date.now();
      return acc;
    }, {} as Record<string, boolean>),
    default_landing_page: siteSettings.default_landing_page || '/',
    navigation_order: Array.isArray(siteSettings.navigation_order) ? [...siteSettings.navigation_order] : [],
    _is_draft: false,
  };
}

function serializeForSave(draft: SiteSettingsDraft) {
  const normalizedLocks = VISIBLE_PUBLIC_PAGES.reduce((acc, page) => {
    if (draft.locked_pages?.[page.key]) acc[page.key] = true;
    else if (draft.locked_pages && page.key in draft.locked_pages) acc[page.key] = false;
    return acc;
  }, { ...(draft.locked_pages || {}) } as Record<string, boolean>);

  const normalizedTimers = Object.keys(draft.locked_pages_until || {}).reduce((acc, page) => {
    acc[page] = draft.show_page_timers?.[page] ? draft.locked_pages_until[page] : null;
    return acc;
  }, {} as Record<string, string | null>);

  return {
    site_closed: !!draft.site_closed,
    coming_soon_enabled: !!draft.coming_soon_enabled,
    chat_locked: !!draft.chat_locked,
    locked_pages: normalizedLocks,
    coming_soon_until: draft.show_timer && draft.coming_soon_until ? toIsoFromLocalInput(draft.coming_soon_until) : null,
    coming_soon_title: draft.coming_soon_title.trim() ? draft.coming_soon_title : null,
    coming_soon_message: draft.coming_soon_message.trim() ? draft.coming_soon_message : null,
    coming_soon_ended_text: draft.coming_soon_ended_text.trim() ? draft.coming_soon_ended_text : null,
    homepage_hero_title: draft.homepage_hero_title.trim() ? draft.homepage_hero_title : null,
    ...(SITE_FEATURES.sports ? { sports_instagram_url: draft.sports_instagram_url.trim() ? draft.sports_instagram_url.trim() : null } : {}),
    locked_pages_until: normalizedTimers,
    default_landing_page: draft.default_landing_page || '/',
    navigation_order: Array.isArray(draft.navigation_order) ? draft.navigation_order : [],
  };
}

interface ChangeDiffItem {
  key: string;
  tab: SettingsTab;
  label: string;
  before: string;
  after: string;
}

function computeChanges(current: SiteSettingsDraft, baseline: SiteSettingsDraft): ChangeDiffItem[] {
  const a = serializeForSave(current);
  const b = serializeForSave(baseline);
  const diffs: ChangeDiffItem[] = [];

  const pushIfChanged = (key: string, tab: SettingsTab, label: string, valB: unknown, valA: unknown, formatter?: (v: any) => string) => {
    if (JSON.stringify(valA) === JSON.stringify(valB)) return;
    const fmt = formatter || ((v: any) => (v == null || v === '' ? 'Default / Empty' : String(v)));
    diffs.push({ key, tab, label, before: fmt(valB), after: fmt(valA) });
  };

  pushIfChanged('site_closed', 'access', 'Hard maintenance mode', b.site_closed, a.site_closed, v => (v ? 'Closed' : 'Open'));
  pushIfChanged('coming_soon_enabled', 'access', 'Coming soon mode', b.coming_soon_enabled, a.coming_soon_enabled, v => (v ? 'Enabled' : 'Off'));
  pushIfChanged('chat_locked', 'access', 'Community chat lock', b.chat_locked, a.chat_locked, v => (v ? 'Locked' : 'Open'));
  pushIfChanged('coming_soon_until', 'access', 'Maintenance countdown', b.coming_soon_until, a.coming_soon_until, v => (v ? new Date(v).toLocaleString() : 'Indefinite'));
  pushIfChanged('coming_soon_title', 'access', 'Gate headline', b.coming_soon_title, a.coming_soon_title);
  pushIfChanged('coming_soon_message', 'access', 'Gate message', b.coming_soon_message, a.coming_soon_message);
  pushIfChanged('coming_soon_ended_text', 'access', 'Post-timer text', b.coming_soon_ended_text, a.coming_soon_ended_text);
  pushIfChanged('homepage_hero_title', 'access', 'Homepage hero title', b.homepage_hero_title, a.homepage_hero_title);
  if (SITE_FEATURES.sports) {
    pushIfChanged('sports_instagram_url', 'access', 'Sports Instagram URL', b.sports_instagram_url, a.sports_instagram_url);
  }
  pushIfChanged('default_landing_page', 'navigation', 'Default landing page', b.default_landing_page, a.default_landing_page);
  pushIfChanged(
    'navigation_order',
    'navigation',
    'Menu item order',
    normalizeVisibleOrder(b.navigation_order),
    normalizeVisibleOrder(a.navigation_order),
    v => (Array.isArray(v) && v.length ? v.join(' → ') : 'Default order')
  );

  for (const page of VISIBLE_PUBLIC_PAGES) {
    const lockedBefore = !!b.locked_pages?.[page.key];
    const lockedAfter = !!a.locked_pages?.[page.key];
    const untilBefore = b.locked_pages_until?.[page.key] || null;
    const untilAfter = a.locked_pages_until?.[page.key] || null;
    if (lockedBefore !== lockedAfter || (lockedAfter && untilBefore !== untilAfter)) {
      const describe = (locked: boolean, until: string | null) =>
        !locked ? 'Open' : until ? `Locked until ${formatLocalTime(until)}` : 'Locked (Indefinite)';
      diffs.push({
        key: `lock-${page.key}`,
        tab: 'locks',
        label: `${page.label} page lock`,
        before: describe(lockedBefore, untilBefore),
        after: describe(lockedAfter, untilAfter),
      });
    }
  }

  return diffs;
}

export const SiteSettingsPanel: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const { submitForApproval, checkRequiresApproval } = useApprovals();

  const [requiresApproval, setRequiresApproval] = useState(false);
  const [rawLocal, setRawLocal, clearLocal] = useLocalStorage<SiteSettingsDraft>('admin_site_settings_draft', INITIAL_LOCAL_STATE);
  const local = useMemo<SiteSettingsDraft>(() => ({ ...INITIAL_LOCAL_STATE, ...rawLocal }), [rawLocal]);
  const baseline = useMemo<SiteSettingsDraft>(() => buildBaselineFromServer(siteSettings), [siteSettings]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('access');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [simulateGate, setSimulateGate] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const formRef = useRef<HTMLFormElement>(null);
  const tabRefs = useRef<Record<SettingsTab, HTMLButtonElement | null>>({ access: null, navigation: null, locks: null });

  const idPrefix = useId();
  const siteClosedId = `${idPrefix}-site-closed`;
  const comingSoonId = `${idPrefix}-coming-soon`;
  const chatLockedId = `${idPrefix}-chat-locked`;
  const showTimerId = `${idPrefix}-show-timer`;
  const countdownInputId = `${idPrefix}-countdown-until`;
  const gateTitleId = `${idPrefix}-gate-title`;
  const gateMessageId = `${idPrefix}-gate-message`;
  const postTimerId = `${idPrefix}-post-timer`;
  const heroTitleId = `${idPrefix}-hero-title`;
  const sportsIgId = `${idPrefix}-sports-ig`;
  const landingSelectId = `${idPrefix}-landing-page`;

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  useEffect(() => {
    if (!siteSettings || local._is_draft) return;
    setRawLocal(buildBaselineFromServer(siteSettings));
  }, [siteSettings, local._is_draft]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const updateDraft = useCallback(
    (updater: (prev: SiteSettingsDraft) => SiteSettingsDraft) => {
      setFeedback(null);
      setRawLocal(prev => updater({ ...INITIAL_LOCAL_STATE, ...prev, _is_draft: true }));
    },
    [setRawLocal]
  );

  const changes = useMemo(() => computeChanges(local, baseline), [local, baseline]);
  const isDirty = changes.length > 0;
  const tabHasChanges = useCallback((tab: SettingsTab) => changes.some(c => c.tab === tab), [changes]);

  const effectiveNavOrder = useMemo(() => normalizeVisibleOrder(local.navigation_order), [local.navigation_order]);
  const isCustomOrder = useMemo(() => {
    if (!local.navigation_order.length) return false;
    return JSON.stringify(effectiveNavOrder) !== JSON.stringify(DEFAULT_NAV_ORDER);
  }, [local.navigation_order, effectiveNavOrder]);

  const activeLockedCount = useMemo(
    () =>
      VISIBLE_PUBLIC_PAGES.filter(page => {
        if (!local.locked_pages?.[page.key]) return false;
        const usesTimer = !!local.show_page_timers?.[page.key];
        const expiry = local.locked_pages_until?.[page.key];
        if (usesTimer && expiry) {
          const ms = new Date(expiry).getTime();
          if (!Number.isNaN(ms) && ms <= nowMs) return false;
        }
        return true;
      }).length,
    [local.locked_pages, local.show_page_timers, local.locked_pages_until, nowMs]
  );

  const gateState: 'open' | 'coming-soon' | 'closed' = local.site_closed
    ? 'closed'
    : local.coming_soon_enabled
      ? 'coming-soon'
      : 'open';

  const onSave = useCallback(async () => {
    if (saving || !isDirty) return;
    if (formRef.current && !formRef.current.reportValidity()) return;

    setSaving(true);
    setFeedback(null);
    try {
      const payload = serializeForSave(local);
      if (requiresApproval) {
        const settingsId = (siteSettings as any)?.id || 1;
        const result = await submitForApproval('site_settings', 'update', payload, settingsId);
        if (result.success) {
          setSavedAt(Date.now());
          setFeedback({ type: 'success', text: 'Changes submitted for owner approval.' });
        } else {
          setFeedback({ type: 'error', text: `Could not submit for approval: ${result.error || 'Unknown error'}` });
        }
      } else {
        await updateSiteSettings(payload as any);
        setSavedAt(Date.now());
        clearLocal();
        setShowChanges(false);
        setFeedback({ type: 'success', text: 'Site settings published successfully.' });
      }
    } catch (error: any) {
      let msg = error?.message || 'Failed to save settings. Please try again.';
      if (error?.message === 'TIMEOUT') {
        msg = 'Request timed out. Check your connection and try saving again.';
      } else if (error?.message?.includes('violates row-level security') || error?.code === '42501') {
        msg = 'Permission denied: your account does not have permission to update site settings.';
      }
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  }, [saving, isDirty, local, requiresApproval, siteSettings, submitForApproval, updateSiteSettings, clearLocal]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void onSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSave]);

  const discardChanges = () => {
    clearLocal();
    setRawLocal(baseline);
    setShowChanges(false);
    setFeedback({ type: 'success', text: 'Unsaved draft discarded. Live settings restored.' });
  };

  const applyGateTimerPreset = (minutes: number) => {
    const baseMs =
      local.show_timer && local.coming_soon_until
        ? Math.max(Date.now(), new Date(local.coming_soon_until).getTime() || Date.now())
        : Date.now();
    const nextIso = new Date(baseMs + minutes * 60000).toISOString();
    updateDraft(s => ({
      ...s,
      show_timer: true,
      coming_soon_until: toLocalDateTimeInputValue(nextIso),
    }));
  };

  const adjustPageTimer = (pageKey: string, minutes: number) => {
    const current = local.locked_pages_until?.[pageKey];
    let baseDate = current ? new Date(current) : new Date();
    if (Number.isNaN(baseDate.getTime()) || baseDate.getTime() < Date.now()) {
      baseDate = new Date();
    }
    const nextDate = new Date(baseDate.getTime() + minutes * 60000);
    updateDraft(s => ({
      ...s,
      locked_pages: { ...s.locked_pages, [pageKey]: true },
      show_page_timers: { ...s.show_page_timers, [pageKey]: true },
      locked_pages_until: { ...s.locked_pages_until, [pageKey]: nextDate.toISOString() },
    }));
  };

  const clearPageTimer = (pageKey: string) => {
    updateDraft(s => ({
      ...s,
      locked_pages_until: { ...s.locked_pages_until, [pageKey]: null },
      show_page_timers: { ...s.show_page_timers, [pageKey]: false },
    }));
  };

  const setAllPageLocks = (locked: boolean) => {
    updateDraft(s => {
      const nextLocks = { ...s.locked_pages };
      for (const page of VISIBLE_PUBLIC_PAGES) nextLocks[page.key] = locked;
      return { ...s, locked_pages: nextLocks };
    });
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= effectiveNavOrder.length) return;
    const next = [...effectiveNavOrder];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateDraft(s => ({ ...s, navigation_order: next }));
  };

  const reorderNavByKey = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const next = [...effectiveNavOrder];
    const fromIdx = next.indexOf(sourceKey);
    const toIdx = next.indexOf(targetKey);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateDraft(s => ({ ...s, navigation_order: next }));
  };

  const resetNavOrder = () => {
    updateDraft(s => ({ ...s, navigation_order: [] }));
  };

  const previewSettings = useMemo(() => {
    const serialized = serializeForSave(local);
    if (!simulateGate) return serialized;
    return {
      ...serialized,
      coming_soon_enabled: true,
      coming_soon_title: serialized.coming_soon_title || 'Coming Soon',
      coming_soon_message: serialized.coming_soon_message || 'We are preparing something amazing for the festival.',
      coming_soon_ended_text: serialized.coming_soon_ended_text || "We'll be back soon",
    };
  }, [local, simulateGate]);

  const landingPageMeta = VISIBLE_PUBLIC_PAGES.find(p => p.path === local.default_landing_page) || VISIBLE_PUBLIC_PAGES[0];

  const handleTabKeyDown = (event: React.KeyboardEvent, current: SettingsTab) => {
    const order: SettingsTab[] = ['access', 'navigation', 'locks'];
    const idx = order.indexOf(current);
    let nextTab: SettingsTab | null = null;
    if (event.key === 'ArrowRight') nextTab = order[(idx + 1) % order.length];
    else if (event.key === 'ArrowLeft') nextTab = order[(idx - 1 + order.length) % order.length];
    else if (event.key === 'Home') nextTab = order[0];
    else if (event.key === 'End') nextTab = order[order.length - 1];
    if (nextTab) {
      event.preventDefault();
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };

  const statusHeadline =
    gateState === 'closed'
      ? 'Hard maintenance active'
      : gateState === 'coming-soon'
        ? 'Coming soon gate active'
        : 'Website open to visitors';

  const statusDescription =
    gateState === 'closed'
      ? 'All public routes are closed behind the access-denied screen. Authorized admins bypass automatically.'
      : gateState === 'coming-soon'
        ? 'Visitors see your Coming Soon teaser screen and countdown before accessing the site.'
        : activeLockedCount > 0
          ? `Site is live, with ${activeLockedCount} individual ${activeLockedCount === 1 ? 'page' : 'pages'} currently locked.`
          : 'All public pages and community features are accessible with your configured navigation.';

  return (
    <div className="ss-workspace">
      {/* Live Site Status Overview Strip */}
      <section className="ss-status-strip" data-gate={gateState} aria-label="Public site status summary">
        <div className="ss-status-lead">
          <div className="ss-status-badge-icon" aria-hidden="true">
            {gateState === 'closed' ? (
              <ShieldAlert size={19} />
            ) : gateState === 'coming-soon' ? (
              <Timer size={19} />
            ) : (
              <Globe size={19} />
            )}
          </div>
          <div className="ss-status-copy">
            <div className="ss-status-title-row">
              <span className="ss-status-pill">{statusHeadline}</span>
              <span className={`ss-meta-chip${activeLockedCount > 0 ? ' is-alert' : ''}`}>
                <Lock size={12} aria-hidden="true" />
                <strong>{activeLockedCount}</strong> of {VISIBLE_PUBLIC_PAGES.length} pages locked
              </span>
              <span className={`ss-meta-chip${local.chat_locked ? ' is-alert' : ''}`}>
                <MessageSquareOff size={12} aria-hidden="true" />
                Chat <strong>{local.chat_locked ? 'locked' : 'open'}</strong>
              </span>
              <span className="ss-meta-chip">
                <Compass size={12} aria-hidden="true" />
                Entry <strong>{landingPageMeta.path}</strong>
              </span>
            </div>
            <p>{statusDescription}</p>
          </div>
        </div>

        <div className="ss-status-meta">
          <div className={`ss-draft-chip${isDirty ? ' is-dirty' : ''}`} role="status" aria-live="polite">
            {isDirty ? (
              <>
                <span className="ss-draft-dot" aria-hidden="true" />
                {changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}
              </>
            ) : savedAt ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" />
                Saved at {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              <>
                <CheckCircle2 size={14} aria-hidden="true" />
                All changes published
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <div className="ss-tabs-bar">
        <div className="ss-tabs" role="tablist" aria-label="Site settings sections">
          {(
            [
              { id: 'access', label: 'Site access & gate', icon: ShieldAlert },
              { id: 'navigation', label: 'Navigation & landing', icon: Compass },
              { id: 'locks', label: 'Page locks', icon: Lock, count: activeLockedCount },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            const dirty = tabHasChanges(tab.id);
            return (
              <button
                key={tab.id}
                ref={el => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`ss-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`ss-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className="ss-tab"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={e => handleTabKeyDown(e, tab.id)}
              >
                {selected && (
                  <motion.span
                    className="ss-tab-indicator"
                    layoutId="ss-active-tab-pill"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  />
                )}
                <Icon size={15} aria-hidden="true" />
                <span>{tab.label}</span>
                {'count' in tab && tab.count > 0 && <span className="ss-tab-badge">{tab.count}</span>}
                {dirty && <span className="ss-tab-dirty" title="Unsaved changes in this section" />}
              </button>
            );
          })}
        </div>

        <a
          href="/coming-soon"
          target="_blank"
          rel="noopener noreferrer"
          className="ss-external-link"
        >
          <ExternalLink size={13} aria-hidden="true" />
          Open gate page
        </a>
      </div>

      {/* Inline Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            className={`ss-feedback${feedback.type === 'error' ? ' is-error' : ''}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {feedback.type === 'error' ? (
              <AlertTriangle size={16} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={16} aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setFeedback(null)}>
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Change Review Drawer */}
      <AnimatePresence>
        {showChanges && isDirty && (
          <motion.section
            className="ss-changes-drawer"
            aria-label="Pending site settings changes"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <header>
              <strong>Reviewing {changes.length} pending {changes.length === 1 ? 'change' : 'changes'}</strong>
              <button type="button" aria-label="Close change review" onClick={() => setShowChanges(false)}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <div className="ss-changes-list">
              {changes.map(diff => (
                <div className="ss-change-row" key={diff.key}>
                  <span>{diff.label}</span>
                  <del>{diff.before}</del>
                  <ChevronRight size={13} aria-hidden="true" />
                  <strong>{diff.after}</strong>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Main Form */}
      <form
        ref={formRef}
        onSubmit={e => {
          e.preventDefault();
          void onSave();
        }}
        noValidate
      >
        <fieldset disabled={saving} className="ss-fieldset">
          <legend className="sr-only">Website access, navigation, and maintenance configuration</legend>

          {/* TAB 1: ACCESS & GATE */}
          {activeTab === 'access' && (
            <div
              id="ss-panel-access"
              role="tabpanel"
              aria-labelledby="ss-tab-access"
              className="ss-grid"
            >
              <div className="ss-stack">
                {/* Site-wide Switches */}
                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <ShieldAlert size={16} />
                      </span>
                      <div>
                        <h2>Global Access Controls</h2>
                        <p>Control overall site availability and real-time community messaging.</p>
                      </div>
                    </div>
                  </header>
                  <div className="ss-card-body">
                    <div className="ss-toggle-list">
                      <div className="ss-toggle-card" data-tone="danger">
                        <div className="ss-toggle-info">
                          <span className="ss-toggle-icon" aria-hidden="true">
                            <Lock size={15} />
                          </span>
                          <div>
                            <label htmlFor={siteClosedId} className="ss-toggle-label">
                              Close entire site (hard maintenance)
                            </label>
                            <p className="ss-toggle-desc">
                              Immediately gates all public visitors behind the access-denied screen. Admins can still enter.
                            </p>
                          </div>
                        </div>
                        <div className="ss-toggle-control">
                          <span className="ss-state-tag">{local.site_closed ? 'Closed' : 'Off'}</span>
                          <input
                            id={siteClosedId}
                            type="checkbox"
                            role="switch"
                            data-tone="danger"
                            className="ss-switch"
                            checked={local.site_closed}
                            onChange={e => updateDraft(s => ({ ...s, site_closed: e.target.checked }))}
                          />
                        </div>
                      </div>

                      <div className="ss-toggle-card" data-tone="warn">
                        <div className="ss-toggle-info">
                          <span className="ss-toggle-icon" aria-hidden="true">
                            <Sparkles size={15} />
                          </span>
                          <div>
                            <label htmlFor={comingSoonId} className="ss-toggle-label">
                              Enable Coming Soon mode
                            </label>
                            <p className="ss-toggle-desc">
                              Shows the launch teaser and optional countdown clock while you prepare content behind the scenes.
                            </p>
                          </div>
                        </div>
                        <div className="ss-toggle-control">
                          <span className="ss-state-tag">{local.coming_soon_enabled ? 'Active' : 'Off'}</span>
                          <input
                            id={comingSoonId}
                            type="checkbox"
                            role="switch"
                            data-tone="warn"
                            className="ss-switch"
                            checked={local.coming_soon_enabled}
                            onChange={e => updateDraft(s => ({ ...s, coming_soon_enabled: e.target.checked }))}
                          />
                        </div>
                      </div>

                      <div className="ss-toggle-card" data-tone="warn">
                        <div className="ss-toggle-info">
                          <span className="ss-toggle-icon" aria-hidden="true">
                            <MessageSquareOff size={15} />
                          </span>
                          <div>
                            <label htmlFor={chatLockedId} className="ss-toggle-label">
                              Lock all chat
                            </label>
                            <p className="ss-toggle-desc">
                              Freezes message submission across student community and technical support channels.
                            </p>
                          </div>
                        </div>
                        <div className="ss-toggle-control">
                          <span className="ss-state-tag">{local.chat_locked ? 'Locked' : 'Open'}</span>
                          <input
                            id={chatLockedId}
                            type="checkbox"
                            role="switch"
                            data-tone="warn"
                            className="ss-switch"
                            checked={local.chat_locked}
                            onChange={e => updateDraft(s => ({ ...s, chat_locked: e.target.checked }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Maintenance Timing */}
                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <Timer size={16} />
                      </span>
                      <div>
                        <h2>Maintenance Timing</h2>
                        <p>Choose whether the blackout ends automatically or stays up until turned off.</p>
                      </div>
                    </div>
                    <div className="ss-toggle-control">
                      <label htmlFor={showTimerId} className="ss-toggle-label ss-toggle-label-inline">
                        Countdown timer
                      </label>
                      <input
                        id={showTimerId}
                        type="checkbox"
                        role="switch"
                        className="ss-switch"
                        checked={local.show_timer}
                        onChange={e => updateDraft(s => ({ ...s, show_timer: e.target.checked }))}
                      />
                    </div>
                  </header>
                  <div className="ss-card-body">
                    {local.show_timer ? (
                      <>
                        <div className="ss-field">
                          <div className="ss-field-head">
                            <label htmlFor={countdownInputId}>Countdown ends at</label>
                            {local.coming_soon_until && (
                              <span className="ss-countdown-readout">
                                {formatRemainingDuration(local.coming_soon_until, nowMs)}
                              </span>
                            )}
                          </div>
                          <input
                            id={countdownInputId}
                            type="datetime-local"
                            className="ss-input"
                            value={local.coming_soon_until}
                            onChange={e => updateDraft(s => ({ ...s, coming_soon_until: e.target.value }))}
                          />
                        </div>
                        <div className="ss-preset-row" aria-label="Quick countdown presets">
                          <span className="ss-field-meta ss-preset-label">Quick add:</span>
                          <button type="button" className="ss-preset-btn" onClick={() => applyGateTimerPreset(15)}>
                            +15 min
                          </button>
                          <button type="button" className="ss-preset-btn" onClick={() => applyGateTimerPreset(60)}>
                            +1 hour
                          </button>
                          <button type="button" className="ss-preset-btn" onClick={() => applyGateTimerPreset(60 * 24)}>
                            +24 hours
                          </button>
                          <button type="button" className="ss-preset-btn" onClick={() => applyGateTimerPreset(60 * 72)}>
                            +3 days
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="ss-indefinite-banner" role="note">
                        <InfinityIcon size={17} aria-hidden="true" className="ss-indefinite-icon" />
                        <div>
                          <strong>Indefinite mode active</strong>
                          While maintenance or Coming Soon is enabled, the gate will stay visible until you turn it off manually.
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Gate Messaging & Overrides */}
                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <Eye size={16} />
                      </span>
                      <div>
                        <h2>Gate Messaging & Overrides</h2>
                        <p>Customize what visitors read while the site is gated.</p>
                      </div>
                    </div>
                  </header>
                  <div className="ss-card-body">
                    <div className="ss-two-col">
                      <div className="ss-field">
                        <label htmlFor={gateTitleId}>Gate headline</label>
                        <input
                          id={gateTitleId}
                          type="text"
                          className="ss-input"
                          value={local.coming_soon_title}
                          onChange={e => updateDraft(s => ({ ...s, coming_soon_title: e.target.value }))}
                          placeholder="Coming Soon"
                        />
                      </div>

                      <div className="ss-field">
                        <label htmlFor={postTimerId}>Post-timer message</label>
                        <input
                          id={postTimerId}
                          type="text"
                          className="ss-input"
                          value={local.coming_soon_ended_text}
                          onChange={e => updateDraft(s => ({ ...s, coming_soon_ended_text: e.target.value }))}
                          placeholder="We'll be back soon"
                        />
                      </div>
                    </div>

                    <div className="ss-field">
                      <div className="ss-field-head">
                        <label htmlFor={gateMessageId}>Message body</label>
                        <span className="ss-field-meta">{local.coming_soon_message.length} chars</span>
                      </div>
                      <textarea
                        id={gateMessageId}
                        className="ss-textarea"
                        value={local.coming_soon_message}
                        onChange={e => updateDraft(s => ({ ...s, coming_soon_message: e.target.value }))}
                        placeholder="We are preparing something amazing..."
                      />
                    </div>

                    <details className="ss-disclosure">
                      <summary>
                        <span>Optional landing & channel overrides</span>
                        <ChevronDown size={15} aria-hidden="true" />
                      </summary>
                      <div className="ss-disclosure-content">
                        <div className="ss-field">
                          <label htmlFor={heroTitleId}>Homepage hero title override</label>
                          <input
                            id={heroTitleId}
                            type="text"
                            className="ss-input"
                            aria-describedby={`${heroTitleId}-hint`}
                            value={local.homepage_hero_title}
                            onChange={e => updateDraft(s => ({ ...s, homepage_hero_title: e.target.value }))}
                            placeholder="RICORRENZA"
                          />
                          <p id={`${heroTitleId}-hint`} className="ss-field-hint">
                            Stored in site settings for legacy homepage hero fallback. Primary title editing lives in the Home editor.
                          </p>
                        </div>

                        {SITE_FEATURES.sports && (
                          <div className="ss-field">
                            <label htmlFor={sportsIgId}>Sports Instagram URL</label>
                            <input
                              id={sportsIgId}
                              type="url"
                              autoCorrect="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              className="ss-input"
                              aria-describedby={`${sportsIgId}-hint`}
                              value={local.sports_instagram_url}
                              onChange={e => updateDraft(s => ({ ...s, sports_instagram_url: e.target.value }))}
                              placeholder="https://instagram.com/..."
                            />
                            <p id={`${sportsIgId}-hint`} className="ss-field-hint">
                              Optional Instagram link displayed on the Sports section page.
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </section>
              </div>

              {/* Sticky Live Isolated Gate Preview */}
              <aside className="ss-sticky-side" aria-label="Maintenance gate live preview">
                <div className="ss-preview-controls">
                  <span>Gate preview mode</span>
                  <div className="ss-segmented" role="group" aria-label="Gate preview mode">
                    <button
                      type="button"
                      aria-pressed={!simulateGate}
                      onClick={() => setSimulateGate(false)}
                    >
                      Reflect switches
                    </button>
                    <button
                      type="button"
                      aria-pressed={simulateGate}
                      onClick={() => setSimulateGate(true)}
                    >
                      Simulate gate
                    </button>
                  </div>
                </div>

                <div className="ss-preview-frame-shell">
                  <WebsitePreviewFrame
                    title="/coming-soon · Visitor gate"
                    mobile={previewMobile}
                    onMobileChange={setPreviewMobile}
                    dirty={isDirty}
                    readOnly
                    height={560}
                  >
                    <ComingSoon isPreview previewSettings={previewSettings} />
                  </WebsitePreviewFrame>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: NAVIGATION & LANDING */}
          {activeTab === 'navigation' && (
            <div
              id="ss-panel-navigation"
              role="tabpanel"
              aria-labelledby="ss-tab-navigation"
              className="ss-grid"
            >
              <div className="ss-stack">
                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <Compass size={16} />
                      </span>
                      <div>
                        <h2>Default Landing Route</h2>
                        <p>Choose which page opens first when new public visitors arrive at the root URL.</p>
                      </div>
                    </div>
                  </header>
                  <div className="ss-card-body">
                    <div className="ss-field">
                      <label htmlFor={landingSelectId}>Default entry page</label>
                      <div className="ss-select-wrap">
                        <select
                          id={landingSelectId}
                          className="ss-select"
                          aria-describedby={`${landingSelectId}-hint`}
                          value={local.default_landing_page}
                          onChange={e => updateDraft(s => ({ ...s, default_landing_page: e.target.value }))}
                        >
                          {VISIBLE_PUBLIC_PAGES.map(page => (
                            <option key={page.key} value={page.path}>
                              {page.label} ({page.path}){page.path === '/' ? ' — Default' : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="ss-select-chevron" aria-hidden="true" />
                      </div>
                      <p id={`${landingSelectId}-hint`} className="ss-field-hint">
                        Redirects first-visit public traffic on <code>/</code> to this route once per session. Admin sessions are unaffected.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <GripVertical size={16} />
                      </span>
                      <div>
                        <h2>Public Navigation Order</h2>
                        <p>Drag items or use arrow buttons to reorder links in the public header and workspace directory.</p>
                      </div>
                    </div>
                    {isCustomOrder && (
                      <button type="button" className="ss-btn-secondary" onClick={resetNavOrder}>
                        <RotateCcw size={13} aria-hidden="true" />
                        Reset default
                      </button>
                    )}
                  </header>
                  <div className="ss-card-body">
                    <div className="ss-nav-list" role="list" aria-label="Public navigation links order">
                      {effectiveNavOrder.map((key, idx) => {
                        const page = VISIBLE_PUBLIC_PAGES.find(p => p.key === key);
                        if (!page) return null;
                        const isLanding = local.default_landing_page === page.path;
                        const isLocked = !!local.locked_pages?.[page.key];
                        return (
                          <div
                            key={page.key}
                            role="listitem"
                            draggable
                            onDragStart={e => {
                              setDragKey(page.key);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', page.key);
                            }}
                            onDragOver={e => {
                              e.preventDefault();
                              if (dragKey && dragKey !== page.key) setDropKey(page.key);
                            }}
                            onDragLeave={() => {
                              if (dropKey === page.key) setDropKey(null);
                            }}
                            onDrop={e => {
                              e.preventDefault();
                              const source = dragKey || e.dataTransfer.getData('text/plain');
                              reorderNavByKey(source, page.key);
                              setDragKey(null);
                              setDropKey(null);
                            }}
                            onDragEnd={() => {
                              setDragKey(null);
                              setDropKey(null);
                            }}
                            className={`ss-nav-item${dragKey === page.key ? ' is-dragging' : ''}${dropKey === page.key ? ' is-drop-target' : ''}`}
                          >
                            <span className="ss-drag-handle" aria-hidden="true" title="Drag to reorder">
                              <GripVertical size={15} />
                            </span>
                            <span className="ss-nav-rank">{String(idx + 1).padStart(2, '0')}</span>
                            <div className="ss-nav-info">
                              <strong>{page.label}</strong>
                              <code>{page.path}</code>
                            </div>
                            <div className="ss-nav-badges">
                              {isLanding && <span className="ss-mini-badge">Entry</span>}
                              {isLocked && <span className="ss-mini-badge is-locked">Locked</span>}
                            </div>
                            <div className="ss-nav-actions">
                              <button
                                type="button"
                                className="ss-icon-btn"
                                aria-label={`Move ${page.label} up`}
                                disabled={idx === 0}
                                onClick={() => moveNavItem(idx, 'up')}
                              >
                                <ArrowUp size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="ss-icon-btn"
                                aria-label={`Move ${page.label} down`}
                                disabled={idx === effectiveNavOrder.length - 1}
                                onClick={() => moveNavItem(idx, 'down')}
                              >
                                <ArrowDown size={14} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="ss-field-hint">
                      Reordering only arranges public navigation links. Student Dashboard, Admin, and Login links remain pinned at the end.
                    </p>
                  </div>
                </section>
              </div>

              {/* Sticky Visual Header Preview */}
              <aside className="ss-sticky-side" aria-label="Public navigation bar preview">
                <section className="ss-card">
                  <header className="ss-card-header">
                    <div className="ss-card-title">
                      <span className="ss-card-icon" aria-hidden="true">
                        <Globe size={16} />
                      </span>
                      <div>
                        <h2>Live Header Preview</h2>
                        <p>How visitors see your public navigation bar after saving.</p>
                      </div>
                    </div>
                  </header>
                  <div className="ss-card-body">
                    <div className="ss-navbar-mockup">
                      <div className="ss-navbar-mockup-bar">
                        <span className="ss-navbar-mockup-brand">RICORRENZA</span>
                        <span className="ss-navbar-mockup-tag">Public Header</span>
                      </div>
                      <div className="ss-navbar-mockup-links">
                        {effectiveNavOrder.map(key => {
                          const page = VISIBLE_PUBLIC_PAGES.find(p => p.key === key);
                          if (!page) return null;
                          const isLanding = local.default_landing_page === page.path;
                          const isLocked = !!local.locked_pages?.[page.key];
                          return (
                            <span
                              key={page.key}
                              className={`ss-mockup-link${isLanding ? ' is-landing' : ''}${isLocked ? ' is-locked' : ''}`}
                            >
                              {isLocked && <Lock size={10} aria-hidden="true" />}
                              {page.label}
                            </span>
                          );
                        })}
                        <span className="ss-mockup-link is-fixed">Student Login</span>
                        <span className="ss-mockup-link is-fixed">Login</span>
                      </div>
                      <p className="ss-navbar-mockup-note">
                        Highlighted link marks your current default landing page (<code>{local.default_landing_page}</code>).
                        Dashed links indicate pages with active maintenance locks.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}

          {/* TAB 3: PAGE LOCKS */}
          {activeTab === 'locks' && (
            <div id="ss-panel-locks" role="tabpanel" aria-labelledby="ss-tab-locks" className="ss-stack">
              <div className="ss-locks-toolbar">
                <div>
                  <strong>Page-Level Maintenance Locks</strong>
                  <p>
                    Restrict individual festival routes without taking the entire website offline. Admins bypass page locks automatically.
                  </p>
                </div>
                <div className="ss-toolbar-actions">
                  <button
                    type="button"
                    className="ss-btn-secondary"
                    disabled={activeLockedCount === 0}
                    onClick={() => setAllPageLocks(false)}
                  >
                    <Unlock size={14} aria-hidden="true" />
                    Unlock all
                  </button>
                  <button
                    type="button"
                    className="ss-btn-secondary"
                    disabled={activeLockedCount === VISIBLE_PUBLIC_PAGES.length}
                    onClick={() => setAllPageLocks(true)}
                  >
                    <Lock size={14} aria-hidden="true" />
                    Lock all
                  </button>
                </div>
              </div>

              <div className="ss-locks-grid">
                {VISIBLE_PUBLIC_PAGES.map(page => {
                  const Icon = page.icon;
                  const switchId = `${idPrefix}-lock-${page.key}`;
                  const isLocked = !!local.locked_pages?.[page.key];
                  const pageModeTimer = !!local.show_page_timers?.[page.key];
                  const timerExpiry = local.locked_pages_until?.[page.key];
                  const hasActiveTimer = !!timerExpiry && new Date(timerExpiry).getTime() > nowMs;

                  return (
                    <article key={page.key} className="ss-lock-card">
                      <div className="ss-lock-head">
                        <div className="ss-lock-identity">
                          <span className="ss-lock-icon" aria-hidden="true">
                            <Icon size={17} />
                          </span>
                          <div>
                            <label htmlFor={switchId} className="ss-lock-name">
                              {page.label}
                            </label>
                            <code className="ss-lock-route">{page.path}</code>
                          </div>
                        </div>

                        <input
                          id={switchId}
                          type="checkbox"
                          role="switch"
                          data-tone="warn"
                          className="ss-switch"
                          checked={isLocked}
                          onChange={e =>
                            updateDraft(s => ({
                              ...s,
                              locked_pages: { ...s.locked_pages, [page.key]: e.target.checked },
                            }))
                          }
                        />
                      </div>

                      <div className="ss-lock-status">
                        <span className={`ss-lock-pill${isLocked ? ' is-locked' : ''}`}>
                          {!isLocked ? (
                            <>
                              <Check size={12} aria-hidden="true" />
                              Open to visitors
                            </>
                          ) : !pageModeTimer ? (
                            <>
                              <InfinityIcon size={12} aria-hidden="true" />
                              Locked · Indefinite
                            </>
                          ) : hasActiveTimer ? (
                            <>
                              <Timer size={12} aria-hidden="true" />
                              Until {formatLocalTime(timerExpiry!)} ({formatRemainingDuration(timerExpiry, nowMs)})
                            </>
                          ) : (
                            <>
                              <Timer size={12} aria-hidden="true" />
                              Locked · Set timer below
                            </>
                          )}
                        </span>

                        <div className="ss-segmented" role="group" aria-label={`${page.label} lock duration mode`}>
                          <button
                            type="button"
                            aria-pressed={!pageModeTimer}
                            onClick={() =>
                              updateDraft(s => ({
                                ...s,
                                show_page_timers: { ...s.show_page_timers, [page.key]: false },
                              }))
                            }
                          >
                            Forever
                          </button>
                          <button
                            type="button"
                            aria-pressed={pageModeTimer}
                            onClick={() =>
                              updateDraft(s => ({
                                ...s,
                                show_page_timers: { ...s.show_page_timers, [page.key]: true },
                              }))
                            }
                          >
                            Timer
                          </button>
                        </div>
                      </div>

                      {pageModeTimer && (
                        <div className="ss-lock-timer-bar">
                          <span>
                            {hasActiveTimer
                              ? `Unlocks at ${formatLocalTime(timerExpiry!)}`
                              : 'Choose duration (auto-locks page):'}
                          </span>
                          <button
                            type="button"
                            className="ss-timer-chip"
                            onClick={() => adjustPageTimer(page.key, -5)}
                            aria-label={`Subtract 5 minutes from ${page.label} lock`}
                          >
                            <Minus size={11} aria-hidden="true" />
                            5m
                          </button>
                          <button
                            type="button"
                            className="ss-timer-chip"
                            onClick={() => adjustPageTimer(page.key, 5)}
                            aria-label={`Add 5 minutes to ${page.label} lock`}
                          >
                            <Plus size={11} aria-hidden="true" />
                            5m
                          </button>
                          <button
                            type="button"
                            className="ss-timer-chip"
                            onClick={() => adjustPageTimer(page.key, 15)}
                            aria-label={`Add 15 minutes to ${page.label} lock`}
                          >
                            +15m
                          </button>
                          <button
                            type="button"
                            className="ss-timer-chip"
                            onClick={() => adjustPageTimer(page.key, 60)}
                            aria-label={`Add 1 hour to ${page.label} lock`}
                          >
                            +1h
                          </button>
                          {hasActiveTimer && (
                            <button
                              type="button"
                              className="ss-timer-chip is-danger"
                              onClick={() => clearPageTimer(page.key)}
                              aria-label={`Clear ${page.label} timer`}
                            >
                              <X size={11} aria-hidden="true" />
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </fieldset>

        {/* Floating Sticky Save Bar */}
        <footer className="ss-save-bar">
          <div className="ss-save-summary">
            <span className={`ss-save-icon${isDirty ? ' is-dirty' : ''}`} aria-hidden="true">
              {isDirty ? <Timer size={16} /> : <CheckCircle2 size={16} />}
            </span>
            <div>
              <strong>
                {saving
                  ? 'Saving site settings…'
                  : isDirty
                    ? `${changes.length} unsaved ${changes.length === 1 ? 'change' : 'changes'}`
                    : 'All changes saved'}
              </strong>
              <small>
                {isDirty
                  ? 'Draft kept in this browser until published'
                  : savedAt
                    ? `Last published at ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Live configuration matches database'}
              </small>
            </div>
            {isDirty && (
              <button
                type="button"
                className="ss-link-btn"
                onClick={() => setShowChanges(prev => !prev)}
              >
                {showChanges ? 'Hide diff' : 'Review changes'}
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="ss-save-actions">
            <button
              type="button"
              className="ss-btn-ghost"
              disabled={saving || !isDirty}
              onClick={discardChanges}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Discard
            </button>
            <button
              type="submit"
              className="ss-btn-primary"
              disabled={saving || !isDirty}
            >
              <Save size={14} aria-hidden="true" />
              {saving ? 'Saving…' : requiresApproval ? 'Submit for approval' : 'Save settings'}
              <kbd>⌘ S</kbd>
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default SiteSettingsPanel;
