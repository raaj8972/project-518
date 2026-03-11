import { useEffect, useState, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

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
      const docRef = doc(db, 'admin_messages', newId);
      await setDoc(docRef, {
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
      const docRef = doc(db, 'admin_messages', messageId);
      await updateDoc(docRef, { is_read: true });
      
      // Remove from unread list immediately
      setUnreadMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Fetch unread messages & Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const q = query(
      collection(db, 'admin_messages'),
      where('to_user_id', '==', user.id),
      where('is_read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: AdminMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<AdminMessage, 'id'>)
      }));
      
      // Sort in memory since Firestore requires composite index for query + multiple where clauses
      messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setUnreadMessages(messages);
      setIsSubscribed(true);
    }, (error) => {
      console.error('Error listening to messages:', error);
      setIsSubscribed(false);
    });

    return () => {
      unsubscribe();
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
