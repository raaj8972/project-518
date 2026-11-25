import '../../styles/StudentGuide.css';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useEventsData } from '../../context/EventsContext';
interface Entry { id: string; full_name: string; user_id: string | null; }
export default function ParticipationVerification({ eventId }: { eventId?: string; }) {
  const { events } = useEventsData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(eventId || '');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [qualified, setQualified] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { setSelected(eventId || ''); }, [eventId]);
  useEffect(() => {
    if (!open || !selected) { setEntries([]); return; }
    let active = true; setLoading(true); setError(null);
    const load = async () => {
      try {
        const regs = await supabase.from('registrations').select('id,full_name,user_id').eq('event_id', selected).eq('status', 'approved').is('deleted_at', null).order('full_name');
        if (regs.error) throw regs.error;
        const rows = (regs.data || []) as Entry[];
        const ids = rows.map(row => row.id);
        const [attendance, rounds] = ids.length ? await Promise.all([
          supabase.from('student_event_participation').select('registration_id').in('registration_id', ids),
          supabase.from('registration_rounds').select('registration_id').in('registration_id', ids).eq('status', 'qualified'),
        ]) : [{ data: [], error: null }, { data: [], error: null }];
        if (attendance.error || rounds.error) throw attendance.error || rounds.error;
        if (active) { setEntries(rows); setVerified(new Set((attendance.data || []).map(row => row.registration_id))); setQualified(new Set((rounds.data || []).map(row => row.registration_id))); }
      } catch { if (active) setError('Participation records could not load. Please retry.'); } finally { if (active) setLoading(false); }
    }; void load(); return () => { active = false; };
  }, [selected, open, revision]);
  useEffect(() => {
    if (!open || !selected) return;
    const channel = supabase.channel(`participation-verification-${selected}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_rounds' }, () => setRevision(value => value + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_event_participation' }, () => setRevision(value => value + 1))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selected, open]);
  const verify = async (entry: Entry) => {
    setBusy(entry.id); setError(null);
    const value = !verified.has(entry.id);
    try {
      const { error } = await supabase.rpc('verify_student_participation', { p_registration_id: entry.id, p_verified: value });
      if (error) throw error;
      setVerified(previous => {
        const next = new Set(previous);
        if (value) next.add(entry.id); else next.delete(entry.id);
        return next;
      });
    } catch {
      setError('Participation could not be updated. Check your event access and try again.');
    } finally { setBusy(null); }
  };
  const filtered = entries.filter(entry => entry.full_name.toLowerCase().includes(query.toLowerCase()));
  return <details className="participation-verification" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Verify event participation · XP & leaderboard</summary>
    <p>Mark actual participation after the event. Registration approval alone does not award points. A recorded qualified round also verifies participation automatically.</p>
    {!eventId && <label>Event<select value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="">Select an event</option>
      {events.map(event =>
        <option key={event.id} value={String(event.id)}>
          {event.title}
        </option>)}
    </select>
    </label>}{error && <div role="alert">
      <p>
        {error}
      </p>
      <button onClick={() => setRevision(value => value + 1)}>Retry</button>
    </div>}{selected && <label>Find a participant<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Participant name" />
    </label>}{loading ? <p role="status">Loading participation records…</p> : <ul>
      {filtered.slice(0, 50).map(entry =>
        <li key={entry.id}>
          <span>
            {entry.full_name}
          </span>
          <button disabled={!!busy || !entry.user_id || qualified.has(entry.id)} onClick={() => void verify(entry)}>
            {qualified.has(entry.id) ? 'Verified by result' : busy === entry.id ? 'Saving…' : verified.has(entry.id) ? 'Undo verification' : 'Verify participation'}
          </button>
        </li>)}
    </ul>}{filtered.length > 50 && <p>Showing 50 results. Search by name to find another participant.</p>}{selected && !loading && !entries.length && <p>No approved entries for this event.</p>}
  </details>;
}
