import { supabase } from '../../../lib/supabase';
import type { Event } from '../../../types/data';
import type { EventMailDraft } from './EventNotificationDialog';

export async function sendEventUpdate(event: Pick<Event, 'id' | 'title' | 'date' | 'time' | 'venue'>, draft: EventMailDraft): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error('Your session has expired. Sign in again before sending.');
  const response = await fetch('/api/notify-event-update', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventId: event.id, eventTitle: event.title, updateType: draft.type, message: draft.message, rules: draft.rules, newDetails: { date: event.date, time: event.time, venue: event.venue } }) });
  const result = await response.json();
  if (!response.ok || result.success === false) throw new Error(result.error || 'Participant emails could not send. Please try again.');
  if (!result.total && !result.sent) return 'No approved registrations were found. No participant emails were sent.';
  return `${Number(result.sent) || 0} emails sent${Number(result.failed) ? `; ${Number(result.failed)} failed` : ''}.${Number(result.total) > 100 ? ' This send processed the first 100 approved registrations.' : ''}`;
}
