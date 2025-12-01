import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { computeLiveStatus, formatPreLiveCountdown } from '../utils/eventTime';
import WatchLiveButton from '../components/WatchLiveButton';
import { LIVE_LEAD_MINUTES } from '../config/liveStream';
import HeroBackground from '../components/HeroBackground';
// Registration is disabled on Schedule; users will open the event card instead.
import ScrollHint from '../components/ScrollHint';
import { SEO } from '../components/SEO';

export const Schedule: React.FC = () => {
  const { schedule, loading, events, guestArtists, eventCoordinators } = useData() as any;
  const [selectedDay, setSelectedDay] = useState(0);
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});
  const toggleOpen = (idx: number) => setOpenIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  // Registration flow removed on Schedule page; navigation to Events card is used instead.

  // Persist expanded rows per session (per selected day)
  useEffect(() => {
    if (!schedule || schedule.length === 0) return;
    const dayKey = `schedule-open-v1-${selectedDay}-${schedule[selectedDay]?.date || ''}`;
    try {
      const raw = sessionStorage.getItem(dayKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<number, boolean>;
        setOpenIndices(parsed || {});
      } else {
        setOpenIndices({});
      }
    } catch {
      setOpenIndices({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, schedule.length]);

  useEffect(() => {
    if (!schedule || schedule.length === 0) return;
    const dayKey = `schedule-open-v1-${selectedDay}-${schedule[selectedDay]?.date || ''}`;
    try {
      sessionStorage.setItem(dayKey, JSON.stringify(openIndices));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndices]);

  // Ensure selectedDay stays within bounds when schedule changes
  useEffect(() => {
    if (schedule.length === 0) {
      if (selectedDay !== 0) setSelectedDay(0);
      return;
    }
    if (selectedDay >= schedule.length) {
      setSelectedDay(Math.max(0, schedule.length - 1));
    }
  }, [schedule.length]);

  // Intersection Observer for scroll animations
  // Re-run when schedule or selected day changes so newly mounted nodes are observed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const animatedElements = document.querySelectorAll('.scroll-animate');

    if (!('IntersectionObserver' in window)) {
      animatedElements.forEach((el) => el.classList.add('animate-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            try { observer.unobserve(entry.target); } catch {}
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

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

    try {
      const nodesNow = Array.from(document.querySelectorAll('.scroll-animate')) as HTMLElement[];
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      nodesNow.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.top < viewportH * 0.9) {
          n.classList.add('animate-in');
          try { (n as any).__observed = true; } catch {}
        }
      });
    } catch (e) { /* ignore */ }

    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 300);
    const safety = setTimeout(() => document.querySelectorAll('.scroll-animate').forEach((el) => (el as HTMLElement).classList.add('animate-in')), 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); observer.disconnect(); };
  }, [schedule, selectedDay, loading]);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cultural':
        return 'from-purple-500 to-pink-500';
      case 'Technical':
        return 'from-blue-500 to-cyan-500';
      case 'Sports':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Per-second tick to refresh live status (LIVE / Opens in / NOT LIVE)
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Registration gating helpers removed; Schedule no longer offers registration UI.

  // Map link helper removed

  const renderLiveBadge = (evt: any, dayDate: string) => {
    let watch_live_url: string | null | undefined = null;
    let registration_open: boolean | undefined = undefined;
    let startDateStr: string | null | undefined = null;
    let startTimeStr: string | null | undefined = null;
    let forceLive = false;

    if (evt.event_id) {
      const linked = events?.find((e: any) => e.id === evt.event_id);
      if (linked) {
        watch_live_url = (linked as any).watch_live_url;
        registration_open = (linked as any).registration_open;
        startDateStr = linked.date;
        startTimeStr = linked.time;
        forceLive = !!(linked as any).registration_open || !!linked.featured;
      }
    } else if (evt.guest_artist_id) {
      const ga = guestArtists?.find((g: any) => g.id === evt.guest_artist_id);
      if (ga) {
        watch_live_url = (ga as any).watch_live_url;
        registration_open = false; // no registration flag for guest artist force
        startDateStr = dayDate;
        startTimeStr = evt.time;
        forceLive = !!(ga as any).live_now_enabled || !!(ga as any).is_featured;
      }
    } else {
      // Unlinked – treat schedule day date + time as baseline but no stream unless explicit
      startDateStr = dayDate;
      startTimeStr = evt.time;
      watch_live_url = (evt as any).watch_live_url;
      registration_open = (evt as any).registration_open;
      forceLive = !!registration_open || !!(evt as any).force_live_override;
    }

    const { isLive, isPreLive, deltaMs } = computeLiveStatus(startDateStr, startTimeStr, {
      now: nowTs,
      leadMinutes: LIVE_LEAD_MINUTES,
      registrationOpen: registration_open,
    });
    const wlu = watch_live_url;
    if (isLive && wlu) {
      return (
        <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] sm:text-xs font-semibold shadow-inner ${forceLive ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 shadow-pink-400/30' : 'bg-green-600 shadow-green-400/30'}`} title={forceLive ? 'Early Access Live (forced)' : 'Live'}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${forceLive ? 'bg-white ring-1 ring-amber-300' : 'bg-white'}`} />
          </span>
          {forceLive ? 'EARLY LIVE' : 'LIVE'}
        </span>
      );
    }
    if (isPreLive && typeof deltaMs === 'number' && wlu && !forceLive) {
      return (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs font-semibold shadow-inner shadow-blue-400/30">
          Opens in {formatPreLiveCountdown(deltaMs)}
        </span>
      );
    }
    if (wlu && !forceLive) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-200 text-[10px] sm:text-xs font-medium border border-gray-600">
          NOT LIVE
        </span>
      );
    }
    return null;
  };

  // Social media display flags were unused in this view; removed to satisfy noUnusedLocals

  return (
    <div className="cyberpunk-theme min-h-screen">
      <SEO 
        title="Schedule" 
        description="Check the complete timeline of events for RICORRENZA 2026." 
        canonical="https://ricorrenza.fun/schedule" 
      />
      {/* One-time mobile scroll hint */}
      <ScrollHint />
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="schedule" />

        {/* Floating Particles removed */}

  {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Clock className="w-4 h-4 mr-2 animate-pulse" />
              TIMELINE
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-8xl font-black mb-6 cyberpunk-title">
              EVENT <span className="neon-blue">SCHEDULE</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Plan your <span className="neon-pink">journey</span> through our 
              <span className="neon-purple"> detailed timeline</span> of digital experiences
            </p>
          </div>
        </div>
      </section>

      {/* Day Navigation */}
      <section className="py-12 relative overflow-y-auto max-h-screen">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card p-2">
                <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                    disabled={selectedDay === 0}
                    className={`cyberpunk-btn cyberpunk-btn-secondary flex-shrink-0 ${selectedDay === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                    {/* Loading skeletons when schedule is being fetched on direct refresh */}
                    {loading && schedule.length === 0 && (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="px-6 py-4 rounded-lg border-2 border-gray-700 bg-gray-800/50 animate-pulse">
                          <div className="h-4 w-16 bg-gray-600 rounded mb-2"></div>
                          <div className="h-3 w-24 bg-gray-700 rounded mb-1"></div>
                          <div className="h-3 w-8 bg-gray-700 rounded"></div>
                        </div>
                      ))
                    )}

                    {/* Day buttons when data is ready */}
                    {!loading && schedule.length > 0 && schedule.map((day: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index)}
                        className={`px-3 sm:px-6 py-3 sm:py-4 rounded-lg font-medium transition-all duration-300 border-2 flex-shrink-0 ${
                          selectedDay === index
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                            : 'text-gray-300 border-gray-600 hover:border-blue-500/50 hover:text-blue-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold text-sm sm:text-lg">{day.day}</div>
                          <div className="text-xs opacity-75 hidden sm:block">{day.date}</div>
                          <div className="text-xs mt-1">{(day.events ?? []).length}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setSelectedDay(Math.min(schedule.length - 1, selectedDay + 1))}
                    disabled={selectedDay === schedule.length - 1}
                    className={`cyberpunk-btn cyberpunk-btn-secondary flex-shrink-0 ${selectedDay === schedule.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                {/* Connection status note when empty */}
                {(!loading && schedule.length === 0) && (
                  <div className="px-4 pb-3 pt-2 text-center text-sm text-gray-400">
                    <span>Schedule will be published soon. Please check back later.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Day Schedule */}
      {schedule.length > 0 && (
        <section className="py-12 relative">
          <div className="container mx-auto px-4">
            <div className="cyberpunk-card overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-7 text-white">
                <div className="scroll-animate opacity-0 transform translate-y-20">
                  <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold uppercase mb-4 cyberpunk-title selected-day-title leading-tight tracking-tight">{String(schedule[selectedDay].title || '').toUpperCase()}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm sm:text-lg opacity-90">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {schedule[selectedDay].date}
                    </div>
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2" />
                      {(schedule[selectedDay]?.events ?? []).length} Events Scheduled
                    </div>
                  </div>
                </div>
              </div>

              {/* Events Timeline */}
              <div className="p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  {(schedule[selectedDay]?.events ?? []).map((event: any, index: number) => (
                    <div
                      key={index}
                      className="scroll-animate opacity-0 transform translate-y-20"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="cyberpunk-card group border-l-4 border-blue-500">
                        <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 p-4 sm:p-6">
                          {/* Time Block */}
                          <div className="flex-shrink-0 text-center mb-4 sm:mb-0">
                            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 rounded-lg border border-blue-500/50">
                              <div className="text-sm sm:text-lg font-bold neon-blue">{event.time}</div>
                              <div className="text-xs text-gray-400 mt-1">{event.duration}</div>
                            </div>
                          </div>
                          
                          {/* Event Details */}
                          <div className="flex-grow w-full">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors flex items-center flex-wrap">
                                <span className="pr-2">{event.title}</span>
                                {renderLiveBadge(event, schedule[selectedDay].date)}
                              </h3>
                              {/* Make the category/type pill larger on phones (text-base) but keep desktop size at sm:text-sm */}
                              <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-base sm:text-sm font-medium bg-gradient-to-r ${getTypeColor(event.type)} text-white shadow-lg flex-shrink-0 ml-2`}>
                                {event.type}
                              </span>
                            </div>
                            
                            <div className="flex items-center text-gray-400 mb-2 text-sm">
                              <MapPin size={16} className="mr-2 text-purple-400" />
                              <span>{event.venue}</span>
                            </div>
                            
                            {/* Event Type Indicator */}
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTypeColor(event.type)}`}></div>
                              <span className="text-xs sm:text-sm text-gray-500">Duration: {event.duration}</span>
                            </div>
                            {(() => {
                              // Inline WatchLiveButton (optional) leveraging same resolution as badge
                              const dayDate = schedule[selectedDay].date;
                              let watch_live_url: string | null | undefined = null;
                              let startDateStr: string | null | undefined = null;
                              let startTimeStr: string | null | undefined = null;
                              let forceLive = false;
                              let registration_open: boolean | undefined = undefined;
                              if (event.event_id) {
                                const linked = events?.find((e: any) => e.id === event.event_id);
                                if (linked) {
                                  watch_live_url = (linked as any).watch_live_url;
                                  startDateStr = linked.date; startTimeStr = linked.time;
                                  registration_open = (linked as any).registration_open;
                                  forceLive = !!(linked as any).registration_open || !!linked.featured;
                                }
                              } else if (event.guest_artist_id) {
                                const ga = guestArtists?.find((g: any) => g.id === event.guest_artist_id);
                                if (ga) {
                                  watch_live_url = (ga as any).watch_live_url;
                                  startDateStr = dayDate; startTimeStr = event.time;
                                  registration_open = false;
                                  forceLive = !!(ga as any).live_now_enabled || !!(ga as any).is_featured;
                                }
                              } else {
                                watch_live_url = (event as any).watch_live_url;
                                startDateStr = dayDate; startTimeStr = event.time;
                                registration_open = (event as any).registration_open;
                                forceLive = !!registration_open || !!(event as any).force_live_override;
                              }
                              if (!watch_live_url || !startDateStr || !startTimeStr) return null;
                              const startIso = new Date(`${startDateStr} ${startTimeStr}`).toISOString();
                              return (
                                <div className="mt-3">
                                  <WatchLiveButton url={watch_live_url} startTime={startIso} leadMinutes={LIVE_LEAD_MINUTES} forceLive={forceLive} size="xs" />
                                </div>
                              );
                            })()}

                            {/* Expand/collapse details in-place (no navigation) */}
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => toggleOpen(index)}
                                className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-300 hover:text-white px-3 py-1 rounded border border-blue-500/40 hover:border-blue-400/70 bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                                aria-expanded={!!openIndices[index]}
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${openIndices[index] ? 'rotate-180' : ''}`} />
                                {openIndices[index] ? 'Hide details' : 'View details'}
                              </button>
                              {openIndices[index] && (() => {
                                // Resolve linked details and coordinators
                                let linkedTitle: string | undefined;
                                let linkedDesc: string | undefined;
                                let img: string | undefined;
                                let coords: Array<{ id: number; name: string; phone?: string | null }> = [];
                                let linkedEvent: any | undefined;
                                if (event.event_id) {
                                  const ev = events?.find((e: any) => e.id === event.event_id);
                                  linkedEvent = ev;
                                  linkedTitle = ev?.title;
                                  linkedDesc = ev?.description;
                                  img = (ev as any)?.image;
                                  const list = (eventCoordinators || []).filter((c: any) => c.event_id === event.event_id);
                                  coords = list.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone }));
                                } else if (event.guest_artist_id) {
                                  const ga = guestArtists?.find((g: any) => g.id === event.guest_artist_id);
                                  linkedTitle = ga?.name;
                                  linkedDesc = (ga as any)?.description;
                                  img = (ga as any)?.image;
                                } else {
                                  linkedTitle = event.title;
                                  linkedDesc = (event as any)?.description;
                                  img = (event as any)?.image;
                                }
                                return (
                                  <div className="mt-3 p-3 sm:p-4 rounded-lg border border-white/10 bg-white/5">
                                    <div className="flex gap-3 items-start">
                                      {img ? (
                                        <img src={img} alt={linkedTitle || 'event'} className="w-20 h-20 object-contain bg-black rounded-md border border-white/10 flex-shrink-0" />
                                      ) : null}
                                      <div className="flex-1 min-w-0">
                                        {linkedTitle && <div className="text-white font-semibold text-sm sm:text-base mb-1">{linkedTitle}</div>}
                                        {linkedDesc && <p className="text-gray-300 text-xs sm:text-sm whitespace-pre-line line-clamp-5">{linkedDesc}</p>}
                                        {(() => {
                                          const clean = coords.filter((c: any) => {
                                            const n = String(c.name ?? '').trim();
                                            const p = String(c.phone ?? '').trim();
                                            if (!n && !p) return false;
                                            if ((n === '0' || n === '-' || n === '—') && !p) return false;
                                            return true;
                                          });
                                          if (clean.length === 0) return null;
                                          return (
                                          <div className="mt-3">
                                            <div className="text-xs text-gray-400 mb-1">Coordinators</div>
                                            <ul className="text-xs text-gray-200 space-y-0.5">
                                              {clean.map((c: any) => {
                                                const n = String(c.name ?? '').trim();
                                                const p = String(c.phone ?? '').trim();
                                                return <li key={c.id}>{n}{p ? ` • ${p}` : ''}</li>;
                                              })}
                                            </ul>
                                          </div>
                                          );
                                        })()}

                                        {/* Direct navigation to the linked event card (registration disabled on Schedule) */}
                                        {linkedEvent && (
                                          <div className="mt-3">
                                            <a
                                              href={`/events#event-${linkedEvent.id}`}
                                              onClick={(e) => e.stopPropagation()}
                                              className="cyberpunk-btn cyberpunk-btn-primary btn-xs whitespace-nowrap text-xs px-2 py-1 sm:text-base sm:px-4 sm:py-2 flex flex-col items-center justify-center"
                                              title="Open event card"
                                            >
                                              <span className="sm:inline hidden">OPEN EVENT</span>
                                              <span className="inline sm:hidden">OPEN</span>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats - hide while loading initial data to avoid flashing 0s */}
      {!loading && (
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="cyberpunk-card">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 p-4 sm:p-8 text-center">
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-blue mb-2">{schedule.length}</div>
                  <div className="text-gray-400 text-sm sm:text-base">Days of Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-purple mb-2">
                    {schedule.reduce((total: number, day: any) => total + (day.events ?? []).length, 0)}
                  </div>
                  <div className="text-gray-400 text-sm sm:text-base">Total Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-pink mb-2">12+</div>
                  <div className="text-gray-400 text-sm sm:text-base">Venues</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* RegistrationModal removed: Schedule no longer handles registration */}

      <style>
        {`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        /* particles CSS removed */

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 2px #ff00ff,
            0 0 4px #ff00ff;
        }

        /* Theme-aware neon (matches --theme-accent) */
        .neon-blue {
          color: var(--theme-accent, #00ffff);
          text-shadow:
            0 0 2px var(--theme-accent, #00ffff),
            0 0 4px var(--theme-accent, #00ffff);
        }

        /* Progressive enhancement: smoother glow on browsers supporting color-mix */
        @supports (color: color-mix(in srgb, #000 0%, #000 100%)) {
          .neon-blue {
            text-shadow:
              0 0 2px color-mix(in srgb, var(--theme-accent, #00ffff) 60%, transparent),
              0 0 4px color-mix(in srgb, var(--theme-accent, #00ffff) 40%, transparent);
          }
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 2px #8a2be2,
            0 0 4px #8a2be2;
        }

        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-secondary {
          border-color: var(--theme-accent, #00ffff);
          color: var(--theme-accent, #00ffff);
          box-shadow:
            0 0 10px color-mix(in srgb, var(--theme-accent, #00ffff) 20%, transparent),
            inset 0 0 10px color-mix(in srgb, var(--theme-accent, #00ffff) 10%, transparent);
        }

        .cyberpunk-btn-secondary:hover {
          background: color-mix(in srgb, var(--theme-accent, #00ffff) 10%, transparent);
          box-shadow:
            0 0 20px color-mix(in srgb, var(--theme-accent, #00ffff) 40%, transparent),
            inset 0 0 20px color-mix(in srgb, var(--theme-accent, #00ffff) 15%, transparent);
          transform: translateY(-2px);
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid color-mix(in srgb, var(--theme-accent, #00ffff) 30%, transparent);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .cyberpunk-card:hover::before {
          transform: translateX(0);
        }

        .cyberpunk-card:hover {
          border-color: rgba(255, 0, 255, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(255, 0, 255, 0.1);
          transform: translateY(-5px);
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        /* 3D animated icon button for Map link */
        /* Map button styles removed */

        /* Mobile optimizations */
        @media (max-width: 768px) {
          /* Increase title size on small tablets / large phones */
          .cyberpunk-title {
            font-size: 2.75rem;
          }
          /* Make the selected day title scale automatically on small -> medium screens.
             clamp(min, preferred, max) keeps it readable without overflowing. */
          .selected-day-title {
            font-size: clamp(1.8rem, 7.5vw, 3.4rem) !important;
            line-height: 1.04 !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          /* particles CSS removed */
          
          .cyberpunk-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .cyberpunk-card {
            margin: 0 4px;
          }
        }
        
        @media (max-width: 480px) {
          /* Make the schedule title noticeably larger on phones */
          .cyberpunk-title {
            font-size: 2.25rem;
          }
          /* On very narrow phones, allow the clamp() preferred value to control size
             while ensuring it doesn't overflow the card. */
          .selected-day-title {
            font-size: clamp(1.8rem, 9.5vw, 3.8rem) !important;
            line-height: 1.02 !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }

        /* Tiny button variant for tight layouts (e.g., Schedule "Open Event") */
        .btn-xs { padding: 6px 10px; font-size: 0.72rem; line-height: 1; }
        @media (max-width: 768px) {
          .btn-xs { padding: 6px 10px; font-size: 0.7rem; }
        }
        @media (max-width: 480px) {
          .btn-xs { padding: 4px 8px; font-size: 0.66rem; }
        }
        `}
      </style>
    </div>
  );
};