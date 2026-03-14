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
  
  addScheduleDay: (day: Partial<ScheduleDay>) => Promise<any>;
  updateScheduleDay: (id: number, patch: Partial<ScheduleDay>) => Promise<void>;
  deleteScheduleDay: (id: number) => Promise<void>;
  
  addScheduleEvent: (dayId: number, evt: Partial<ScheduleEvent>) => Promise<void>;
  updateScheduleEvent: (id: number, patch: Partial<ScheduleEvent>) => Promise<void>;
  deleteScheduleEvent: (id: number) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const useEventsData = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEventsData must be used within an EventsProvider');
  }
  return context;
};

export const EventsProvider = ({ children }: { children: ReactNode }) => {
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

  const fetchEventsData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, coordinatorsRes, categoriesRes, scheduleRes, roadmapRes] = await Promise.all([
        fetchAllEvents(),
        dualRead({ table: 'event_coordinators' }),
        dualRead({ table: 'event_categories', order: ['display_order', { ascending: true }] }),
        dualRead({ table: 'schedule_days' }),
        supabase.from('roadmap_milestones').select('*').order('order_position', { ascending: true })
      ]);

      if (eventsRes.data) setEvents(eventsRes.data || []);
      if (coordinatorsRes.data) setEventCoordinators(coordinatorsRes.data || []);
      if (categoriesRes.data) setEventCategories(categoriesRes.data || []);
      
      if (scheduleRes.data) {
        const days = scheduleRes.data || [];
        const { data: allScheduleEvents } = await dualRead({ table: 'schedule_events' });
        
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
      if (winnersRes.data) {
        setEventWinners(winnersRes.data || []);
      }

      const nowIso = new Date().toISOString();
      const { data: notifyData } = await dualRead({ table: 'notifications' });
      
      const filteredNotifications = (notifyData || []).filter((n: any) => 
        n.visible && 
        n.starts_at <= nowIso && 
        (!n.ends_at || n.ends_at > nowIso)
      ).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
      
      setNotifications(filteredNotifications);

    } catch (err) {
      console.error('[EventsContext] Failed to fetch events data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0 || user?.id) {
      fetchEventsData();
    }
  }, [refreshTrigger, user?.id, fetchEventsData]);

  const addEvent = async (event: Partial<Event>) => {
    await dualInsert('events', event);
    await fetchEventsData();
  };

  const addEventWithCoordinators = async (event: Partial<Event>, coordinators: any[]) => {
    // dualInsert returns an array or object. Let's assume array of results.
    const result = await dualInsert('events', event);
    const insertedEvent = Array.isArray(result) ? result[0] : result;
    
    if (insertedEvent && insertedEvent.id && coordinators && coordinators.length > 0) {
      const coordsToInsert = coordinators.map(c => ({
        event_id: insertedEvent.id,
        name: c.name,
        phone: c.phone || null,
        password: c.password || null
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
    addScheduleDay,
    updateScheduleDay,
    deleteScheduleDay,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};
