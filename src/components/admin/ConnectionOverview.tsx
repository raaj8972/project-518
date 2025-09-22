import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type FuncHealth = {
  ok: boolean;
  ts?: string;
};

export const ConnectionOverview: React.FC = () => {
  const { connectionStatus, latencyMs, lastError, supabaseHost, schemaCapabilities, resubscribeRealtime, pingNow, realtimeStatus } = useData();
  const { isAuthenticated, user } = useAuth();

  const [funcOk, setFuncOk] = useState<boolean | null>(null);
  const [funcLatency, setFuncLatency] = useState<number | null>(null);
  const [funcError, setFuncError] = useState<string | null>(null);

  const [netOnline, setNetOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [dbCounts, setDbCounts] = useState<Record<string, number | null> | null>(null);
  const [dbChecking, setDbChecking] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [heartbeatAt, setHeartbeatAt] = useState<string | null>(null);
  const [heartbeatIso, setHeartbeatIso] = useState<string | null>(null);
  const [hbError, setHbError] = useState<string | null>(null);
  const [hbPending, setHbPending] = useState<boolean>(false);
  const [copiedHB, setCopiedHB] = useState<boolean>(false);
  const [installingHB, setInstallingHB] = useState<boolean>(false);
  const [installErr, setInstallErr] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setNetOnline(true);
    const off = () => setNetOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const pingFunctions = async () => {
    setFuncError(null);
    setFuncOk(null);
    setFuncLatency(null);
    try {
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const res = await fetch('/.netlify/functions/health', { cache: 'no-store' });
      const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      setFuncLatency(Math.round(t1 - t0));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FuncHealth = await res.json().catch(() => ({ ok: true } as any));
      setFuncOk(!!data?.ok);
    } catch (e: any) {
      setFuncOk(false);
      setFuncError(e?.message || String(e));
    }
  };

  useEffect(() => { pingFunctions(); }, []);

  const checkDbCounts = async () => {
    setDbChecking(true);
    setDbError(null);
    try {
      const tables = [
        'events',
        'registrations',
        'sponsors',
        'schedule_days',
        'guest_artists',
        'faculty_heads',
        'sponsorship_packages',
        'sponsorship_settings',
      ];

      const results = await Promise.all(
        tables.map(async (t) => {
          try {
            const { count, error } = await supabase
              .from(t as any)
              .select('id', { count: 'exact' })
              .range(0, 0);
            if (error) throw error;
            return [t, count ?? 0] as const;
          } catch (e) {
            return [t, null] as const;
          }
        })
      );

      const map: Record<string, number | null> = {};
      for (const [t, c] of results) map[t] = c;
      setDbCounts(map);
    } catch (e: any) {
      setDbError(e?.message || String(e));
      setDbCounts(null);
    } finally {
      setDbChecking(false);
    }
  };

  const fetchHeartbeat = async () => {
    setHbError(null);
    try {
      const { data, error } = await supabase
        .from('health_heartbeats' as any)
        .select('last_run')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      const ts = (data as any)?.last_run || null;
      setHeartbeatIso(ts);
      setHeartbeatAt(ts ? new Date(ts).toLocaleString() : null);
    } catch (e: any) {
      setHbError(e?.message || String(e));
    }
  };

  const triggerHeartbeat = async () => {
    setHbPending(true);
    setHbError(null);
    try {
      let res = await fetch('/.netlify/functions/heartbeat', { method: 'POST' });
      if (res.status === 404) {
        // Fallback endpoint name
        res = await fetch('/.netlify/functions/heartbeat_fallback', { method: 'POST' });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchHeartbeat();
    } catch (e: any) {
      const msg = e?.message || String(e);
      // Supabase PostgREST missing table often returns a message like:
      // "Could not find the table 'public.health_heartbeats' in the schema cache"
      setHbError(msg);
    } finally {
      setHbPending(false);
    }
  };

  useEffect(() => { fetchHeartbeat(); }, []);

  const autoInstallHeartbeat = async () => {
    setInstallingHB(true);
    setInstallErr(null);
    try {
      // Get current session token
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session?.access_token) throw new Error('Not authenticated');
      const res = await fetch('/.netlify/functions/install-heartbeat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const body = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(body); throw new Error(j?.error || `HTTP ${res.status}`); } catch { throw new Error(body || `HTTP ${res.status}`); }
      }
      await fetchHeartbeat();
    } catch (e: any) {
      setInstallErr(e?.message || String(e));
    } finally {
      setInstallingHB(false);
    }
  };

  const statusDot = (state: 'ok' | 'warn' | 'err') => (
    <span className={
      'inline-block w-2.5 h-2.5 rounded-full mr-2 ' +
      (state === 'ok' ? 'bg-green-500' : state === 'warn' ? 'bg-amber-500' : 'bg-rose-600')
    } />
  );

  const supabaseState: 'ok' | 'warn' | 'err' = connectionStatus === 'ok' ? 'ok' : (connectionStatus === 'degraded' ? 'warn' : 'err');
  const storageOk = !!schemaCapabilities?.storage_registration_photos_bucket;

  // Heartbeat freshness status
  const heartbeatState: 'ok' | 'warn' | 'err' = (() => {
    if (!heartbeatIso) return 'err';
    const last = Date.parse(heartbeatIso);
    if (Number.isNaN(last)) return 'err';
    const mins = (Date.now() - last) / 60000;
    if (mins <= 20) return 'ok';
    if (mins <= 60) return 'warn';
    return 'err';
  })();
  const heartbeatAgo = (() => {
    if (!heartbeatIso) return null;
    const last = Date.parse(heartbeatIso);
    if (Number.isNaN(last)) return null;
    const mins = Math.max(0, Math.floor((Date.now() - last) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  })();

  // Helper SQL to create health_heartbeats table if missing
  const heartbeatInstallSql = `-- Create health_heartbeats table for Netlify heartbeat diagnostics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='health_heartbeats'
  ) THEN
    CREATE TABLE public.health_heartbeats (
      id INTEGER PRIMARY KEY,
      last_run timestamptz,
      updated_by text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'set_updated_at' AND n.nspname='public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid
    WHERE t.tgname='health_heartbeats_set_updated_at' AND n.nspname='public' AND c.relname='health_heartbeats'
  ) THEN
    CREATE TRIGGER health_heartbeats_set_updated_at
    BEFORE UPDATE ON public.health_heartbeats
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.health_heartbeats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_heartbeats' AND policyname='read_health_heartbeats'
  ) THEN
    CREATE POLICY read_health_heartbeats ON public.health_heartbeats
    FOR SELECT USING (auth.role() = 'authenticated' OR (SELECT current_setting('request.jwt.claims', true)) IS NULL);
  END IF;
END $$;

INSERT INTO public.health_heartbeats (id, last_run, updated_by)
VALUES (1, NOW(), 'migration-seed')
ON CONFLICT (id) DO UPDATE SET last_run = EXCLUDED.last_run, updated_by = EXCLUDED.updated_by;`;

  const copyHeartbeatSql = async () => {
    try {
      await navigator.clipboard.writeText(heartbeatInstallSql);
      setCopiedHB(true);
      setTimeout(() => setCopiedHB(false), 1500);
    } catch {}
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Connection Overview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => pingNow && pingNow()}
            className="rounded bg-gray-900 text-white px-2 py-1 text-xs hover:bg-black active:scale-[0.99]"
            title="Measure Supabase API latency"
          >Ping Supabase</button>
          <button
            onClick={() => pingFunctions()}
            className="rounded bg-gray-700 text-white px-2 py-1 text-xs hover:bg-gray-800 active:scale-[0.99]"
            title="Ping Netlify Functions"
          >Ping Functions</button>
          <button
            onClick={() => resubscribeRealtime()}
            className="rounded bg-gray-200 text-gray-900 px-2 py-1 text-xs hover:bg-gray-300 active:scale-[0.99]"
            title="Resubscribe realtime channels"
          >Resubscribe</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Supabase API */}
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm font-medium text-gray-900">
              {statusDot(supabaseState)}Supabase API
            </div>
            <div className="text-xs text-gray-500 truncate ml-2" title={supabaseHost || undefined}>{supabaseHost || '—'}</div>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Latency: {typeof latencyMs === 'number' ? `${latencyMs} ms` : '—'}</div>
            {lastError && connectionStatus !== 'ok' && (
              <div className="text-rose-700 truncate" title={lastError}>Err: {lastError}</div>
            )}
          </div>
        </div>

        {/* Netlify Functions */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(funcOk === null ? 'warn' : funcOk ? 'ok' : 'err')}Netlify Functions
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Latency: {funcLatency != null ? `${funcLatency} ms` : '—'}</div>
            {funcError && (<div className="text-rose-700 truncate" title={funcError}>Err: {funcError}</div>)}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium"
                  style={{
                    borderColor: heartbeatState === 'ok' ? '#16a34a' : heartbeatState === 'warn' ? '#f59e0b' : '#e11d48',
                    color: heartbeatState === 'ok' ? '#166534' : heartbeatState === 'warn' ? '#92400e' : '#9f1239',
                    background: heartbeatState === 'ok' ? '#dcfce7' : heartbeatState === 'warn' ? '#fff7ed' : '#ffe4e6',
                  }}
                  title={heartbeatAt || undefined}
                >
                  {statusDot(heartbeatState)}
                  <span className="ml-1">Heartbeat {heartbeatAgo ? `· ${heartbeatAgo}` : ''}</span>
                </span>
                <span className="text-gray-500">{heartbeatAt || '—'}</span>
              </div>
              <button
                onClick={triggerHeartbeat}
                disabled={hbPending}
                className={`rounded px-2 py-1 text-xs ${hbPending ? 'bg-gray-200 text-gray-400' : 'bg-gray-700 text-white hover:bg-gray-800'} active:scale-[0.99]`}
                title="Trigger heartbeat now"
              >{hbPending ? 'Running…' : 'Run Heartbeat'}</button>
            </div>
            {hbError && (<div className="text-rose-700 truncate mt-1" title={hbError}>HB Err: {hbError}</div>)}
            {hbError && /health_heartbeats/.test(hbError) && (
              <div className="mt-3 border rounded p-2 bg-amber-50 text-amber-900">
                <div className="text-xs font-medium mb-1">Heartbeat table missing</div>
                <div className="text-xs mb-2">Run this SQL in your Supabase project's SQL editor, then retry:</div>
                <div className="text-[11px] bg-white border rounded p-2 overflow-auto max-h-36" style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>
                  <pre className="whitespace-pre-wrap">{heartbeatInstallSql}</pre>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={copyHeartbeatSql} className="rounded bg-gray-800 text-white px-2 py-1 text-xs hover:bg-black active:scale-[0.99]">
                    {copiedHB ? 'Copied!' : 'Copy SQL'}
                  </button>
                  <a href="https://app.supabase.com/" target="_blank" rel="noreferrer" className="text-xs underline">Open Supabase</a>
                  <button onClick={autoInstallHeartbeat} disabled={installingHB} className={`rounded px-2 py-1 text-xs ${installingHB ? 'bg-gray-200 text-gray-400' : 'bg-amber-700 text-white hover:bg-amber-800'} active:scale-[0.99]`} title="Attempt automatic install via serverless function (owner only)">
                    {installingHB ? 'Installing…' : 'Auto-install (owner)'}
                  </button>
                </div>
                {installErr && (<div className="text-rose-700 text-xs mt-1 truncate" title={installErr}>Install Err: {installErr}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* Database */}
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm font-medium text-gray-900">
              {statusDot('ok')}Database
            </div>
            <button
              onClick={checkDbCounts}
              disabled={dbChecking}
              className={`rounded px-2 py-1 text-xs ${dbChecking ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'} active:scale-[0.99]`}
            >{dbChecking ? 'Checking…' : 'Check DB'}</button>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            {dbError && <div className="text-rose-700 truncate" title={dbError}>Err: {dbError}</div>}
            {dbCounts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-center mt-1">
                {[
                  ['events','Events'],
                  ['registrations','Registrations'],
                  ['sponsors','Sponsors'],
                  ['schedule_days','Schedule Days'],
                  ['guest_artists','Guest Artists'],
                  ['faculty_heads','Faculty'],
                  ['sponsorship_packages','Sponsor Packages'],
                  ['sponsorship_settings','Sponsor Settings'],
                ].map(([key,label]) => (
                  <div key={key as string} className="border rounded p-2">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-semibold">{dbCounts[key as string] != null ? dbCounts[key as string] : '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">Press “Check DB” to fetch row counts</div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(storageOk ? 'ok' : 'warn')}Storage (registration-photos)
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Bucket access: {storageOk ? 'OK' : 'Unavailable'}</div>
          </div>
        </div>

        {/* Auth */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(isAuthenticated ? 'ok' : 'warn')}Authentication
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>{isAuthenticated ? `Signed in as ${user?.email || user?.id}` : 'Not signed in'}</div>
          </div>
        </div>

        {/* Network */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(netOnline ? 'ok' : 'err')}Browser Network
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>{netOnline ? 'Online' : 'Offline'}</div>
          </div>
        </div>

        {/* Realtime (overall + channels) */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(connectionStatus === 'offline' ? 'err' : connectionStatus === 'degraded' ? 'warn' : 'ok')}Realtime
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Status: {connectionStatus}</div>
            <div className="text-xs text-gray-500 mb-2">Resubscribe if events look stale.</div>
            {realtimeStatus && Object.keys(realtimeStatus).length > 0 ? (
              <div className="max-h-28 overflow-auto border rounded p-2 text-xs bg-gray-50">
                {Object.entries(realtimeStatus).sort(([a],[b]) => a.localeCompare(b)).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="truncate mr-2">{name}</div>
                    <div className={`ml-2 font-mono ${/SUBSCRIBED|JOINED/.test(String(status)) ? 'text-green-700' : /SUBSCRIBING|PENDING/.test(String(status)) ? 'text-amber-700' : 'text-rose-700'}`}>{String(status)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No channel statuses yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionOverview;
