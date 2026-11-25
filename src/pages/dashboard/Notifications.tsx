import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { useStudentEventTools } from '../../context/StudentEventToolsContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { loadMoreStudentNotices, type InboxKind, type StudentInboxItem } from '../../services/studentEventTools';

const labels: Record<InboxKind, string> = { registration: 'Registrations', invitation: 'Team invitations', venue: 'Venue changes', schedule: 'Schedule changes', reminder: 'Reminders', support: 'Support replies' };
export default function Notifications() {
  const tools = useStudentEventTools();
  const { user } = useStudentAuth();
  const [filter, setFilter] = useState('All');
  const [history, setHistory] = useState<{ userId?: string; items: StudentInboxItem[] }>({ userId: user?.id, items: [] });
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const older = history.userId === user?.id ? history.items : [];
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  useEffect(() => { setHistory({ userId: user?.id, items: [] }); setHasMore(true); setPageError(null); }, [user?.id]);
  if (!tools) return null;
  const items = [...new Map([...older, ...tools.inbox].map(item => [item.id, item])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const filtered = items.filter(item => filter === 'All' || (filter === 'Unread' ? !item.read_at : item.kind === filter));
  const more = async () => {
    if (!user || !items.length || loadingMore) return;
    setLoadingMore(true); setPageError(null);
    try {
      const result = await loadMoreStudentNotices(user.id, items[items.length - 1]);
      if (currentUser.current !== user.id) return;
      setHistory(previous => ({ userId: user.id, items: [...(previous.userId === user.id ? previous.items : []), ...result] })); setHasMore(result.length === 50);
    } catch { setPageError('Older notifications could not load. Please try again.'); }
    finally { setLoadingMore(false); }
  };
  const markRead = async (ids: string[]) => {
    const success = await tools.markRead(ids);
    if (!success || currentUser.current !== user?.id) return;
    // Reopen pagination from the newly refreshed read state.
    setHistory({ userId: user?.id, items: [] }); setHasMore(true);
  };
  return <div className="sd-inbox-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">EVERYTHING THAT NEEDS YOUR ATTENTION</p>
        <h1>Your festival inbox<span className="sd-heading-dot">.</span>
        </h1>
        <p>Invitations, entry updates, reminders, and last-minute changes.</p>
      </div>
      <button className="sd-button sd-button-secondary" disabled={!filtered.some(item => !item.read_at) || !!tools.busy} onClick={() => void markRead(filtered.filter(item => !item.read_at).map(item => item.id))}>
        <CheckIcon /> Mark shown as read</button>
    </div>
    <section className="sd-panel sd-reminder-settings">
      <div>
        <h2>
          <BellIcon /> Event reminders</h2>
        <p>For your approved registrations with a confirmed start time. Reminders stay in this inbox, even when you close the app.</p>
      </div>
      <label>Remind me<select value={tools.reminderMinutes} disabled={!tools.ready || !!tools.busy} onChange={event => void tools.updateReminders(Number(event.target.value))}>
        <option value={0}>Off</option>
        <option value={15}>15 minutes before</option>
        <option value={30}>30 minutes before</option>
        <option value={60}>1 hour before</option>
      </select>
      </label>
    </section>
    {(tools.error || pageError) && <div className="sd-error" role="alert">
      <span>
        {tools.error || pageError}
      </span>
      <button onClick={() => void (pageError ? more() : tools.refresh())}>Try again</button>
    </div>}
    <div className="sd-filter-row">
      <div className="sd-chips" aria-label="Filter notifications">
        {['All', 'Unread', ...Object.keys(labels)].map(kind => <button key={kind} aria-pressed={filter === kind} onClick={() => setFilter(kind)}>
          {kind === 'All' || kind === 'Unread' ? kind : labels[kind as InboxKind]}
        </button>)}
      </div>
      <span className="sd-result-count">
        {tools.unread} unread</span>
    </div>
    {!tools.ready && !tools.error ? <div className="sd-skeleton sd-skeleton-block" aria-label="Loading notifications" /> : <section className="sd-panel sd-inbox-list">
      {filtered.length ? filtered.map(item => <article key={item.id} className={`sd-inbox-item${item.read_at ? '' : ' is-unread'}`}>
        <span className="sd-inbox-dot" aria-label={item.read_at ? 'Read' : 'Unread'} />
        <div>
          <small>
            {labels[item.kind]} · <time dateTime={item.created_at}>
              {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(item.created_at))} IST</time>
          </small>
          <h2>
            {item.title}
          </h2>
          <p>
            {item.body}
          </p>
          <div className="sd-inbox-actions">
            <Link to={item.href.startsWith('/dashboard/') ? item.href : '/dashboard'} onClick={() => { if (!item.read_at) void tools.markRead([item.id]); }}>View details <ChevronRightIcon />
            </Link>
            {!item.read_at && <button disabled={!!tools.busy} onClick={() => void markRead([item.id])}>Mark as read</button>}
          </div>
        </div>
      </article>) : <div className="sd-empty">
        <span className="sd-empty-icon">
          <BellIcon />
        </span>
        <h2>
          {filter === 'Unread' ? 'You’re all caught up.' : 'Nothing here yet.'}
        </h2>
        <p>Your festival updates will appear here.</p>
      </div>}{hasMore && items.length >= 50 && <button className="sd-button sd-button-secondary sd-load-more" disabled={loadingMore} onClick={() => void more()}>
        {loadingMore ? 'Loading…' : 'Load older notifications'}
      </button>}
    </section>}
  </div>;
}
