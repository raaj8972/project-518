import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BellIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { supabase } from '../../lib/supabase';
import { useDomainRealtime } from '../../hooks/useDomainRealtime';

interface Notice { id: string; text: string; urgent: boolean; event_id: string | null; sender_role: string; created_at: string }
export default function StudentNoticePreview({ eventIds }: { eventIds: string[] }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const idsKey = JSON.stringify(eventIds);
  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('announcements').select('id, text, urgent, event_id, sender_role, created_at').eq('category', 'general').in('target', ['all', 'students']).is('deleted_at', null).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      const ids = new Set<string>(JSON.parse(idsKey));
      setNotices((data || []).filter(notice => notice.sender_role === 'admin' || (notice.event_id && ids.has(String(notice.event_id)))).slice(0, 3));
      setFailed(false);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, [idsKey]);
  useEffect(() => { void load(); }, [load]);
  useDomainRealtime('student-notice-preview', true, ['announcements'], load);
  return <section className="sd-panel sd-notices">
    <div className="sd-section-heading">
      <h2>
        <BellIcon /> Latest updates</h2>
      <Link to="/dashboard/announcements">All notices <ArrowRightIcon />
      </Link>
    </div>
    {loading ? <div className="sd-skeleton sd-skeleton-row" aria-label="Loading notices" /> : failed ? <div className="sd-inline-empty">
      <p>Updates could not load.</p>
      <button className="sd-text-button" onClick={() => void load()}>Try again</button>
    </div> : notices.length ? notices.map(notice => <Link key={notice.id} className="sd-notice" to={`/dashboard/announcements#announcement-${notice.id}`}>
      <span className={`sd-notice-dot${notice.urgent ? ' is-urgent' : ''}`} />
      <div>
        <p>
          {notice.text}
        </p>
        <small>
          {notice.urgent ? 'Important · ' : ''}{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(notice.created_at))}
        </small>
      </div>
      <ArrowRightIcon />
    </Link>) : <div className="sd-inline-empty">
      <SpeakerLoudIcon />
      <div>
        <strong>You’re all caught up.</strong>
        <p>Official updates and schedule changes will appear here.</p>
      </div>
    </div>}
  </section>;
}
