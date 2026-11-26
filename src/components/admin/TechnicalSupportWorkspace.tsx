import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  Eraser,
  Inbox,
  Lock,
  MessageSquare,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoreData } from '../../context/CoreDataContext';
import {
  listSupportConversations,
  loadSupportMessages,
  supportRpc,
  type SupportConversation,
  type SupportMessage,
} from '../../services/supportChat';
import '../../styles/TechnicalSupport.css';

type QueueFilter = 'all' | 'unread' | 'active' | 'empty';

const QUICK_REPLIES = [
  'Checking your account and pass details now.',
  'Please refresh the page and sign in again to sync your latest updates.',
  'This has been resolved. Let us know if anything else comes up!',
  'Could you share which page you were on and any message you saw?',
] as const;

const IST_TZ = 'Asia/Kolkata';

function formatMessageTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST_TZ,
  }).format(d);
}

function formatQueueTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ });
  const nowDay = dayFmt.format(new Date());
  const valDay = dayFmt.format(d);
  if (valDay === nowDay) return formatMessageTime(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: IST_TZ,
  }).format(d);
}

function getDayKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(d);
}

function formatDayLabel(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ });
  const todayKey = dayFmt.format(new Date());
  const yesterdayKey = dayFmt.format(new Date(Date.now() - 86400000));
  const key = dayFmt.format(d);
  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: IST_TZ,
  }).format(d);
}

function initialsFor(label: string): string {
  const parts = label.trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const TechnicalSupportWorkspace: React.FC = () => {
  const { siteSettings } = useCoreData();
  const locked = !!siteSettings?.chat_locked;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [olderAvailable, setOlderAvailable] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [showJumpLatest, setShowJumpLatest] = useState(false);

  const [editing, setEditing] = useState<SupportMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearThread, setConfirmClearThread] = useState(false);

  const activeRef = useRef<string | null>(activeId);
  activeRef.current = activeId;
  const isNearBottomRef = useRef(true);
  const listRequestRef = useRef(0);
  const messageRequestRef = useRef(0);
  const actionLockRef = useRef(false);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const idPrefix = useId();
  const searchInputId = `${idPrefix}-search`;
  const composerId = `${idPrefix}-composer`;

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data.user?.id || null);
    });
    return () => {
      active = false;
    };
  }, []);

  const loadList = useCallback(async () => {
    const request = ++listRequestRef.current;
    const rows = await listSupportConversations('admin');
    if (request !== listRequestRef.current) return;
    setConversations(rows);
    setActiveId(prev => (rows.some(row => row.id === prev) ? prev : rows[0]?.id || null));
  }, []);

  const loadThread = useCallback(async (id: string, quiet = false) => {
    const request = ++messageRequestRef.current;
    if (!quiet) setMessageLoading(true);
    try {
      const rows = await loadSupportMessages(id);
      if (activeRef.current !== id || request !== messageRequestRef.current) return;
      setMessages(prev => {
        if (!quiet || rows.length < 100) return rows;
        const first = rows[0];
        const earlier = prev.filter(
          row =>
            new Date(row.expires_at).getTime() > Date.now() &&
            (row.created_at < first.created_at || (row.created_at === first.created_at && row.id < first.id))
        );
        return [...earlier, ...rows];
      });
      if (!quiet) setOlderAvailable(rows.length === 100);
      if (document.visibilityState !== 'hidden' && (showThread || window.matchMedia?.('(min-width: 961px)').matches)) {
        await supportRpc('support_mark_read', { p_conversation_id: id, p_mode: 'admin' });
        if (activeRef.current === id) {
          setConversations(prev => prev.map(row => (row.id === id ? { ...row, unread_count: 0 } : row)));
        }
      }
    } finally {
      if (request === messageRequestRef.current) setMessageLoading(false);
    }
  }, [showThread]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void loadList()
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load support requests.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      listRequestRef.current++;
      messageRequestRef.current++;
    };
  }, [loadList]);

  useEffect(() => {
    setMessages([]);
    setEditing(null);
    setConfirmDeleteId(null);
    setConfirmClearThread(false);
    setDraft('');
    setShowJumpLatest(false);
    isNearBottomRef.current = true;
    if (!activeId) return;
    void loadThread(activeId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Messages could not load.');
    });
  }, [activeId, loadThread]);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      try {
        await loadList();
        if (mounted && activeRef.current) await loadThread(activeRef.current, true);
      } catch {
        if (mounted) setError('Support feed could not refresh. Retry below.');
      }
    };

    const queue = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 200);
    };

    const channel = supabase
      .channel('support-panel-admin:technical')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, queue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
        queue();
      })
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadList, loadThread]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView?.({ block: 'end' });
    }
  }, [messages.length, activeId]);

  const handleMessagesScroll = () => {
    const el = messagesScrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 80;
    isNearBottomRef.current = nearBottom;
    setShowJumpLatest(!nearBottom && messages.length > 0);
  };

  const scrollToLatest = () => {
    isNearBottomRef.current = true;
    setShowJumpLatest(false);
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  };

  const perform = async (action: () => Promise<void>) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      actionLockRef.current = false;
      setBusy(false);
    }
  };

  const manualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      await loadList();
      if (activeRef.current) await loadThread(activeRef.current, true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to refresh support requests.');
    } finally {
      setRefreshing(false);
    }
  };

  const send = () => {
    const text = draft.trim();
    const id = activeId;
    if (!text || !id || locked) return;
    void perform(async () => {
      const created = await supportRpc<SupportMessage>('support_send_message', {
        p_conversation_id: id,
        p_mode: 'admin',
        p_text: text,
      });
      if (activeRef.current !== id) return;
      isNearBottomRef.current = true;
      setMessages(prev => [...prev.filter(row => row.id !== created.id), created]);
      setDraft('');
      await loadList();
    });
  };

  const commitEdit = () => {
    if (!editing || !editText.trim()) return;
    const target = editing;
    const nextText = editText.trim();
    void perform(async () => {
      await supportRpc('support_edit_message', {
        p_message_id: target.id,
        p_mode: 'admin',
        p_text: nextText,
      });
      setEditing(null);
      if (activeRef.current) await loadThread(activeRef.current);
      await loadList();
    });
  };

  const deleteMessage = (message: SupportMessage) => {
    void perform(async () => {
      await supportRpc('support_delete_message', {
        p_message_id: message.id,
        p_mode: 'admin',
      });
      setConfirmDeleteId(null);
      setMessages(prev => prev.filter(m => m.id !== message.id));
      await loadList();
    });
  };

  const clearConversation = () => {
    if (!activeId) return;
    const id = activeId;
    void perform(async () => {
      await supportRpc('support_clear_conversation', {
        p_conversation_id: id,
        p_mode: 'admin',
      });
      setConfirmClearThread(false);
      if (activeRef.current === id) setMessages([]);
      await loadList();
    });
  };

  const markConversationRead = () => {
    if (!activeId) return;
    const id = activeId;
    void perform(async () => {
      await supportRpc('support_mark_read', { p_conversation_id: id, p_mode: 'admin' });
      setConversations(prev => prev.map(row => (row.id === id ? { ...row, unread_count: 0 } : row)));
      if (activeRef.current === id) await loadThread(id, true);
    });
  };

  const loadOlder = () => {
    if (!activeId || !messages.length) return;
    const id = activeId;
    void perform(async () => {
      const rows = await loadSupportMessages(id, messages[0]);
      if (activeRef.current === id) {
        setMessages(prev => [...rows, ...prev]);
        setOlderAvailable(rows.length === 100);
      }
    });
  };

  const stats = useMemo(() => {
    const total = conversations.length;
    const unreadMessages = conversations.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);
    const unreadThreads = conversations.filter(row => Number(row.unread_count) > 0).length;
    const activeThreads = conversations.filter(row => !!row.last_message?.trim()).length;
    const emptyThreads = total - activeThreads;
    return { total, unreadMessages, unreadThreads, activeThreads, emptyThreads };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(row => {
      if (filter === 'unread' && Number(row.unread_count) === 0) return false;
      if (filter === 'active' && !row.last_message?.trim()) return false;
      if (filter === 'empty' && !!row.last_message?.trim()) return false;
      if (!q) return true;
      return `${row.label} ${row.subtitle} ${row.last_message}`.toLowerCase().includes(q);
    });
  }, [conversations, filter, search]);

  const activeConvo = useMemo(
    () => conversations.find(c => c.id === activeId) || null,
    [conversations, activeId]
  );

  const isOwnMessage = (message: SupportMessage) =>
    message.sender_id === currentUserId && message.sender_role === 'admin';

  return (
    <div className={`ts-workspace${showThread ? ' is-thread-open' : ''}`}>
      {/* Command Bar */}
      <section className="ts-command-bar" aria-label="Technical support overview">
        <div className="ts-metrics">
          <span className="ts-stat-chip">
            <Inbox size={13} aria-hidden="true" />
            <strong>{stats.total}</strong> {stats.total === 1 ? 'request' : 'requests'}
          </span>
          <span className={`ts-stat-chip${stats.unreadMessages > 0 ? ' is-unread' : ''}`}>
            <MessageSquare size={13} aria-hidden="true" />
            <strong>{stats.unreadMessages}</strong> unread
          </span>
          <span className="ts-stat-chip">
            <strong>{stats.activeThreads}</strong> active threads
          </span>
        </div>

        <div className="ts-command-actions">
          <Link
            to="/admin/site-settings"
            className={`ts-status-pill${locked ? ' is-locked' : ''}`}
            title="Manage global chat lock in Navigation & site settings"
          >
            {locked ? 'Chat locked' : 'Messaging open'}
          </Link>
          <button
            type="button"
            className="ts-refresh-btn"
            onClick={() => void manualRefresh()}
            disabled={refreshing || loading}
          >
            <RefreshCw size={13} className={refreshing ? 'ts-spin' : ''} aria-hidden="true" />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="ts-error-banner" role="alert">
          <div>
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <div className="ts-error-actions">
            <button type="button" onClick={() => void manualRefresh()}>
              Retry
            </button>
            <button type="button" aria-label="Dismiss error" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Master-Detail Support Shell */}
      <div className="ts-shell">
        {/* Left Queue */}
        <aside className="ts-queue" aria-label="Student support queue">
          <div className="ts-queue-head">
            <div className="ts-queue-title-row">
              <h2>Student queue</h2>
              <span>{filteredConversations.length} shown</span>
            </div>

            <div className="ts-search-box" role="search">
              <Search size={14} aria-hidden="true" />
              <label className="sr-only" htmlFor={searchInputId}>
                Search student support conversations
              </label>
              <input
                id={searchInputId}
                type="search"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Search by student or message…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="ts-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="ts-filter-pills" role="group" aria-label="Filter support requests">
              {(
                [
                  { id: 'all', label: 'All', count: stats.total },
                  { id: 'unread', label: 'Unread', count: stats.unreadThreads },
                  { id: 'active', label: 'Active', count: stats.activeThreads },
                  { id: 'empty', label: 'Empty', count: stats.emptyThreads },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className="ts-filter-pill"
                  aria-pressed={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                  <span>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ts-queue-list">
            {loading ? (
              <p className="ts-queue-empty" role="status">
                Loading student requests…
              </p>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map(row => {
                const unread = Number(row.unread_count) || 0;
                const hasPreview = !!row.last_message?.trim();
                const isSelected = row.id === activeId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="ts-queue-item"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => {
                      setActiveId(row.id);
                      setShowThread(true);
                    }}
                  >
                    <span className="ts-avatar" aria-hidden="true">
                      {initialsFor(row.label)}
                      {unread > 0 && <span className="ts-avatar-unread" />}
                    </span>
                    <div className="ts-queue-item-body">
                      <div className="ts-queue-item-top">
                        <strong>{row.label}</strong>
                        <time dateTime={row.last_activity}>{formatQueueTime(row.last_activity)}</time>
                      </div>
                      <p className={`ts-queue-preview${hasPreview ? '' : ' is-empty'}`}>
                        {hasPreview ? row.last_message : 'No active messages (5-day window)'}
                      </p>
                      <div className="ts-queue-item-foot">
                        <span className={`ts-mini-status${unread > 0 ? ' is-unread' : ''}`}>
                          {unread > 0 ? 'Needs reply' : hasPreview ? 'Active thread' : 'No active messages'}
                        </span>
                        {unread > 0 && <span className="ts-unread-badge">{unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="ts-queue-empty">
                <p>
                  {conversations.length === 0
                    ? 'No student technical support requests yet. New requests appear automatically.'
                    : 'No conversations match your current search or filter.'}
                </p>
                {(search || filter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Conversation View */}
        <section className="ts-thread" aria-label="Active support conversation">
          <header className="ts-thread-header">
            <div className="ts-thread-identity">
              <button
                type="button"
                className="ts-back-btn"
                aria-label="Back to student queue"
                onClick={() => setShowThread(false)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
              <span className="ts-avatar" aria-hidden="true">
                {activeConvo ? initialsFor(activeConvo.label) : 'TS'}
              </span>
              <div className="ts-thread-title-wrap">
                <h2>{activeConvo?.label || 'Select a student request'}</h2>
                <div className="ts-thread-meta">
                  {activeConvo ? (
                    <>
                      <span>Technical support request</span>
                      <span>·</span>
                      <span>Started {formatQueueTime(activeConvo.created_at)}</span>
                      <code>#{activeConvo.id.slice(0, 8)}</code>
                    </>
                  ) : (
                    <span>Choose a conversation from the left queue to inspect and reply</span>
                  )}
                </div>
              </div>
            </div>

            {activeConvo && (
              <div className="ts-thread-actions">
                {Number(activeConvo.unread_count) > 0 && (
                  <button
                    type="button"
                    className="ts-action-btn"
                    disabled={busy}
                    onClick={markConversationRead}
                  >
                    <CheckCheck size={13} aria-hidden="true" />
                    Mark read
                  </button>
                )}

                {messages.length > 0 &&
                  (confirmClearThread ? (
                    <>
                      <button
                        type="button"
                        className="ts-action-btn is-danger"
                        disabled={busy}
                        onClick={clearConversation}
                      >
                        Confirm clear
                      </button>
                      <button
                        type="button"
                        className="ts-action-btn"
                        disabled={busy}
                        onClick={() => setConfirmClearThread(false)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ts-action-btn"
                      disabled={busy}
                      onClick={() => setConfirmClearThread(true)}
                    >
                      <Eraser size={13} aria-hidden="true" />
                      Clear thread
                    </button>
                  ))}
              </div>
            )}
          </header>

          <div className="ts-retention-bar">
            <span>Messages auto-expire after 5 days · Replies notify the student’s dashboard inbox</span>
            {activeConvo && <span>{messages.length} active {messages.length === 1 ? 'message' : 'messages'}</span>}
          </div>

          {/* Message Stream */}
          <div className="ts-messages-wrap">
            <div
              ref={messagesScrollerRef}
              className="ts-messages"
              aria-busy={messageLoading}
              onScroll={handleMessagesScroll}
            >
              {olderAvailable && (
                <button type="button" className="ts-load-older" disabled={busy} onClick={loadOlder}>
                  Load earlier messages
                </button>
              )}

              {messageLoading ? (
                <p className="ts-queue-empty" role="status">
                  Loading conversation messages…
                </p>
              ) : !activeConvo ? (
                <div className="ts-empty-state">
                  <span className="ts-empty-icon" aria-hidden="true">
                    <Inbox size={20} />
                  </span>
                  <h3>Technical support inbox</h3>
                  <p>Select a student request on the left to review their messages and send a reply.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="ts-empty-state">
                  <span className="ts-empty-icon" aria-hidden="true">
                    <MessageSquare size={20} />
                  </span>
                  <h3>No active messages with {activeConvo.label}</h3>
                  <p>
                    Messages in this thread are automatically cleared after 5 days, or the student hasn’t sent a message yet.
                    You can send a proactive update below.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isAdminMsg = message.sender_role !== 'student';
                  const own = isOwnMessage(message);
                  const prevDay = index > 0 ? getDayKey(messages[index - 1].created_at) : null;
                  const currDay = getDayKey(message.created_at);
                  const showDayDivider = currDay && currDay !== prevDay;
                  const timeStr = formatMessageTime(message.created_at);
                  const isEdited =
                    message.updated_at &&
                    message.created_at &&
                    Math.abs(new Date(message.updated_at).getTime() - new Date(message.created_at).getTime()) > 2000;

                  return (
                    <React.Fragment key={message.id}>
                      {showDayDivider && (
                        <div className="ts-day-divider" role="separator">
                          <span>{formatDayLabel(message.created_at)}</span>
                        </div>
                      )}

                      <article className={`ts-msg${isAdminMsg ? ' is-admin' : ''}`}>
                        <div className="ts-msg-bubble">
                          {editing?.id === message.id ? (
                            <div className="ts-edit-box">
                              <label className="sr-only" htmlFor={`${idPrefix}-edit-${message.id}`}>
                                Edit support reply
                              </label>
                              <textarea
                                id={`${idPrefix}-edit-${message.id}`}
                                maxLength={4000}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditing(null);
                                  } else if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                    commitEdit();
                                  }
                                }}
                              />
                              <div className="ts-edit-actions">
                                <button type="button" onClick={() => setEditing(null)}>
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="is-save"
                                  disabled={busy || !editText.trim()}
                                  onClick={commitEdit}
                                >
                                  Save edit
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="ts-msg-head">
                                <span className="ts-msg-sender">
                                  {own
                                    ? 'You · Technical team'
                                    : isAdminMsg
                                      ? 'Technical team'
                                      : activeConvo.label}
                                </span>
                              </div>
                              <p className="ts-msg-text">{message.text}</p>
                              <div className="ts-msg-foot">
                                {isEdited && <span>Edited</span>}
                                <time dateTime={message.created_at}>{timeStr} IST</time>
                                {isAdminMsg && (
                                  <span
                                    className="ts-msg-receipt"
                                    aria-label={message.read_at ? 'Read by student' : 'Sent'}
                                    title={message.read_at ? 'Read by student' : 'Delivered to student'}
                                  >
                                    {message.read_at ? (
                                      <CheckCheck size={12} aria-hidden="true" />
                                    ) : (
                                      <Check size={12} aria-hidden="true" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {editing?.id !== message.id && (
                          <div className="ts-msg-actions">
                            {own && (
                              <button
                                type="button"
                                className="ts-msg-action"
                                disabled={busy}
                                aria-label={`Edit reply sent at ${timeStr}`}
                                onClick={() => {
                                  setEditing(message);
                                  setEditText(message.text);
                                  setConfirmDeleteId(null);
                                }}
                              >
                                <Pencil size={11} aria-hidden="true" />
                                Edit
                              </button>
                            )}

                            {confirmDeleteId === message.id ? (
                              <>
                                <button
                                  type="button"
                                  className="ts-msg-action is-confirm"
                                  disabled={busy}
                                  aria-label={`Confirm deleting message sent at ${timeStr}`}
                                  onClick={() => deleteMessage(message)}
                                >
                                  Confirm delete
                                </button>
                                <button
                                  type="button"
                                  className="ts-msg-action"
                                  disabled={busy}
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="ts-msg-action"
                                disabled={busy}
                                aria-label={`Delete message sent at ${timeStr}`}
                                onClick={() => setConfirmDeleteId(message.id)}
                              >
                                <Trash2 size={11} aria-hidden="true" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {showJumpLatest && (
              <button
                type="button"
                className="ts-jump-latest"
                onClick={scrollToLatest}
              >
                <ArrowDown size={13} aria-hidden="true" />
                Jump to latest
              </button>
            )}
          </div>

          {/* Reply Composer */}
          {locked ? (
            <div className="ts-locked-banner" role="status">
              <span className="ts-locked-text">
                <Lock size={14} aria-hidden="true" />
                Messaging is paused globally. Staff and students can still read active conversations.
              </span>
              <Link to="/admin/site-settings">Manage in Navigation &amp; site settings</Link>
            </div>
          ) : (
            <div className="ts-composer-dock">
              {activeConvo && (
                <div className="ts-quick-replies" aria-label="Quick reply templates">
                  <span className="ts-quick-label">Quick replies</span>
                  {QUICK_REPLIES.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="ts-quick-chip"
                      disabled={busy}
                      onClick={() =>
                        setDraft(prev => (prev.trim() ? `${prev.trim()} ${template}` : template))
                      }
                    >
                      {template}
                    </button>
                  ))}
                </div>
              )}

              <form
                className="ts-composer"
                onSubmit={e => {
                  e.preventDefault();
                  send();
                }}
              >
                <div className="ts-composer-input-wrap">
                  <label className="sr-only" htmlFor={composerId}>
                    {activeConvo ? `Reply to ${activeConvo.label}` : 'Select a conversation to reply'}
                  </label>
                  <textarea
                    id={composerId}
                    maxLength={4000}
                    placeholder={
                      activeConvo
                        ? `Reply to ${activeConvo.label}… (Enter to send, Shift+Enter for new line)`
                        : 'Select a student request from the queue first'
                    }
                    value={draft}
                    disabled={!activeId || busy}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                        send();
                      }
                    }}
                  />
                  {draft.length > 3200 && (
                    <span className="ts-char-count">{draft.length} / 4000</span>
                  )}
                </div>
                <button
                  type="submit"
                  className="ts-send-btn"
                  disabled={!activeId || !draft.trim() || busy}
                  aria-label="Send reply"
                >
                  <Send size={14} aria-hidden="true" />
                  <span>{busy ? 'Sending…' : 'Send reply'}</span>
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TechnicalSupportWorkspace;
