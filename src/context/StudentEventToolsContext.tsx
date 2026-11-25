import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStudentAuth } from './StudentAuthContext';
import { supabase } from '../lib/supabase';
import { loadStudentTools, markStudentNoticesRead, setReminderMinutes, setSavedEvent } from '../services/studentEventTools';

type Data = Awaited<ReturnType<typeof loadStudentTools>>;
interface Tools extends Data {
  ready: boolean; error: string | null; busy: string | null;
  refresh: () => Promise<void>;
  toggleSaved: (id: string) => Promise<boolean>;
  updateReminders: (minutes: number) => Promise<boolean>;
  markRead: (ids: string[]) => Promise<boolean>;
}
const empty: Data = { saved: new Set(), inbox: [], unread: 0, reminderMinutes: 30, schedule: [] };
const StudentToolsContext = createContext<Tools | undefined>(undefined);
export const useStudentEventTools = () => useContext(StudentToolsContext);

export function StudentEventToolsProvider({ children }: { children: ReactNode }) {
  const { user, isApproved } = useStudentAuth();
  const userId = isApproved ? user?.id : undefined;
  const [snapshot, setSnapshot] = useState<{ userId: string; data: Data } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);
  const mutation = useRef(false);
  const currentUser = useRef(userId); currentUser.current = userId;
  const refresh = useCallback(async () => {
    if (!userId) return;
    const request = ++generation.current;
    try {
      const data = await loadStudentTools(userId);
      if (request === generation.current && currentUser.current === userId) { setSnapshot({ userId, data }); setError(null); }
    } catch { if (request === generation.current && currentUser.current === userId) setError('Saved events and notifications could not sync. Please try again.'); }
  }, [userId]);
  useEffect(() => {
    setSnapshot(null); setError(null);
    if (!userId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const queueRefresh = () => { clearTimeout(timer); timer = setTimeout(() => { if (active) void refresh(); }, 150); };
    const tick = async () => {
      let reminderFailed = false;
      try { const result = await supabase.rpc('refresh_my_student_reminders'); reminderFailed = !!result.error; } catch { reminderFailed = true; }
      if (active) { await refresh(); if (reminderFailed && active) setError('Event reminders could not refresh. Please try again.'); }
    };
    void tick();
    const channel = supabase.channel(`student-tools-${userId}`);
    for (const table of ['student_inbox', 'student_saved_events', 'student_notification_preferences', 'registrations']) channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, queueRefresh);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, queueRefresh).subscribe();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void tick(); }, 60000);
    const onFocus = () => void tick();
    window.addEventListener('focus', onFocus);
    return () => { active = false; generation.current++; clearTimeout(timer); clearInterval(interval); window.removeEventListener('focus', onFocus); void supabase.removeChannel(channel); };
  }, [userId, refresh]);
  const perform = async (key: string, action: (id: string) => Promise<void>) => {
    if (!userId || mutation.current) return false;
    mutation.current = true; setBusy(key);
    try { await action(userId); if (currentUser.current === userId) await refresh(); return currentUser.current === userId; }
    catch { if (currentUser.current === userId) setError('That change could not be saved. Please try again.'); return false; }
    finally { mutation.current = false; setBusy(null); }
  };
  const data = snapshot && snapshot.userId === userId ? snapshot.data : empty;
  return <StudentToolsContext.Provider value={{
    ...data, ready: !!snapshot && snapshot.userId === userId, error, busy, refresh,
    toggleSaved: id => perform(`saved:${id}`, uid => setSavedEvent(uid, id, !data.saved.has(id))),
    updateReminders: minutes => perform('reminders', uid => setReminderMinutes(uid, minutes)),
    markRead: ids => perform('read', uid => markStudentNoticesRead(uid, ids)),
  }}>
    {children}
  </StudentToolsContext.Provider>;
}
