import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Event, EventCoordinator, EventCategory, ScheduleDay, ScheduleEvent, 
  RoadmapMilestone
} from '../types/data';
import { useCoreData } from './CoreDataContext';
import { fetchAllEvents, fetchSupabaseBatch } from '../utils/dataUtils';

interface EventsContextType {
  events: Event[];
  eventCoordinators: EventCoordinator[];
  eventCategories: EventCategory[];
  schedule: ScheduleDay[];
  eventWinners: any[];
  notifications: any[];
  roadmapMilestones: RoadmapMilestone[];
  
  addEvent: (event: Partial<Event>) => Promise<void>;
  updateEvent: (id: number, event: Partial<Event>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  reorderEvents: (orderedIds: number[]) => Promise<boolean>;
  
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
  
  addScheduleDay: (day: Partial<ScheduleDay>) => Promise<void>;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCoordinators, setEventCoordinators] = useState<EventCoordinator[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [eventWinners, setEventWinners] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [roadmapMilestones, setRoadmapMilestones] = useState<RoadmapMilestone[]>([]);

  const fetchEventsData = useCallback(async () => {
    try {
      const [eventsRes, coordinatorsRes, categoriesRes, scheduleRes, roadmapRes] = await Promise.all([
        fetchAllEvents(),
        fetchSupabaseBatch<EventCoordinator>('event_coordinators', { order: { column: 'event_id', ascending: true } }),
        fetchSupabaseBatch<EventCategory>('event_categories'),
        supabase.from('schedule_days').select('*, schedule_events (*)').order('date', { ascending: true }),
        fetchSupabaseBatch<RoadmapMilestone>('roadmap_milestones', { order: { column: 'order_position', ascending: true } })
      ]);

      if (!eventsRes.error) setEvents(eventsRes.data || []);
      if (!coordinatorsRes.error) setEventCoordinators(coordinatorsRes.data || []);
      if (!categoriesRes.error) setEventCategories(categoriesRes.data || []);
      if (!scheduleRes.error) {
        const mappedSchedule = (scheduleRes.data || []).map((day: any) => ({
          ...day,
          events: day.schedule_events || []
        }));
        setSchedule(mappedSchedule);
      }
      if (!roadmapRes.error) setRoadmapMilestones(roadmapRes.data || []);

      // Fetch winners separately (more complex logic)
      const { data: winnersData, error: winnersError } = await supabase.rpc('get_public_event_winners');
      if (!winnersError) {
        setEventWinners(winnersData || []);
      } else {
        // Fallback
        const { data: fallbackWinners } = await fetchSupabaseBatch('event_winners');
        setEventWinners(fallbackWinners || []);
      }

      // Notifications
      const nowIso = new Date().toISOString();
      // Notifications are usually few, but let's use batch just in case someone makes 1000 notifications
      const { data: notifyData } = await fetchSupabaseBatch('notifications', {
         order: { column: 'priority', ascending: false },
         // We can't easily batch with complex filters like .lte / .or in our simple utility yet
         // so we'll just fetch all and filter in memory if needed, or keep it as is if it's safe.
         // Actually, let's keep notifications as is because they are time-gated (few ACTIVE ones).
      });
      
      const filteredNotifications = (notifyData || []).filter((n: any) => 
        n.visible && 
        n.starts_at <= nowIso && 
        (!n.ends_at || n.ends_at > nowIso)
      );
      
      setNotifications(filteredNotifications);

    } catch (err) {
      console.error('[EventsContext] Failed to fetch events data', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchEventsData();
    }
  }, [refreshTrigger, fetchEventsData]);

  const addEvent = async (event: Partial<Event>) => {
    const { error } = await supabase.from('events').insert(event);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateEvent = async (id: number, event: Partial<Event>) => {
    const { error } = await supabase.from('events').update(event).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteEvent = async (id: number) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const reorderEvents = async (orderedIds: number[]): Promise<boolean> => {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index
      }));
      const { error } = await supabase.from('events').upsert(updates);
      if (error) throw error;
      await fetchEventsData();
      return true;
    } catch (err) {
      console.error('[EventsContext] reorderEvents failed', err);
      return false;
    }
  };

  const addEventWinner = async (winner: any) => {
    const { error } = await supabase.from('event_winners').insert(winner);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateEventWinner = async (id: number, patch: Partial<any>) => {
    const { error } = await supabase.from('event_winners').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteEventWinner = async (id: number) => {
    const { error } = await supabase.from('event_winners').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const addNotification = async (n: any) => {
    const { error } = await supabase.from('notifications').insert(n);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateNotification = async (id: number, patch: Partial<any>) => {
    const { error } = await supabase.from('notifications').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteNotification = async (id: number) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const addEventCategory = async (cat: Partial<EventCategory>) => {
    const { error } = await supabase.from('event_categories').insert(cat);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateEventCategory = async (id: number, patch: Partial<EventCategory>) => {
    const { error } = await supabase.from('event_categories').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteEventCategory = async (id: number) => {
    const { error } = await supabase.from('event_categories').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const addEventCoordinator = async (coord: Partial<EventCoordinator>) => {
    const { error } = await supabase.from('event_coordinators').insert(coord);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateEventCoordinator = async (id: number, patch: Partial<EventCoordinator>) => {
    const { error } = await supabase.from('event_coordinators').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteEventCoordinator = async (id: number) => {
    const { error } = await supabase.from('event_coordinators').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const addScheduleDay = async (day: Partial<ScheduleDay>) => {
    const { error } = await supabase.from('schedule_days').insert(day);
    if (error) throw error;
    await fetchEventsData();
  };

  const updateScheduleDay = async (id: number, patch: Partial<ScheduleDay>) => {
    const { error } = await supabase.from('schedule_days').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteScheduleDay = async (id: number) => {
    const { error } = await supabase.from('schedule_days').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const addScheduleEvent = async (dayId: number, evt: Partial<ScheduleEvent>) => {
    const { error } = await supabase.from('schedule_events').insert({ ...evt, schedule_day_id: dayId });
    if (error) throw error;
    await fetchEventsData();
  };

  const updateScheduleEvent = async (id: number, patch: Partial<ScheduleEvent>) => {
    const { error } = await supabase.from('schedule_events').update(patch).eq('id', id);
    if (error) throw error;
    await fetchEventsData();
  };

  const deleteScheduleEvent = async (id: number) => {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id);
    if (error) throw error;
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
    addEvent,
    updateEvent,
    deleteEvent,
    reorderEvents,
    // Add placeholders for now to keep the interface valid
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
