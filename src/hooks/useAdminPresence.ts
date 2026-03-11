import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { firebaseDb } from '../lib/firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';

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
  
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseThrottle = useRef<number>(0);

  // Sync state to Realtime DB
  const updatePresence = useCallback((update: PresenceUpdate & Partial<CursorUpdate> = {}) => {
    if (!user || isOwner) return;

    try {
      const userRef = ref(firebaseDb, `admin_presence/${user.id}`);
      
      const payload: any = {
        user_id: user.id,
        email: user.email,
        last_activity_at: serverTimestamp()
      };

      if (update.page !== undefined) payload.current_page = update.page;
      if (update.section !== undefined) payload.current_section = update.section;
      if (update.isTyping !== undefined) payload.is_typing = update.isTyping;
      
      if (update.x !== undefined) payload.cursor_x = update.x;
      if (update.y !== undefined) payload.cursor_y = update.y;
      if (update.screenW !== undefined) payload.screen_w = update.screenW;
      if (update.screenH !== undefined) payload.screen_h = update.screenH;
      if (update.focusedElement !== undefined) payload.focused_element = update.focusedElement;

      // Ensure cleanup on disconnect
      onDisconnect(userRef).remove();
      
      // Update data
      set(userRef, payload);
    } catch (error) {
      // Silent error
    }
  }, [user, isOwner]);

  const broadcastCursor = useCallback((update: CursorUpdate) => {
    updatePresence(update);
  }, [updatePresence]);

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

  // Subscribe to real-time presence changes
  useEffect(() => {
    if (!user) return;

    const presenceRef = ref(firebaseDb, 'admin_presence');
    
    // Initial connection
    updatePresence();
    setIsSubscribed(true);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const twoMinutesAgo = Date.now() - 120000;
        
        const activeAdmins: AdminPresence[] = Object.values(data)
          .filter((admin: any) => admin.user_id !== user.id)
          .filter((admin: any) => {
             // Handle both server timestamps and exact numbers
             const ts = typeof admin.last_activity_at === 'number' ? admin.last_activity_at : Date.now();
             return ts >= twoMinutesAgo;
          }) as AdminPresence[];
          
        setOtherAdmins(activeAdmins);
      } else {
        setOtherAdmins([]);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - mouseThrottle.current > 50) { // 20fps
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
      unsubscribe();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (!isOwner) {
         set(ref(firebaseDb, `admin_presence/${user.id}`), null).catch(() => {});
      }
    };
  }, [user, updatePresence, broadcastCursor, isOwner]);

  return {
    otherAdmins,
    isSubscribed,
    updatePresence,
    setTyping
  };
};
