import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, AlertCircle } from 'lucide-react';

// Context
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

// Components
import { RegistrationModal } from '../components/RegistrationModal';
import { HeroBackground } from '../components/HeroBackground';
import ScrollHint from '../components/ScrollHint';
import { SEO } from '../components/SEO';
import { EventsHero } from '../components/Events/EventsHero';
import { CategoryFilter } from '../components/Events/CategoryFilter';
import { EventCard } from '../components/Events/EventCard';
import { RulesModal } from '../components/Events/RulesModal';
import { WinnersSection } from '../components/Events/WinnersSection';
import { AuthRequiredModal } from '../components/Events/AuthRequiredModal';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useToast } from '../components/ToastProvider';
import { useNavigate } from 'react-router-dom';

// Utils
import { 
  getCoordinators,
  isStructuredRules,
  unpackStructured 
} from '../utils/eventUtils';

// Styles
import '../styles/Events.css';

export const Events: React.FC = () => {
  const { 
    events, 
    eventCoordinators, 
    eventWinners = [], 
    connectionStatus, 
    lastError, 
    refreshAll, 
    siteSettings, 
    adminUsers, 
    updateEvent 
  } = useData() as any;
  const { user: firebaseUser, isAuthenticated: isFirebaseAuthenticated } = useAuth();
  const { isAuthenticated: isSupabaseAuthenticated, isProfileComplete, isApproved } = useStudentAuth();
  
  const isAnyAuthenticated = isFirebaseAuthenticated || isSupabaseAuthenticated;
  const { push } = useToast();
  const navigate = useNavigate();

  const isOwner = (() => {
    try {
      if (!firebaseUser) return false;
      const uid = firebaseUser.id || (firebaseUser as any).uid;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.id === uid && (a.role === 'owner' || a.is_primary));
    } catch { return false; }
  })();

  const [searchParams, setSearchParams] = useSearchParams();
  const registerIdParam = searchParams.get('register');
  
  // More robust matching for the registration event
  const registrationEvent = React.useMemo(() => {
    if (!registerIdParam || !events) return undefined;
    return events.find((e: any) => String(e.id) === String(registerIdParam));
  }, [events, registerIdParam]);

  const registrationEventId = registrationEvent?.id || 0;
  
  const registrationModal = React.useMemo(() => ({
    isOpen: !!registrationEvent,
    eventId: registrationEventId,
    eventTitle: registrationEvent?.title || ''
  }), [registrationEvent, registrationEventId]);

  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [rulesModalFor, setRulesModalFor] = useState<number | null>(null);
  const [authModalEventId, setAuthModalEventId] = useState<number | null>(null);
  const scrollSaveRef = useRef<number>(0);
  
  const [pageJustLoaded, setPageJustLoaded] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setPageJustLoaded(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  React.useLayoutEffect(() => {
    if (rulesModalFor === null && scrollSaveRef.current > 0) {
      window.scrollTo({ top: scrollSaveRef.current, behavior: 'instant' });
    }
  }, [rulesModalFor]);

  const openRulesModal = (id: number) => {
    if (pageJustLoaded) return;
    if (!Array.isArray(filteredEvents) || filteredEvents.length === 0) return;
    scrollSaveRef.current = window.scrollY;
    setRulesModalFor(id);
  };
  const closeRulesModal = () => setRulesModalFor(null);

  const visibleEvents = React.useMemo(() => {
    const base = (events as any[]).filter((e: any) => e.visible !== false);
    const hasManual = base.some((e: any) => e.display_order != null);
    if (hasManual) {
      return [...base].sort((a: any, b: any) => {
        const da = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const db = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (ca !== cb) return ca - cb;
        return a.id - b.id;
      });
    }
    return [...base].sort((a: any, b: any) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (at !== bt) return bt - at;
      return b.id - a.id;
    });
  }, [events]);

  const allCategoriesMap = new Map<string, string>();
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
  }, [visibleEvents]);

  const openRegistration = (eventId: number) => {
    if (!isAnyAuthenticated) {
      setAuthModalEventId(eventId);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set('register', eventId.toString());
    setSearchParams(newParams, { replace: true });
  };
  const closeRegistration = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('register');
    setSearchParams(newParams, { replace: true });
  };
  const toggleRules = (id: number) => setExpandedRules((prev: Set<number>) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlip = (id: number) => setFlippedCards((prev: Set<number>) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const posterFit: 'contain' | 'cover' = ((siteSettings as any)?.events_poster_fit === 'cover' ? 'cover' : 'contain');

  const filteredEvents = React.useMemo(() => {
    try {
      if (!visibleEvents || !Array.isArray(visibleEvents)) return [];
      if (!selectedCategory || selectedCategory === 'All') return visibleEvents;
      const key = String(selectedCategory).trim().toLowerCase();
      return (visibleEvents as any[]).filter((e: any) => String(e?.category ?? '').trim().toLowerCase() === key);
    } catch (err) { return visibleEvents || []; }
  }, [visibleEvents, selectedCategory]);

  const activeRuleItems = React.useMemo(() => {
    try {
      if (!rulesModalFor) return [];
      const ev = (events as any[]).find((e: any) => e.id === rulesModalFor);
      if (!ev || !ev.rules) return [{ content: 'No rules available', level: 'bullet' } as const];

      const items: any[] = [];
      if (isStructuredRules(ev.rules)) {
        const sections = unpackStructured(ev.rules);
        sections.forEach(sec => {
          if (sec.heading?.trim()) items.push({ content: sec.heading, level: 'h1' });
          (sec.blocks || []).forEach(block => {
            if (block.title?.trim()) items.push({ content: block.title, level: 'h2' });
            const isNumbered = (block.style || 'number') !== 'bullet';
            (block.items || []).forEach((pt: string, i: number) => {
              items.push({ content: pt, level: isNumbered ? 'numbered' : 'bullet', index: i + 1 });
            });
          });
        });
      } else {
        (ev.rules || []).forEach((rule: string, i: number) => {
          items.push({ content: rule, level: 'numbered', index: i + 1 });
        });
      }
      return items.length ? items : [{ content: 'No rules available', level: 'bullet' }];
    } catch (err) { return [{ content: 'Error loading rules', level: 'bullet' }]; }
  }, [rulesModalFor, events]);

  useEffect(() => {
    const supportsTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsTilt) return;
    const maxTilt = 12;
    const cards = Array.from(document.querySelectorAll('.tilt-card')) as HTMLElement[];
    const move = (el: HTMLElement, e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--rx', `${Math.max(-maxTilt, Math.min(maxTilt, -py * maxTilt * 2))}deg`);
      el.style.setProperty('--ry', `${Math.max(-maxTilt, Math.min(maxTilt, px * maxTilt * 2))}deg`);
    };
    const leave = (el: HTMLElement) => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };
    cards.forEach(el => {
      el.addEventListener('mousemove', (e) => move(el, e as MouseEvent));
      el.addEventListener('mouseleave', () => leave(el));
    });
  }, [flippedCards, filteredEvents]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredEvents]);

  useEffect(() => {
    setExpandedRules(new Set());
    setFlippedCards(new Set());
  }, [selectedCategory]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v: number) => (v + 1) % 1_000_000), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="stranger-theme min-h-screen" style={{ overscrollBehaviorY: 'contain' }}>
      <SEO 
        title="Events"
        description="Explore the thrilling events and competitions at Ricorrenza. From cultural showcases to intense technical battles, there's a world to discover."
      />

      <HeroBackground pageKey="events" />
      <EventsHero 
        events={events} 
        registrationModalOpen={registrationModal.isOpen} 
        rulesModalOpen={!!rulesModalFor} 
      />

      <main className="relative z-10 -mt-20">
        <ScrollHint />
        
        <div className="container mx-auto px-4 py-12">
          {connectionStatus === 'error' && (
            <div className="max-w-2xl mx-auto mb-12 animate-in slide-in-from-top duration-500">
              <div className="bg-red-950/40 backdrop-blur-md border border-red-500/50 rounded-2xl p-6 flex items-center gap-4 text-red-200 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                <div className="p-3 bg-red-500/20 rounded-xl"><AlertCircle className="text-red-500" size={24} /></div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Connection Error</h3>
                  <p className="text-sm opacity-90">{lastError || 'Something went wrong. Please refresh the page.'}</p>
                  <button onClick={refreshAll} className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all flex items-center gap-2">
                    <Zap size={16} /> Reconnect Now
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 scroll-animate">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-black text-white stranger-text mb-4">EVENT CATEGORIES</h2>
              <div className="h-1 w-24 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
            </div>
            <CategoryFilter 
              categories={categories} 
              selectedCategory={selectedCategory} 
              setSelectedCategory={setSelectedCategory} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
            {filteredEvents.map((event: any, idx: number) => (
              <EventCard
                key={event.id}
                event={event}
                index={idx}
                isOwner={isOwner}
                isFlipped={flippedCards.has(event.id)}
                onFlip={toggleFlip}
                onRegister={openRegistration}
                onOpenRules={openRulesModal}
                isRulesExpanded={expandedRules.has(event.id)}
                onToggleRules={toggleRules}
                eventWinners={eventWinners}
                coordinators={getCoordinators(event.id, eventCoordinators)}
                posterFit={posterFit}
                updateEvent={updateEvent}
              />
            ))}
          </div>

          <WinnersSection eventWinners={eventWinners} />
        </div>
      </main>

      {rulesModalFor && (
        <RulesModal
          isOpen={!!rulesModalFor}
          onClose={closeRulesModal}
          eventTitle={events.find((e: any) => e.id === rulesModalFor)?.title || ''}
          rules={activeRuleItems}
        />
      )}

      {registrationModal.isOpen && (
        <RegistrationModal
          isOpen={registrationModal.isOpen}
          onClose={closeRegistration}
          eventId={registrationModal.eventId}
          eventTitle={registrationModal.eventTitle}
        />
      )}
      <AuthRequiredModal
        isOpen={authModalEventId !== null}
        onClose={() => setAuthModalEventId(null)}
        onConfirm={() => {
          if (authModalEventId) {
            navigate(`/student/login?mode=signup&redirect=/events?register=${authModalEventId}`);
          }
          setAuthModalEventId(null);
        }}
        eventTitle={events.find((e: any) => e.id === authModalEventId)?.title || 'this event'}
      />
    </div>
  );
};