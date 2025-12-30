/**
 * Wake Lock Hook
 * Prevents screen from sleeping during scanning
 */

import { useState, useEffect } from 'react';

export function useWakeLock(enabled: boolean = true) {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async () => {
    if (!isSupported || !enabled) return;

    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      console.log('✅ Wake Lock active - screen will stay on');

      // Listen for lock release
      lock.addEventListener('release', () => {
        console.log('Wake Lock released');
        setWakeLock(null);
      });
    } catch (err: any) {
      console.warn('Wake Lock failed:', err.message);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  // Request wake lock when enabled
  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-request on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isSupported]);

  return {
    wakeLock,
    isSupported,
    isActive: wakeLock !== null,
    requestWakeLock,
    releaseWakeLock
  };
}
