import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { dualUpsert, dualUpdate } from '../lib/dualDb';

export interface AdminMessage {
  id: string; // Changed to string for Firestore ID
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useAdminMessages = () => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState<AdminMessage[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Send a message
  const sendMessage = useCallback(async (toUserId: string, message: string) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const newId = Date.now().toString();
      await dualUpsert('admin_messages', {
        id: newId,
        from_user_id: user.id,
        to_user_id: toUserId,
        message: message.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await dualUpdate('admin_messages', messageId, { is_read: true });
      
      // Remove from unread list immediately
      setUnreadMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Fetch unread messages & Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`admin_messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_messages',
          filter: `to_user_id=eq.${user.id}`
        },
        async () => {
          // Re-fetch unread messages on any change
          const { data, error } = await supabase
            .from('admin_messages')
            .select('*')
            .eq('to_user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching messages:', error);
            setIsSubscribed(false);
          } else {
            setUnreadMessages(data as AdminMessage[]);
            setIsSubscribed(true);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Initial fetch
          supabase
            .from('admin_messages')
            .select('*')
            .eq('to_user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('Initial message fetch error:', error);
                setIsSubscribed(false);
              } else {
                setUnreadMessages(data as AdminMessage[]);
                setIsSubscribed(true);
              }
            });
        }
      });

    return () => {
      supabase.removeChannel(subscription);
      setIsSubscribed(false);
    };
  }, [user?.id]);

  return {
    unreadMessages,
    isSubscribed,
    sendMessage,
    markAsRead
  };
};
