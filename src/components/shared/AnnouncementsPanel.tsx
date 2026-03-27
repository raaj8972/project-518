import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Trash2, Pencil, Check, X, Bell, Globe, Users, AlertCircle, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AnnouncementCategory = 'general' | 'sports' | 'cultural' | 'academic';

interface Announcement {
  id: string;
  text: string;
  created_at: string;
  urgent: boolean;
  target: string;
  sender_role: string;
  sender_id: string;
  event_id?: string | null;
  deleted_at?: string | null;
  category: AnnouncementCategory;
}

const CATEGORY_META: Record<AnnouncementCategory, { label: string; color: string; bg: string; border: string }> = {
  general:  { label: 'General',  color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  sports:   { label: 'Sports',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cultural: { label: 'Cultural', color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  academic: { label: 'Academic', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
};

type ViewMode = 'admin' | 'coordinator' | 'student';

interface AnnouncementsPanelProps {
  mode: ViewMode;
  eventTitle?: string;
  eventId?: string; // For coordinator: restrict posts to this event
  compact?: boolean;
  onMore?: (id: string) => void;
  /** When set, only announcements with this category are shown (and new posts default to it) */
  defaultCategory?: AnnouncementCategory;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ 
  mode, 
  eventTitle, 
  eventId,
  compact = false,
  onMore,
  defaultCategory,
}) => {
  const location = useLocation();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editText, setEditText] = useState('');
  const [composeText, setComposeText] = useState('');
  const [target, setTarget] = useState<'all' | 'students' | 'coordinators'>('all');
  const [urgent, setUrgent] = useState(false);
  const [postCategory, setPostCategory] = useState<AnnouncementCategory>(defaultCategory ?? 'general');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [coordinatorsMap, setCoordinatorsMap] = useState<Record<string, string>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, string>>({});

  const canPost = mode === 'admin' || mode === 'coordinator';

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle deep-linking and scrolling
  useEffect(() => {
    if (announcements.length > 0 && location.hash) {
      const id = location.hash.replace('#announcement-', '');
      const element = document.getElementById(`announcement-${id}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(id);
          // Remove highlight after animation
          setTimeout(() => setHighlightedId(null), 3000);
        }, 300);
      }
    }
  }, [location.hash, announcements]);

  // Realtime fetch + registration context
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      setCurrentUserId(uid);

      // Students: fetch their registered event IDs so we can show coordinator announcements for those events
      if (mode === 'student') {
        const { data: regs } = await supabase
          .from('registrations')
          .select('event_id')
          .eq('user_id', uid);
        if (regs) {
          setRegisteredEventIds(new Set(regs.map((r: any) => String(r.event_id))));
        }
      }
    });

    // Fetch all coordinator names so we can display them instead of just "Coordinator"
    supabase.from('event_coordinators').select('user_id, name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c: any) => { map[c.user_id] = c.name; });
        setCoordinatorsMap(map);
      }
    });

    // Fetch all event titles to label coordinator event announcements
    supabase.from('events').select('id, title').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((e: any) => { map[String(e.id)] = e.title; });
        setEventsMap(map);
      }
    });
  }, [mode]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        // If a category filter is provided (e.g. sports council view), only show that category
        if (defaultCategory) {
          query = query.eq('category', defaultCategory);
        }

        if (mode === 'student') {
          // Students only see announcements for their target (all / students)
          query = query.in('target', ['all', 'students']);
          // NOTE: event-gating for coordinator announcements is done after fetch (client-side for simplicity)
        }

        if (mode === 'coordinator' && eventId) {
          // Coordinators on event view: see their event announcements + global admin ones
          query = query.or(`event_id.eq.${eventId},event_id.is.null`);
        }

        const { data, error } = await query;
        if (!error && data) {
          let filtered = data as Announcement[];

          // For students: filter coordinator announcements to only show ones from registered events
          if (mode === 'student') {
            filtered = filtered.filter((ann) => {
              if (ann.sender_role === 'admin') return true; // admin broadcasts always visible
              if (ann.sender_role === 'coordinator') {
                // Only show if student registered for this event
                return ann.event_id ? registeredEventIds.has(String(ann.event_id)) : false;
              }
              return true;
            });
          }

          // Ensure every announcement has a category (add default for legacy rows)
          filtered = filtered.map(a => ({ ...a, category: (a.category as AnnouncementCategory) || 'general' }));

          setAnnouncements(compact ? filtered.slice(0, 5) : filtered);
        }
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      }
    };

    fetchAnnouncements();

    const channel = supabase.channel('announcements_changes_compact')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnn = payload.new as Announcement;
            // Default category for legacy realtime rows
            if (!newAnn.category) newAnn.category = 'general';
            // If a category filter is active, skip announcements that don't match
            if (defaultCategory && newAnn.category !== defaultCategory) return;
            if (!newAnn.deleted_at) {
              // Apply the same filtering rules on realtime inserts
              let visible = true;
              if (mode === 'student') {
                if (newAnn.sender_role === 'coordinator') {
                  visible = newAnn.event_id ? registeredEventIds.has(String(newAnn.event_id)) : false;
                }
                visible = visible && ['all', 'students'].includes(newAnn.target);
              }
              if (visible) {
                setAnnouncements(prev => {
                  const combined = [newAnn, ...prev].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  return compact ? combined.slice(0, 5) : combined;
                });
              }
            }
          }
          if (payload.eventType === 'UPDATE') {
            const upAnn = payload.new as Announcement;
            if (upAnn.deleted_at) {
              setAnnouncements(prev => prev.filter(a => a.id !== upAnn.id));
            } else {
              setAnnouncements(prev => prev.map(a => a.id === upAnn.id ? upAnn : a));
            }
          }
          if (payload.eventType === 'DELETE') {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mode, eventId, registeredEventIds, compact]);

  const canDelete = (ann: Announcement): boolean => {
    if (mode === 'student') return false; // Students CANNOT delete
    if (mode === 'admin') return true; // Admin deletes all
    if (mode === 'coordinator') return currentUserId === ann.sender_id; // Coordinator deletes own only
    return false;
  };

  const canEdit = (ann: Announcement): boolean => {
    if (mode === 'student') return false; // Students CANNOT edit
    if (mode === 'admin') return true; // Admin edits all
    if (mode === 'coordinator') return currentUserId === ann.sender_id; // Coordinator edits own only
    return false;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    const ann = announcements.find(a => a.id === id);
    if (!ann || !canDelete(ann)) return;

    // Optimistic remove
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      // Roll back on failure
      setAnnouncements(prev => [ann, ...prev]);
      console.error('[Announcements] delete failed:', error.message);
    }
  };

  const handleEdit = (ann: Announcement) => {
    if (!canEdit(ann)) return;
    setEditingId(ann.id);
    setEditText(ann.text);
  };

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) return;
    const updatedText = editText.trim();
    const prev = announcements.find(a => a.id === id);
    setAnnouncements(anns => anns.map(a => a.id === id ? { ...a, text: updatedText } : a));
    setEditingId(null);
    setEditText('');
    const { error } = await supabase.from('announcements').update({ text: updatedText, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      // Roll back text change
      if (prev) setAnnouncements(anns => anns.map(a => a.id === id ? prev : a));
      console.error('[Announcements] update failed:', error.message);
    }
  };

  const handlePost = async () => {
    if (!composeText.trim() || !currentUserId) return;
    const textToInsert = composeText.trim();
    const savedText = composeText;
    setComposeText('');
    setUrgent(false);

    // Coordinators always post with their event_id — their announcements are event-specific
    const { error } = await supabase.from('announcements').insert({
      text: textToInsert,
      urgent,
      target: mode === 'coordinator' ? 'students' : target,
      sender_id: currentUserId,
      sender_role: mode,
      event_id: mode === 'coordinator' ? (eventId || null) : null,
      category: postCategory,
    });
    if (error) {
      // Restore compose text so user doesn't lose it
      setComposeText(savedText);
      console.error('[Announcements] insert failed:', error.message);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const senderLabel = (ann: Announcement) => {
    if (ann.sender_role === 'admin') return 'Admin • Broadcast';
    if (ann.sender_role === 'coordinator') {
      const name = coordinatorsMap[ann.sender_id] || 'Coordinator';
      const eventName = ann.event_id ? eventsMap[String(ann.event_id)] : null;
      return `${name}${eventName ? ` • ${eventName}` : (ann.event_id ? ` • Event` : '')}`;
    }
    return ann.sender_role;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {mode === 'student' ? 'Live Announcements' : `Announcements${eventTitle ? ` — ${eventTitle}` : ''}`}
            </h3>
          </div>
          <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
            {announcements.length} Active
          </span>
        </div>
      )}

      {/* Permission note for coordinators */}
      {!compact && mode === 'coordinator' && (
        <div className="text-[10px] text-purple-400 bg-purple-500/5 border border-purple-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <Globe size={10} />
          Your announcements are sent only to students registered for this event.
        </div>
      )}

      {/* Announcement Cards */}
      <div className={`space-y-2 overflow-y-auto pr-2 custom-scrollbar ${compact ? 'max-h-[400px]' : 'max-h-[600px]'}`}>
        {announcements.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-8 border border-dashed border-white/10 rounded-2xl">
            No announcements yet
          </div>
        )}
        {announcements.map(ann => {
          const isLong = ann.text.length > 180;
          const isExpanded = expandedIds.has(ann.id);
          const displayMore = compact && isLong && !isExpanded;

          return (
            <div
              key={ann.id}
              id={`announcement-${ann.id}`}
              className={`flex items-start gap-3 p-4 rounded-2xl border text-sm group transition-all duration-500 ${
                highlightedId === ann.id
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.02] z-10'
                  : ann.urgent
                    ? 'bg-red-500/5 border-red-500/20 text-red-200'
                    : 'bg-white/[0.03] border-white/5 text-gray-300'
              }`}
            >
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${ann.urgent ? 'bg-red-500' : ann.sender_role === 'coordinator' ? 'bg-purple-500' : 'bg-white/20'}`} />

              <div className="flex-1 min-w-0">
                {editingId === ann.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEditSave(ann.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                    />
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white p-1"><X size={14} /></button>
                    <button onClick={() => handleEditSave(ann.id)} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                  </div>
                ) : (
                  <div>
                    <p className="break-words whitespace-pre-wrap leading-relaxed">
                      {isLong && !isExpanded ? `${ann.text.substring(0, 180)}...` : ann.text}
                    </p>
                    {isLong && !compact && (
                      <button 
                        onClick={(e) => toggleExpand(e, ann.id)}
                        className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 hover:text-red-300"
                      >
                        {isExpanded ? 'Show Less ↑' : 'Read More ↓'}
                      </button>
                    )}
                    {displayMore && (
                      <button 
                        onClick={() => onMore?.(ann.id)}
                        className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 hover:text-red-300 flex items-center gap-1"
                      >
                        Read Full Discovery <ArrowRight size={10} />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${ann.sender_role === 'coordinator' ? 'text-purple-400' : 'text-gray-600'}`}>
                    {senderLabel(ann)}
                  </span>
                  {ann.sender_role === 'admin' && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
                      {ann.target === 'all' ? 'ALL' : ann.target.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600">· {formatTime(ann.created_at)}</span>
                  {ann.urgent && (
                    <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20 uppercase flex items-center gap-1">
                      <AlertCircle size={9} /> Urgent
                    </span>
                  )}
                  {/* Category badge — only show when not the default 'general' or there's an active filter */}
                  {(ann.category !== 'general' || defaultCategory) && (() => {
                    const meta = CATEGORY_META[ann.category] ?? CATEGORY_META.general;
                    return (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border uppercase flex items-center gap-1 ${meta.color} ${meta.bg} ${meta.border}`}>
                        <Tag size={8} /> {meta.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Actions — only show for those who can act */}
              {!compact && (canEdit(ann) || canDelete(ann)) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {canEdit(ann) && editingId !== ann.id && (
                    <button
                      onClick={() => handleEdit(ann)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-all"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {canDelete(ann) && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compose (admin/coordinator only) */}
      {canPost && (
        <div className={`bg-black/20 rounded-2xl border border-white/5 p-4 space-y-3 ${compact ? 'mt-2' : 'mt-4'}`}>
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Post Announcement</p>
            {!compact && <span className="text-[10px] font-black text-gray-700 uppercase tabular-nums">{composeText.length} Characters</span>}
          </div>

          {/* Admins choose target; coordinators always target their event's students */}
          {mode === 'admin' && !compact && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['all', 'students', 'coordinators'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all uppercase ${
                      target === t ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => setUrgent(u => !u)}
                  className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border transition-all uppercase ${
                    urgent ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {urgent ? '🔴 Urgent' : 'Normal'}
                </button>
              </div>
              {/* Category selector — hidden if panel already has a locked defaultCategory */}
              {!defaultCategory && (
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(CATEGORY_META) as AnnouncementCategory[]).map(cat => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setPostCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all uppercase flex items-center gap-1 ${
                          postCategory === cat
                            ? `${meta.color} ${meta.bg} ${meta.border}`
                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <Tag size={9} /> {meta.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {mode === 'coordinator' && !compact && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-purple-400">
                <Users size={10} />
                <span>→ Registered students for this event only</span>
              </div>
              <button
                onClick={() => setUrgent(u => !u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all uppercase ${
                  urgent ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                }`}
              >
                {urgent ? '🔴 Urgent' : 'Normal'}
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              rows={compact ? 1 : 2}
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder={mode === 'coordinator' ? `Announce to registered students...` : 'Type an announcement...'}
              className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all text-sm resize-none ${compact ? 'py-2 pr-24' : 'py-3 pr-28'}`}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost(); }}
            />
            <button
              onClick={handlePost}
              disabled={!composeText.trim()}
              className={`absolute right-2 bottom-1.5 px-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 shadow-lg ${compact ? 'py-1' : 'py-1.5 py-1.5'}`}
            >
              <Bell size={12} /> {compact ? 'Post' : mode === 'admin' ? 'Broadcast' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
