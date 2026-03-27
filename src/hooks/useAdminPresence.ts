import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';

export interface AdminPresence {
  id: number;
  user_id: string;
  email: string | null;
  current_page: string | null;
  current_section: string | null;
  is_typing: boolean;
  last_activity_at: number;
  // Cursor tracking (merged from broadcast)
  cursor_x?: number;
  cursor_y?: number;
  screen_w?: number;
  screen_h?: number;
  focused_element?: string;
}

interface PresenceUpdate {
  page?: string;
  section?: string;
  isTyping?: boolean;
}

interface CursorUpdate {
  x: number;
  y: number;
  screenW: number;
  screenH: number;
  focusedElement?: string;
}

export const useAdminPresence = () => {
  const { user } = useAuth();
  const { adminUsers } = useData();

  // "Ghost Mode": Owner should not broadcast presence to others
  const isOwner = useMemo(() => {
    if (!user || !Array.isArray(adminUsers)) return false;
    if (user.user_metadata?.master_bypass || user.id === 'master-admin-bypass') return true;
    const admin = adminUsers.find(u => u.user_id === user.id);
    return !!(admin?.role === 'owner' || admin?.is_primary);
  }, [user, adminUsers]);

  const [otherAdmins, setOtherAdmins] = useState<AdminPresence[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Track peer state locally via a ref (keyed by user_id)
  const peerState = useRef<Record<string, AdminPresence>>({});
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseThrottle = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const buildPresencePayload = useCallback((update: PresenceUpdate & Partial<CursorUpdate> = {}): any => {
    if (!user) return null;
    const payload: any = {
      user_id: user.id,
      email: user.email,
      last_activity_at: Date.now(),
    };
    if (update.page !== undefined) payload.current_page = update.page;
    if (update.section !== undefined) payload.current_section = update.section;
    if (update.isTyping !== undefined) payload.is_typing = update.isTyping;
    if (update.x !== undefined) payload.cursor_x = update.x;
    if (update.y !== undefined) payload.cursor_y = update.y;
    if (update.screenW !== undefined) payload.screen_w = update.screenW;
    if (update.screenH !== undefined) payload.screen_h = update.screenH;
    if (update.focusedElement !== undefined) payload.focused_element = update.focusedElement;
    return payload;
  }, [user]);

  const broadcastPresence = useCallback((payload: any) => {
    if (!channelRef.current || !payload) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'presence_update',
      payload
    }).catch(() => {});
  }, []);

  const updatePresence = useCallback((update: PresenceUpdate & Partial<CursorUpdate> = {}) => {
    if (!user || isOwner) return;
    const payload = buildPresencePayload(update);
    broadcastPresence(payload);
  }, [user, isOwner, buildPresencePayload, broadcastPresence]);

  const broadcastCursor = useCallback((update: CursorUpdate) => {
    updatePresence(update);
  }, [updatePresence]);

  const setTyping = useCallback((isTyping: boolean) => {
    updatePresence({ isTyping });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        updatePresence({ isTyping: false });
      }, 3000);
    }
  }, [updatePresence]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('admin_presence', {
      config: { broadcast: { self: false } }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === user.id) return;

        const twoMinutesAgo = Date.now() - 120000;
        if (payload.last_activity_at < twoMinutesAgo) {
          // Stale entry — remove this peer
          delete peerState.current[payload.user_id];
        } else {
          peerState.current[payload.user_id] = payload as AdminPresence;
        }
        setOtherAdmins(Object.values(peerState.current));
      })
      .on('broadcast', { event: 'presence_leave' }, ({ payload }) => {
        if (!payload?.user_id) return;
        delete peerState.current[payload.user_id];
        setOtherAdmins(Object.values(peerState.current));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          // Announce initial presence
          updatePresence();
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') updatePresence();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - mouseThrottle.current > 50) {
        mouseThrottle.current = now;
        broadcastCursor({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          screenW: window.innerWidth,
          screenH: window.innerHeight,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);

      // Announce departure then unsubscribe
      if (!isOwner && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'presence_leave',
          payload: { user_id: user.id }
        }).catch(() => {});
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
      peerState.current = {};
      setIsSubscribed(false);
    };
  }, [user, isOwner, updatePresence, broadcastCursor]);

  return {
    otherAdmins,
    isSubscribed,
    updatePresence,
    setTyping
  };
};
