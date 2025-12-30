/**
 * useOnlineStatus Hook
 * 
 * Monitors network connectivity and provides real-time online/offline status
 */

import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
  lastOnlineTime: Date | null;
  wasOffline: boolean;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Network: ONLINE');
      setIsOnline(true);
      setLastOnlineTime(new Date());
      
      if (wasOffline) {
        console.log('🔄 Connection restored - triggering sync...');
        // Dispatch custom event for auto-sync
        window.dispatchEvent(new CustomEvent('connection-restored'));
      }
      
      setWasOffline(false);
    };

    const handleOffline = () => {
      console.log('🔴 Network: OFFLINE');
      setIsOnline(false);
      setWasOffline(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    lastOnlineTime,
    wasOffline
  };
}
