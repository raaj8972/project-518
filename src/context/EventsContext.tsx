import { SITE_FEATURES, isSportsContent } from '../constants/siteFeatures';
import { useDomainRealtime } from '../hooks/useDomainRealtime';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { dualInsert, dualUpdate, dualDelete, dualUpsert, dualRead, invalidateTableCache } from '../lib/dualDb';
import { 
  Event, EventCoordinator, EventCategory, ScheduleDay, ScheduleEvent, 
  RoadmapMilestone
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchAllEvents } from '../utils/dataUtils';
import { scheduleDayType, sortSchedule } from '../utils/schedulePresentation';

interface EventsContextType {
  events: Event[];
  eventCoordinators: EventCoordinator[];
  eventCategories: EventCategory[];
  schedule: ScheduleDay[];
  eventWinners: any[];
  notifications: any[];
  roadmapMilestones: RoadmapMilestone[];
  loading: boolean;
  isLoaded: boolean;
  scheduleError: string | null;
  eventsError: string | null;
  
  addEvent: (event: Partial<Event>) => Promise<void>;
  addEventWithCoordinators: (event: Partial<Event>, coordinators: any[]) => Promise<Event | undefined>;
  updateEvent: (id: number, event: Partial<Event>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  reorderEvents: (orderedIds: number[]) => Promise<boolean>;
  reorderEventCategories: (orderedIds: number[]) => Promise<boolean>;
  
  addEventWinner: (winner: any) => Promise<void>;
  updateEventWinner: (id: number, patch: Partial<any>) => Promise<void>;
  deleteEventWinner: (id: number) => Promise<void>;
  
  addNotification: (n: any) => Promise<void>;
  updateNotification: (id: number, patch: Partial<any>) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;

  addEventCategory: (cat: Partial<EventCategory>) => Promise<void>;
  updateEventCategory: (id: number, patch: Partial<EventCategory>) => Promise<void>;
  deleteEventCategory: (id: number) => Promise<void>;
  
  addEventCoordinator: (coord: Partial<EventCoordinator>) => Promise<EventCoordinator | undefined>;
  updateEventCoordinator: (id: number, patch: Partial<EventCoordinator>) => Promise<void>;
  deleteEventCoordinator: (id: number) => Promise<void>;
  
  toggleEventVisibility: (id: number) => Promise<void>;
  toggleEventFeatured: (id: number) => Promise<void>;
  toggleEventRegistration: (id: number) => Promise<void>;

  addScheduleDay: (day: Partial<ScheduleDay>) => Promise<any>;
  updateScheduleDay: (id: number, patch: Partial<ScheduleDay>) => Promise<void>;
  deleteScheduleDay: (id: number) => Promise<void>;
  
  addScheduleEvent: (dayId: number, evt: Partial<ScheduleEvent>) => Promise<void>;
  updateScheduleEvent: (id: number, patch: Partial<ScheduleEvent>) => Promise<void>;
  deleteScheduleEvent: (id: number) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

// [DEDUPE] Use window bridge for singleton Context
const PrimaryEventsContext = ((typeof window !== 'undefined') 
  ? ((window as any).__EVENTS_CONTEXT__ || ((window as any).__EVENTS_CONTEXT__ = EventsContext))
  : EventsContext) as React.Context<EventsContextType | undefined>;

export const useEventsData = () => {
  const context = useContext(PrimaryEventsContext);
  if (context === undefined) {
    throw new Error('useEventsData must be used within an EventsProvider');
  }
  return context;
};

export function EventsProvider({ children, enabled = true }: { children: ReactNode, enabled?: boolean }) {
  const { refreshTrigger } = useCoreData();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCoordinators, setEventCoordinators] = useState<EventCoordinator[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [eventWinners, setEventWinners] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [roadmapMilestones, setRoadmapMilestones] = useState<RoadmapMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const fetchEventsData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);

    console.log('[EventsContext] fetchEventsData started');
    const start = Date.now();
    try {
      const results = await Promise.allSettled([
        fetchAllEvents().then(r => { if (r.error) throw r.error; console.log('✔ events'); return r; }),
        dualRead({ table: 'event_coordinators' }).then(r => { console.log('✔ event_coordinators'); return r; }),
        dualRead({ table: 'event_categories' }).then(r => { console.log('✔ event_categories'); return r; }),
        dualRead({ table: 'schedule_days' }).then(r => { console.log('✔ schedule_days'); return r; }),
        dualRead({ table: 'roadmap_milestones', order: ['order_position', { ascending: true }] }),
        dualRead({ table: 'schedule_events' }),
        dualRead({ table: 'event_winners' }),
        dualRead({ table: 'notifications' })
      ]);

      const [eventsRes, coordinatorsRes, categoriesRes, scheduleRes, roadmapRes, scheduleEventsRes, winnersRes, notifyRes] = results.map(result => result.status === 'fulfilled' ? result.value : { data: null });
      setEventsError(results[0].status === 'rejected' ? 'Events could not load. Check your connection and retry.' : null);
      setScheduleError(results[3].status === 'rejected' || results[5].status === 'rejected' ? 'The schedule could not load completely. Check your connection and retry.' : null);

      if (eventsRes.data) setEvents(eventsRes.data || []);
      if (coordinatorsRes.data) setEventCoordinators(coordinatorsRes.data || []);
      if (categoriesRes.data) setEventCategories(categoriesRes.data || []);
      
      if (scheduleRes.data && scheduleEventsRes.data) {
        const days = scheduleRes.data || [];
        const allScheduleEvents = scheduleEventsRes.data || [];
        console.log('✔ schedule_events');
        
        const mappedSchedule = days.map((day: any) => {
          const dayEvents = (allScheduleEvents || []).filter((e: any) => e.schedule_day_id === day.id);
          
          return {
            ...day,
            events: dayEvents,
            schedule_type: scheduleDayType(day)
          };
        });
        
        setSchedule(sortSchedule(mappedSchedule));
      }
      
      if (roadmapRes.data) {
        setRoadmapMilestones(roadmapRes.data || []);
      }
      // Fetch winners
      console.log('✔ event_winners');
      if (winnersRes.data) {
        setEventWinners(winnersRes.data || []);
      }

      console.log('[EventsContext] Fetching notifications...');
      const nowIso = new Date().toISOString();
      const notifyData = notifyRes.data;
      console.log('✔ notifications');
      
      const filteredNotifications = (notifyData || []).filter((n: any) => 
        n.visible && 
        n.starts_at <= nowIso && 
        (!n.ends_at || n.ends_at > nowIso)
      ).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
      
      setNotifications(filteredNotifications);

      console.log(`[EventsContext] Data fetched in ${Date.now() - start}ms`);
    } catch (err) {
      console.error('[EventsContext] Failed to fetch events data', err);
    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchEventsData();
    }
  }, [fetchEventsData, refreshTrigger, user?.id, enabled]);

  useDomainRealtime('events-context-realtime', enabled, ['events', 'event_categories', 'event_coordinators', 'schedule_days', 'schedule_events', 'event_winners', 'notifications', 'roadmap_milestones'], fetchEventsData);

  // Realtime is primary; a lightweight events-only refresh recovers missed counter updates.
  useEffect(() => {
    if (!enabled) return;
    let active = true; let running = false;
    const refreshCounts = async () => {
      if (!active || running || document.hidden) return;
      running = true;
      try { const result = await dualRead({ table: 'events', forceRefresh: true, order: ['display_order', { ascending: true }] }); if (active && result.data) setEvents(result.data); }
      catch { /* Keep the last known events during a temporary connection failure. */ }
      finally { running = false; }
    };
    const timer = window.setInterval(() => void refreshCounts(), 60000);
    const focused = () => void refreshCounts(); window.addEventListener('focus', focused);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focused); };
  }, [enabled]);

  const addEvent = async (event: Partial<Event>) => {
    await dualInsert('events', {
      ...event,
      visible: event.visible ?? true,
      registration_open: event.registration_open ?? true,
      featured: event.featured ?? false
    });
    await fetchEventsData();
  };

  const addEventWithCoordinators = async (event: Partial<Event>, coordinators: any[]) => {
    // dualInsert returns an array or object. Let's assume array of results.
    const result = await dualInsert('events', {
      ...event,
      visible: event.visible ?? true,
      registration_open: event.registration_open ?? true,
      featured: event.featured ?? false
    });
    const insertedEvent = Array.isArray(result) ? result[0] : result;
    
    if (insertedEvent && insertedEvent.id && coordinators && coordinators.length > 0) {
      const coordsToInsert = coordinators.map((c, index) => ({
        event_id: insertedEvent.id,
        name: c.name,
        phone: c.phone || null,
        order_position: index + 1
      }));
      await dualInsert('event_coordinators', coordsToInsert);
    }
    
    await fetchEventsData();
    return insertedEvent as Event | undefined;
  };

  const updateEvent = async (id: number, event: Partial<Event>) => {
    await dualUpdate('events', id, event);
    await fetchEventsData();
  };

  const deleteEvent = async (id: number) => {
    await dualDelete('events', id);
    await fetchEventsData();
  };

  const reorderEvents = async (orderedIds: number[]): Promise<boolean> => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index
      }));
      await dualUpsert('events', updates);
      await fetchEventsData();
      return true;
    } catch (err) {
      console.error('[EventsContext] reorderEvents failed', err);
      return false;
    }
  };

  const reorderEventCategories = async (orderedIds: number[]): Promise<boolean> => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index
      }));
      await dualUpsert('event_categories', updates);
      await fetchEventsData();
      return true;
    } catch (err) {
      console.error('[EventsContext] reorderEventCategories failed', err);
      return false;
    }
  };

  const addEventWinner = async (winner: any) => {
    await dualInsert('event_winners', winner);
    await fetchEventsData();
  };

  const updateEventWinner = async (id: number, patch: Partial<any>) => {
    await dualUpdate('event_winners', id, patch);
    await fetchEventsData();
  };

  const deleteEventWinner = async (id: number) => {
    await dualDelete('event_winners', id);
    await fetchEventsData();
  };

  const addNotification = async (n: any) => {
    await dualInsert('notifications', n);
    await fetchEventsData();
  };

  const updateNotification = async (id: number, patch: Partial<any>) => {
    await dualUpdate('notifications', id, patch);
    await fetchEventsData();
  };

  const deleteNotification = async (id: number) => {
    await dualDelete('notifications', id);
    await fetchEventsData();
  };

  const addEventCategory = async (cat: Partial<EventCategory>) => {
    await dualInsert('event_categories', cat);
    await fetchEventsData();
  };

  const updateEventCategory = async (id: number, patch: Partial<EventCategory>) => {
    await dualUpdate('event_categories', id, patch);
    await fetchEventsData();
  };

  const deleteEventCategory = async (id: number) => {
    await dualDelete('event_categories', id);
    await fetchEventsData();
  };

  const addEventCoordinator = async (coord: Partial<EventCoordinator>) => {
    const result = await dualInsert('event_coordinators', coord);
    await fetchEventsData();
    return (Array.isArray(result) ? result[0] : result) as EventCoordinator | undefined;
  };

  const updateEventCoordinator = async (id: number, patch: Partial<EventCoordinator>) => {
    await dualUpdate('event_coordinators', id, patch);
    await fetchEventsData();
  };

  const deleteEventCoordinator = async (id: number) => {
    await dualDelete('event_coordinators', id);
    await fetchEventsData();
  };

  const toggleEventVisibility = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    await dualUpdate('events', id, { visible: !event.visible });
    await fetchEventsData();
  };

  const toggleEventFeatured = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    await dualUpdate('events', id, { featured: !event.featured });
    await fetchEventsData();
  };

  const toggleEventRegistration = async (id: number) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    await dualUpdate('events', id, { registration_open: !event.registration_open });
    await fetchEventsData();
  };

  const addScheduleDay = async (day: Partial<ScheduleDay>): Promise<any> => {
    const result = await dualInsert('schedule_days', day);
    if (!result?.id) throw new Error('The schedule day was not saved. Please retry.');
    setSchedule(previous => sortSchedule([...previous.filter(row => row.id !== result.id), { ...result, events: [] }]));
    await fetchEventsData();
    return result;
  };

  const updateScheduleDay = async (id: number, patch: Partial<ScheduleDay>) => {
    const [saved] = await dualUpdate('schedule_days', id, patch);
    setSchedule(previous => sortSchedule(previous.map(day => day.id === id ? { ...day, ...saved, events: day.events } : day)));
    await fetchEventsData();
  };

  const deleteScheduleDay = async (id: number) => {
    await dualDelete('schedule_days', id);
    invalidateTableCache('schedule_events');
    setSchedule(previous => previous.filter(day => day.id !== id));
    await fetchEventsData();
  };

  const addScheduleEvent = async (dayId: number, evt: Partial<ScheduleEvent>) => {
    const saved = await dualInsert('schedule_events', { ...evt, schedule_day_id: dayId });
    if (!saved?.id) throw new Error('The schedule entry was not saved. Please retry.');
    setSchedule(previous => sortSchedule(previous.map(day => day.id === dayId ? { ...day, events: [...day.events.filter(row => row.id !== saved.id), saved] } : day)));
    await fetchEventsData();
  };

  const updateScheduleEvent = async (id: number, patch: Partial<ScheduleEvent>) => {
    const [saved] = await dualUpdate('schedule_events', id, patch);
    setSchedule(previous => sortSchedule(previous.map(day => ({ ...day, events: [...day.events.filter(row => row.id !== id), ...(day.id === saved.schedule_day_id ? [saved] : [])] }))));
    await fetchEventsData();
  };

  const deleteScheduleEvent = async (id: number) => {
    await dualDelete('schedule_events', id);
    setSchedule(previous => previous.map(day => ({ ...day, events: day.events.filter(row => row.id !== id) })));
    await fetchEventsData();
  };

  const value: EventsContextType = {
    scheduleError,
    eventsError,
    events: SITE_FEATURES.sports ? events : events.filter(event => !isSportsContent(event.category)),
    eventCoordinators,
    eventCategories: SITE_FEATURES.sports ? eventCategories : eventCategories.filter(category => !isSportsContent(category.name)),
    schedule: SITE_FEATURES.sports ? schedule : schedule.map(day => ({ ...day, events: day.events.filter(item => !isSportsContent(item.type) && !events.some(event => event.id === item.event_id && isSportsContent(event.category))) })),
    eventWinners: SITE_FEATURES.sports ? eventWinners : eventWinners.filter(winner => !isSportsContent(winner.category) && !events.some(event => event.id === winner.event_id && isSportsContent(event.category))),
    notifications: SITE_FEATURES.sports ? notifications : notifications.filter(notification => !isSportsContent(notification.category)),
    roadmapMilestones,
    loading,
    isLoaded,
    addEvent,
    addEventWithCoordinators,
    updateEvent,
    deleteEvent,
    reorderEvents,
    reorderEventCategories,
    addEventWinner,
    updateEventWinner,
    deleteEventWinner,
    addNotification,
    updateNotification,
    deleteNotification,
    addEventCategory,
    updateEventCategory,
    deleteEventCategory,
    addEventCoordinator,
    updateEventCoordinator,
    deleteEventCoordinator,
    toggleEventVisibility,
    toggleEventFeatured,
    toggleEventRegistration,
    addScheduleDay,
    updateScheduleDay,
    deleteScheduleDay,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent
  };

  return <PrimaryEventsContext.Provider value={value}>{children}</PrimaryEventsContext.Provider>;
}
