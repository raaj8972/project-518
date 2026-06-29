import React, { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Trash2, Pencil, Check, X, Search, CheckCheck, Shield, Lock, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoreData } from '../../context/CoreDataContext';

/* ─── Types ─── */
interface ChatMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender_id: string;
  sender_role: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  student_id: string;
  coordinator_id: string | null;
  event_id: string | null;
  created_at: string;
  // Enriched on frontend
  label: string;       // "Official Support" or "Dance Event" etc
  subtitle: string;    // coordinator name or student name
  lastMsg: string;
  online: boolean;
}

interface ChatPanelProps {
  themeAccent?: 'purple' | 'red' | 'indigo';
  currentUserLabel?: string;
  otherUserLabel?: string;
  eventId?: string; // coordinator passes their event id
}

/* ─── Helpers ─── */

function formatTime(ts: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Main Component ─── */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  themeAccent = 'purple',
  eventId,
}) => {
  const mode = themeAccent === 'red' ? 'student' : themeAccent === 'indigo' ? 'admin' : 'coordinator';
  const { siteSettings } = useCoreData();
  const chatLocked = !!(siteSettings as any)?.chat_locked;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [showChatWindowOnMobile, setShowChatWindowOnMobile] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [myTypingTimer, setMyTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convosRef = useRef<Conversation[]>([]);
  const activeConvoRef = useRef<string | null>(null);

  useEffect(() => {
    convosRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConvoRef.current = activeConvoId;
  }, [activeConvoId]);

  // Theme helpers
  const accentBg = themeAccent === 'purple' ? 'bg-purple-600' : themeAccent === 'indigo' ? 'bg-indigo-600' : 'bg-red-600';
  const accentHover = themeAccent === 'purple' ? 'hover:bg-purple-500' : themeAccent === 'indigo' ? 'hover:bg-indigo-500' : 'hover:bg-red-500';
  const accentRing = themeAccent === 'purple' ? 'focus:border-purple-500/50' : themeAccent === 'indigo' ? 'focus:border-indigo-500/50' : 'focus:border-red-500/50';
  const accentBadge = themeAccent === 'purple' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : themeAccent === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-red-500/10 border-red-500/20 text-red-400';
  const activeContactBg = themeAccent === 'purple' ? 'bg-purple-500/10 border-purple-500/20' : themeAccent === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-red-500/10 border-red-500/20';

  /* ─── 1. Get current user ─── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  /* ─── 2. Fetch & build conversations ─── */
  useEffect(() => {
    if (!currentUserId) return;

    const buildConversations = async () => {
      let allConvoIds: string[] = [];

      /* ── STUDENT MODE ──
       * a) 1 chat per registered event → coordinator of that event
       * b) 1 "Official Support" chat → admin (coordinator_id = NULL)
       */
      if (mode === 'student') {
        // ── Step 1: Fan out all initial reads in PARALLEL ──
        const [regsResult, existingConvosResult] = await Promise.all([
          supabase.from('registrations').select('event_id').eq('user_id', currentUserId),
          supabase.from('conversations').select('*').eq('student_id', currentUserId).order('created_at', { ascending: false }),
        ]);

        const registeredEventIds = regsResult.data ? regsResult.data.map((r: any) => String(r.event_id)).filter(Boolean) : [];

        // ── Step 2: Fetch event names in parallel with convo-map building ──
        const [evtsResult] = await Promise.all([
          registeredEventIds.length > 0
            ? supabase.from('events').select('id, title').in('id', registeredEventIds)
            : Promise.resolve({ data: [] }),
        ]);

        const eventNames: Record<string, string> = {};
        if (evtsResult.data) evtsResult.data.forEach((e: any) => { eventNames[String(e.id)] = e.title; });

        // Build map of existing conversations
        const convoMap: Record<string, any> = {};
        if (existingConvosResult.data) {
          existingConvosResult.data.forEach((c: any) => {
            const key = c.event_id ? `event-${c.event_id}` : 'support';
            convoMap[key] = c;
          });
        }

        // ── Step 3: Identify which chats need to be created ──
        const missingKeys: string[] = [];
        if (!convoMap['support']) missingKeys.push('support');
        for (const eid of registeredEventIds) {
          if (!convoMap[`event-${eid}`]) missingKeys.push(`event-${eid}`);
        }

        // ── Step 4: Show EXISTING chats immediately (instant render) ──
        const buildConvoList = (map: Record<string, any>) => {
          const list: Conversation[] = [];
          if (map['support']) {
            list.push({ ...map['support'], label: '🛡️ Official Support', subtitle: 'Admin team', lastMsg: 'Tap to chat with the admin team', online: true });
          }
          for (const eid of registeredEventIds) {
            const c = map[`event-${eid}`];
            if (c) {
              list.push({ ...c, label: eventNames[eid] || `Event #${eid}`, subtitle: 'Chat with event coordinator', lastMsg: 'Tap to chat', online: false });
            }
          }
          return list;
        };

        // Render immediately with what we have
        const initialList = buildConvoList(convoMap);
        setConversations(initialList);
        allConvoIds = initialList.map(c => c.id);
        if (initialList.length > 0 && !activeConvoId) setActiveConvoId(initialList[0].id);

        // ── Step 5: Create missing chats in PARALLEL ──
        if (missingKeys.length > 0) {
          const insertPromises = missingKeys.map(async (key) => {
            const event_id = key === 'support' ? null : key.replace('event-', '');
            const { data: created, error: createErr } = await supabase
              .from('conversations')
              .insert({ student_id: currentUserId, coordinator_id: null, event_id })
              .select()
              .single();

            if (created) {
              convoMap[key] = created;
            } else if (createErr) {
              // Race condition — might already exist; try fetching
              const q = supabase.from('conversations').select('*').eq('student_id', currentUserId).is('coordinator_id', null);
              const { data: fetched } = await (event_id ? q.eq('event_id', event_id) : q.is('event_id', null)).single();
              if (fetched) convoMap[key] = fetched;
              else if (key === 'support') {
                // Fallback placeholder when migration not applied
                convoMap[key] = { id: `support-placeholder-${currentUserId}`, student_id: currentUserId, coordinator_id: null, event_id: null, created_at: new Date().toISOString(), _placeholder: true };
              }
            }
          });

          await Promise.all(insertPromises);

          // Re-render with all chats now resolved
          const finalList = buildConvoList(convoMap);
          setConversations(finalList);
          allConvoIds = finalList.map(c => c.id);
          if (!activeConvoId && finalList.length > 0) setActiveConvoId(finalList[0].id);
        }

      }

      /* ── COORDINATOR MODE ──
       * Show all conversations for their event (where event_id matches)
       * Label = student's actual name
       */
      else if (mode === 'coordinator' && eventId) {
        const { data: convos } = await supabase
          .from('conversations')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(2000);

        if (!convos || convos.length === 0) {
          setConversations([]);
          return;
        }

        // Bulk fetch student names from profiles table
        const studentIds = Array.from(new Set(convos.map((c: any) => c.student_id)));
        const nameMap: Record<string, string> = {};
        const chunkSize = 200;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const chunk = studentIds.slice(i, i + chunkSize);
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', chunk);
          if (profileRows) profileRows.forEach((p: any) => {
            if (p.full_name) nameMap[p.id] = p.full_name;
          });
        }

        const mapped: Conversation[] = convos.map((c: any) => ({
          ...c,
          label: nameMap[c.student_id] || `Student (${c.student_id.substring(0, 6)}...)`,
          subtitle: 'Student',
          lastMsg: 'Tap to chat',
          online: false,
        }));

        setConversations(mapped);
        allConvoIds = mapped.map(c => c.id);
        if (mapped.length > 0 && !activeConvoId) setActiveConvoId(mapped[0].id);
      }

      /* ── ADMIN MODE ──
       * Show only SUPPORT chats (coordinator_id IS NULL)
       * Label = student name
       */
      else if (mode === 'admin') {
        const { data: convos } = await supabase
          .from('conversations')
          .select('*')
          .is('coordinator_id', null)
          .is('event_id', null)       // Only pure support chats (not event chats)
          .order('created_at', { ascending: false })
          .limit(2000);

        if (!convos || convos.length === 0) {
          setConversations([]);
          return;
        }

        // Bulk fetch student names from profiles table
        const studentIds = Array.from(new Set(convos.map((c: any) => c.student_id)));
        const nameMap: Record<string, string> = {};
        const chunkSize = 200;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const chunk = studentIds.slice(i, i + chunkSize);
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', chunk);
          if (profileRows) profileRows.forEach((p: any) => {
            if (p.full_name) nameMap[p.id] = p.full_name;
          });
        }

        const mapped: Conversation[] = convos.map((c: any) => ({
          ...c,
          label: nameMap[c.student_id] || `Student (${c.student_id.substring(0, 6)}...)`,
          subtitle: 'Support request',
          lastMsg: 'Tap to chat',
          online: false,
        }));

        setConversations(mapped);
        allConvoIds = mapped.map(c => c.id);
        if (mapped.length > 0 && !activeConvoId) setActiveConvoId(mapped[0].id);
      }

      // 4. Also fetch unread counts for all conversations
      if (currentUserId && allConvoIds.length > 0) {
        const { data: unreads } = await supabase
          .from('chat_messages')
          .select('conversation_id')
          .in('conversation_id', allConvoIds)
          .is('read_at', null)
          .neq('sender_role', mode);

        if (unreads) {
          const counts: Record<string, number> = {};
          unreads.forEach(u => {
            counts[u.conversation_id] = (counts[u.conversation_id] || 0) + 1;
          });
          setUnreadCounts(counts);
        }
      }
    };

    buildConversations();
  }, [currentUserId, mode, eventId]);

  /* ─── 3. Fetch messages for active conversation ─── */
  useEffect(() => {
    if (!activeConvoId) { setMessages([]); return; }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', activeConvoId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as ChatMessage[]);

      // Mark unread messages as read + update local state so blue ticks appear immediately
      if (currentUserId) {
        const now = new Date().toISOString();
        // Clear unread count for this active convo locally
        setUnreadCounts(prev => ({ ...prev, [activeConvoId]: 0 }));

        await supabase
          .from('chat_messages')
          .update({ read_at: now })
          .eq('conversation_id', activeConvoId)
          .neq('sender_role', mode)
          .is('read_at', null);
        
        // Update local state so sender sees blue ticks without waiting for realtime
        setMessages(prev => prev.map(m =>
          m.sender_role !== mode && !m.read_at ? { ...m, read_at: now } : m
        ));
      }
    };
    fetchMessages();
  }, [activeConvoId, currentUserId]);

  /* ─── 4. Global Realtime Listener for Badges ─── */
  useEffect(() => {
    if (!currentUserId) return;
    
    // Realtime subscription for all user's conversations
    const channel = supabase.channel(`chat-listener-${currentUserId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new as ChatMessage;
            
            // Only process if it belongs to one of our conversations
            if (!convosRef.current.some(c => c.id === m.conversation_id)) return;
            
            if (activeConvoRef.current === m.conversation_id) {
              setMessages(prev => {
                  // Only add message to state if the active chat matches 
                  // and we haven't already added it 
                  if (!prev.find(p => p.id === m.id)) {
                      return [...prev, m];
                  }
                  return prev;
              });
              // Auto-mark as read if it's from the other person
              if (m.sender_role !== mode) {
                supabase.from('chat_messages')
                  .update({ read_at: new Date().toISOString() })
                  .eq('id', m.id)
                  .then(() => {});
              }
            } else {
              // If it's for an inactive convo and from the other side, increment badge
              if (m.sender_role !== mode) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [m.conversation_id]: (prev[m.conversation_id] || 0) + 1
                }));
              }
            }
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ChatMessage;
            if (activeConvoRef.current === updated.conversation_id) {
                setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
            }
          }
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages(prev => prev.filter(m => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  /* ─── 5. Typing indicator ─── */
  useEffect(() => {
    if (input.trim()) {
      if (myTypingTimer) clearTimeout(myTypingTimer);
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      setMyTypingTimer(timer);
    }
    return () => { if (myTypingTimer) clearTimeout(myTypingTimer); };
  }, [input]);

  /* ─── 5. Auto-scroll ─── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages, isTyping]);

  /* ─── 6. Actions ─── */
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeConvoId || !currentUserId || chatLocked) return;
    const savedInput = input;
    setInput('');
    setIsTyping(false);
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: activeConvoId,
      sender_id: currentUserId,
      sender_role: mode,
      text: trimmed
    });
    if (error) {
      setInput(savedInput);
      console.error('[Chat] send failed:', error.message);
    }
  };

  // WhatsApp-style: anyone can edit or delete ONLY their own messages sent in their current role
  // (Checks role too so testing both dashboards on the same account shows correct left/right siding)
  const canEdit = (msg: ChatMessage) => msg.sender_id === currentUserId && msg.sender_role === mode;
  const canDelete = (msg: ChatMessage) => {
    if (msg.sender_id === currentUserId && msg.sender_role === mode) return true;
    if (mode === 'admin') return true;
    if (mode === 'coordinator') return !!eventId; // Coordinator can moderate their event chats
    return false;
  };

  const handleDelete = async (id: string, msg: ChatMessage) => {
    if (!canDelete(msg)) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) {
      setMessages(prev => [msg, ...prev].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      console.error('[Chat] delete failed:', error.message);
    }
  };

  const handleClearHistory = async () => {
    if (!activeConvoId || (mode !== 'admin' && mode !== 'coordinator')) return;
    if (!window.confirm('Are you sure you want to PERMANENTLY delete all messages in this chat?')) return;
    const backup = messages;
    setMessages([]);
    const { error } = await supabase.from('chat_messages').delete().eq('conversation_id', activeConvoId);
    if (error) {
      setMessages(backup);
      console.error('[Chat] clear history failed:', error.message);
    }
  };

  const handleEditSave = async (id: string, msg: ChatMessage) => {
    if (!editText.trim() || !canEdit(msg)) return;
    const updTx = editText.trim();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: updTx } : m));
    setEditingId(null);
    setEditText('');
    const { error } = await supabase.from('chat_messages').update({ text: updTx, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      // Roll back edit
      setMessages(prev => prev.map(m => m.id === id ? msg : m));
      console.error('[Chat] edit failed:', error.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConversations = conversations.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.label.toLowerCase().includes(term) || c.subtitle.toLowerCase().includes(term);
  });

  const activeConvo = conversations.find(c => c.id === activeConvoId);

  return (
    <div 
      className="flex flex-col lg:flex-row gap-4 h-full"
    >
      {/* Contact List */}
      <div className={`flex-shrink-0 lg:h-full lg:w-[200px] xl:w-[240px] flex flex-col gap-2 ${showChatWindowOnMobile ? 'hidden lg:flex' : 'flex w-full'}`}>
        {conversations.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text" placeholder="Search..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}
        <div className="bg-black/30 rounded-2xl border border-white/5 p-2 flex flex-col gap-2 overflow-y-auto h-full custom-scrollbar">
          {conversations.length > 3 && (
            <div className="relative flex-shrink-0 w-full lg:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" placeholder="Search..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}
          {filteredConversations.length === 0 && (
            <div className="text-center text-xs text-gray-500 mt-10 w-full">
              {searchTerm ? 'No results found.' : 'No conversations yet.'}
            </div>
          )}
          {filteredConversations.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setActiveConvoId(chat.id);
                setShowChatWindowOnMobile(true);
              }}
              className={`w-full flex items-center p-3 lg:px-4 lg:py-3 gap-3 rounded-xl text-left transition-all border ${
                chat.id === activeConvoId ? activeContactBg : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                  !chat.coordinator_id ? 'bg-indigo-600/40' : 'bg-white/10'
                }`}>
                  {!chat.coordinator_id ? <Shield size={16} /> : chat.label.charAt(0)}
                </div>
                {chat.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111]" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between items-center mb-0.5">
                  <p className="font-semibold text-white text-sm truncate">{chat.label}</p>
                  {unreadCounts[chat.id] > 0 && chat.id !== activeConvoId && (
                    <div className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-black bg-[#25D366] shadow-sm ml-2">
                      {unreadCounts[chat.id]}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate">{chat.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 min-h-0 flex flex-col bg-black/30 rounded-2xl border border-white/5 overflow-hidden ${!showChatWindowOnMobile ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-white/[0.02] flex-shrink-0">
          <button
            onClick={() => setShowChatWindowOnMobile(false)}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all mr-1"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="relative">
            <div className={`w-9 h-9 ${!activeConvo?.coordinator_id ? 'bg-indigo-600/40' : accentBg + ' opacity-40'} rounded-full flex items-center justify-center font-bold text-white text-sm`}>
              {!activeConvo?.coordinator_id ? <Shield size={14} /> : (activeConvo?.label || '?').charAt(0)}
            </div>
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              {activeConvo?.label || 'Select a chat'}
            </p>
            <p className="text-[10px] text-gray-500">{activeConvo?.subtitle || ''}</p>
          </div>
          <div className={`ml-auto flex items-center gap-2`}>
            {(mode === 'admin' || mode === 'coordinator') && activeConvoId && (
              <button
                onClick={handleClearHistory}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-all border border-red-500/20"
                title="Clear all messages"
              >
                <Trash2 size={10} />
                Clear History
              </button>
            )}
            <div className={`text-[10px] font-black px-2 py-1 rounded-full border ${accentBadge} hidden sm:block`}>
              5-day retention
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20 custom-scrollbar overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-2">
            <span className="text-[10px] text-gray-500 bg-black/40 px-3 py-0.5 rounded-full uppercase tracking-widest">
              Today · Messages auto-delete after 5 days
            </span>
          </div>

          {!activeConvoId && (
            <div className="text-center text-gray-600 text-xs mt-8">Select a conversation to start chatting.</div>
          )}

          {activeConvoId && messages.length === 0 && (
            <div className="text-center text-gray-600 text-xs mt-8">No messages yet. Say hello! 👋</div>
          )}

          {messages.map(msg => {
            const isMe = msg.sender_id === currentUserId && msg.sender_role === mode;
            // Determine bubble styling based on sender role
            const senderIsCoord = msg.sender_role === 'coordinator';
            const senderIsStudent = msg.sender_role === 'student';

            // My own bubble = accent color. Other person's bubble = role-based
            const bubbleClass = isMe
              ? `${accentBg} rounded-tr-sm`  // own message = theme color
              : senderIsCoord
                ? 'bg-emerald-700/60 border border-emerald-500/30 rounded-tl-sm'  // coordinator → green
                : senderIsStudent
                  ? 'bg-indigo-700/40 border border-indigo-500/20 rounded-tl-sm'  // student → indigo
                  : 'bg-white/10 border border-white/5 rounded-tl-sm';            // fallback

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                <div className="max-w-[75%] relative">
                  {/* Hover actions — only coordinator/admin see these */}
                  {(canEdit(msg) || canDelete(msg)) && (
                    <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                      {canEdit(msg) && (
                        <button
                          onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                          className="p-1 bg-white/10 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-all"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {canDelete(msg) && (
                        <button
                          onClick={() => handleDelete(msg.id, msg)}
                          className="p-1 bg-red-500/10 hover:bg-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {editingId === msg.id ? (
                    <div className="bg-black/40 border border-white/20 rounded-2xl p-2 min-w-[200px]">
                      <input
                        autoFocus value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(msg.id, msg); if (e.key === 'Escape') setEditingId(null); }}
                        className="w-full bg-transparent text-white text-sm focus:outline-none"
                      />
                      <div className="flex justify-end gap-1 mt-1">
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:text-white"><X size={12} /></button>
                        <button onClick={() => handleEditSave(msg.id, msg)} className="p-1 text-green-400 hover:text-green-300"><Check size={12} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm text-white ${bubbleClass}`}>
                      {/* Role badge for incoming messages so student knows who's talking */}
                      {!isMe && senderIsCoord && (
                        <span className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-widest mb-0.5">Coordinator</span>
                      )}
                      {msg.text}
                      <div className={`flex items-center ${isMe ? 'justify-end' : 'justify-start'} gap-1 mt-1`}>
                        <span className={`text-[10px] ${isMe ? 'opacity-60' : 'text-gray-500'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                        {/* Read receipt — WhatsApp style */}
                        {isMe && (
                          <CheckCheck size={12} className={`${msg.read_at ? 'text-blue-400' : 'text-gray-500 opacity-50'}`} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input / Locked Banner */}
        {chatLocked ? (
          <div className="p-4 border-t border-white/10 flex items-center gap-3 bg-orange-500/5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Lock size={14} className="text-orange-400" />
            </div>
            <div>
              <p className="text-orange-300 text-xs font-semibold">Chat is temporarily locked</p>
              <p className="text-gray-500 text-[11px]">An admin has paused all messaging. Check back later.</p>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
            <input
              type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConvoId}
              placeholder={activeConvoId ? "Message..." : "Select a chat first"}
              className={`flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none ${accentRing} transition-all placeholder-gray-600 disabled:opacity-50`}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !activeConvoId}
              className={`p-2.5 ${accentBg} ${accentHover} disabled:opacity-40 text-white rounded-xl transition-all shadow-lg flex-shrink-0`}
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
