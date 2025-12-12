import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, Calendar, MapPin, Clock, Users, UserPlus, FileText, AlertCircle, Zap, Phone } from 'lucide-react';
import WatchLiveButton from '../components/WatchLiveButton';
import { LIVE_LEAD_MINUTES } from '../config/liveStream';
import { parseEventDateTime } from '../utils/eventTime';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { RegistrationModal } from '../components/RegistrationModal';
import { HeroBackground } from '../components/HeroBackground';
import PreserveNewlines from '../components/PreserveNewlines';
import ScrollHint from '../components/ScrollHint';
import { SEO } from '../components/SEO';

// Preload Component for Hero Carousel Media (Performance Optimization)
const HeroMediaPreloader: React.FC<{ events: any[] }> = React.memo(({ events }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      {events.slice(0, 4).map((event) => (
        <React.Fragment key={`preload-${event.id}`}>
          {event.poster_url && (
            <link rel="preload" as="image" href={event.poster_url} />
          )}
          {event.motion_poster_url && (
            <link rel="preload" as="video" href={event.motion_poster_url} />
          )}
        </React.Fragment>
      ))}
    </>,
    document.head
  );
});



export const Events: React.FC = () => {
  const { events, eventCoordinators, eventWinners = [], connectionStatus, lastError, refreshAll, siteSettings, adminUsers, updateEvent } = useData() as any;
  const { user } = useAuth();

  const isOwner = (() => {
    try {
      // Only check owner status if user is logged in
      if (!user) return false;
      
      const uid = user.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.is_primary));
    } catch { return false; }
  })();
  const getCoordinators = (eventId: number) => (eventCoordinators as any)?.filter((c: any) => c.event_id === eventId) || [];
  const eventsRef = useRef<HTMLDivElement>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const registerIdParam = searchParams.get('register');
  const registrationEventId = registerIdParam ? parseInt(registerIdParam, 10) : 0;
  const registrationEvent = events.find((e: any) => e.id === registrationEventId);
  
  const registrationModal = React.useMemo(() => ({
    isOpen: !!registrationEvent,
    eventId: registrationEventId,
    eventTitle: registrationEvent?.title || ''
  }), [registrationEvent, registrationEventId]);

  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [glitchActive, _setGlitchActive] = useState(false);

  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [rulesModalFor, setRulesModalFor] = useState<number | null>(null);
  const scrollSaveRef = useRef<number>(0);

  // Restore scroll position when closing the rules modal (nuclear optimization recovery)
  React.useLayoutEffect(() => {
    // Only restore if we have a saved position and just closed the modal (value is null)
    if (rulesModalFor === null && scrollSaveRef.current > 0) {
      // Restore synchronously to block paint and prevent "jump" to top
      window.scrollTo({ top: scrollSaveRef.current, behavior: 'instant' });
    }
  }, [rulesModalFor]);

  const openRulesModal = (id: number) => {
    // Capture/Save current scroll position before hiding content
    scrollSaveRef.current = window.scrollY;
    setRulesModalFor(id);
  };
  const closeRulesModal = () => setRulesModalFor(null);

  
  // Timestamp ticker removed since left-side LIVE/Opens-in pill is suppressed when watch-live exists

  // Events that are actually shown (respecting visibility flag)
  // Visible events (public view). If manual ordering (display_order) exists, prefer that ordering ascending.
  const visibleEvents = React.useMemo(() => {
    const base = (events as any[]).filter((e: any) => e.visible !== false);
    const hasManual = base.some((e: any) => e.display_order != null);
    if (hasManual) {
      return [...base].sort((a: any, b: any) => {
        const da = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const db = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        // Stable fallback by created_at then id
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (ca !== cb) return ca - cb;
        return a.id - b.id;
      });
    }
    // No manual order yet → show newest first (created_at descending)
    return [...base].sort((a: any, b: any) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (at !== bt) return bt - at; // descending
      return b.id - a.id; // newer id first as tie-breaker
    });
  }, [events]);

  // Show a one-time mobile scroll hint near the top of the Events page
  // The ScrollHint component handles its own localStorage state and will
  // hide itself after the user scrolls/touches once.

  // Build the full category list from ALL events (even hidden) so owner-created
  // categories appear in the filter even if no event is currently visible.
  // - Trim whitespace
  // - De-duplicate in a case-insensitive way while preserving first-seen casing
  const allCategoriesMap = new Map<string, string>();
  // Only include categories present on the events that are actually visible to users.
  // This prevents categories added elsewhere (e.g. gallery) from showing up in the
  // Events filter when there are no corresponding event cards.
  (visibleEvents as any[]).forEach((e: any) => {
    const raw = e?.category;
    if (raw == null) return;
    const trimmed = String(raw).trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!allCategoriesMap.has(key)) allCategoriesMap.set(key, trimmed);
  });
  const allCategories = Array.from(allCategoriesMap.values());
  const categories = ['All', ...allCategories];

  // Structured rules helpers (mirror of admin logic)
  type RuleBlock = { kind: 'points'; style?: 'bullet' | 'number'; title?: string; items: string[] };
  type RuleSection = { heading?: string; blocks?: RuleBlock[] };
  type RuleSectionV1 = { heading?: string; subheading?: string; points?: string[] };
  const STRUCTURED_MARK = '__SR__';
  const isStructuredRules = (rules: string[] | null | undefined): boolean => Array.isArray(rules) && rules.length === 1 && typeof rules[0] === 'string' && rules[0].startsWith(STRUCTURED_MARK);
  const normalizeV1toV2 = (list: RuleSectionV1[]): RuleSection[] => (list || []).map((s) => ({ heading: s.heading, blocks: [ ...(s.points && s.points.length ? [{ kind: 'points', style: 'number', title: s.subheading, items: s.points }] as RuleBlock[] : []) ] }));
  const unpackStructured = (rules: string[] | null | undefined): RuleSection[] => {
    try {
      if (!isStructuredRules(rules)) return [];
      const s = (rules as string[])[0].slice(STRUCTURED_MARK.length);
      const parsed = JSON.parse(s);
      if (parsed?.v === 2 && Array.isArray(parsed?.sections)) return parsed.sections as RuleSection[];
      if (Array.isArray(parsed?.sections)) return normalizeV1toV2(parsed.sections as RuleSectionV1[]);
      return [];
    } catch { return []; }
  };
  const computeRulesCount = (rules: string[] | null | undefined): number => {
    if (!rules || rules.length === 0) return 0;
    try {
      if (isStructuredRules(rules)) {
        const sections = unpackStructured(rules);
        return sections.reduce((acc, sec) => {
          const blocks = sec.blocks || [];
          return acc + blocks.reduce((bacc, b) => bacc + (b.items ? b.items.length : 0), 0);
        }, 0);
      }
    } catch (e) {
      // fall through
    }
    return (rules || []).filter((r) => !!String(r).trim()).length;
  }
  



  // Tap-triggered sheen on touch devices (short once-off)
  useEffect(() => {
    const supportsTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!supportsTouch) return;
    const cards = Array.from(document.querySelectorAll('.tilt-card')) as HTMLElement[];
    const handler = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      if (!el) return;
      el.classList.add('sheen');
      setTimeout(() => el.classList.remove('sheen'), 700);
    };
    cards.forEach((el) => el.addEventListener('click', handler, { passive: true }));
    return () => cards.forEach((el) => el.removeEventListener('click', handler as EventListener));
  }, []);




  const openRegistration = (eventId: number) => {
    // Haptic feedback for "button press" feel
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50); // Short buzz
    }
    
    // Open modal immediately - speedramp removed for performance
    const newParams = new URLSearchParams(searchParams);
    newParams.set('register', eventId.toString());
    setSearchParams(newParams, { replace: true });
  };
  const closeRegistration = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('register');
    setSearchParams(newParams, { replace: true });
  };
  const toggleRules = (id: number) => setExpandedRules((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlip = (id: number) => setFlippedCards((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // removed clipboard/share logic per updated UX (View-only)
  // getCategoryColor removed - category pill now uses glass-style across pages

  // Site-wide poster fit preference: 'contain' (default) or 'cover'
  const posterFit: 'contain' | 'cover' = ((siteSettings as any)?.events_poster_fit === 'cover' ? 'cover' : 'contain');

  // Events filtered for current selected category
  const filteredEvents = React.useMemo(() => {
    try {
      if (!visibleEvents || !Array.isArray(visibleEvents)) return [];
      if (!selectedCategory || selectedCategory === 'All') return visibleEvents;
      const key = String(selectedCategory).trim().toLowerCase();
      return (visibleEvents as any[]).filter((e: any) => String(e?.category ?? '').trim().toLowerCase() === key);
    } catch (err) { return visibleEvents || []; }
  }, [visibleEvents, selectedCategory]);

  // Soft perspective tilt on hover for desktop/fine pointers
  // MOVED HERE: to access 'filteredEvents' for dependency
  useEffect(() => {
    const supportsTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsTilt) return;
    const maxTilt = 12; // degrees (increase for more depth)
    
    // Slight timeout to ensure DOM is updated after filter change
    const timer = setTimeout(() => {
        const cards = Array.from(document.querySelectorAll('.tilt-card')) as HTMLElement[];
    
        const move = (el: HTMLElement, e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
          const py = (e.clientY - rect.top) / rect.height - 0.5; // -0.5..0.5
          const rx = Math.max(-maxTilt, Math.min(maxTilt, -py * maxTilt * 2));
          const ry = Math.max(-maxTilt, Math.min(maxTilt, px * maxTilt * 2));
          el.style.setProperty('--rx', `${rx}deg`);
          el.style.setProperty('--ry', `${ry}deg`);
        };
        const leave = (el: HTMLElement) => {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
        };
    
        // Re-attach event listeners on cards when they change
        const handlers: Array<{ el: HTMLElement; onMove: (e: MouseEvent) => void; onLeave: () => void }> = [];
        cards.forEach((el) => {
          const onMove = (e: MouseEvent) => move(el, e);
          const onLeave = () => leave(el);
          el.addEventListener('mousemove', onMove);
          el.addEventListener('mouseleave', onLeave);
          handlers.push({ el, onMove, onLeave });
        });
        
        // Cleanup function needs to be stored or handled by ref if we used timer... 
        // But simplifying: just local var won't work for cleanup if effect unmounts before timer.
        // Let's use standard effect logic without complex cleanup for now since this component mounts once mostly.
        // Actually, to correctly clean up listener attached inside timeout, we need a ref or simpler logic.
        // Simplified: Just run immediate. React usually commits DOM before effect.
    }, 100);

    // To properly clean up listeners attached asynchronously, we'd need a mutable ref tracking them.
    // For now, let's revert to synchronous attachment but assume React render is done.
    const cards = Array.from(document.querySelectorAll('.tilt-card')) as HTMLElement[];
    const move = (el: HTMLElement, e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
          const py = (e.clientY - rect.top) / rect.height - 0.5; // -0.5..0.5
          const rx = Math.max(-maxTilt, Math.min(maxTilt, -py * maxTilt * 2));
          const ry = Math.max(-maxTilt, Math.min(maxTilt, px * maxTilt * 2));
          el.style.setProperty('--rx', `${rx}deg`);
          el.style.setProperty('--ry', `${ry}deg`);
    };
    const leave = (el: HTMLElement) => {
          el.style.setProperty('--rx', '0deg');
          el.style.setProperty('--ry', '0deg');
    };
    const handlers: Array<{ el: HTMLElement; onMove: (e: MouseEvent) => void; onLeave: () => void }> = [];
    cards.forEach((el) => {
          const onMove = (e: MouseEvent) => move(el, e);
          const onLeave = () => leave(el);
          el.addEventListener('mousemove', onMove);
          el.addEventListener('mouseleave', onLeave);
          handlers.push({ el, onMove, onLeave });
    });
    return () => {
        clearTimeout(timer);
        handlers.forEach(({ el, onMove, onLeave }) => {
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('mouseleave', onLeave);
        });
    };
  }, [flippedCards, filteredEvents]); // Re-run if cards change (e.g., flip or filter)

  // DEBUG: log counts to help diagnose missing event cards
  React.useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[Events debug] events:', Array.isArray(events) ? events.length : events, 'visibleEvents:', Array.isArray(visibleEvents) ? visibleEvents.length : visibleEvents, 'filteredEvents:', Array.isArray(filteredEvents) ? filteredEvents.length : filteredEvents, 'selectedCategory:', selectedCategory);
    } catch (err) {}
  }, [events, visibleEvents, filteredEvents, selectedCategory]);

  // Reveal-on-scroll observer for Events page (ensure .scroll-animate elements become visible)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Quick debug override: allow forcing all cards visible via URL param
      // Example: /events?debug_force_cards=1
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug_force_cards') === '1') {
          document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
          return;
        }
      } catch (e) {
        // ignore param parse errors
      }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      const attach = () => {
        const nodes = document.querySelectorAll('.scroll-animate');
        nodes.forEach((el) => {
          const node = el as HTMLElement & { __observed?: boolean };
          if (!node.__observed) {
            observer.observe(node);
            node.__observed = true;
          }
        });
      };
      attach();

      // Immediately make visible any nodes already inside the viewport so
      // returning to this route doesn't show a black/empty screen while the
      // IntersectionObserver settles. We use a generous threshold so large
      // hero elements become visible right away.
      try {
        const nodesNow = Array.from(document.querySelectorAll('.scroll-animate')) as HTMLElement[];
        const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
        nodesNow.forEach((n) => {
          const r = n.getBoundingClientRect();
          // If the element is mostly within the viewport (top less than 90% viewport)
          if (r.top < viewportH * 0.9) {
            n.classList.add('animate-in');
            try { (n as any).__observed = true; } catch {}
          }
        });
      } catch (e) {
        /* ignore */
      }
      const t1 = setTimeout(attach, 100);
      const t2 = setTimeout(attach, 300);

      const safety = setTimeout(() => {
        document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
      }, 1500);

      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); observer.disconnect(); };
    } catch (err) {
      // if IntersectionObserver not supported, fall back to making elements visible
      document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in'));
    }

  }, [events.length, filteredEvents.length, selectedCategory]);

  // SMART VIDEO AUTOPLAY OBSERVER
  // Watches .smart-video elements and plays/pauses them based on visibility to save resources
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    
    // throttle play/pause actions to prevent rapid toggling
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        // Only autoplay if it has the data-autoplay flag (checked by our renderer)
        if (entry.isIntersecting) {
            // STRICT CHECK: Only play if data-autoplay is explicitly true
            if (video.dataset.autoplay === 'true') {
                if (video.paused) {
                    const p = video.play();
                    if (p !== undefined) {
                        p.catch(() => { /* Auto-play was prevented, ignore */ });
                    }
                }
            }
        } else {
            // Pause
            if (!video.paused) {
                video.pause();
            }
        }
      });
    }, { threshold: 0.5 }); // 50% visible to play

    const attachVideos = () => {
        const vids = document.querySelectorAll('video.smart-video');
        vids.forEach(v => videoObserver.observe(v));
    };

    // Attach initially and after potential re-renders (short timeouts)
    attachVideos();
    const t = setTimeout(attachVideos, 500);
    
    // SECONDARY OBSERVER: SMART PRELOAD BUFFER
    // Watches just ahead of viewport to preload videos before they are played
    const preloadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const v = entry.target as HTMLVideoElement;
          if (v.preload !== 'auto') {
            v.preload = 'auto'; // Trigger buffer
            preloadObserver.unobserve(v); // One-time action
          }
        }
      });
    }, { rootMargin: '600px 0px 600px 0px' }); // One screen height ahead/behind

    const attachPreload = () => {
      const vids = document.querySelectorAll('video.smart-video');
      vids.forEach(v => preloadObserver.observe(v));
    };
    attachPreload();
    const tPre = setTimeout(attachPreload, 500);

    return () => {
        clearTimeout(t);
        clearTimeout(tPre);
        videoObserver.disconnect();
        preloadObserver.disconnect();
    };
  }, [events.length, filteredEvents.length, selectedCategory, flippedCards]); // Re-attach when list changes



  // Reset UI state when category changes to avoid empty-looking UI due to flipped/expanded states
  useEffect(() => {
    setExpandedRules(new Set());
    setFlippedCards(new Set());
  }, [selectedCategory]);

  // Helper: countdown string for an event's open time
  const getCountdown = (e: any): string | null => {
    if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
    const openAt = new Date(e.registration_opens_at).getTime();
    if (Number.isNaN(openAt)) return null;
    const now = Date.now();
    const diff = openAt - now;
    if (diff <= 0) return 'now';
    const d = Math.floor(diff / (24*60*60*1000));
    const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
    const m = Math.floor((diff % (60*60*1000)) / (60*1000));
    const s = Math.floor((diff % (60*1000)) / 1000);
    const parts = [] as string[];
    if (d) parts.push(`${d}d`);
    if (h || parts.length) parts.push(`${h}h`);
    if (m || parts.length) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  // Tick per-second to refresh countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % 1_000_000), 1000);
    return () => clearInterval(t);
  }, []);

  // Helpers to gate registration behind the timer
  const getOpenAtMs = (e: any): number | null => {
    if (!e?.registration_timer_enabled || !e?.registration_opens_at) return null;
    const ts = new Date(e.registration_opens_at).getTime();
    return Number.isNaN(ts) ? null : ts;
  };
  const OPEN_GRACE_MS = 1000; // allow 1s grace around boundary for device clock drift
  const getSecondsToOpen = (e: any): number | null => {
    const openAt = getOpenAtMs(e);
    if (openAt == null) return null;
    const diff = openAt - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 1000);
  };
  const getOpensAtTooltip = (e: any): string => {
    const iso = e?.registration_opens_at as string | null | undefined;
    if (!iso) return 'Opens at —';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Opens at —';
    const ist = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const local = d.toLocaleString();
    const utc = d.toUTCString();
    return `Opens at — IST: ${ist} • Local: ${local} • UTC: ${utc} • Note: countdown uses your device time`;
  };

  // Soft palette for last-10s countdown (not too bright), with colored glow
  const COUNTDOWN_PALETTE = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f87171', '#93c5fd', '#c084fc', '#38bdf8'];
  const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace('#','');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const getCountdownStylesForSecs = (secs: number | null | undefined) => {
    const s = Math.max(1, Math.min(10, Number(secs) || 10));
    const idx = (10 - s) % COUNTDOWN_PALETTE.length; // vary color each second as it counts down
    const color = COUNTDOWN_PALETTE[idx];
    const glow = hexToRgba(color, 0.35);
    const filter = `drop-shadow(0 10px 24px rgba(0,0,0,0.65)) drop-shadow(0 0 18px ${glow})`;
    return { color, filter };
  };

  const isLastTenSeconds = (e: any): boolean => {
    const secs = getSecondsToOpen(e);
    return typeof secs === 'number' && secs >= 1 && secs <= 10 && isBeforeOpen(e);
  };
  const isBeforeOpen = (e: any): boolean => {
    const openAt = getOpenAtMs(e);
    if (openAt == null) return false;
    return Date.now() < openAt;
  };
  const canRegisterNow = (e: any): boolean => {
    // Allow registration if either:
    // 1) Admin has opened registration (registration_open true) — overrides timer immediately, OR
    // 2) The timer has reached/passed the open time (immediate open at boundary even if flag hasn't toggled yet)
    if (e?.registration_open) return true;
    const openAt = getOpenAtMs(e);
    const isTimerOpenWithGrace = openAt != null ? Date.now() + OPEN_GRACE_MS >= openAt : false;
    return isTimerOpenWithGrace;
  };

  // Whether to show on-page debug panels: ONLY when explicit debug_owner=1 URL param is present
  const debugOwnerParam = (() => { try { return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug_owner') === '1'; } catch { return false; } })();
  const showDebugPanel = debugOwnerParam;

  // mapsUrlFor helper removed (we compute inline where needed)

  // Helper to check if a field is yet to be announced
  const getFieldDisplay = (value: string | null | undefined): { text: string; isUnannounced: boolean } => {
    if (!value || !value.trim()) {
      return { text: '- Yet to be announced', isUnannounced: true };
    }
    const trimmed = value.trim();
    // Check for common placeholder values
    const placeholders = ['-', '—', 'tba', 't.b.a', 'to be announced', 'tbd', 'to be decided', 'na', 'n/a', 'not available'];
    if (placeholders.includes(trimmed.toLowerCase())) {
      return { text: '- Yet to be announced', isUnannounced: true };
    }
    return { text: trimmed, isUnannounced: false };
  };

  // Motion poster carousel for Hero Section (True 3D Vertical Ring)
  const motionPosterEvents = React.useMemo(() => {
    let base = (events as any[]).filter((e: any) => e.motion_poster_url && e.visible !== false);
    if (base.length === 0) return [];
    // Ensure we have enough items for a nice cylinder shape (min 6 faces)
    // If fewer, duplicate them
    while (base.length < 6) {
      base = [...base, ...base];
    }
    // Cap at a reasonable number to prevent performance issues if many events exist
    return base.slice(0, 12);
  }, [events]);
  
  const [rotationIndex, setRotationIndex] = useState(0); 
  const [isZoomed, setIsZoomed] = useState(false); // State for "Fit to Screen" mode
  const [transitionDuration, setTransitionDuration] = useState(3000); // Dynamic duration

  useEffect(() => {
    if (motionPosterEvents.length === 0) return;
    
    // Cycle Timing (Total ~10s) - Adjusted to safely fit 5s videos:
    // 0ms: Set Slow Duration (3s) -> Trigger Spin (+2/3 items)
    // 3200ms: Set Fast Duration (1.5s) -> Trigger Zoom In
    // 4700ms: Fully Zoomed (Video plays clearly)
    // 10000ms: Cycle Repeats (Trigger Zoom Out / Spin)
    // "Clear View" Duration: 10000 - 4700 = 5300ms (~5.3s) -> Perfect for 4-5s videos.
    
    const cycleDuration = 10000;
    
    const rotateInterval = setInterval(() => {
      // 1. Prepare for Spin (Zoom Out ensured, Slow Duration)
      setIsZoomed(false);
      setTransitionDuration(3000);
      
      // Randomly rotate 2 or 3 items to give a "spinning drum" feel
      const randomSteps = 2 + Math.floor(Math.random() * 2); 
      setRotationIndex(prev => prev + randomSteps);

      // 2. Schedule Zoom In after rotation finishes
      setTimeout(() => {
        setTransitionDuration(1500); // Faster for the "punch" in
        // Small delay to let state apply before triggering transform? 
        // React batching might require a tick, but usually fine.
        setIsZoomed(true);
      }, 3200); 

    }, cycleDuration);

    // Initial Zoom trigger on mount
    const initialZoomTimeout = setTimeout(() => {
        setTransitionDuration(1500);
        setIsZoomed(true);
    }, 1000);

    return () => {
      clearInterval(rotateInterval);
      clearTimeout(initialZoomTimeout);
    };
  }, [motionPosterEvents.length]);

  // Effect to manage Hero Video Playback: Only play the ACTIVE face, pause others
  useEffect(() => {
    if (motionPosterEvents.length === 0) return;
    const activeIdx = rotationIndex % motionPosterEvents.length;
    
    motionPosterEvents.forEach((ev: any, idx: number) => {
       const vid = document.getElementById(`hero-video-${ev.id}-${idx}`) as HTMLVideoElement;
       if (!vid) return;
       
       if (idx === activeIdx) {
          // Play active
          vid.play().catch(() => {});
       } else {
          // Pause others to save resources
          vid.pause();
       }
    });

  }, [rotationIndex, motionPosterEvents]);

  // Cylinder Math
  const faceCount = motionPosterEvents.length;
  // Use a fixed virtual height for the "cards" on the ring.
  // We'll use a value relative to viewport or fixed pixels.
  // 58vh height faces
  const faceHeight = 58; // vh
  const faceTitle = 360 / faceCount;
  // radius = (w / 2) / tan(theta/2) -> here h/2 for vertical
  // We use a slight multiplier (1.1) to push them out a bit more for spacing
  const radius = Math.round(((faceHeight / 2) / Math.tan(Math.PI / faceCount)) * 1.5); 

  return (
    <div className="cyberpunk-theme min-h-screen" style={{ overscrollBehaviorY: 'contain' }}>
      <SEO 
        title="Events" 
        description="Explore the diverse range of cultural, technical, and sports events at RICORRENZA 2026." 
        canonical="https://ricorrenza.fun/events" 
      />
      {/* NUCLEAR OPTIMIZATION: If rules modal is open, completely HIDE the main page content to prevent crash. 
          The modal uses a Portal so it will still show. */}
      <div className={rulesModalFor ? 'invisible' : ''}>
      <ScrollHint />
      {/* Preload hero carousel media for smooth experience */}
      <HeroMediaPreloader events={motionPosterEvents} />

      {/* Connection issues are surfaced in Admin only to avoid alarming public users */}
      

      <div ref={(el) => {
        // Pausal Observer for Hero Animation
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) => {
           // If hero is < 10% visible, we assume user scrolled past it.
           // Pause the rotation/videos to save massive GPU power.
           const isVisible = entry.isIntersecting;
           // We use a CSS class or React state to pause.
           // React state might trigger re-render of the whole heavy list, so CSS variable or class on container is cheaper.
           if (isVisible) {
             el.classList.remove('paused-animations');
             // Resume videos
             el.querySelectorAll('video').forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
           } else {
             el.classList.add('paused-animations');
             // Pause videos
             el.querySelectorAll('video').forEach(v => { try { v.pause() } catch {} });
           }
        }, { threshold: 0.1 }); // 10% visibility threshold
        observer.observe(el);
        // cleanup handled by React ref callback behavior (called with null on unmount) providing a new closure isn't created every render.
        // For safety, we just attach once.
      }} className="hero-section-wrapper">

      <section className="hero-section relative h-[80vh] md:min-h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
          <div className="absolute inset-0 z-0 bg-black">
          
          {/* Default Hero Background (always rendered as base/fallback) */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${motionPosterEvents.length > 0 ? 'opacity-0' : 'opacity-100'}`}>
             <HeroBackground pageKey="events" />
          </div>

          {/* 3D Rotating Drum Container - UNMOUNT/HIDE when modal is open to save GPU */ }
          {/* Also hidden via CSS when .paused-animations parent class is present to stop layout thrashing if completely removed, but we just pause animations here. */}
          {/* CRITICAL OPTIMIZATION: Also unmount when 'rulesModalFor' is active (reading rules) to prevent crash on mobile */}
          {motionPosterEvents.length > 0 && !registrationModal.isOpen && !rulesModalFor && (
            <div 
              className="absolute top-1/2 left-1/2 w-[80vw] -ml-[40vw] md:w-[360px] md:-ml-[180px] h-[58vh] -mt-[29vh] ease-in-out hero-3d-drum" 
              style={{
                transformStyle: 'preserve-3d',
                transitionProperty: 'transform',
                transitionDuration: `${transitionDuration}ms`,
                // Direct 3D: Just rotate on X axis (Vertical Drum)
                // No extra tilt, clean symmetric view.
                transform: `rotateX(${-rotationIndex * faceTitle}deg)`
              }}
            >
              {motionPosterEvents.map((ev: any, idx: number) => {
                // Calculate position for this face
                const angle = faceTitle * idx;
                const isActive = idx === rotationIndex % faceCount;
                
                // Zoom Logic
                // If active AND zoomed, we override the 3D cylinder transform to bring it "to camera"
                // We use a massive TranslateZ to bring it close, or Scale.
                // NOTE: In a true preserve-3d scene, scaling might clip if container isn't huge.
                // Translating on Z axis is often safer for "coming to camera".
                // Since our radius is ~40-100vh, we pull it forward by 'radius' + extra.
                
                const isItemZoomed = isActive && isZoomed;

                // Deterministic Glow Color Generator based on Event ID or Title
                // This ensures "change glow according to cards" as requested
                const getGlowStyle = (id: string | number) => {
                  const colors = [
                    'from-pink-600/60 to-purple-600/60',   // Default Neon
                    'from-cyan-500/60 to-blue-600/60',     // Cyber Blue
                    'from-green-500/60 to-emerald-600/60', // Toxic Green
                    'from-yellow-500/60 to-orange-600/60', // Solar Flare
                    'from-red-600/60 to-rose-600/60',      // Crimson
                    'from-violet-600/60 to-fuchsia-600/60',// Synthetic Violet
                    'from-teal-400/60 to-indigo-600/60',   // Ocean
                  ];
                  // Simple hash of the ID/String to pick a consistent color
                  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  return colors[hash % colors.length];
                };

                const glowGradient = getGlowStyle(ev.id || idx);

                return (
                  <div 
                    key={`hero-video-${ev.id}-${idx}`}
                    className="absolute inset-0 w-full h-full backface-hidden will-change-transform ease-in-out"
                    style={{
                      willChange: 'transform',
                      transitionProperty: 'transform',
                      transitionDuration: `${transitionDuration}ms`,
                      transform: isItemZoomed 
                        ? `rotateX(${angle}deg) translateZ(${radius + 50}vh) scale(1.45)` 
                        : `rotateX(${angle}deg) translateZ(${radius}vh)`,
                      height: '58vh', // Match container height
                      zIndex: isItemZoomed ? 100 : 0 // Ensure it sits on top when zoomed
                    }}
                  > 
                    <div className={`w-full h-full relative transition-all duration-1000 ${isActive ? 'opacity-100 scale-100' : 'opacity-70 scale-90 brightness-90' } ${isItemZoomed ? 'p-0' : 'p-2'}`}>
                      {/* Glow Effect for Active Item (Hidden when zoomed to avoid artifacting edges) */}
                      {isActive && !isItemZoomed && (
                        <div className={`absolute -inset-16 md:-inset-32 bg-gradient-to-r ${glowGradient} blur-[40px] md:blur-[80px] opacity-100 rounded-full animate-pulse z-[-1]`} />
                      )}
                      
                      <div className="relative w-full h-full overflow-hidden rounded-xl">
                        <video
                          id={`hero-video-${ev.id}-${idx}`}
                          className={`w-full h-full object-cover shadow-2xl transition-all duration-1000 ${isItemZoomed ? 'rounded-none border-0' : 'rounded-xl border-2 border-white/40'}`}
                          src={ev.motion_poster_url}
                          // Remove global autoPlay. Controlled by Side Effect below.
                          muted
                          loop
                          playsInline
                          preload="auto"
                          {...({ fetchpriority: "high" } as any)} // Hint browser to prioritize this hero content
                          poster={ev.image} 
                        />
                        
                        {/* Shine / Sheen Effect */}
                        {isActive && !isItemZoomed && (
                          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl">
                            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] animate-shine" />
                          </div>
                        )}
                      </div>

                      {/* Reflection Effect at bottom (Hide when zoomed) */}
                      {!isItemZoomed && (
                         <div className="absolute top-full left-0 w-full h-[60%] bg-gradient-to-b from-white/30 to-transparent transform scale-y-[-1] opacity-50 mask-image-gradient" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`} />
          {/* Dimming Overlay to decrease overall hero opacity/intensity per user request */}
          <div className="absolute inset-0 bg-black/60 z-5 pointer-events-none transition-opacity duration-1000" />
        </div>
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 text-pink-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Zap className="w-4 h-4 mr-2 animate-pulse" /> EVENTS 2026
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              <span className="neon-pink">EVENTS</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Experience the <span className="neon-blue glow-text">future</span> of innovation through our
              <span className="neon-purple glow-text"> cutting-edge events</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {/* Button Removed per user request */}
            </div>
          </div>
        </div>
      </section>
      <style>{`
          /* Optimization: When paused via IntersectionObserver, freeze animations to save CPU */
          .paused-animations * {
             animation-play-state: paused !important;
             transition: none !important;
          }
          .mask-image-gradient {
             -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
             mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
          }
          @keyframes shine {
            0% { left: -100%; opacity: 0; }
            50% { opacity: 0.5; }
            100% { left: 200%; opacity: 0; }
          }
          .animate-shine {
            animation: shine 3s infinite linear;
          }
          
          /* Aggressive Optimization: Flatten 3D elements when rules are open to prevent crashes */
          .disable-heavy-rendering .tilt-card,
          .disable-heavy-rendering .flip-3d,
          .disable-heavy-rendering .flip-3d-inner,
          .disable-heavy-rendering .flip-face,
          .disable-heavy-rendering .neon-anim-border {
             transform: none !important;
             filter: none !important;
             box-shadow: none !important;
             perspective: none !important;
             will-change: auto !important;
             transition: none !important;
             animation: none !important;
          }
          /* Hide videos completely in background to free GPU textures */
          .disable-heavy-rendering video {
             display: none !important;
          }
          /* Optionally hide the card content itself if needed, but keeping it visible (flat) is better UX so it doesn't flash white. 
             If crash persists, we can switch to visibility: hidden */
       `}</style>
      </div>

      {/* Winners Section moved below the events grid */}

      <section className="py-4 relative">
        <div className="container mx-auto px-4">
          {/* Debug: show owner/admin info when ?debug_owner=1 is present */}
          {new URLSearchParams(window.location.search).get('debug_owner') === '1' && (
            <div className="mb-4 p-3 rounded border border-yellow-400 bg-yellow-900/20 text-yellow-200 text-sm">
              <div className="font-medium">Owner debug</div>
              <div>isOwner: {String(isOwner)}</div>
              <div>user id: {user?.id ?? 'n/a'}</div>
              <div>user email: {user?.email ?? 'n/a'}</div>
              <details className="mt-2 p-2 bg-yellow-900/10 rounded">
                <summary className="cursor-pointer">adminUsers (truncated)</summary>
                <pre className="max-h-40 overflow-auto text-xs mt-2">{JSON.stringify(adminUsers?.slice(0, 20) ?? adminUsers, null, 2)}</pre>
              </details>
            </div>
          )}
          <div className="scroll-animate opacity-0 transform translate-y-10">
            <div className="flex justify-center mb-2">
              <div className="cyberpunk-card w-full md:max-w-5xl lg:max-w-6xl xl:max-w-7xl p-3 md:p-4">
                <div className="filter-row flex gap-2 md:gap-3 justify-start md:justify-center flex-nowrap overflow-x-auto max-w-full px-1 md:px-0">
                  {categories.map((category: string) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`filter-btn px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium transition-all duration-300 border-2 whitespace-nowrap hover-float ${selectedCategory === category ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500 shadow-lg shadow-pink-500/25' : 'text-gray-300 border-gray-600 hover:border-pink-500/50 hover:text-pink-400'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-4 relative">
        <div className="container mx-auto px-4" ref={eventsRef}>
              {showDebugPanel && (
                <div className="mb-6 p-3 rounded-lg bg-black/60 text-sm text-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Events debug</div>
                    <div className="text-xs text-gray-300">selected: {selectedCategory}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-200">
                    events: {Array.isArray(events) ? events.length : 'n/a'} • visible: {Array.isArray(visibleEvents) ? visibleEvents.length : 'n/a'} • filtered: {Array.isArray(filteredEvents) ? filteredEvents.length : 'n/a'}
                  </div>
                  {Array.isArray(filteredEvents) && filteredEvents.length > 0 ? (
                    <div className="mt-2 text-[13px] text-gray-300">First: {filteredEvents.slice(0,5).map((e:any)=>e.title).join(' • ')}</div>
                  ) : null}
                </div>
              )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event: any, index: number) => (
              <div id={`event-${event.id}`} key={`${selectedCategory}-${event.id}`} style={{ contain: 'paint layout' }}>
                <div className={`relative flip-3d neon-anim-border tilt-card ${flippedCards.has(event.id) ? 'is-flipped' : ''}`}>
                  <div className="flip-3d-inner">
                    <button
                      className={`flip-face flip-front relative group ${(event as any).watch_live_url ? 'no-front-overlay' : ''}`}
                      onClick={(e) => {
                        const btn = e.currentTarget as HTMLElement;
                        if (btn.dataset.suppressClick) {
                          // consume a suppressed click generated after a long-press preview
                          try { delete btn.dataset.suppressClick; } catch {}
                          return;
                        }
                        toggleFlip(event.id);
                      }}
                      aria-label={`Open details for ${event.title}`}
                      onMouseEnter={() => {
                        try {
                          // play on hover only when prefer_video is enabled and autoplay isn't forced
                          if ((event as any).prefer_video && !(event as any).motion_poster_autoplay) {
                            const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                            if (v) import('../utils/safePlay').then(({ default: safePlay }) => safePlay(v)).catch(() => { const p = v.play(); if (p) p.catch(() => {}); });
                          }
                        } catch (e) {}
                      }}
                      onMouseLeave={() => {
                        try {
                          if ((event as any).prefer_video && !(event as any).motion_poster_autoplay) {
                            const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                            if (v) {
                              v.pause();
                              try { v.currentTime = 0; } catch { /* ignore */ }
                            }
                          }
                        } catch (e) {}
                      }}
                      /* Touch behavior for owner-hover preview: on phones, allow owners who enabled owner_hover_reveal to
                         trigger the motion-poster on touchstart (play) and stop on touchend/move. We keep this gated so
                         regular users won't get touch-to-play behavior. */
                      onTouchStart={(e) => {
                        try {
                          if (!(isOwner && (event as any).owner_hover_reveal)) return;
                          const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                          const btn = e.currentTarget as HTMLElement;
                          if (v) {
                            import('../utils/safePlay').then(({ default: safePlay }) => safePlay(v)).catch(() => { const p = v.play(); if (p) p.catch(() => {}); });
                            // Suppress the following click that can fire after a long-press/touch on some devices
                            try { (btn as any).dataset.suppressClick = '1'; } catch {}
                            // clear suppress shortly after to allow normal clicks
                            setTimeout(() => { try { delete (btn as any).dataset.suppressClick; } catch {} }, 700);
                          }
                        } catch (err) {}
                      }}
                      onTouchEnd={() => {
                        try {
                          if (!(isOwner && (event as any).owner_hover_reveal)) return;
                          const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                          if (v) {
                            v.pause();
                            try { v.currentTime = 0; } catch {}
                          }
                        } catch (err) {}
                      }}
                      onTouchMove={() => {
                        try {
                          if (!(isOwner && (event as any).owner_hover_reveal)) return;
                          const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                          if (v) {
                            v.pause();
                            try { v.currentTime = 0; } catch {}
                          }
                        } catch (err) {}
                      }}
                    >
                      <div className="flip-front-media">
                        {/* Blurred cover layer to fill width while keeping main poster full (no crop) */}
                        <div className="poster-fill" style={{ backgroundImage: `url(${event.image})` }} />
                        {/* Main poster layer (contain or cover per setting) */}
                        <div className="poster-main">
                          <img
                            src={event.image}
                            alt={event.title}
                            loading={index < 6 ? 'eager' : 'lazy'}
                            decoding="async"
                            className="w-full h-full"
                            style={{ objectFit: posterFit }}
                          />
                        </div>
                      </div>
                      {/* Render motion poster video only when one of:
                          - motion_poster_autoplay (always show and autoplay),
                          - prefer_video (show on hover and play via JS),
                          - owner_hover_reveal (owner preview behavior).
                        Otherwise show only the static image (default behavior).
                      */}
                      {/* Always render video if URL exists to ensure preloading (cached for transition)
                          Control visibility via opacity/CSS instead of unmounting.
                          Prioritize loading for the first few items.
                      */}
                      {event.motion_poster_url ? (
                        <video
                          id={`event-video-${event.id}`}
                          className={`smart-video absolute inset-0 w-full h-full ${posterFit === 'cover' ? 'object-cover' : 'object-contain'} bg-black transition-opacity duration-300 front-video block ${ ((event as any).motion_poster_autoplay || (isOwner && (event as any).owner_hover_reveal)) ? 'opacity-90' : 'opacity-0 group-hover:opacity-90' }`}
                          src={event.motion_poster_url}
                          // Remove autoPlay, use data-autoplay for our observer to know intent
                          {...(((event as any).motion_poster_autoplay || (isOwner && (event as any).owner_hover_reveal)) ? { 'data-autoplay': 'true' } as any : {})}
                          muted
                          playsInline
                          loop
                          poster={event.image}
                          preload="auto"
                          {...(index < 6 ? { fetchpriority: "high" } as any : {})}
                        />
                      ) : null}

                      {isOwner && (
                        <div className="absolute top-2 left-2 z-30" onClick={(e)=>e.stopPropagation()}>
                          <label className="flex items-center text-xs bg-black/50 px-2 py-1 rounded text-white">
                            <input
                              type="checkbox"
                              checked={!!(event as any).owner_hover_reveal}
                              onChange={async (e) => {
                                try {
                                  await updateEvent(event.id, { owner_hover_reveal: e.target.checked } as any);
                                } catch (err) {
                                  console.error('Failed to update owner_hover_reveal', err);
                                  alert('Could not update preview setting.');
                                }
                              }}
                              className="mr-2"
                            />
                            Owner preview
                          </label>
                        </div>
                      )}
                    </button>
                      {/* Mobile Rules Modal - Bottom Sheet Style (Rewritten for stability) */}
                      {rulesModalFor != null && (() => {
                        const ev = filteredEvents.find((e: any) => e.id === rulesModalFor);
                        if (!ev || typeof document === 'undefined') return null;
                        const rulesUrl = (ev as any).rules_link || (ev as any).rules_url || (ev as any).rules_file_url || (ev as any).rules_drive_link || null;
                        
                        // Flatten rules for simple rendering
                        let ruleItems: string[] = [];
                        try {
                          if (isStructuredRules(ev.rules)) {
                            const sections = unpackStructured(ev.rules).slice(0, 10);
                            sections.forEach((sec) => {
                              if (String(sec.heading || '').trim()) ruleItems.push(`**${String(sec.heading)}**`);
                              (sec.blocks || []).slice(0, 10).forEach((b) => {
                                if (String(b.title || '').trim()) ruleItems.push(`*${String(b.title)}*`);
                                (b.items || []).slice(0, 30).forEach((item) => {
                                  ruleItems.push(typeof item === 'object' ? JSON.stringify(item) : String(item));
                                });
                              });
                            });
                          } else {
                            ruleItems = (ev.rules || []).slice(0, 50).map((r: any) => 
                              typeof r === 'object' ? JSON.stringify(r) : String(r)
                            );
                          }
                        } catch { ruleItems = ['Error loading rules']; }

                        return createPortal(
                          <div 
                            className="fixed inset-0 z-[9999] md:hidden"
                            style={{ touchAction: 'none' }}
                          >
                            {/* Backdrop - tap to close */}
                            <div 
                              className="absolute inset-0 bg-black/85"
                              onClick={closeRulesModal}
                              style={{ animation: 'fadeIn 150ms ease-out' }}
                            />
                            
                            {/* Bottom Sheet Container */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-[#111] rounded-t-3xl max-h-[80vh] flex flex-col"
                              style={{ 
                                animation: 'slideUp 200ms ease-out',
                                touchAction: 'pan-y'
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                              onTouchEnd={(e) => e.stopPropagation()}
                            >
                              {/* Drag Handle */}
                              <div className="flex justify-center py-3">
                                <div className="w-10 h-1 bg-gray-500 rounded-full" />
                              </div>
                              
                              {/* Header */}
                              <div className="px-5 pb-3 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white font-semibold text-base truncate pr-4">
                                  {ev.title} — Rules
                                </h3>
                                <button 
                                  onClick={closeRulesModal}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white text-lg"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                  ✕
                                </button>
                              </div>
                              
                              {/* Scrollable Content */}
                              <div 
                                className="flex-1 overflow-y-auto overscroll-contain px-5 py-4"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                              >
                                <ul className="list-disc list-outside ml-4 space-y-2.5 text-gray-200 text-[15px] leading-relaxed">
                                  {ruleItems.map((item, i) => {
                                    // Render headings differently
                                    if (item.startsWith('**') && item.endsWith('**')) {
                                      return <li key={i} className="list-none -ml-4 font-bold text-white mt-4 first:mt-0 text-base">{item.slice(2, -2)}</li>;
                                    }
                                    if (item.startsWith('*') && item.endsWith('*')) {
                                      return <li key={i} className="list-none -ml-4 font-semibold text-pink-300 mt-3 text-[15px]">{item.slice(1, -1)}</li>;
                                    }
                                    return <li key={i} className="text-gray-100">{item}</li>;
                                  })}
                                </ul>
                                
                                {/* PDF/Drive Link */}
                                {rulesUrl && (
                                  <a 
                                    href={rulesUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="mt-4 inline-flex items-center text-sm px-3 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Full Rules PDF
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <style>{`
                              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                              @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
                            `}</style>
                          </div>,
                          document.body
                        );
                      })()}

                    <div className="flip-face flip-back" onClick={() => toggleFlip(event.id)}>
                      {/* Back face Watch Live button (mirrors front face, 60m pre-live gating) */}
                      {(() => {
                        const wlu = (event as any).watch_live_url;
                        if (wlu) {
                          const dt = parseEventDateTime(event.date as any, event.time as any);
                          if (dt) {
                            return (
                              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-auto" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                                <WatchLiveButton
                                  url={wlu}
                                  startTime={dt.toISOString()}
                                  leadMinutes={LIVE_LEAD_MINUTES}
                                  forceLive={(event as any).registration_open || event.featured}
                                  size="xs"
                                  className=""
                                />
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                      <div className="h-full overflow-hidden flex flex-col">
                        <div className="p-6 overflow-y-auto flex-1">
                          <h3 className="text-xl font-bold text-white mb-3" style={{ transform: 'translateX(16px)', textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(103, 232, 249, 0.4)' }}>{event.title}</h3>
                          <PreserveNewlines text={event.description} className="text-sm sm:text-base text-gray-300 mb-4" />
                          <div className="space-y-2 mb-4">
                            {(() => {
                              const dateInfo = getFieldDisplay(event.date);
                              const timeInfo = getFieldDisplay(event.time);
                              const venueInfo = getFieldDisplay(event.venue);
                              return (
                                <>
                                  <div className="flex items-center text-sm text-gray-400">
                                    <Calendar size={16} className={`mr-2 ${dateInfo.isUnannounced ? 'text-amber-400' : 'text-blue-400'}`} />
                                    <span className={dateInfo.isUnannounced ? 'text-amber-400 font-medium' : 'text-gray-300'}
                                      style={dateInfo.isUnannounced 
                                        ? { filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' } 
                                        : { filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.3))' }}>
                                      {dateInfo.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-400">
                                    <Clock size={16} className={`mr-2 ${timeInfo.isUnannounced ? 'text-amber-400' : 'text-green-400'}`} />
                                    <span className={timeInfo.isUnannounced ? 'text-amber-400 font-medium' : 'text-gray-300'}
                                      style={timeInfo.isUnannounced 
                                        ? { filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' } 
                                        : { filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.3))' }}>
                                      {timeInfo.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-400">
                                    <MapPin size={16} className={`mr-2 ${venueInfo.isUnannounced ? 'text-amber-400' : 'text-purple-400'}`} />
                                    <span className={venueInfo.isUnannounced ? 'text-amber-400 font-medium' : 'text-gray-300'}
                                      style={venueInfo.isUnannounced 
                                        ? { filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' } 
                                        : { filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.3))' }}>
                                      {venueInfo.text}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                            {(event as any).participants && String((event as any).participants).trim() && String((event as any).participants).trim() !== '0' && (
                              <div className="flex items-center text-sm text-gray-400"><Users size={16} className="mr-2 text-pink-400" />{(event as any).participants} participants</div>
                            )}
                            {(() => {
                              const coords = getCoordinators(event.id).filter((c: any) => {
                                const n = String(c.name ?? '').trim();
                                const p = String(c.phone ?? '').trim();
                                if (!n && !p) return false;
                                if ((n === '0' || n === '-' || n === '—') && !p) return false;
                                return true;
                              });
                              if (coords.length > 0) {
                                return (
                                  <div className="mt-2 text-sm text-gray-300">
                                    <div className="font-semibold text-gray-200">Coordinators</div>
                                    <div className="text-gray-400 space-y-0.5">
                                      {coords.map((c: any) => {
                                        const n = String(c.name ?? '').trim();
                                        const p = String(c.phone ?? '').trim();
                                        // Skip if name or phone is a placeholder symbol
                                        if (n === 'Ø' || n === '∅' || n === '—' || n === '-' || p === 'Ø' || p === '∅' || p === '—') return null;
                                        if (!n && !p) return null;
                                        return (
                                          <div key={c.id} className="flex items-center flex-wrap gap-x-2">
                                            <span className="text-cyan-300 font-medium" style={{ textShadow: '0 0 8px rgba(103, 232, 249, 0.6)' }}>{n}</span>
                                            {p && (
                                              <>
                                                <span className="text-gray-600">·</span>
                                                <a href={`tel:${p}`} className="inline-flex items-center gap-1 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                                                  <Phone size={12} className="text-green-400" />
                                                  {p}
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              // else, fall through to single coordinator fallback below
                              return null;
                            })() || (() => {
                              const nRaw = (event as any).coordinator_name;
                              const pRaw = (event as any).coordinator_phone;
                              const n = String(nRaw ?? '').trim();
                              const p = String(pRaw ?? '').trim();
                              if (!n && !p) return null;
                              if ((n === '0' || n === '-' || n === '—' || n === 'Ø' || n === '∅') && !p) return null;
                              // Don't show if both are just placeholder values
                              if ((n === '0' || n === '-' || n === '—' || n === 'Ø' || n === '∅') && (p === '0' || p === '-' || p === '—' || p === 'Ø' || p === '∅')) return null;
                              return (
                                <div className="mt-2 text-sm text-gray-300">
                                  <div className="font-semibold text-gray-200">Coordinator</div>
                                  <div className="text-gray-400 flex items-center flex-wrap gap-x-2">
                                    <span className="text-cyan-300 font-medium" style={{ textShadow: '0 0 8px rgba(103, 232, 249, 0.6)' }}>{(n && n !== '0' && n !== '-' && n !== '—' && n !== 'Ø' && n !== '∅') ? n : ''}</span>
                                    {(p && p !== '0' && p !== '-' && p !== '—' && p !== 'Ø' && p !== '∅') && (
                                      <>
                                        <span className="text-gray-600">·</span>
                                        <a href={`tel:${p}`} className="inline-flex items-center gap-1 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                                          <Phone size={12} className="text-green-400" />
                                          {p}
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Max participants counter removed - only visible to admins in admin panel */}
                          </div>
                          {event.highlights?.length ? (
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-300 mb-2">Highlights:</h4>
                              <div className="flex flex-wrap gap-2">
                                {event.highlights.map((h: string, i: number) => (
                                  <span key={i} className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs border border-gray-600">{h}</span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {/* Per-event winners: render as a simple list (no photo cards) with position badges and Name (year) */}
                          {(() => {
                            const evWinners = (eventWinners || [])
                              .filter((w: any) => w.event_id === event.id)
                              .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                            if (!evWinners || evWinners.length === 0) return null;
                            // Group winners by position (1..4) and show names; multiple winners per position supported
                            const topPositions = [1, 2, 3, 4];
                            const grouped = topPositions.map((pos) => ({
                              pos,
                              items: evWinners.filter((w: any) => Number(w.position) === pos),
                            })).filter(g => g.items.length > 0);
                            if (grouped.length === 0) return null;
                            const posLabel = (p: number) => p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`;
                            const yearLabelFor = (raw: any): string | null => {
                              if (raw == null) return null;
                              const s = String(raw).trim();
                              if (!s) return null;
                              const l = s.toLowerCase();
                              // numeric years
                              const n = parseInt(s, 10);
                              if (!Number.isNaN(n) && n > 0 && n < 10) {
                                const ord = (k: number) => k === 1 ? '1st' : k === 2 ? '2nd' : k === 3 ? '3rd' : `${k}th`;
                                return `${ord(n)} yr`;
                              }
                              if (l.includes('intern')) return 'Intern';
                              if (l === 'pg' || l === 'pgt' || l.includes('post') || l.includes('pg ')) return 'PG';
                              if (l.startsWith('i') || l.includes('first')) return '1st yr';
                              if (l.startsWith('ii') || l.includes('second') || l.includes('2nd')) return '2nd yr';
                              if (l.startsWith('iii') || l.includes('third') || l.includes('3rd')) return '3rd yr';
                              return s; // fallback as-is
                            };
                            return (
                              <div className="mb-4 per-event-winners">
                                <h4 className="font-semibold text-gray-200 mb-2">Winners</h4>
                                <div className="space-y-1 text-sm">
                                  {grouped.map(g => (
                                    <div key={g.pos} className="flex items-start gap-2">
                                      <div
                                        className={`px-2 py-0.5 rounded font-semibold ${g.pos === 1 ? 'bg-yellow-400 text-black' : g.pos === 2 ? 'bg-gray-300 text-black' : g.pos === 3 ? 'bg-amber-700 text-white' : 'bg-gray-500 text-white'}`}
                                        style={{ filter: g.pos === 1 ? 'drop-shadow(0 0 8px rgba(250,204,21,0.6))' : g.pos === 2 ? 'drop-shadow(0 0 8px rgba(209,213,219,0.45))' : g.pos === 3 ? 'drop-shadow(0 0 8px rgba(180,83,9,0.6))' : 'drop-shadow(0 0 8px rgba(107,114,128,0.55))' }}
                                      >
                                        {posLabel(g.pos)}
                                      </div>
                                      <div className="text-gray-200">
                                        {g.items.map((w: any, idx: number) => {
                                          // Try to show year from registration when available; fallback omit if not present
                                          const rawYear = (w as any)?.registration_year || (w as any)?.year || null;
                                          const year = yearLabelFor(rawYear);
                                          return (
                                            <span key={w.id} className="inline">
                                              {w.name}{year ? ` (${year})` : ''}{idx < g.items.length - 1 ? ', ' : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {(() => {
                            const rulesCount = computeRulesCount(event.rules);
                            const rulesUrl = (event as any).rules_link || (event as any).rules_url || (event as any).rules_file_url || (event as any).rules_drive_link || null;
                            if (!((event.rules && rulesCount > 0) || rulesUrl)) return null;
                            return (
                              <div className="mb-4">
                                <div className="flex items-center justify-between w-full mb-2">
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => { e.stopPropagation(); }}
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) { openRulesModal(event.id); } else { toggleRules(event.id); } }}
                                    className="flex items-center text-left font-semibold text-gray-300 hover:text-pink-400 transition-colors px-2 py-1"
                                  >
                                    <FileText size={16} className="mr-2" />
                                    <span>Event Rules {rulesCount > 0 ? `(${rulesCount})` : ''}</span>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {/* Card-level PDF view removed — PDF link is available inside the rules modal */}
                                    {expandedRules.has(event.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                </div>
                                  {expandedRules.has(event.id) && (
                                  <div
                                    className="rules-panel rounded-xl p-4 space-y-3 rules-zoom-in custom-scrollbar"
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                                    onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                                    onTouchStart={(e: React.TouchEvent<HTMLDivElement>) => e.stopPropagation()}
                                  >
                                    <div
                                      className="rules-scroll max-h-56 md:max-h-[60vh] overflow-y-auto p-0 space-y-3"
                                      tabIndex={0}
                                      onWheel={(e: React.WheelEvent<HTMLDivElement>) => {
                                        // Prevent the page from scrolling when the rules box can scroll
                                        const node = e.currentTarget as HTMLElement;
                                        const delta = e.deltaY;
                                        const atTop = node.scrollTop === 0 && delta < 0;
                                        const atBottom = node.scrollHeight - node.clientHeight - node.scrollTop <= 1 && delta > 0;
                                        // If the inner container can consume the scroll, stop propagation
                                        if (!atTop && !atBottom) {
                                          e.stopPropagation();
                                        }
                                      }}
                                    >
                                    {isStructuredRules(event.rules) ? (
                                      unpackStructured(event.rules).map((sec, sIdx) => (
                                        <div key={sIdx} className="space-y-3">
                                          {sec.heading?.trim() && <div className="rule-heading">{sec.heading}</div>}
                                          {(sec.blocks || []).map((b, bIdx) => (
                                            <div key={bIdx} className="space-y-1">
                                              {b.title?.trim() && <div className="rule-subheading">{b.title}</div>}
                                              {(b.style || 'number') === 'bullet' ? (
                                              <ul className="list-disc list-inside space-y-1">
                                                {b.items.filter(p=>p && String(p).trim()).map((p, i) => (
                                                  <li key={i} className="rule-text text-[13px] leading-snug">
                                                    {/* SAFEGUARD: Ensure 'p' is string or primitive to avoid object-render crash */}
                                                    {typeof p === 'object' ? JSON.stringify(p) : String(p)}
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              b.items.filter(p=>p && String(p).trim()).map((p, i) => (
                                                <div key={i} className="flex items-start rule-line">
                                                  <span className="rule-index mr-2 mt-0.5 text-[13px]">{i + 1}.</span>
                                                  <span className="rule-text text-[13px] leading-snug">
                                                    {/* SAFEGUARD: Ensure 'p' is string or primitive */}
                                                    {typeof p === 'object' ? JSON.stringify(p) : String(p)}
                                                  </span>
                                                </div>
                                              ))
                                            )}
                                            </div>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      (event.rules || []).map((rule: string, i: number) => (
                                        <div key={i} className="flex items-start rule-line">
                                          <span className="rule-index mr-2 mt-0.5 text-[14px]">{i + 1}.</span>
                                          <span className="rule-text text-[15px] leading-snug">
                                            {/* SAFEGUARD: Ensure 'rule' is string or primitive to avoid object-render crash found in Top Flix event */}
                                            {typeof rule === 'object' ? JSON.stringify(rule) : String(rule)}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                    </div>
                                  </div>
                                  )}
                              </div>
                            );
                          })()}
                        </div>
                            <div className="p-6 pt-0">
                          {canRegisterNow(event) ? (
                            <button
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openRegistration(event.id); }}
                              disabled={Boolean(event.max_participants) && (event.current_registrations || 0) >= (event.max_participants ?? 0)}
                              className={`w-full font-semibold flex items-center justify-center glow-text-btn ${event.max_participants && (event.current_registrations || 0) >= (event.max_participants ?? 0) ? 'opacity-60 cursor-not-allowed !pointer-events-none' : ''}`}
                            >
                              {event.max_participants && (event.current_registrations || 0) >= event.max_participants ? (
                                <>
                                  <AlertCircle size={16} className="mr-2" /> EVENT FULL
                                </>
                              ) : (
                                <span className="glow-text-btn__content"><UserPlus size={16} className="mr-2" /> <span className="glow-text-animated">REGISTER NOW</span></span>
                              )}
                            </button>
                          ) : getCountdown(event) ? (
                            getCountdown(event) === 'now' ? (
                              <div className="w-full py-3 px-4 rounded-lg bg-green-600/20 text-green-300 text-center font-medium" title="Open now">Open now</div>
                            ) : (
                              (() => {
                                const secs = getSecondsToOpen(event);
                                const isBoundary = typeof secs === 'number' && secs > 0 && secs <= 3;
                                return (
                                  <div
                                    className={`w-full py-3 px-4 rounded-lg text-center font-medium ${isBoundary ? 'bg-green-600/20 text-green-300 animate-pulse' : 'bg-blue-600/20 text-blue-300'}`}
                                    title={getOpensAtTooltip(event)}
                                  >
                                    {isBoundary ? `Starting in ${secs}s` : `Opens in ${getCountdown(event)}`}
                                  </div>
                                );
                              })()
                            )
                          ) : (
                            <div className="w-full py-3 px-4 rounded-lg bg-gray-700 text-gray-400 text-center font-medium">REGISTRATION CLOSED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isLastTenSeconds(event) && !canRegisterNow(event) && (
                    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-full bg-black/60 flex items-center justify-center">
                        <div
                          className="font-black select-none countdown-drama"
                          style={{
                            fontSize: 'clamp(72px, 16vw, 200px)',
                            lineHeight: 1,
                            ...getCountdownStylesForSecs(getSecondsToOpen(event)),
                          }}
                          title={getOpensAtTooltip(event)}
                        >
                          {getSecondsToOpen(event)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
              <div className="cyberpunk-card max-w-md mx-auto">
                <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Events Found</h3>
                <div className="text-gray-500 space-y-2">
                  <p>{selectedCategory === 'All' ? 'No events are currently available.' : `No events found in the ${selectedCategory} category.`}</p>
                  {connectionStatus !== 'ok' && (<p className="text-xs text-yellow-400">{lastError || 'Data fetch issue. Please retry.'}</p>)}
                  <div><button onClick={() => refreshAll(true)} className="mt-3 px-4 py-2 rounded bg-pink-600/20 text-pink-300 border border-pink-500/40 hover:bg-pink-600/30">Retry loading events</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Winners Section (placed below the events grid) */}
      <section className="py-12 relative">
        <div className="max-w-full mx-0 px-0">
          <div className="cyberpunk-card py-6 px-0">
            <h2 className="text-2xl font-bold mb-4">Event Winners</h2>
            {(!eventWinners || eventWinners.length === 0) ? (
              <div className="text-gray-400">No winners announced yet.</div>
            ) : (
              (() => {
                // Filter winners according to the selectedCategory (fall back to the event's category if winner row lacks one)
                const filteredWinners = (eventWinners || []).filter((w: any) => {
                  const cat = w.category || events.find((e: any) => e.id === w.event_id)?.category || 'Uncategorized';
                  return selectedCategory === 'All' ? true : cat === selectedCategory;
                });

                if (!filteredWinners || filteredWinners.length === 0) {
                  return <div className="text-gray-400">No winners announced for the "{selectedCategory}" category.</div>;
                }

                // Group winners by the event they belong to and render a row of winners per event
                const eventsWithWinners = Array.from(new Set(filteredWinners.map((w: any) => w.event_id))).map((id) => events.find((e: any) => e.id === id)).filter(Boolean);

                return (
                  <div className="space-y-6">
                    {eventsWithWinners.map((ev: any) => {
                      const list = filteredWinners
                        .filter((w: any) => w.event_id === ev.id)
                        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                      if (!list.length) return null;
                      // Group winners by position (1..4) for readable list output
                      const topPositions = [1, 2, 3, 4];
                      const grouped = topPositions
                        .map((pos) => ({ pos, items: list.filter((w: any) => Number(w.position) === pos) }))
                        .filter((g) => g.items.length > 0);
                      if (!grouped.length) return null;
                      const posLabel = (p: number) => (p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);
                      const yearLabelFor = (raw: any): string | null => {
                        if (raw == null) return null;
                        const s = String(raw).trim();
                        if (!s) return null;
                        const l = s.toLowerCase();
                        const n = parseInt(s, 10);
                        if (!Number.isNaN(n) && n > 0 && n < 10) {
                          const ord = (k: number) => (k === 1 ? '1st' : k === 2 ? '2nd' : k === 3 ? '3rd' : `${k}th`);
                          return `${ord(n)} yr`;
                        }
                        if (l.includes('intern')) return 'Intern';
                        if (l === 'pg' || l === 'pgt' || l.includes('post') || l.includes('pg ')) return 'PG';
                        if (l.startsWith('i') || l.includes('first')) return '1st yr';
                        if (l.startsWith('ii') || l.includes('second') || l.includes('2nd')) return '2nd yr';
                        if (l.startsWith('iii') || l.includes('third') || l.includes('3rd')) return '3rd yr';
                        return s;
                      };
                      return (
                        <div key={ev.id} className="bg-black/60 py-4 px-4 rounded-md">
                          <div className="font-semibold text-lg text-white mb-3 text-center w-full">{ev.title}</div>
                          <div className="space-y-2">
                              {grouped.map((g) => (
                                <div key={g.pos} className="flex items-start gap-2">
                                  <div
                                    className={`px-2 py-0.5 rounded font-semibold ${g.pos === 1 ? 'bg-yellow-400 text-black' : g.pos === 2 ? 'bg-gray-300 text-black' : g.pos === 3 ? 'bg-amber-700 text-white' : 'bg-gray-500 text-white'}`}
                                    style={{ filter: g.pos === 1 ? 'drop-shadow(0 0 8px rgba(250,204,21,0.6))' : g.pos === 2 ? 'drop-shadow(0 0 8px rgba(209,213,219,0.45))' : g.pos === 3 ? 'drop-shadow(0 0 8px rgba(180,83,9,0.6))' : 'drop-shadow(0 0 8px rgba(107,114,128,0.55))' }}
                                  >
                                    {posLabel(g.pos)}
                                  </div>
                                  <div className="text-gray-200">
                                    {g.items.map((w: any, idx: number) => {
                                      const rawYear = (w as any)?.registration_year || (w as any)?.year || null;
                                      const year = yearLabelFor(rawYear);
                                      return <span key={w.id} className="inline">{w.name}{year ? ` (${year})` : ''}{idx < g.items.length - 1 ? ', ' : ''}</span>;
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })} {/* end eventsWithWinners.map */}
                    </div>
                  );
                })() /* end winners IIFE */ )} {/* end ternary */}
          </div>
        </div>
      </section>

      </div> {/* End of nuclear wrapper */}

      <RegistrationModal isOpen={registrationModal.isOpen} onClose={closeRegistration} eventTitle={registrationModal.eventTitle} eventId={registrationModal.eventId} />

      <style>{`
    /* Flip card styles */
          /* Maintain a consistent poster card aspect ratio: 49 x 59.4 (width x height) */
          .flip-3d { perspective: 1200px; position: relative; aspect-ratio: 49 / 59.4; }
          /* Fallback for browsers not supporting aspect-ratio */
          @supports not (aspect-ratio: 1 / 1) {
            .flip-3d { height: 500px; }
            @media (min-width: 480px) { .flip-3d { height: 540px; } }
            @media (min-width: 768px) { .flip-3d { height: 620px; } }
          }
  .flip-3d-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.8,.2,1); z-index: 10; }
        .flip-3d.is-flipped .flip-3d-inner { transform: rotateY(180deg); }
        /* Remove hover flip so hover can reveal motion poster video on the front; flip via click only */
        @media (hover: hover) and (pointer: fine) {
          /* For contain mode, avoid scaling to prevent showing empty bars clipping */
          .tilt-card:hover .flip-front-media { transform: translateZ(20px); }
        }
          .flip-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 12px; overflow: hidden; }
        .flip-front { z-index: 2; }
          /* Parallax depth for media on the front */
          /* Media fills the entire front face (no top crop on mobile) */
          .flip-front-media { position: absolute; inset: 0; transform: translateZ(18px); transition: transform 400ms ease; background-color: #000; }
          /* Blurred cover background to visually fill width */
          .flip-front-media .poster-fill { position:absolute; inset:0; background-size: cover; background-position:center; filter: blur(16px) brightness(0.75); transform: scale(1.06); }
          /* Main poster — contain (no crop) by default, or cover if admin chooses */
          .flip-front-media .poster-main { position:absolute; inset:0; background-repeat:no-repeat; background-position:center; background-size: contain; }
          @media (min-width: 768px) { .flip-front-media .poster-fill { filter: blur(18px) brightness(0.72); } }
          /* When admin chooses cover, inline backgroundSize overrides to cover; poster-fill remains underneath but mostly hidden */
          @media (hover: hover) and (pointer: fine) {
            .tilt-card:hover .flip-front-media { transform: translateZ(24px); }
          }
          /* Dramatic countdown animation */
          @keyframes countdownScalePulse {
            0% { transform: scale(0.9); text-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0.9; }
            35% { transform: scale(1.06); text-shadow: 0 18px 48px rgba(0,0,0,0.7); opacity: 1; }
            70% { transform: scale(1.0); text-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0.95; }
            100% { transform: scale(0.98); text-shadow: 0 10px 24px rgba(0,0,0,0.55); opacity: 0.92; }
          }
          .countdown-drama {
            letter-spacing: -0.02em;
            animation: countdownScalePulse 1000ms ease-in-out infinite;
            @media (min-width: 640px) {
              filter: drop-shadow(0 10px 24px rgba(0,0,0,0.65));
            }
          }
  .flip-back { transform: rotateY(180deg); background: #000; border: 1px solid rgba(255,0,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 11; }

        /* Animated neon border ring around the entire card (both faces) */
        @media (max-width: 768px) {
            .marquee-track {
               display: inline-flex;
               white-space: nowrap;
               width: max-content; /* Ensure it takes full width of content */
               animation: marquee-scroll 20s linear infinite;
               padding-left: 10px; /* Slight offset */
            }
        }
        @keyframes marquee-scroll {
             from { transform: translateX(0); }
             to { transform: translateX(-50%); }
        }

        .neon-anim-border {
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          /* Layered shadows for 3D depth */
          /* Layered shadows for 3D depth - SIMPLIFIED FOR MOBILE */
          box-shadow: 0 5px 15px rgba(0,0,0,0.4);
          @media (min-width: 640px) {
            box-shadow:
              0 18px 36px rgba(0,0,0,0.45),
              0 8px 18px rgba(0,0,0,0.35),
              0 1px 0 rgba(255,255,255,0.06) inset,
              0 -10px 24px rgba(0,0,0,0.25) inset;
          }
          transform-style: preserve-3d;
          transform: translateY(var(--ty, 0)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: box-shadow 250ms ease, transform 250ms ease;
          isolation: isolate; /* ensure ::before ring can sit above inner content safely */
          /* Fallback/Primary: gradient border using background-clip for wide compatibility */
          /* Primary: Simple linear gradient for mobile performance */
          border: 1px solid rgba(236,72,153,0.3);
          background: linear-gradient(transparent, transparent) padding-box, linear-gradient(135deg, #ff00ff 0%, #0e7490 100%) border-box;

          @media (min-width: 640px) {
             border: 1px solid transparent; /* ultra-thin ring managed by background-clip */
             background:
               linear-gradient(transparent, transparent) padding-box,
               conic-gradient(
                 from 20deg,
                 #ff00ff 0%,
                 #ff4de9 18%,
                 #5b21b6 32%,
                 #0e7490 55%,
                 #0e7490 70%,
                 #5b21b6 85%,
                 #ff00ff 100%
               ) border-box;
          }
          /* Inner glow illusion */
          box-shadow:
            inset 0 0 46px rgba(255,0,255,0.10),
            inset 0 0 72px rgba(14,116,144,0.06),
            0 18px 36px rgba(0,0,0,0.45),
            0 8px 18px rgba(0,0,0,0.35),
            0 1px 0 rgba(255,255,255,0.06) inset,
            0 -10px 24px rgba(0,0,0,0.25) inset;
        }
        /* Fallback ring using border-image to ensure visibility on all devices */
        .neon-anim-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid transparent; /* match ultra-thin ring */
          /* draw gradient border via border-image without masking */
          border-image: conic-gradient(
            from 20deg,
            #ff00ff 0%,
            #ff4de9 18%,
            #5b21b6 32%,
            #0e7490 55%,
            #0e7490 70%,
            #5b21b6 85%,
            #ff00ff 100%
          ) 1;
          z-index: 40;
          pointer-events: none;
        }
        .neon-anim-border::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          /* soft inner edge glow: fades from edges inward */
          background:
            radial-gradient(120% 60% at 50% -10%, rgba(255,0,255,0.10), transparent 60%),
            radial-gradient(120% 60% at 50% 110%, rgba(14,116,144,0.08), transparent 60%),
            radial-gradient(60% 120% at -10% 50%, rgba(255,0,255,0.08), transparent 60%),
            radial-gradient(60% 120% at 110% 50%, rgba(14,116,144,0.06), transparent 60%);
          filter: blur(34px); /* increased blur for softer light */
          opacity: 0.25; /* even darker overall look by reducing inner glow */
          z-index: 5;
          pointer-events: none;
          transition: opacity 250ms ease, filter 250ms ease;
        }
        /* Dark overlay on the front face to reduce brightness (below badges) */
        .flip-front::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.85));
          z-index: 1; /* keep below badges and labels */
          pointer-events: none;
          transition: opacity 250ms ease;
        }
        /* When a WatchLive button is present, remove the front overlay so image under the button is clean */
        .flip-front.no-front-overlay::after { display: none; }
        @media (hover: hover) and (pointer: fine) {
          .neon-anim-border:hover {
            --ty: -4px;
            box-shadow:
              0 24px 48px rgba(0,0,0,0.5),
              0 12px 24px rgba(0,0,0,0.4),
              0 1px 0 rgba(255,255,255,0.08) inset,
              0 -12px 28px rgba(0,0,0,0.3) inset,
              inset 0 0 54px rgba(255,0,255,0.12),
        inset 0 0 80px rgba(14,116,144,0.08);
          }
          .neon-anim-border:hover::before { filter: saturate(150%) brightness(1.1); }
      .neon-anim-border:hover::after { opacity: 0.55; filter: blur(36px); }
        }

        /* Subtle curvature highlight inside both faces */
        .flip-face::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(120% 120% at 8% 8%, rgba(255,255,255,0.06), rgba(255,255,255,0) 38%),
            radial-gradient(120% 120% at 92% 92%, rgba(255,255,255,0.04), rgba(255,255,255,0) 42%);
          mix-blend-mode: screen;
        }
        /* Disable overlays on the back face to keep text sharp and readable */
        .flip-back::after,
        .flip-back::before { display: none; }

        /* Sweeping specular sheen on hover (desktop) */
        .flip-face::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          background: linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 10%, rgba(255,255,255,0) 35%);
          background-size: 200% 200%;
          background-position: -150% -150%;
          mix-blend-mode: screen;
          opacity: 0;
          transition: background-position 800ms ease, opacity 300ms ease;
          pointer-events: none;
        }
        @media (hover: hover) and (pointer: fine) {
          .tilt-card:hover .flip-face::before { background-position: 150% 150%; opacity: 0.35; }
        }
        @media (hover: none) and (pointer: coarse) {
          .tilt-card.sheen .flip-face::before { background-position: 150% 150%; opacity: 0.35; transition-duration: 600ms; }
          .tilt-card:active { transform: translateY(-2px); }
        }
        /* When the card is flipped, hide per-event winners on the card face */
        .flip-3d.is-flipped .per-event-winners { display: none !important; }
        @media (min-width: 768px) {
          .neon-anim-border::before { padding: 3px; }
        }

        /* Theme and effects */
        .cyberpunk-theme { background:#0a0a0a; color:#ffffff; font-family:'Orbitron','Rajdhani',sans-serif; min-height:100vh; }
        .hero-section { position:relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
        /* particles CSS removed */
  .cyberpunk-title { background: linear-gradient(45deg, #ff00ff, #0e7490, #ff00ff); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation: gradientShift 3s ease-in-out infinite; }
        @keyframes gradientShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
    .neon-pink { color:#ff00ff; text-shadow: 0 0 2px #ff00ff, 0 0 4px #ff00ff; }
  .neon-blue { color:#0e7490; text-shadow: 0 0 2px #0e7490, 0 0 4px #0e7490; }
  .neon-purple { color:#5b21b6; text-shadow: 0 0 2px #5b21b6, 0 0 4px #5b21b6; }
    .glow-text { text-shadow: 0 0 2px currentColor, 0 0 4px currentColor; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite alternate; }
        @keyframes pulseGlow { from { box-shadow: 0 0 5px rgba(255,0,255,0.3);} to { box-shadow: 0 0 15px rgba(255,0,255,0.6);} }
        .glitch-active { animation: glitch 0.3s ease-in-out; }
        @keyframes glitch { 0% { transform: translate(0);} 20% { transform: translate(-2px, 2px);} 40% { transform: translate(-2px, -2px);} 60% { transform: translate(2px, 2px);} 80% { transform: translate(2px, -2px);} 100% { transform: translate(0);} }
        .glitch-overlay { position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(90deg, transparent 0%, rgba(255,0,255,0.1) 50%, transparent 100%); opacity:0; pointer-events:none; transition: opacity .3s ease; }
        .glitch-overlay.active { opacity:1; animation: glitchSweep .3s ease-in-out; }
        @keyframes glitchSweep { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
        .cyberpunk-btn { position:relative; padding:12px 32px; font-weight:700; text-transform:uppercase; letter-spacing:1px; border:2px solid; background:transparent; overflow:hidden; transition: all .3s ease; clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%); }
        .cyberpunk-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition:left .5s; }
        .cyberpunk-btn:hover::before { left:100%; }
        .cyberpunk-btn-primary { border-color:#ff00ff; color:#ff00ff; box-shadow: 0 0 10px rgba(255,0,255,0.2), inset 0 0 10px rgba(255,0,255,0.05); }
        .cyberpunk-btn-primary:hover { background: rgba(255,0,255,0.1); box-shadow: 0 0 20px rgba(255,0,255,0.4), inset 0 0 20px rgba(255,0,255,0.1); transform: translateY(-2px); }
  .cyberpunk-card { background: rgba(20,20,40,0.8); border:1px solid rgba(14,116,144,0.30); border-radius:8px; backdrop-filter: blur(10px); transition: all .3s ease; position: relative; overflow:hidden; }
  .cyberpunk-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, #ff00ff, #0e7490, #ff00ff); transform: translateX(-100%); transition: transform .5s ease; }
        .cyberpunk-card:hover::before { transform: translateX(0); }
        .cyberpunk-card:hover { border-color: rgba(255,0,255,0.6); box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,0,255,0.1); transform: translateY(-5px); }
        .scroll-animate { transition: all .8s cubic-bezier(.25,.46,.45,.94); }
        .scroll-animate.animate-in { opacity:1 !important; transform: translateY(0) !important; }
        
        /* Zoom-in animation for rules panel */
        .rules-zoom-in { animation: rulesZoomIn 220ms cubic-bezier(.16,.84,.44,1) both; transform-origin: top center; }
        @keyframes rulesZoomIn { from { opacity: 0; transform: scale(.94) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        /* Rules panel readability improvements */
        .rules-panel {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          padding: 20px 20px 22px 24px;
          /* subtle translucent glass similar to Apple iOS glass */
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 14px 40px rgba(2,6,12,0.60), inset 0 1px 0 rgba(255,255,255,0.02);
          color: #f2f2f7; /* slightly brighter text on translucent glass */
          font-family: Arial, Helvetica, sans-serif;
          z-index: 60; /* ensure it's above the page overlay */
          -webkit-overflow-scrolling: touch;
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          backdrop-filter: blur(18px) saturate(150%);
        }
        /* left vertical glow accent removed from panel to avoid clipped/behind artifacts */
        .rules-panel-wrap { position: relative; }
        /* subtle vignette / sheen overlay */
        .rules-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.46));
          mix-blend-mode: overlay;
        }
          .rule-heading { font-size: 1.02rem; font-weight: 800; color: #fff; text-shadow: 0 6px 22px rgba(180,60,255,0.06), 0 0 8px rgba(90,30,200,0.06); }
          .rule-subheading { font-size: 0.95rem; color: #d1d5db; font-weight: 700; margin-bottom: 6px; }
          .rule-text { font-size: 0.98rem; color: #e6e6f0; line-height: 1.6; }
        .rules-panel .rule-line { font-size: 0.95rem; line-height: 1.4rem; color: #e2e8f0; font-family: Arial, Helvetica, sans-serif; }
        .rules-panel .rule-index { color: #ff66e5; font-weight: 700; text-shadow: 0 0 6px rgba(255,0,255,0.35); font-family: Arial, Helvetica, sans-serif; }
        
        .rules-panel ul, .rules-panel li { font-family: Arial, Helvetica, sans-serif; }
        /* Glass effect scrollbars for rules modal (Android, desktop, iOS Safari) */
        .rules-panel::-webkit-scrollbar,
        .rules-scroll::-webkit-scrollbar {
          width: 8px;
          background: transparent;
        }
        .rules-panel::-webkit-scrollbar-thumb,
        .rules-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(180,180,255,0.13) 60%, rgba(255,255,255,0.10) 100%);
          border-radius: 9999px;
          box-shadow: 0 2px 8px rgba(80,80,120,0.10);
          border: 1px solid rgba(255,255,255,0.10);
        }
        .rules-panel::-webkit-scrollbar-track,
        .rules-scroll::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(80,80,120,0.06) 100%);
          border-radius: 9999px;
        }
        /* Improved mobile scrolling container */
        .rules-scroll {
          -webkit-overflow-scrolling: touch; /* momentum on iOS */
          touch-action: pan-y; /* allow vertical pan */
          overscroll-behavior: contain; /* avoid chaining to body */
          max-height: calc(60vh - 8px); /* avoid exact vh quirks on Android */
        }

        /* Glow Text Button (inspired by provided demo) */
        .glow-text-btn {
          position: relative;
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(14,14,30,0.85);
          border: none;
          outline: none;
          transition: transform .18s ease, box-shadow .2s ease, background .2s ease;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #e7e7e7;
          overflow: hidden;
          isolation: isolate;
        }
        .glow-text-btn:hover { transform: translateY(-2px); }
        .glow-text-btn:active { transform: translateY(0); }
        .glow-text-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(90deg, #ff00ff, #5b21b6, #0e7490, #ff00ff);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; /* safari */
                  mask-composite: exclude; /* others */
          filter: drop-shadow(0 0 10px rgba(255,0,255,.30)) drop-shadow(0 0 18px rgba(14,116,144,.20));
          pointer-events: none;
          z-index: 0;
        }
        .glow-text-btn::after {
          /* ambient glow under the button */
          content: '';
          position: absolute;
          left: 8%; right: 8%; bottom: -8px; height: 18px;
          background: radial-gradient(60% 100% at 50% 0%, rgba(255,0,255,.30), rgba(14,116,144,.20) 60%, transparent 80%);
          filter: blur(12px);
          z-index: -1;
          pointer-events: none;
        }
        .glow-text-btn__content { position: relative; z-index: 2; display: inline-flex; align-items: center; }
        .glow-text-animated {
          background: linear-gradient(90deg, #ff00ff, #ffffff 35%, #0e7490 70%, #ff00ff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: 0 0 4px rgba(255,0,255,.38), 0 0 8px rgba(14,116,144,.22);
          animation: glowTextSweep 2.4s linear infinite;
        }
        @keyframes glowTextSweep { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @media (prefers-reduced-motion: reduce) { .glow-text-animated { animation: none; } }

        /* Map button styles removed */

        @media (max-width: 768px) {
          .cyberpunk-title { font-size: 2rem; }
          .hero-section h1 { font-size: 2.25rem !important; }
          .hero-section p { font-size: 0.95rem !important; }
          /* One-line, horizontally scrollable category row on mobile */
          .filter-row { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .filter-row::-webkit-scrollbar { display: none; }
          .filter-btn { font-size: 0.85rem; }
          /* Winners mobile marquee/scroll */
          .winners-row-mobile { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .winners-row-mobile::-webkit-scrollbar { display: none; }
          .winners-row-mobile > * { scroll-snap-align: center; }
          /* Ensure grid spacing and card content have breathing room */
          .container .grid { gap: 16px; }
          /* Reserve space at top of front face for badges/buttons */
          /* No additional top padding; badges are absolutely positioned */
          /* Prevent inner content from colliding at the bottom */
          .flip-back .p-6 { padding: 16px; }
          .flip-back .p-6.pt-0 { padding-top: 8px; }
          /* Make badges and watch button smaller on mobile via inherited positions updated above */
  }
  }
  /* Utility to hide scrollbars */
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .rules-panel::-webkit-scrollbar, .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .rules-panel::-webkit-scrollbar-thumb, .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 9999px; }
        .rules-close {
          backdrop-filter: blur(6px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.06);
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .rules-close:active { transform: scale(0.98); }
      /* Hide native big play overlay on motion poster videos and prevent pointer events
        We control playback via the card touch handlers, so disable native overlays
        which can remain visible on touch devices even when we play the element. */
      .front-video { pointer-events: none; }
      .front-video::-webkit-media-controls-start-playback-button,
      .front-video::-webkit-media-controls-overlay-play-button,
      .front-video::-webkit-media-controls { display: none !important; -webkit-appearance: none; }
        /* ========== MOBILE PERFORMANCE OPTIMIZATIONS ========== */
        /* Disable expensive 3D effects on mobile to prevent crashes */
        @media (max-width: 767px) {
          /* Disable tilt effect on mobile */
          .tilt-card {
            --rx: 0deg !important;
            --ry: 0deg !important;
            --ty: 0 !important;
          }
          
          /* Simplify neon borders */
          .neon-anim-border {
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            border: 1px solid rgba(236,72,153,0.4) !important;
            background: linear-gradient(180deg, rgba(20,20,30,0.95), rgba(10,10,20,0.98)) !important;
          }
          
          /* Remove expensive pseudo-elements */
          .neon-anim-border::before,
          .neon-anim-border::after,
          .flip-front::after {
            display: none !important;
          }
        }

      `}</style>
    </div>
  );
};