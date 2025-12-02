import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
  // Cursor tracking
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
  cursorX?: number;
  cursorY?: number;
  screenW?: number;
  screenH?: number;
  focusedElement?: string;
}

export const useAdminPresence = () => {
  const { user } = useAuth();
  const [otherAdmins, setOtherAdmins] = useState<AdminPresence[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseThrottle = useRef<number>(0);

  // Update presence
  const updatePresence = useCallback(async (update: PresenceUpdate) => {
    if (!user) return;

    try {
      const data: any = {
        user_id: user.id,
        email: user.email,
        last_activity_at: new Date().toISOString()
      };

      if (update.page !== undefined) data.current_page = update.page;
      if (update.section !== undefined) data.current_section = update.section;
      if (update.isTyping !== undefined) data.is_typing = update.isTyping;
      
      // Cursor data
      if (update.cursorX !== undefined) data.cursor_x = update.cursorX;
      if (update.cursorY !== undefined) data.cursor_y = update.cursorY;
      if (update.screenW !== undefined) data.screen_w = update.screenW;
      if (update.screenH !== undefined) data.screen_h = update.screenH;
      if (update.focusedElement !== undefined) data.focused_element = update.focusedElement;

      await supabase
        .from('admin_presence')
        .upsert(data, { onConflict: 'user_id' });
    } catch (error) {
      // Silent error for high-frequency updates
      // console.error('Error updating presence:', error);
    }
  }, [user]);

  // Set typing status with auto-clear after 3 seconds
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
      // Increased tolerance to 2 minutes to handle background tabs
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

  // Subscribe to presence changes
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchPresence();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin_presence_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_presence'
        },
        () => {
          fetchPresence();
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    // Heartbeat to update last_activity_at every 15 seconds
    heartbeatInterval.current = setInterval(() => {
      updatePresence({});
    }, 15000);

    // Force heartbeat on visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence({});
        fetchPresence();
      }
    };
    
    // Track mouse movement (throttled)
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - mouseThrottle.current > 100) { // Max 10 updates per second
        mouseThrottle.current = now;
        
        // Calculate percentage position to handle different screen sizes
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        updatePresence({
          cursorX: x,
          cursorY: y,
          screenW: window.innerWidth,
          screenH: window.innerHeight
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      supabase.removeChannel(channel);
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [user, fetchPresence, updatePresence]);

  // Cleanup on unmount - remove presence
  useEffect(() => {
    return () => {
      if (user) {
        supabase
          .from('admin_presence')
          .delete()
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error cleaning up presence:', error);
          });
      }
    };
  }, [user]);

  return {
    otherAdmins,
    isSubscribed,
    updatePresence,
    setTyping
  };
};
