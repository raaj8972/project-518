import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, UserPlus, AlertCircle, FileText, ChevronDown, ChevronUp, Zap, Play, Star } from 'lucide-react';
import WatchLiveButton from '../components/WatchLiveButton';
import { LIVE_LEAD_MINUTES } from '../config/liveStream';
import { parseEventDateTime } from '../utils/eventTime';
import { useData } from '../context/DataContext';
import { RegistrationModal } from '../components/RegistrationModal';
import { HeroBackground } from '../components/HeroBackground';

export const Events: React.FC = () => {
  const { events, eventCoordinators, eventWinners = [], connectionStatus, lastError, refreshAll } = useData() as any;
  const getCoordinators = (eventId: number) => (eventCoordinators as any)?.filter((c: any) => c.event_id === eventId) || [];
  const eventsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [registrationModal, setRegistrationModal] = useState<{ isOpen: boolean; eventId: number; eventTitle: string }>(
    { isOpen: false, eventId: 0, eventTitle: '' }
  );
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [glitchActive, setGlitchActive] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  // Timestamp ticker removed since left-side LIVE/Opens-in pill is suppressed when watch-live exists

  const visibleEvents = (events as any[]).filter((e: any) => e.visible !== false);
  const categories = ['All', ...Array.from(new Set(visibleEvents.map((e: any) => String(e.category))))];
  const filteredEvents = selectedCategory === 'All' ? visibleEvents : visibleEvents.filter((e: any) => e.category === selectedCategory);
  const categoriesKey = categories.join('|');

  // If current selection disappears due to data refresh, fallback to All so cards render
  useEffect(() => {
    if (selectedCategory !== 'All' && !categories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categoriesKey, selectedCategory]);

  useEffect(() => {
    const t = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 12000);
    return () => clearInterval(t);
  }, []);

  // Scroll to event card if URL contains #event-<id>
  useEffect(() => {
    const hash = location.hash;
    if (!hash || !hash.startsWith('#event-')) return;
    const idStr = hash.replace('#event-', '');
    let target = document.getElementById(`event-${idStr}`);
    if (target) {
      setTimeout(() => target!.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      target.classList.add('ring-2', 'ring-pink-500');
      setTimeout(() => target!.classList.remove('ring-2', 'ring-pink-500'), 1500);
      return;
    }
    // If target not found, switch category to include it
    const idNum = Number(idStr);
  const ev = events.find((e: any) => e.id === idNum);
    if (ev && selectedCategory !== 'All' && selectedCategory !== ev.category) {
      setSelectedCategory(ev.category);
      // After category update, effect will re-run and scroll
    }
  }, [location.hash, selectedCategory, filteredEvents.length, events.length]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.scroll-animate').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [events, selectedCategory, filteredRulesKey(filteredEvents)]);

  // (No per-second ticker needed for pills now; WatchLiveButton manages its own countdown.)

  // Stable key for dependency to re-run observer when filteredEvents set changes
  function filteredRulesKey(list: typeof filteredEvents) {
    // use ids + length to avoid heavy deps, and ensure change when category toggles
    return list.length + ':' + list.map((e: any) => e.id).join(',');
  }

  // Soft perspective tilt on hover for desktop/fine pointers
  useEffect(() => {
    const supportsTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsTilt) return;
    const maxTilt = 12; // degrees (increase for more depth)
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
      handlers.forEach(({ el, onMove, onLeave }) => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);

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

  // Auto-scroll marquee for winners rows on small screens
  useEffect(() => {
    // Respect users who prefer reduced motion
    if (typeof window === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rows = Array.from(document.querySelectorAll('.winners-row-mobile')) as HTMLElement[];
    if (!rows.length) return;

    let raf = 0 as number;
    const speed = 0.45; // pixels per frame (tweak for faster/slower)

    const step = () => {
      // Only auto-scroll on narrow viewports (mobile)
      if (window.innerWidth > 768) {
        raf = requestAnimationFrame(step);
        return;
      }
      rows.forEach((row) => {
        if (row.dataset.marqueePaused === 'true') return;
        const max = row.scrollWidth - row.clientWidth;
        if (max <= 0) return;
        let next = row.scrollLeft + speed;
        if (next > max) {
          // smooth wrap to start
          next = 0;
        }
        row.scrollLeft = next;
      });
      raf = requestAnimationFrame(step);
    };

    const pause = (ev: Event) => { const el = ev.currentTarget as HTMLElement; if (el) el.dataset.marqueePaused = 'true'; };
    const resume = (ev: Event) => { const el = ev.currentTarget as HTMLElement; if (el) el.dataset.marqueePaused = 'false'; };

    rows.forEach((r) => {
      r.dataset.marqueePaused = 'false';
      r.addEventListener('mouseenter', pause);
      r.addEventListener('mouseleave', resume);
      r.addEventListener('touchstart', pause, { passive: true } as EventListenerOptions);
      r.addEventListener('touchend', resume);
    });

    raf = requestAnimationFrame(step);

    const onResize = () => { /* keep running, step checks width */ };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      rows.forEach((r) => {
        r.removeEventListener('mouseenter', pause);
        r.removeEventListener('mouseleave', resume);
        // Note: removeEventListener for passive listener still works
        r.removeEventListener('touchstart', pause as EventListener);
        r.removeEventListener('touchend', resume);
      });
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const openRegistration = (eventId: number, eventTitle: string) => setRegistrationModal({ isOpen: true, eventId, eventTitle });
  const closeRegistration = () => setRegistrationModal({ isOpen: false, eventId: 0, eventTitle: '' });
  const toggleRules = (id: number) => setExpandedRules((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlip = (id: number) => setFlippedCards((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const getCategoryColor = (c: string) => ({ Cultural: 'from-purple-500 to-pink-500', Technical: 'from-blue-500 to-cyan-500', Sports: 'from-green-500 to-emerald-500', default: 'from-gray-500 to-gray-600' } as Record<string, string>)[c] || 'from-gray-500 to-gray-600';


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

  // mapsUrlFor helper removed (we compute inline where needed)

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Connection issues are surfaced in Admin only to avoid alarming public users */}

      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
          <HeroBackground pageKey="events" />
          <div className="particles-container">
            {[...Array(50)].map((_: any, i: number) => (
              <div key={i} className="particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 20}s`, animationDuration: `${15 + Math.random() * 10}s` }} />
            ))}
          </div>
          <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`} />
        </div>
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 text-pink-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Zap className="w-4 h-4 mr-2 animate-pulse" /> EVENTS 2025
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              <span className="neon-pink">EVENTS</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Experience the <span className="neon-blue glow-text">future</span> of innovation through our
              <span className="neon-purple glow-text"> cutting-edge events</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <div className="cyberpunk-btn cyberpunk-btn-primary hover-float">
                <span className="relative z-10 flex items-center">
                  <Play className="mr-2" size={20} /> EXPLORE EVENTS
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Winners Section moved below the events grid */}

      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-10">
            <div className="flex justify-center mb-8">
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

      <section className="py-12 relative">
        <div className="container mx-auto px-4" ref={eventsRef}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event: any, index: number) => (
              <div id={`event-${event.id}`} key={`${selectedCategory}-${event.id}`} className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className={`relative flip-3d neon-anim-border tilt-card ${flippedCards.has(event.id) ? 'is-flipped' : ''}`}>
                  <div className="flip-3d-inner">
                    <button className={`flip-face flip-front relative group ${(event as any).watch_live_url ? 'no-front-overlay' : ''}`} onClick={() => toggleFlip(event.id)} aria-label={`Open details for ${event.title}`}>
                      <div className="flip-front-media" style={{ backgroundImage: `url(${event.image})` }} />
                      {event.motion_poster_url ? (
                        <video
                          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-90 front-video sm:block hidden"
                          src={event.motion_poster_url}
                          autoPlay
                          muted
                          playsInline
                          loop
                          poster={event.image}
                        />
                      ) : null}
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-wrap items-center gap-2 max-w-[75%] sm:max-w-[70%] pr-16">
                        <span className={`bg-gradient-to-r ${getCategoryColor(event.category)} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg`}>{event.category}</span>
                        {/* Suppress separate LIVE/Opens-in pill when Watch Live exists to avoid overlap; the button conveys status */}
                        {(() => {
                          const wlu = (event as any).watch_live_url;
                          if (wlu) return null;
                          // If no watch-live url, you could show other non-live chips here in future.
                          return null;
                        })()}
                      </div>
                      {/* Watch Live button (60m pre-live gating) or Featured badge */}
                      {(() => {
                        const wlu = (event as any).watch_live_url;
                        if (wlu) {
                          const dt = parseEventDateTime(event.date as any, event.time as any);
                          if (dt) {
                            return (
                              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
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
                        if (event.featured) {
                          return (
                            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10">
                              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-2 rounded-full animate-pulse pulse-ring">
                                <Star className="w-4 h-4 fill-current" />
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </button>

                    {/* Always-visible countdown pill on front face (when timer-gated and no Watch Live button) */}
                    {(() => {
                      const wlu = (event as any).watch_live_url;
                      const countdown = getCountdown(event);
                      const showCountdown = !wlu && countdown; // avoid duplicate with WatchLiveButton which has its own countdown
                      const isOpen = canRegisterNow(event);
                      if (!showCountdown) return null;
                      return (
                        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 pointer-events-none">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur border ${countdown === 'now' || isOpen ? 'bg-green-600/80 text-white border-white/30' : 'bg-blue-600/80 text-white border-white/20'}`}
                            title={getOpensAtTooltip(event)}
                          >
                            {countdown === 'now' || isOpen ? 'Open now' : `Opens in ${countdown}`}
                          </div>
                        </div>
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
                          <h3 className="text-xl font-bold text-white mb-3" style={{ transform: 'translateX(16px)' }}>{event.title}</h3>
                          <p className="text-gray-300 mb-4">{event.description}</p>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-400"><Calendar size={16} className="mr-2 text-blue-400" />{event.date}</div>
                            <div className="flex items-center text-sm text-gray-400"><Clock size={16} className="mr-2 text-green-400" />{event.time}</div>
                            <div className="flex items-center text-sm text-gray-400">
                              <MapPin size={16} className="mr-2 text-purple-400" />
                              <span>{event.venue}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-400"><Users size={16} className="mr-2 text-pink-400" />{event.participants} participants</div>
                            {getCoordinators(event.id).length > 0 ? (
                              <div className="mt-2 text-sm text-gray-300">
                                <div className="font-semibold text-gray-200">Coordinators</div>
                                <div className="text-gray-400 space-y-0.5">
                                  {getCoordinators(event.id).map((c: any) => (
                                    <div key={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</div>
                                  ))}
                                </div>
                              </div>
                            ) : ((event as any).coordinator_name || (event as any).coordinator_phone) ? (
                              <div className="mt-2 text-sm text-gray-300">
                                <div className="font-semibold text-gray-200">Coordinator</div>
                                <div className="text-gray-400">{(event as any).coordinator_name || '—'}{(event as any).coordinator_phone ? ` • ${(event as any).coordinator_phone}` : ''}</div>
                              </div>
                            ) : null}
                            {event.max_participants && (
                              <div className="mt-3">
                                <div className="flex justify-between text-sm text-gray-400 mb-1"><span>Registrations</span><span>{event.current_registrations || 0} / {event.max_participants}</span></div>
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (((event.current_registrations || 0) / (event.max_participants || 1)) * 100))}%` }} />
                                </div>
                              </div>
                            )}
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
                          {/* Per-event winners (render as a single horizontal row) */}
                          {(() => {
                            const evWinners = (eventWinners || []).filter((w: any) => w.event_id === event.id).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                            if (!evWinners || evWinners.length === 0) return null;
                            return (
                              <div className="mb-4 per-event-winners">
                                <h4 className="font-semibold text-gray-200 mb-2">Winners</h4>
                                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar winners-row-mobile">
                                  {evWinners.map((w: any) => (
                                    <div key={w.id} className="flex-shrink-0 flex flex-col items-center gap-1 bg-gray-900/40 py-0.5 px-1 rounded mr-2">
                                      <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                                        {w.photo_url ? <img src={w.photo_url} alt={w.name} className="w-full h-full object-cover" /> : <div className="text-xs text-gray-500">No photo</div>}
                                        {/* Medal badge (use the winner's position) */}
                                        {(() => {
                                          const pos = Number(w.position || 0) || 0;
                                          const medalColor = pos === 1 ? 'bg-yellow-400 text-black' : pos === 2 ? 'bg-gray-300 text-black' : pos === 3 ? 'bg-amber-700 text-white' : 'bg-gray-500 text-white';
                                          return <div className={`absolute -bottom-3 -right-3 w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-base font-bold border-2 border-black ${medalColor}`}>{pos}</div>;
                                        })()}
                                      </div>
                                      <div className="text-center mt-2">
                                        <div className="font-semibold text-white truncate" style={{ maxWidth: 140 }}>{w.name}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {event.rules && event.rules.length > 0 && (
                            <div className="mb-4">
                              <button onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); toggleRules(event.id); }} className="flex items-center justify-between w-full text-left font-semibold text-gray-300 mb-2 hover:text-pink-400 transition-colors">
                                <div className="flex items-center"><FileText size={16} className="mr-2" />Event Rules ({event.rules.length})</div>
                                {expandedRules.has(event.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {expandedRules.has(event.id) && (
                                <div
                                  className="rules-panel rounded-xl p-4 space-y-3 max-h-56 overflow-y-auto rules-zoom-in"
                                  onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                                  onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                                  onTouchStart={(e: React.TouchEvent<HTMLDivElement>) => e.stopPropagation()}
                                >
                                  {event.rules.map((rule: string, i: number) => (
                                    <div key={i} className="flex items-start rule-line"><span className="rule-index mr-2 mt-0.5">{i + 1}.</span><span className="rule-text">{rule}</span></div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                            <div className="p-6 pt-0">
                          {canRegisterNow(event) ? (
                            <button
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); openRegistration(event.id, event.title); }}
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
                      const list = filteredWinners.filter((w: any) => w.event_id === ev.id).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                      if (!list.length) return null;
                      // group winners by position so multiple winners for same rank show together
                      const byPos: Record<number, any[]> = {};
                      list.forEach((w: any) => {
                        const p = Number(w.position || 0) || 0;
                        byPos[p] = byPos[p] || [];
                        byPos[p].push(w);
                      });
                      
                      return (
                        <div key={ev.id} className="bg-black/60 py-4 px-0 rounded-md">
                          <div className="font-semibold text-lg text-white mb-3 text-center w-full">{ev.title}</div>
                          <div className="flex gap-6 flex-nowrap md:flex-wrap overflow-x-auto no-scrollbar winners-row-mobile px-4">
                            {list.map((w: any) => {
                              const pos = Number(w.position || 0) || 0;
                              const medalColor = pos === 1 ? 'bg-yellow-400 text-black' : pos === 2 ? 'bg-gray-300 text-black' : pos === 3 ? 'bg-amber-700 text-white' : 'bg-gray-500 text-white';
                              return (
                                <div key={w.id} className="w-40 md:w-44 flex-shrink-0 flex flex-col items-center bg-gray-900/40 py-0.5 px-1 rounded">
                                  <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                                    {w.photo_url ? <img src={w.photo_url} alt={w.name} className="w-full h-full object-cover" /> : <div className="text-sm text-gray-600">No photo</div>}
                                    <div className={`absolute -bottom-3 -right-3 w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-base font-bold border-2 border-black ${medalColor}`}>{pos}</div>
                                  </div>
                                  <div className="text-center mt-2">
                                    <div className="font-semibold text-white truncate">{w.name}</div>
                                    <div className="text-xs text-gray-400">{ev.title}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </section>

      <RegistrationModal isOpen={registrationModal.isOpen} onClose={closeRegistration} eventTitle={registrationModal.eventTitle} eventId={registrationModal.eventId} />

      <style>{`
    /* Flip card styles */
  .flip-3d { perspective: 1200px; position: relative; height: 440px; }
  @media (min-width: 480px) { .flip-3d { height: 500px; } }
  @media (min-width: 768px) { .flip-3d { height: 620px; } }
  .flip-3d-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.8,.2,1); z-index: 10; }
        .flip-3d.is-flipped .flip-3d-inner { transform: rotateY(180deg); }
        /* Remove hover flip so hover can reveal motion poster video on the front; flip via click only */
        @media (hover: hover) and (pointer: fine) {
          .tilt-card:hover .flip-front-media { transform: scale(1.08); }
        }
          .flip-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 12px; overflow: hidden; }
        .flip-front { z-index: 2; }
          /* Parallax depth for media on the front */
          .flip-front-media { position: absolute; inset: 0; background-size: cover; background-position: center; transform: translateZ(18px) scale(1.03); transition: transform 400ms ease; }
          @media (hover: hover) and (pointer: fine) {
            .tilt-card:hover .flip-front-media { transform: translateZ(22px) scale(1.06); }
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
            filter: drop-shadow(0 10px 24px rgba(0,0,0,0.65));
          }
  .flip-back { transform: rotateY(180deg); background: #000; border: 1px solid rgba(255,0,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 11; }

        /* Animated neon border ring around the entire card (both faces) */
        .neon-anim-border {
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          /* Layered shadows for 3D depth */
          box-shadow:
            0 18px 36px rgba(0,0,0,0.45),
            0 8px 18px rgba(0,0,0,0.35),
            0 1px 0 rgba(255,255,255,0.06) inset,
            0 -10px 24px rgba(0,0,0,0.25) inset;
          transform-style: preserve-3d;
          transform: translateY(var(--ty, 0)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: box-shadow 250ms ease, transform 250ms ease;
          isolation: isolate; /* ensure ::before ring can sit above inner content safely */
          /* Fallback/Primary: gradient border using background-clip for wide compatibility */
          border: 1px solid transparent; /* ultra-thin ring */
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
        .particles-container { position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; }
  .particle { position:absolute; width:2px; height:2px; background: linear-gradient(45deg, #ff00ff, #06b6d4); border-radius:50%; animation: particleFloat linear infinite; }
    .particle { background: linear-gradient(45deg, #ff00ff, #0e7490); }
        @keyframes particleFloat { 0% { transform: translateY(100vh) scale(0); opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { transform: translateY(-100px) scale(1); opacity:0; } }
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
          background: rgba(17, 22, 36, 0.98);
          border: 1px solid rgba(91, 33, 182, 0.32); /* darker purple tone */
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.35);
          color: #d9d9e3;
          z-index: 2; /* above decorative layers */
          -webkit-overflow-scrolling: touch;
          backdrop-filter: blur(6px);
        }
        .rules-panel .rule-line { font-size: 0.95rem; line-height: 1.4rem; color: #e2e8f0; }
        .rules-panel .rule-index { color: #ff66e5; font-weight: 700; text-shadow: 0 0 6px rgba(255,0,255,0.35); }
        .rules-panel .rule-text { color: #e6e6f0; }
        .rules-panel::-webkit-scrollbar { width: 8px; }
  .rules-panel::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5b21b6, #0e7490); border-radius: 9999px; }
        .rules-panel::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 9999px; }

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
          .flip-front { padding-top: 42px; }
          /* Prevent inner content from colliding at the bottom */
          .flip-back .p-6 { padding: 16px; }
          .flip-back .p-6.pt-0 { padding-top: 8px; }
          /* Make badges and watch button smaller on mobile via inherited positions updated above */
  }
  }
  /* Utility to hide scrollbars */
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};