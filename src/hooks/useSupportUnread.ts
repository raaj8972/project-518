import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { supportRpc, type SupportRole } from '../services/supportChat';

/** Count only the inbox this staff member is allowed to answer, including while its panel is closed. */
export function useSupportUnread(mode: SupportRole, enabled: boolean, eventId?: string) {
  const [result, setResult] = useState({ scope: '', count: 0 });
  const scope = `${mode}:${eventId || 'technical'}`;
  useEffect(() => {
    if (!enabled || (mode === 'coordinator' && !eventId)) return;
    let active = true; let timeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try { const count = await supportRpc<number>('support_unread_count', { p_mode: mode, p_event_id: eventId || null }); if (active) setResult({ scope, count: Number(count) || 0 }); }
      catch { if (active) setResult({ scope, count: 0 }); }
    };
    const queue = () => { clearTimeout(timeout); timeout = setTimeout(() => void refresh(), 200); };
    void refresh();
    const channel = supabase.channel(`support-badge-${scope}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, queue).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, queue).subscribe();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    return () => { active = false; clearTimeout(timeout); clearInterval(interval); void supabase.removeChannel(channel); };
  }, [enabled, mode, eventId, scope]);
  return enabled && result.scope === scope ? result.count : 0;
}
