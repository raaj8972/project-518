import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface AdminPresenceSessionMeta {
  user_id: string;
  email?: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ua: string;
  ts: number; // ms epoch when tracked
  platform?: string;
  browser?: string;
}

export interface AdminPresenceStats {
  sessions: AdminPresenceSessionMeta[];
  totalSessions: number;
  uniqueUsers: number;
  byDevice: Record<string, number>;
  lastSync: number | null;
  isConnected: boolean;
  error?: string;
}

function classifyDevice(ua: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const low = ua.toLowerCase();
  if (/ipad|tablet/.test(low)) return 'tablet';
  if (/mobi|iphone|android/.test(low)) return 'mobile';
  if (/macintosh|windows|linux|cros/.test(low)) return 'desktop';
  return 'unknown';
}

function detectBrowser(ua: string): string | undefined {
  const low = ua.toLowerCase();
  if (low.includes('firefox')) return 'Firefox';
  if (low.includes('edg/')) return 'Edge';
  if (low.includes('chrome')) return 'Chrome';
  if (low.includes('safari') && !low.includes('chrome')) return 'Safari';
  if (low.includes('brave')) return 'Brave';
  return undefined;
}

function detectPlatform(ua: string): string | undefined {
  const low = ua.toLowerCase();
  if (low.includes('windows')) return 'Windows';
  if (low.includes('macintosh')) return 'macOS';
  if (low.includes('android')) return 'Android';
  if (low.includes('iphone') || low.includes('ipad')) return 'iOS';
  if (low.includes('linux')) return 'Linux';
  return undefined;
}

/**
 * Provides realtime presence (active admin dashboard sessions) using Supabase Realtime Presence API.
 * No database writes – ephemeral channel presence only.
 */
export function useAdminPresence(enable: boolean): AdminPresenceStats {
  const { isAuthenticated, user } = useAuth();
  const [sessions, setSessions] = useState<AdminPresenceSessionMeta[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enable || !isAuthenticated || !user) return;

    const key = `${user.id}:${Math.random().toString(36).slice(2, 8)}`;
    trackedKeyRef.current = key;
    const ua = navigator.userAgent;
    const meta: AdminPresenceSessionMeta = {
      user_id: user.id,
      email: user.email,
      ua,
      device_type: classifyDevice(ua),
      ts: Date.now(),
      platform: detectPlatform(ua),
      browser: detectBrowser(ua),
    };

    const channel = supabase.channel('admin_dashboard_presence', {
      config: { presence: { key } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState() as Record<string, AdminPresenceSessionMeta[]>;
          const flat: AdminPresenceSessionMeta[] = [];
          Object.values(state).forEach(arr => arr.forEach(m => flat.push(m)));
          // Filter stale sessions older than 2 minutes (safety)
            const now = Date.now();
          const fresh = flat.filter(s => now - s.ts < 2 * 60 * 1000);
          setSessions(fresh);
          setLastSync(Date.now());
        } catch (e: any) {
          console.error('[presence sync error]', e);
          setError(String(e));
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          channel.track(meta).catch(e => {
            console.error('[presence track error]', e);
            setError(String(e));
          });
        }
      });

    // Heartbeat update every 40s to keep session fresh (update ts).
    heartbeatRef.current = setInterval(() => {
      channel.track({ ...meta, ts: Date.now() }).catch(() => {});
    }, 40_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        channel.track({ ...meta, ts: Date.now() }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setIsConnected(false);
    };
  }, [enable, isAuthenticated, user?.id]);

  const byDevice: Record<string, number> = sessions.reduce((acc, s) => {
    acc[s.device_type] = (acc[s.device_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;

  return {
    sessions,
    totalSessions: sessions.length,
    uniqueUsers,
    byDevice,
    lastSync,
    isConnected,
    error,
  };
}
