import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { dualInsert, dualUpdate, dualDelete, dualUpsert, dualRead } from '../lib/dualDb';
import { 
  Event, EventCoordinator, EventCategory, ScheduleDay, ScheduleEvent, 
  RoadmapMilestone
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { useAuth } from './AuthContext';
import { fetchAllEvents } from '../utils/dataUtils';

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
  
  addEvent: (event: Partial<Event>) => Promise<void>;
  addEventWithCoordinators: (event: Partial<Event>, coordinators: any[]) => Promise<void>;
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
  
  addEventCoordinator: (coord: Partial<EventCoordinator>) => Promise<void>;
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

  const fetchEventsData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);

    console.log('[EventsContext] fetchEventsData started');
    const start = Date.now();
    try {
      const [eventsRes, coordinatorsRes, categoriesRes, scheduleRes, roadmapRes] = await Promise.all([
        fetchAllEvents().then(r => { console.log('✔ events'); return r; }),
        dualRead({ table: 'event_coordinators' }).then(r => { console.log('✔ event_coordinators'); return r; }),
        dualRead({ table: 'event_categories' }).then(r => { console.log('✔ event_categories'); return r; }),
        dualRead({ table: 'schedule_days' }).then(r => { console.log('✔ schedule_days'); return r; }),
        dualRead({ table: 'roadmap_milestones', order: ['order_position', { ascending: true }] }).then(r => { console.log('✔ roadmap_milestones'); return r; })
      ]);

      if (eventsRes.data) setEvents(eventsRes.data || []);
      if (coordinatorsRes.data) setEventCoordinators(coordinatorsRes.data || []);
      if (categoriesRes.data) setEventCategories(categoriesRes.data || []);
      
      if (scheduleRes.data) {
        const days = scheduleRes.data || [];
        const { data: allScheduleEvents } = await dualRead({ table: 'schedule_events' });
        console.log('✔ schedule_events');
        
        const mappedSchedule = days.map((day: any) => {
          const dayEvents = (allScheduleEvents || []).filter((e: any) => e.schedule_day_id === day.id);
          
          let scheduleType = 'prelims';
          if (day.title?.includes('[MAINS]')) scheduleType = 'mains';
          else if (day.title?.includes('[PRELIMS]')) scheduleType = 'prelims';
          
          return {
            ...day,
            events: dayEvents,
            schedule_type: scheduleType
          };
        }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setSchedule(mappedSchedule);
      }
      
      if (roadmapRes.data) {
        setRoadmapMilestones(roadmapRes.data || []);
      }
      // Fetch winners
      const winnersRes = await dualRead({ table: 'event_winners' });
      console.log('✔ event_winners');
      if (winnersRes.data) {
        setEventWinners(winnersRes.data || []);
      }

      console.log('[EventsContext] Fetching notifications...');
      const nowIso = new Date().toISOString();
      const { data: notifyData } = await dualRead({ table: 'notifications' });
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

  // Real-time: re-fetch when any events-related table changes
  useEffect(() => {
    const channel = supabase
      .channel('events-context-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_categories' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_coordinators' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_days' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_events' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_winners' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchEventsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_milestones' }, () => fetchEventsData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEventsData]);

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
      const coordsToInsert = coordinators.map(c => ({
        event_id: insertedEvent.id,
        name: c.name,
        phone: c.phone || null
      }));
      await dualInsert('event_coordinators', coordsToInsert);
    }
    
    await fetchEventsData();
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
    await dualInsert('event_coordinators', coord);
    await fetchEventsData();
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
    await fetchEventsData();
    return result;
  };

  const updateScheduleDay = async (id: number, patch: Partial<ScheduleDay>) => {
    await dualUpdate('schedule_days', id, patch);
    await fetchEventsData();
  };

  const deleteScheduleDay = async (id: number) => {
    await dualDelete('schedule_days', id);
    await fetchEventsData();
  };

  const addScheduleEvent = async (dayId: number, evt: Partial<ScheduleEvent>) => {
    await dualInsert('schedule_events', { ...evt, schedule_day_id: dayId });
    await fetchEventsData();
  };

  const updateScheduleEvent = async (id: number, patch: Partial<ScheduleEvent>) => {
    await dualUpdate('schedule_events', id, patch);
    await fetchEventsData();
  };

  const deleteScheduleEvent = async (id: number) => {
    await dualDelete('schedule_events', id);
    await fetchEventsData();
  };

  const value: EventsContextType = {
    events,
    eventCoordinators,
    eventCategories,
    schedule,
    eventWinners,
    notifications,
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

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
