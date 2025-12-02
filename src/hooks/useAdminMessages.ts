import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface AdminMessage {
  id: number;
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
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          message: message.trim()
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: number) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
      
      // Remove from unread list
      setUnreadMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Fetch unread messages
  const fetchUnreadMessages = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnreadMessages(data || []);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  }, [user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `to_user_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new as AdminMessage;
          setUnreadMessages(prev => [newMessage, ...prev]);
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadMessages]);

  return {
    unreadMessages,
    isSubscribed,
    sendMessage,
    markAsRead
  };
};
