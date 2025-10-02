import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDeviceFingerprint, getStableDeviceId } from '../lib/deviceFingerprint';
// Add explicit extension for consistency with AuthContext import.
import { getClientIP, getCachedIP } from '../lib/clientIp.ts';
import { useAuth } from '../context/AuthContext';

export interface AdminPresenceSessionMeta {
  user_id: string;
  email?: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ua: string;
  ts: number; // ms epoch when tracked
  platform?: string;
  browser?: string;
  presence_key?: string; // our ephemeral presence key (used for targeted logout)
  device_fingerprint?: string; // coarse fingerprint for block list
  device_id?: string; // stable local UUID
  ended_at_ts?: number; // when explicitly ended (logout/unmount)
  ip?: string;
}

export interface AdminPresenceStats {
  sessions: AdminPresenceSessionMeta[];
  totalSessions: number;
  uniqueUsers: number;
  byDevice: Record<string, number>;
  lastSync: number | null;
  isConnected: boolean;
  error?: string;
  myPresenceKey?: string | null;
  forceLogout?: (presenceKey: string, code: string) => Promise<boolean>;
  lastForcedTarget?: string | null;
  forcedLogoutLocally?: boolean;
  blockDevice?: (fingerprint: string, code: string) => boolean;
  unblockDevice?: (fingerprint: string, code: string) => boolean;
  isBlocked?: (fingerprint?: string) => boolean;
  blockedFingerprints: string[];
  offlineSessions: AdminPresenceSessionMeta[]; // historical (not currently active)
  refreshHistory?: (force?: boolean) => Promise<void>;
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
  const [lastForcedTarget, setLastForcedTarget] = useState<string | null>(null);
  const [forcedLogoutLocally, setForcedLogoutLocally] = useState(false);
  const [blockedFingerprints, setBlockedFingerprints] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_blocked_devices') || '[]'); } catch { return []; }
  });
  const remoteSyncedRef = useRef(false);
  const [offlineSessions, setOfflineSessions] = useState<AdminPresenceSessionMeta[]>([]);
  const lastHistoryFetchRef = useRef<number>(0);
  const historyFetchInFlight = useRef(false);
  const lastUpsertRef = useRef<number>(0);
  const refreshHistoryRef = useRef<(force?: boolean) => void | Promise<void>>();

  useEffect(() => {
    if (!enable || !isAuthenticated || !user) return;

    const key = `${user.id}:${Math.random().toString(36).slice(2, 8)}`;
    trackedKeyRef.current = key;
    const ua = navigator.userAgent;
    const fingerprint = getDeviceFingerprint();
    const deviceId = getStableDeviceId();
    let ipRef = '';
    const baseMeta: AdminPresenceSessionMeta = {
      user_id: user.id,
      email: user.email,
      ua,
      device_type: classifyDevice(ua),
      ts: Date.now(),
      platform: detectPlatform(ua),
      browser: detectBrowser(ua),
      presence_key: key,
      device_fingerprint: fingerprint,
      device_id: deviceId,
    };

    // If this device is blocked, do not establish presence (silent). Owner panel will show blocked list.
    if (blockedFingerprints.includes(fingerprint)) {
      return; // do not subscribe or track heartbeat
    }

    // Attempt one-time remote sync of blocked list (owner side effect) - non-blocking.
    (async () => {
      if (remoteSyncedRef.current) return;
      try {
        const { data: rows, error: rErr } = await supabase
          .from('admin_blocked_devices')
          .select('fingerprint');
        if (!rErr && rows) {
          const fps = rows.map(r => r.fingerprint).filter(Boolean);
          if (fps.length) {
            setBlockedFingerprints(prev => {
              const merged = Array.from(new Set([...prev, ...fps]));
              localStorage.setItem('admin_blocked_devices', JSON.stringify(merged));
              return merged;
            });
          }
          remoteSyncedRef.current = true;
        }
      } catch {}
    })();

    const channel = supabase.channel('admin_dashboard_presence', { config: { presence: { key } } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState() as Record<string, AdminPresenceSessionMeta[]>;
          const flat: AdminPresenceSessionMeta[] = [];
          // Inject presence key onto each meta so targeting is always accurate even if older clients didn't include it
          Object.entries(state).forEach(([presenceKey, arr]) => {
            arr.forEach(m => flat.push({ ...m, presence_key: m.presence_key || presenceKey }));
          });
          // Filter stale sessions older than 2 minutes (safety)
          const now = Date.now();
          const fresh = flat.filter(s => now - s.ts < 2 * 60 * 1000)
            .map(s => ({ ...s, device_fingerprint: s.device_fingerprint }));
          // Exclude any sessions with blocked fingerprints (real-time purge)
          const unblocked = fresh.filter(s => !blockedFingerprints.includes(s.device_fingerprint || ''));
          setSessions(unblocked);
          setLastSync(Date.now());
        } catch (e: any) {
          console.error('[presence sync error]', e);
          setError(String(e));
        }
      })
      .on('broadcast', { event: 'force_logout' }, async (payload: any) => {
        try {
          const targetKey = payload?.payload?.targetKey;
          const code = payload?.payload?.code;
          if (code === '9693' && targetKey && targetKey === key) {
            await supabase.auth.signOut();
            setForcedLogoutLocally(true);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
          }
        } catch (e: any) {
          console.error('[presence force_logout error]', e);
        }
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          try { ipRef = await getClientIP(); } catch { ipRef = ''; }
          const firstMeta = { ...baseMeta, ip: ipRef };
          channel.track(firstMeta).catch(e => {
            console.error('[presence track error]', e);
            setError(String(e));
          });
          // If IP was not immediately available, retry after a short delay and update presence & history once obtained.
          if (!ipRef) {
            setTimeout(async () => {
              if (ipRef) return; // already resolved in meantime
              try {
                const retryIp = await getClientIP();
                if (retryIp) {
                  ipRef = retryIp;
                  channel.track({ ...baseMeta, ip: ipRef, ts: Date.now() }).catch(()=>{});
                  // Attempt to enrich existing historical session row if it lacks IP
                  try {
                    await supabase
                      .from('admin_device_sessions')
                      .update({ ip_address: ipRef })
                      .eq('fingerprint', baseMeta.device_fingerprint)
                      .is('ip_address', null);
                  } catch {}
                }
              } catch {}
            }, 2000);
          }
        }
      });

    // Listen for realtime block updates so we can instantly update local state
    channel.on('broadcast', { event: 'block_update' }, (payload: any) => {
      try {
        const { fingerprint: bf, action, device_id: bid } = payload?.payload || {};
        if (!bf && !bid) return;
        setBlockedFingerprints(prev => {
          if (action === 'block') {
            if (prev.includes(bf)) return prev; // already
            const merged = [...prev, bf];
            try { localStorage.setItem('admin_blocked_devices', JSON.stringify(merged)); } catch {}
            // Remove any active sessions with that fingerprint immediately
            setSessions(s => s.filter(sess => sess.device_fingerprint !== bf));
            return merged;
          } else if (action === 'unblock') {
            if (!prev.includes(bf)) return prev;
            const filtered = prev.filter(f => f !== bf);
            try { localStorage.setItem('admin_blocked_devices', JSON.stringify(filtered)); } catch {}
            return filtered;
          }
          return prev;
        });
      } catch (e) {
        // ignore
      }
    });

    // Heartbeat update every 40s to keep session fresh (update ts).
    heartbeatRef.current = setInterval(() => {
      channel.track({ ...baseMeta, ip: ipRef || undefined, ts: Date.now() }).catch(() => {});
    }, 40_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        channel.track({ ...baseMeta, ip: ipRef || undefined, ts: Date.now() }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      // Flush final last_seen so it appears quickly in offline list
      (async () => {
        try {
          const nowIso = new Date().toISOString();
          await supabase.from('admin_device_sessions').upsert({
            fingerprint: baseMeta.device_fingerprint,
            user_id: baseMeta.user_id,
            email: baseMeta.email,
            device_type: baseMeta.device_type,
            platform: baseMeta.platform,
            browser: baseMeta.browser,
            ua: baseMeta.ua,
            ip_address: ipRef || null,
            last_seen: nowIso,
            ended_at: nowIso,
          }, { onConflict: 'fingerprint' });
        } catch {}
      })();
      // Notify others to pull latest history
  try { channelRef.current?.send({ type: 'broadcast', event: 'session_exit', payload: { fingerprint: baseMeta.device_fingerprint } }); } catch {}
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setIsConnected(false);
    };
  }, [enable, isAuthenticated, user?.id]);

  const byDevice: Record<string, number> = sessions.reduce((acc, s) => {
    acc[s.device_type] = (acc[s.device_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;

  // Upsert current active sessions into history table (throttled to every 30s)
  useEffect(() => {
    if (!sessions.length) return;
    const now = Date.now();
    if (now - lastUpsertRef.current < 30_000) return; // throttle
    lastUpsertRef.current = now;
    (async () => {
      try {
        const rows = sessions.map(s => ({
          fingerprint: s.device_fingerprint,
          user_id: s.user_id,
          email: s.email,
          device_type: s.device_type,
          platform: s.platform,
          browser: s.browser,
          ua: s.ua,
          ip_address: s.ip || null,
          last_seen: new Date().toISOString(),
        })).filter(r => r.fingerprint);
        if (!rows.length) return;
        await supabase.from('admin_device_sessions').upsert(rows, { onConflict: 'fingerprint' });
      } catch (e) {
        // silently ignore if table missing
      }
    })();
  }, [sessions]);

  const refreshHistory = async (force = false) => {
    if (historyFetchInFlight.current) return;
    const now = Date.now();
    if (!force && now - lastHistoryFetchRef.current < 60_000) return; // throttle only if not forced
    historyFetchInFlight.current = true;
    try {
      // Purge historical sessions older than 2 days (retention policy)
      // Throttle purge to at most once every 6 hours to avoid excessive deletes.
      const RETENTION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
      const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
      try {
        const lastPurgeStr = localStorage.getItem('admin_device_sessions_last_purge');
        const lastPurge = lastPurgeStr ? parseInt(lastPurgeStr, 10) : 0;
        if (now - lastPurge > PURGE_INTERVAL_MS) {
          // Attempt delete; ignore errors if table missing / perms restricted.
          const cutoffIso = new Date(Date.now() - RETENTION_MS).toISOString();
          await supabase.from('admin_device_sessions')
            .delete()
            .lt('last_seen', cutoffIso);
          localStorage.setItem('admin_device_sessions_last_purge', String(now));
        }
      } catch { /* ignore purge issues */ }

      const { data, error: hErr } = await supabase
        .from('admin_device_sessions')
        .select('fingerprint,user_id,email,device_type,platform,browser,ua,ip_address,last_seen,ended_at')
        .order('last_seen', { ascending: false })
        .limit(100);
      if (!hErr && data) {
        // current active fingerprints
        const activeSet = new Set(sessions.map(s => s.device_fingerprint));
        const mapped: AdminPresenceSessionMeta[] = data.map(r => ({
          user_id: r.user_id,
            email: r.email,
            device_type: (r.device_type as any) || 'unknown',
            ua: r.ua,
            ts: new Date(r.last_seen).getTime(),
            ended_at_ts: r.ended_at ? new Date(r.ended_at).getTime() : undefined,
            platform: r.platform,
            browser: r.browser,
            presence_key: undefined,
            device_fingerprint: r.fingerprint,
            ip: (r as any).ip_address || undefined,
        })).filter(m => !activeSet.has(m.device_fingerprint));
        setOfflineSessions(mapped);
        lastHistoryFetchRef.current = now;
      }
    } catch {
      // ignore
    } finally {
      historyFetchInFlight.current = false;
    }
  };
  refreshHistoryRef.current = refreshHistory;

  // Upsert active sessions (already above) - extend to include ended_at null semantics
  // forceLogout function (restored)
  const forceLogout = async (presenceKey: string, code: string): Promise<boolean> => {
    if (code !== '9693') return false;
    if (presenceKey === trackedKeyRef.current) return false; // don't target self
    try {
      if (!channelRef.current || !presenceKey) return false;
      const ok = await channelRef.current.send({
        type: 'broadcast',
        event: 'force_logout',
        payload: { targetKey: presenceKey, code },
      });
      if (ok !== 'error') setLastForcedTarget(presenceKey);
      return ok !== 'error';
    } catch (e) {
      console.error('[forceLogout error]', e);
      return false;
    }
  };

  // Listen for other clients ending their session (after refreshHistoryRef exists)
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const handler = () => refreshHistoryRef.current?.(true);
    ch.on('broadcast', { event: 'session_exit' }, handler);
    return () => {
      // supabase-js doesn't offer off() cleanup for channel events; channel removal handles it.
    };
  }, []);

  const persistBlocked = (list: string[]) => {
    setBlockedFingerprints(list);
    try { localStorage.setItem('admin_blocked_devices', JSON.stringify(list)); } catch {}
  };

  const blockDevice = (fingerprint: string, code: string): boolean => {
    if (code !== '9693') return false;
    if (!fingerprint || blockedFingerprints.includes(fingerprint)) return false;
    persistBlocked([...blockedFingerprints, fingerprint]);
    // Try to persist remotely
    (async () => {
      try {
        const device_id = getStableDeviceId();
        let ip = getCachedIP();
        if (!ip) ip = await getClientIP();
        await supabase.from('admin_blocked_devices').insert({ fingerprint, device_id, ip_address: ip || null });
        // If we still don't have an IP (network delay / blocked), schedule a late enrichment.
        if (!ip) {
          setTimeout(async () => {
            try {
              const lateIp = getCachedIP() || await getClientIP();
              if (lateIp) {
                await supabase
                  .from('admin_blocked_devices')
                  .update({ ip_address: lateIp })
                  .eq('fingerprint', fingerprint)
                  .is('ip_address', null);
              }
            } catch {}
          }, 2000);
        }
      } catch {}
    })();
    // Remove any active sessions with that fingerprint immediately client-side
    setSessions(prev => prev.filter(s => s.device_fingerprint !== fingerprint));
    // Broadcast to others
    try { channelRef.current?.send({ type: 'broadcast', event: 'block_update', payload: { action: 'block', fingerprint, code: '9693', device_id: getStableDeviceId() } }); } catch {}
    return true;
  };

  const unblockDevice = (fingerprint: string, code: string): boolean => {
    if (code !== '9693') return false;
    if (!fingerprint) return false;
    if (!blockedFingerprints.includes(fingerprint)) return false;
    persistBlocked(blockedFingerprints.filter(f => f !== fingerprint));
    (async () => {
      try { await supabase.from('admin_blocked_devices').delete().eq('fingerprint', fingerprint); } catch {}
    })();
    // Broadcast to others
    try { channelRef.current?.send({ type: 'broadcast', event: 'block_update', payload: { action: 'unblock', fingerprint, code: '9693', device_id: getStableDeviceId() } }); } catch {}
    return true;
  };

  const isBlocked = (fingerprint?: string): boolean => {
    if (!fingerprint) return false;
    return blockedFingerprints.includes(fingerprint);
  };

  return {
    sessions,
    totalSessions: sessions.length,
    uniqueUsers,
    byDevice,
    lastSync,
    isConnected,
    error,
    myPresenceKey: trackedKeyRef.current,
    forceLogout,
    lastForcedTarget,
    forcedLogoutLocally,
    blockDevice,
    unblockDevice,
    isBlocked,
    blockedFingerprints,
    offlineSessions,
    refreshHistory,
  };
}
