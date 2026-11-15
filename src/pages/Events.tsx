import { getRoundWinners } from '../services/roundWinners';
import { getRankingData } from '../services/rankingData';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons';

// Supabase
import { supabase } from '../lib/supabase';

// Context
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

// Components
import { CategoryFilter } from '../components/Events/CategoryFilter';
import { EventsArenaHero } from '../components/Events/EventsArenaHero';
import { RegistrationModal } from '../components/RegistrationModal';
import { eventCategory, presentRules } from '../utils/eventPresentation';
import { EventCard } from '../components/Events/EventCard';
import { RulesModal } from '../components/Events/RulesModal';
import { WinnersSection } from '../components/Events/WinnersSection';
import { AuthRequiredModal } from '../components/Events/AuthRequiredModal';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useToast } from '../components/ToastProvider';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../components/dashboard/ProfileModal';
import { useEventCart } from '../context/EventCartContext';
import { CartDrawer } from '../components/CartDrawer';



// Utils
import { getCoordinators, canRegisterNow } from '../utils/eventUtils';

// Styles
import '../styles/EventArena.css';

export const Events: React.FC = () => {
  const { 
    events, 
    eventCoordinators, 
    eventWinners = [], 
    connectionStatus, 
    lastError, 
    refreshAll, 
    adminUsers, 
    updateEvent,
    loading
  } = useData() as any;
  const { user: firebaseUser, isAuthenticated: isFirebaseAuthenticated } = useAuth();
  const { isAuthenticated: isSupabaseAuthenticated } = useStudentAuth();
  
  const isAnyAuthenticated = isFirebaseAuthenticated || isSupabaseAuthenticated;
  const { push } = useToast();
  const navigate = useNavigate();
  const { isInCart } = useEventCart();


  const isOwner = (() => {
    try {
      if (!firebaseUser) return false;
      const uid = firebaseUser.id || (firebaseUser as any).uid;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.id === uid && (a.role === 'owner' || a.is_primary));
    } catch { return false; }
  })();

  const [searchParams] = useSearchParams();
  const focusedEventId = searchParams.get('event') || searchParams.get('register');
  const focusedOnce = useRef<string | null>(null);
  
  // More robust matching for the registration event



  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [registrationEventId, setRegistrationEventId] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [rulesModalFor, setRulesModalFor] = useState<number | null>(null);
  const [authModalEventId, setAuthModalEventId] = useState<number | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Array<{ event_id: string; status: string }>>([]);
  useEffect(() => {
    if (!focusedEventId || focusedOnce.current === focusedEventId) return;
    const event = events.find((e: { id: string | number }) => String(e.id) === focusedEventId);
    if (!event) return;
    focusedOnce.current = focusedEventId;
    setSelectedCategory('All');
    setShowAllEvents(true);
    setFlippedCards(new Set([event.id as number]));
    const timer = setTimeout(() => document.getElementById(`event-${event.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => clearTimeout(timer);
  }, [focusedEventId, events]);

  const scrollSaveRef = useRef<number>(0);

  const fetchUserRegistrations = useCallback(async () => {
    if (!isAnyAuthenticated) { setUserRegistrations([]); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;

    const { data } = await supabase
      .from('registrations')
      .select('event_id, status')
      .eq('user_id', uid)
      .neq('status', 'rejected');
    
    if (data) {
      setUserRegistrations(data.map((r: any) => ({ event_id: String(r.event_id), status: r.status })));
    }
  }, [isAnyAuthenticated]);

  useEffect(() => {
    fetchUserRegistrations();
  }, [fetchUserRegistrations]);

  
  // Round winners state & fetch
  const [roundWinners, setRoundWinners] = useState<any[]>([]);
  const [selectedWinnerProfile, setSelectedWinnerProfile] = useState<any | null>(null);

  const fetchRoundWinners = useCallback(async () => {
    try {
      const data = await getRoundWinners();
      if (data) {
        setRoundWinners(data);
      }
    } catch (err) {
      console.error('[Events] Error fetching round winners:', err);
    }
  }, []);

  useEffect(() => {
    fetchRoundWinners();

    const channel = supabase
      .channel('public-winners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_rounds' }, () => {
        fetchRoundWinners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoundWinners]);

  const handleOpenWinnerProfile = async (userId: string) => {
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          aura_color,
          background_url,
          batch,
          likes_count,
          student_xp(tier, xp_total)
        `)
        .eq('id', userId)
        .single();
        
      if (p) {
        const xpRecord = Array.isArray(p.student_xp) ? p.student_xp[0] : p.student_xp;
        
        // Fetch all profiles, registrations, and rounds to calculate correct rank
        const { profiles: allProfiles, registrations: regsList, rounds: roundsList, eventRounds } = await getRankingData();

        const roundNameMap: Record<string, string> = {};
        eventRounds.forEach(er => {
          roundNameMap[er.id] = er.name;
        });

        // Count approved registrations per event to dynamically find the top 2 Major Events
        const eventCounts: Record<string, number> = {};
        regsList.forEach(r => {
          if (r.status === 'approved' && r.event_id) {
            eventCounts[r.event_id] = (eventCounts[r.event_id] || 0) + 1;
          }
        });

        const computedMajorEventIds = Object.entries(eventCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(entry => entry[0]);

        // Map rounds by registration_id (O(N))
        const roundsByRegMap: Record<string, any[]> = {};
        roundsList.forEach(rd => {
          if (!roundsByRegMap[rd.registration_id]) {
            roundsByRegMap[rd.registration_id] = [];
          }
          roundsByRegMap[rd.registration_id].push(rd);
        });

        // Map registrations by user_id (O(N))
        const userRegsMap: Record<string, any[]> = {};
        regsList.forEach(r => {
          if (!userRegsMap[r.user_id]) {
            userRegsMap[r.user_id] = [];
          }
          const rRounds = roundsByRegMap[r.id] || [];
          userRegsMap[r.user_id].push({
            ...r,
            registration_rounds: rRounds
          });
        });
          
        let calculatedRank = 100;
        if (allProfiles) {
          const sorted = allProfiles
            .map((prof: any) => {
              const likes = prof.likes_count || 0;
              const pRegs = userRegsMap[prof.id] || [];
              
              let score = likes * 10;
              pRegs.forEach((r: any) => {
                const isMajor = computedMajorEventIds.includes(r.event_id || '');
                
                if (r.status === 'approved') {
                  score += isMajor ? 30 : 15;
                }
                
                const rr = r.registration_rounds || [];
                rr.forEach((roundObj: any) => {
                  if (roundObj.status === 'qualified') {
                    // Base round qualified points
                    score += isMajor ? 40 : 20;
                    
                    // Final round bonus
                    const roundName = roundNameMap[roundObj.round_id] || '';
                    const isFinalRound = roundName.toLowerCase().includes('final');
                    if (isFinalRound) {
                      score += isMajor ? 60 : 30;
                    }
                    
                    // Winner position points
                    if (roundObj.prize_rank === '1st') {
                      score += isMajor ? 100 : 50;
                    } else if (roundObj.prize_rank === '2nd') {
                      score += isMajor ? 60 : 30;
                    } else if (roundObj.prize_rank === '3rd') {
                      score += isMajor ? 40 : 20;
                    }
                  }
                });
              });

              return {
                id: prof.id,
                hype_score: score
              };
            })
            .sort((a, b) => b.hype_score - a.hype_score);
            
          const foundIdx = sorted.findIndex(item => item.id === userId);
          if (foundIdx !== -1) {
            calculatedRank = foundIdx + 1;
          }
        }

        const pRegs = userRegsMap[p.id] || [];
        let pScore = (p.likes_count || 0) * 10;
        let pRoundsCleared = 0;
        pRegs.forEach((r: any) => {
          const isMajor = computedMajorEventIds.includes(r.event_id || '');
          
          if (r.status === 'approved') {
            pScore += isMajor ? 30 : 15;
          }
          
          const rr = r.registration_rounds || [];
          rr.forEach((roundObj: any) => {
            if (roundObj.status === 'qualified') {
              pRoundsCleared++;
              pScore += isMajor ? 40 : 20;
              
              const roundName = roundNameMap[roundObj.round_id] || '';
              const isFinalRound = roundName.toLowerCase().includes('final');
              if (isFinalRound) {
                pScore += isMajor ? 60 : 30;
              }
              
              if (roundObj.prize_rank === '1st') {
                pScore += isMajor ? 100 : 50;
              } else if (roundObj.prize_rank === '2nd') {
                pScore += isMajor ? 60 : 30;
              } else if (roundObj.prize_rank === '3rd') {
                pScore += isMajor ? 40 : 20;
              }
            }
          });
        });

        const participatedEvents = Array.from(new Set(
          pRegs
            .filter((r: any) => r.status === 'approved' && r.event)
            .map((r: any) => r.event.title)
        )) as string[];

        setFlippedCards(new Set());
        setSelectedWinnerProfile({
          id: p.id,
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
          aura_color: p.aura_color,
          background_url: p.background_url,
          batch: p.batch,
          tier: xpRecord?.tier || 'bronze',
          xp: xpRecord?.xp_total || 0,
          likes_count: p.likes_count || 0,
          hype_score: pScore,
          rank: calculatedRank,
          participated_events: participatedEvents,
          rounds_cleared: pRoundsCleared
        });
      }
    } catch (err) {
      console.error('[Events] Error loading winner profile:', err);
    }
  };

  const mergedWinners = useMemo(() => {
    const legacy = (eventWinners || []).map((w: any) => ({
      ...w,
      id: w.id,
      event_id: w.event_id,
      name: w.name,
      position: Number(w.position),
      year: w.year,
      registration_id: w.registration_id
    }));

    const newWinners: any[] = [];
    roundWinners.forEach((rw: any) => {
      const reg = rw.registration;
      if (!reg) return;

      const posMap: Record<string, number> = {
        '1st': 1,
        '2nd': 2,
        '3rd': 3,
        'Special Mention': 4
      };
      const position = posMap[rw.prize_rank] || 4;

      if (reg.is_team_registration && reg.team_members) {
        try {
          const members = Array.isArray(reg.team_members) ? reg.team_members : JSON.parse(reg.team_members);
          members.forEach((m: any) => {
            newWinners.push({
              id: `${rw.id}-${m.name || m.full_name}`,
              event_id: reg.event_id,
              event_title: reg.event_title,
              name: m.name || m.full_name || reg.full_name,
              position,
              year: m.batch || m.participant_type || reg.participant_type || '',
              registration_id: reg.id,
              user_id: m.user_id || reg.user_id
            });
          });
        } catch (e) {
          newWinners.push({
            id: rw.id,
            event_id: reg.event_id,
            event_title: reg.event_title,
            name: reg.team_name || reg.full_name,
            position,
            year: reg.participant_type || '',
            registration_id: reg.id,
            user_id: reg.user_id
          });
        }
      } else {
        newWinners.push({
          id: rw.id,
          event_id: reg.event_id,
          event_title: reg.event_title,
          name: reg.full_name,
          position,
          year: reg.participant_type || '',
          registration_id: reg.id,
          user_id: reg.user_id
        });
      }
    });

    return [...legacy, ...newWinners];
  }, [eventWinners, roundWinners]);

  React.useLayoutEffect(() => {
    if (rulesModalFor === null && scrollSaveRef.current > 0) {
      window.scrollTo({ top: scrollSaveRef.current, behavior: 'instant' });
    }
  }, [rulesModalFor]);

  const openRulesModal = (id: number) => {
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

  const openRegistration = (eventId: number) => {
    const event = events.find((e: any) => String(e.id) === String(eventId));
    if (!event || !canRegisterNow(event)) {
      push({ type: 'error', message: 'Registration is currently closed for this event.' });
      return;
    }
    if (!isSupabaseAuthenticated) {
      setAuthModalEventId(eventId);
      return;
    }
    if (userRegistrations.some(r => r.event_id === String(eventId))) {
      navigate('/dashboard/events');
      return;
    }
    setRegistrationEventId(eventId);
  };
  const toggleRules = (id: number) => setExpandedRules((prev: Set<number>) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlip = (id: number) => setFlippedCards(prev => prev.has(id) ? new Set() : new Set([id]));

  const filteredEvents = React.useMemo(() => {
    try {
      if (!visibleEvents || !Array.isArray(visibleEvents)) return [];
      if (!selectedCategory || selectedCategory === 'All') return visibleEvents;
      const key = String(selectedCategory).trim().toLowerCase();
      return (visibleEvents as any[]).filter((e: any) => eventCategory(e?.category).toLowerCase() === key);
    } catch (err) { return visibleEvents || []; }
  }, [visibleEvents, selectedCategory]);

  const activeRuleItems = useMemo(() => presentRules(events.find((event: any) => event.id === rulesModalFor)?.rules), [rulesModalFor, events]);
  const displayedEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 4);

  // Reveal the shared event link immediately, including when the page is entered after sign in.
  const changeCategory = (category: string) => {
    setSelectedCategory(category);
    setShowAllEvents(false);
    setFlippedCards(new Set());
    setExpandedRules(new Set());
  };


  return (
    <div className="arena-page">
      <EventsArenaHero />
      <div className="arena-main" id="event-arena">
          {connectionStatus === 'error' && <div className="arena-connection-error" role="alert"><p>{lastError || 'We could not refresh the events. Please try again.'}</p><button type="button" className="arena-gold-button" onClick={refreshAll}><ReloadIcon /> Refresh events</button></div>}
          <CategoryFilter selectedCategory={selectedCategory} setSelectedCategory={changeCategory} />
          <div className="arena-list-heading"><p>{selectedCategory === 'All' ? 'Every passion has a place here' : `${selectedCategory} / Find your moment`}</p><span aria-live="polite">{loading && !visibleEvents.length ? 'Loading events…' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'} to explore`}</span></div>
          <div className="arena-grid" aria-busy={loading && !visibleEvents.length}>
            {loading && !visibleEvents.length ? Array.from({ length: 4 }, (_, index) => <div className="arena-skeleton" key={index} aria-hidden="true" />) : displayedEvents.map((event: any, idx: number) => (
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
                eventWinners={mergedWinners}
                coordinators={getCoordinators(event.id, eventCoordinators)}
                posterFit="cover"
                updateEvent={updateEvent}
                onOpenProfile={handleOpenWinnerProfile}
                isInCart={isInCart(String(event.id))}
                isRegistered={userRegistrations.some(r => r.event_id === String(event.id) && r.status !== 'payment_pending')}
                isPaymentPending={userRegistrations.some(r => r.event_id === String(event.id) && r.status === 'payment_pending')}
              />
            ))}
          </div>
          {!loading && !filteredEvents.length && <div className="arena-empty"><h2>The arena is getting ready.</h2><p>{selectedCategory === 'All' ? 'Events will appear here as soon as they are announced.' : 'No events in this category yet. Explore another arena.'}</p>{selectedCategory !== 'All' && <button className="arena-gold-button" onClick={() => changeCategory('All')}>Explore all events <ArrowRightIcon /></button>}</div>}
          {!showAllEvents && filteredEvents.length > 4 ? <div className="arena-view-all"><button type="button" className="arena-gold-button" onClick={() => setShowAllEvents(true)}>View all events <span>({filteredEvents.length})</span><ArrowRightIcon /></button></div> : filteredEvents.length > 0 && <p className="arena-result-note">You've reached the edge of the arena.</p>}
          <WinnersSection eventWinners={mergedWinners} events={visibleEvents} onOpenProfile={handleOpenWinnerProfile} onOpenEvent={id => { setSelectedCategory('All'); setShowAllEvents(true); setFlippedCards(new Set([id as any])); }} />
      </div>

      {rulesModalFor && (
        <RulesModal
          isOpen={!!rulesModalFor}
          onClose={closeRulesModal}
          eventTitle={events.find((e: any) => e.id === rulesModalFor)?.title || ''}
          rules={activeRuleItems}
        />
      )}

       <AuthRequiredModal
        isOpen={authModalEventId !== null}
        onClose={() => setAuthModalEventId(null)}
        onConfirm={() => {
          if (authModalEventId) {
            navigate(`/student/login?mode=signup&redirect=${encodeURIComponent(`/events?event=${authModalEventId}`)}`);
          }
          setAuthModalEventId(null);
        }}
        eventTitle={events.find((e: any) => e.id === authModalEventId)?.title || 'this event'}
      />
      {selectedWinnerProfile && (
        <ProfileModal
          profile={selectedWinnerProfile}
          onClose={() => setSelectedWinnerProfile(null)}
          onLike={() => {}}
          isLiked={false}
        />
      )}
      {registrationEventId !== null && <RegistrationModal isOpen onClose={() => { setRegistrationEventId(null); void fetchUserRegistrations(); }} eventId={registrationEventId} eventTitle={events.find((event: any) => event.id === registrationEventId)?.title || 'Event'} />}
      <CartDrawer onRegisterSuccess={fetchUserRegistrations} />
    </div>
  );
};
