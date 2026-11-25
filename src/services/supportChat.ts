import { supabase } from '../lib/supabase';
export type SupportRole = 'student' | 'coordinator' | 'admin';
export interface SupportConversation {
  id: string; student_id: string; event_id: string | null; created_at: string;
  label: string; subtitle: string; last_message: string; last_activity: string; unread_count: number;
}
export interface SupportMessage {
  id: string; conversation_id: string; sender_id: string; sender_role: SupportRole;
  text: string; created_at: string; updated_at: string; read_at: string | null; expires_at: string;
}
export async function supportRpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) throw new Error(error.message || 'Support is unavailable. Please try again.');
  return data as T;
}
export const listSupportConversations = (mode: SupportRole, eventId?: string) => supportRpc<SupportConversation[]>('support_conversation_list', { p_mode: mode, p_event_id: eventId || null });
export const openStudentSupport = (eventId?: string) => supportRpc<string>('open_student_support', { p_event_id: eventId || null });
export async function loadSupportMessages(conversationId: string, before?: SupportMessage) {
  let query = supabase.from('chat_messages').select('id,conversation_id,sender_id,sender_role,text,created_at,updated_at,read_at,expires_at').eq('conversation_id', conversationId).gt('expires_at', new Date().toISOString());
  if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
  if (error) throw error;
  return ((data || []) as SupportMessage[]).reverse();
}
