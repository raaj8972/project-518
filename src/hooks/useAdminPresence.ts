import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export interface AdminPresence {
  id: number;
  user_id: string;
  email: string | null;
  current_page: string | null;
  current_section: string | null;
  is_typing: boolean;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
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
    // Check for master bypass as well to be safe
    if (user.user_metadata?.master_bypass || user.id === 'master-admin-bypass') return true;
    const admin = adminUsers.find(u => u.user_id === user.id);
    return !!(admin?.role === 'owner' || admin?.is_primary);
  }, [user, adminUsers]);
  const [otherAdmins, setOtherAdmins] = useState<AdminPresence[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorUpdate>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseThrottle = useRef<number>(0);
  const channelRef = useRef<any>(null);

  // Update presence (DB - Low Frequency)
  const updatePresence = useCallback(async (update: PresenceUpdate) => {
    if (!user || isOwner) return;

    try {
      const data: any = {
        user_id: user.id,
        email: user.email,
        last_activity_at: new Date().toISOString()
      };

      if (update.page !== undefined) data.current_page = update.page;
      if (update.section !== undefined) data.current_section = update.section;
      if (update.isTyping !== undefined) data.is_typing = update.isTyping;

      await supabase
        .from('admin_presence')
        .upsert(data, { onConflict: 'user_id' });
    } catch (error) {
      // Silent error
    }
  }, [user]);

  // Broadcast cursor (Realtime - High Frequency)
  const broadcastCursor = useCallback((update: CursorUpdate) => {
    if (!channelRef.current || !user || isOwner) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor-pos',
      payload: { 
        user_id: user.id, 
        ...update 
      }
    });
  }, [user]);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    updatePresence({ isTyping });

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        updatePresence({ isTyping: false });
      }, 3000);
    }
  }, [updatePresence]);

  // Fetch other admins' presence
  const fetchPresence = useCallback(async () => {
    if (!user) return;

    try {
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
      
      const { data, error } = await supabase
        .from('admin_presence')
        .select('*')
        .neq('user_id', user.id)
        .gte('last_activity_at', twoMinutesAgo)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      setOtherAdmins(data || []);
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  }, [user]);

  // Subscribe to presence changes & Broadcast
  useEffect(() => {
    if (!user) return;

    fetchPresence();

    const channel = supabase.channel('admin_presence_updates');
    channelRef.current = channel;

    channel
      // Listen for DB changes (Status)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_presence' },
        () => fetchPresence()
      )
      // Listen for Cursor Broadcasts
      .on(
        'broadcast',
        { event: 'cursor-pos' },
        (payload) => {
          if (payload.payload.user_id !== user.id) {
            setCursors(prev => ({
              ...prev,
              [payload.payload.user_id]: {
                x: payload.payload.x,
                y: payload.payload.y,
                screenW: payload.payload.screenW,
                screenH: payload.payload.screenH,
                focusedElement: payload.payload.focusedElement
              }
            }));
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    // Heartbeat
    heartbeatInterval.current = setInterval(() => {
      updatePresence({});
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence({});
        fetchPresence();
      }
    };
    
    // Track mouse movement (Broadcast)
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - mouseThrottle.current > 50) { // 20fps (smoother than DB)
        mouseThrottle.current = now;
        
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        broadcastCursor({
          x,
          y,
          screenW: window.innerWidth,
          screenH: window.innerHeight
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      supabase.removeChannel(channel);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [user, fetchPresence, updatePresence, broadcastCursor]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (user && !isOwner) {
        supabase
          .from('admin_presence')
          .delete()
          .eq('user_id', user.id)
          .then(({ error }) => {
            // Ignore auth errors during cleanup as the user might be logging out
            if (error && 
                !error.message.includes('JWT') && 
                !error.message.includes('Unauthorized') &&
                !error.message.includes('secret/key')) {
              console.error('Error cleaning up presence:', error);
            }
          });
      }
    };
  }, [user]);

  // Merge DB presence with real-time cursors
  const adminsWithCursors = otherAdmins.map(admin => ({
    ...admin,
    cursor_x: cursors[admin.user_id]?.x,
    cursor_y: cursors[admin.user_id]?.y,
    screen_w: cursors[admin.user_id]?.screenW,
    screen_h: cursors[admin.user_id]?.screenH,
    focused_element: cursors[admin.user_id]?.focusedElement
  }));

  return {
    otherAdmins: adminsWithCursors,
    isSubscribed,
    updatePresence,
    setTyping
  };
};
