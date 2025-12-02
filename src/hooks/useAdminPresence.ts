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
}

interface PresenceUpdate {
  page?: string;
  section?: string;
  isTyping?: boolean;
}

export const useAdminPresence = () => {
  const { user } = useAuth();
  const [otherAdmins, setOtherAdmins] = useState<AdminPresence[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      await supabase
        .from('admin_presence')
        .upsert(data, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error updating presence:', error);
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
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data, error } = await supabase
        .from('admin_presence')
        .select('*')
        .neq('user_id', user.id)
        .gte('last_activity_at', thirtySecondsAgo)
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

    // Heartbeat to update last_activity_at every 10 seconds
    heartbeatInterval.current = setInterval(() => {
      updatePresence({});
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
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
          .then(() => {
            // Cleanup successful
          })
          .catch((err: any) => {
            console.error('Error cleaning up presence:', err);
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
