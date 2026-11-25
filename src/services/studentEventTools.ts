import { supabase } from '../lib/supabase';
import type { ScheduledEvent } from '../utils/scheduleClashes';

export type InboxKind = 'registration' | 'invitation' | 'venue' | 'schedule' | 'reminder' | 'support';
export interface StudentInboxItem { id: string; kind: InboxKind; title: string; body: string; href: string; created_at: string; read_at: string | null }
export async function loadStudentSchedule(userId: string): Promise<ScheduledEvent[]> {
  const { data, error } = await supabase.from('registrations').select('event_id,status,deleted_at,event:events(id,title,date,time,venue)').eq('user_id', userId).is('deleted_at', null).neq('status', 'rejected');
  if (error) throw error;
  return (data || []).flatMap(row => {
    const event = Array.isArray(row.event) ? row.event[0] : row.event;
    return event ? [event as ScheduledEvent] : [];
  });
}
export async function loadStudentTools(userId: string) {
  const [saved, inbox, unread, preferences, schedule] = await Promise.all([
    supabase.from('student_saved_events').select('event_id').eq('user_id', userId),
    supabase.from('student_inbox').select('id,kind,title,body,href,created_at,read_at').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50),
    supabase.from('student_inbox').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    supabase.from('student_notification_preferences').select('reminder_minutes').eq('user_id', userId).maybeSingle(),
    loadStudentSchedule(userId),
  ]);
  for (const result of [saved, inbox, unread, preferences]) if (result.error) throw result.error;
  return { saved: new Set<string>((saved.data || []).map(row => row.event_id)), inbox: (inbox.data || []) as StudentInboxItem[], unread: unread.count || 0, reminderMinutes: preferences.data?.reminder_minutes ?? 30, schedule };
}
export async function setSavedEvent(userId: string, eventId: string, save: boolean) {
  const result = save ? await supabase.from('student_saved_events').upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id', ignoreDuplicates: true }) : await supabase.from('student_saved_events').delete().eq('user_id', userId).eq('event_id', eventId);
  if (result.error) throw result.error;
}
export async function setReminderMinutes(userId: string, minutes: number) {
  if (![0, 15, 30, 60].includes(minutes)) throw new Error('Choose a valid reminder time.');
  const { error } = await supabase.from('student_notification_preferences').upsert({ user_id: userId, reminder_minutes: minutes });
  if (error) throw error;
}
export async function markStudentNoticesRead(userId: string, ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('student_inbox').update({ read_at: new Date().toISOString() }).eq('user_id', userId).in('id', ids).is('read_at', null);
  if (error) throw error;
}

export async function loadMoreStudentNotices(userId: string, before: StudentInboxItem) {
  const { data, error } = await supabase.from('student_inbox').select('id,kind,title,body,href,created_at,read_at')
    .eq('user_id', userId).or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []) as StudentInboxItem[];
}
