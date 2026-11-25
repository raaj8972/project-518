import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ChatBubbleIcon, CheckIcon, CheckCircledIcon, Cross2Icon, MagnifyingGlassIcon, PaperPlaneIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { supabase } from '../../lib/supabase';
import { useCoreData } from '../../context/CoreDataContext';
import { listSupportConversations, loadSupportMessages, openStudentSupport, supportRpc, type SupportConversation, type SupportMessage, type SupportRole } from '../../services/supportChat';
import '../../styles/SupportChat.css';

interface ChatPanelProps {
  mode: SupportRole;
  eventId?: string;
  themeAccent?: 'purple' | 'red' | 'indigo';
}
const time = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value));
export function ChatPanel({ mode, eventId }: ChatPanelProps) {
  const { siteSettings } = useCoreData();
  const locked = !!siteSettings?.chat_locked;
  const scope = `${mode}:${eventId || 'technical'}`;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => { let active = true; void supabase.auth.getUser().then(({ data }) => { if (active) setCurrentUserId(data.user?.id || null); }); return () => { active = false; }; }, []);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [olderAvailable, setOlderAvailable] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [editing, setEditing] = useState<SupportMessage | null>(null);
  const [editText, setEditText] = useState('');
  const active = useRef(activeId); active.current = activeId;
  const currentScope = useRef(scope); currentScope.current = scope;
  const messageRequest = useRef(0);
  const listRequest = useRef(0);
  const actionLock = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const activeConvo = conversations.find(conversation => conversation.id === activeId);
  const loadList = useCallback(async () => {
    const request = ++listRequest.current;
    const rows = await listSupportConversations(mode, eventId);
    if (currentScope.current !== scope || request !== listRequest.current) return;
    setConversations(rows);
    setActiveId(previous => rows.some(row => row.id === previous) ? previous : rows[0]?.id || null);
  }, [mode, eventId, scope]);
  const loadThread = useCallback(async (id: string, quiet = false) => {
    const request = ++messageRequest.current;
    if (!quiet) setMessageLoading(true);
    try {
      const rows = await loadSupportMessages(id);
      if (currentScope.current !== scope || active.current !== id || request !== messageRequest.current) return;
      setMessages(previous => {
        if (!quiet || rows.length < 100) return rows;
        const first = rows[0];
        const earlier = previous.filter(row => new Date(row.expires_at).getTime() > Date.now() && (row.created_at < first.created_at || (row.created_at === first.created_at && row.id < first.id)));
        return [...earlier, ...rows];
      });
      if (!quiet) setOlderAvailable(rows.length === 100);
      // Only acknowledge a thread that is actually visible, including mobile layouts.
      if (document.visibilityState !== 'hidden' && (showThread || window.matchMedia?.('(min-width: 1024px)').matches)) {
        await supportRpc('support_mark_read', { p_conversation_id: id, p_mode: mode });
        if (active.current === id) setConversations(previous => previous.map(row => row.id === id ? { ...row, unread_count: 0 } : row));
      }
    } finally { if (request === messageRequest.current) setMessageLoading(false); }
  }, [scope, mode, showThread]);
  useEffect(() => {
    let mounted = true;
    setConversations([]); setActiveId(null); setMessages([]); setDraft(''); setEditing(null); setError(null); setLoading(true); setShowThread(false);
    const start = async () => {
      try {
        if (mode === 'coordinator' && !eventId) throw new Error('Choose your assigned event to open event support.');
        if (mode === 'student') await openStudentSupport(eventId);
        if (mounted) { await loadList(); if (mounted && mode === 'student') setShowThread(true); }
      } catch (failure) { if (mounted) setError((failure as Error).message); }
      finally { if (mounted) setLoading(false); }
    };
    void start();
    return () => { mounted = false; listRequest.current++; messageRequest.current++; };
  }, [scope, mode, eventId, loadList]);
  useEffect(() => { setMessages([]); setEditing(null); setDraft(''); }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    void loadThread(activeId).catch(failure => setError(failure.message || 'Messages could not load.'));
  }, [activeId, loadThread]);
  useEffect(() => {
    let mounted = true; let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try { await loadList(); if (mounted && active.current) await loadThread(active.current, true); }
      catch { if (mounted) setError('Support could not refresh. Try again.'); }
    };
    const queue = () => { clearTimeout(timer); timer = setTimeout(() => void refresh(), 200); };
    const channel = supabase.channel(`support-panel-${scope}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, queue).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
      if (payload.eventType === 'DELETE') setMessages(previous => previous.filter(message => message.id !== payload.old.id));
      queue();
    }).subscribe();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15000);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { mounted = false; clearTimeout(timer); clearInterval(interval); document.removeEventListener('visibilitychange', visible); void supabase.removeChannel(channel); };
  }, [scope, loadList, loadThread]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'end' }); }, [messages.length, activeId]);
  const perform = async (action: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError(null);
    try { await action(); } catch (failure) { setError((failure as Error).message || 'That change could not be saved. Please retry.'); }
    finally { actionLock.current = false; setBusy(false); }
  };
  const send = () => {
    const text = draft.trim(); const id = activeId;
    if (!text || !id || locked) return;
    void perform(async () => {
      const message = await supportRpc<SupportMessage>('support_send_message', { p_conversation_id: id, p_mode: mode, p_text: text });
      if (currentScope.current !== scope || active.current !== id) return;
      setMessages(previous => [...previous.filter(row => row.id !== message.id), message]); setDraft('');
      await loadList();
    });
  };
  const own = (message: SupportMessage) => message.sender_id === currentUserId && message.sender_role === mode;
  const remove = (message: SupportMessage) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    void perform(async () => { await supportRpc('support_delete_message', { p_message_id: message.id, p_mode: mode }); setMessages(previous => previous.filter(row => row.id !== message.id)); await loadList(); });
  };
  const edit = () => {
    if (!editing || !editText.trim()) return;
    void perform(async () => { await supportRpc('support_edit_message', { p_message_id: editing.id, p_mode: mode, p_text: editText.trim() }); setEditing(null); if (activeId) await loadThread(activeId); await loadList(); });
  };
  const older = () => {
    if (!activeId || !messages.length) return;
    const id = activeId;
    void perform(async () => { const rows = await loadSupportMessages(id, messages[0]); if (active.current === id) { setMessages(previous => [...rows, ...previous]); setOlderAvailable(rows.length === 100); } });
  };
  return <div className={`support-chat${showThread ? ' support-show-thread' : ''}`}>
    {error && <div className="support-error" role="alert">
      <span>
        {error}
      </span>
      <button onClick={() => void perform(async () => { if (mode === 'student') await openStudentSupport(eventId); await loadList(); if (activeId) await loadThread(activeId); })}>Retry</button>
    </div>}
    <div className="support-chat-workspace">
      <aside className="support-chat-list" aria-label="Support conversations">
        <div className="support-chat-list-heading">
          <strong>
            {mode === 'student' ? 'Your conversation' : 'Student requests'}
          </strong>
          <span>
            {conversations.reduce((sum, row) => sum + Number(row.unread_count), 0)} unread</span>
        </div>
        <label className="support-search">
          <MagnifyingGlassIcon />
          <input aria-label="Search support conversations" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <div className="support-contact-list">
          {loading ? <p className="support-muted" role="status">Loading support…</p> : conversations.filter(row => `${row.label} ${row.subtitle}`.toLowerCase().includes(search.toLowerCase())).map(row => <button key={row.id} aria-current={row.id === activeId ? 'true' : undefined} onClick={() => { setActiveId(row.id); setShowThread(true); }}>
            <span className="support-contact-avatar">
              <ChatBubbleIcon />
            </span>
            <span>
              <strong>
                {row.label}
              </strong>
              <small>
                {row.subtitle}
              </small>
              <p>
                {row.last_message || 'No messages yet'}
              </p>
            </span>
            {Number(row.unread_count) > 0 && <b className="support-count">
              {row.unread_count}
            </b>}
          </button>)}{!loading && !conversations.length && <p className="support-muted">No student requests yet. New conversations will appear here automatically.</p>}
        </div>
      </aside>
      <section className="support-thread" aria-label="Conversation messages">
        <header>
          <button className="support-back" aria-label="Back to support conversations" onClick={() => setShowThread(false)}>
            <ArrowLeftIcon />
          </button>
          <div>
            <h2>
              {activeConvo?.label || 'Select a conversation'}
            </h2>
            <p>
              {activeConvo?.subtitle || (mode === 'admin' ? 'Technical help from the admin team' : 'Event support')}
            </p>
          </div>
          <span className="support-retention">Messages retained for 5 days</span>
        </header>

        <div className="support-messages" aria-busy={messageLoading}>
          {olderAvailable && <button className="support-older" disabled={busy} onClick={older}>Load earlier messages</button>}{messageLoading ? <p className="support-muted" role="status">Loading messages…</p> : !messages.length && <div className="support-empty">
            <ChatBubbleIcon />
            <h3>
              {activeId ? 'How can we help?' : 'Your support inbox'}
            </h3>
            <p>
              {activeId ? 'Send your question below. Your conversation goes directly to the right team.' : 'Choose a conversation to read and reply.'}
            </p>
          </div>}{messages.map(message => <article key={message.id} className={`support-message ${own(message) ? 'is-own' : ''}`}>
            <div>
              {editing?.id === message.id ? <div className="support-edit">
                <textarea aria-label="Edit message" maxLength={4000} value={editText} onChange={event => setEditText(event.target.value)} />
                <button aria-label="Save edited message" disabled={busy} onClick={edit}>
                  <CheckIcon />
                </button>
                <button aria-label="Cancel editing" onClick={() => setEditing(null)}>
                  <Cross2Icon />
                </button>
              </div> : <>
                <small className="support-sender">
                  {own(message) ? 'You' : message.sender_role === 'admin' ? 'Technical team' : message.sender_role === 'coordinator' ? 'Event coordinator' : 'Student'}
                </small>
                <p>
                  {message.text}
                </p>
                <div className="support-message-meta">
                  <time dateTime={message.created_at}>
                    {time(message.created_at)} IST</time>
                  {own(message) && <span aria-label={message.read_at ? 'Read' : 'Sent'}>
                    {message.read_at ? <CheckCircledIcon /> : <CheckIcon />}
                  </span>}
                </div>
                <div className="support-message-actions">
                  {own(message) && <button aria-label="Edit your message" disabled={busy} onClick={() => { setEditing(message); setEditText(message.text); }}>
                    <Pencil1Icon />
                  </button>}{(own(message) || mode !== 'student') && <button aria-label="Delete message" disabled={busy} onClick={() => remove(message)}>
                    <TrashIcon />
                  </button>}
                </div>
              </>}
            </div>
          </article>)}<div ref={bottom} />
        </div>
        {locked ? <p className="support-locked" role="status">Messaging is temporarily paused by the festival team. You can still read your conversation.</p> : <form className="support-composer" onSubmit={event => { event.preventDefault(); send(); }}>
          <label className="sr-only" htmlFor={`support-draft-${mode}`}>Your message</label>
          <textarea id={`support-draft-${mode}`} maxLength={4000} placeholder={activeId ? 'Describe your question or issue…' : 'Select a conversation first'} value={draft} disabled={!activeId || busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
          <button type="submit" disabled={!activeId || !draft.trim() || busy} aria-label="Send support message">
            <PaperPlaneIcon />
            <span>
              {busy ? 'Sending…' : 'Send'}
            </span>
          </button>
        </form>}
      </section>
    </div>
  </div>;
}
