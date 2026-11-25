import { supabase } from '../lib/supabase';

export async function getEventWhatsAppGroup(eventId: string | number): Promise<string | null> {
  const { data, error } = await supabase.from('event_whatsapp_groups')
    .select('whatsapp_group_link').eq('event_id', String(eventId)).maybeSingle();
  if (error) throw error;
  return data?.whatsapp_group_link || null;
}

export async function getAccessibleEventWhatsAppGroups(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('event_whatsapp_groups').select('event_id,whatsapp_group_link');
  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.event_id, row.whatsapp_group_link]));
}
