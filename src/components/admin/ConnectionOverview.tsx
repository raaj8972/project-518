import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

type FuncHealth = {
  ok: boolean;
  ts?: string;
};

export const ConnectionOverview: React.FC = () => {
  const { connectionStatus, latencyMs, lastError, supabaseHost, schemaCapabilities, resubscribeRealtime, pingNow } = useData();
  const { isAuthenticated, user } = useAuth();

  const [funcOk, setFuncOk] = useState<boolean | null>(null);
  const [funcLatency, setFuncLatency] = useState<number | null>(null);
  const [funcError, setFuncError] = useState<string | null>(null);

  const [netOnline, setNetOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  const statusDot = (state: 'ok' | 'warn' | 'err') => (
    <span className={
      'inline-block w-2.5 h-2.5 rounded-full mr-2 ' +
      (state === 'ok' ? 'bg-green-500' : state === 'warn' ? 'bg-amber-500' : 'bg-rose-600')
    } />
  );

  const supabaseState: 'ok' | 'warn' | 'err' = connectionStatus === 'ok' ? 'ok' : (connectionStatus === 'degraded' ? 'warn' : 'err');
  const storageOk = !!schemaCapabilities?.storage_registration_photos_bucket;

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

        {/* Realtime (derived from overall state) */}
        <div className="border rounded-md p-4">
          <div className="flex items-center text-sm font-medium text-gray-900">
            {statusDot(connectionStatus === 'offline' ? 'err' : connectionStatus === 'degraded' ? 'warn' : 'ok')}Realtime
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div>Status: {connectionStatus}</div>
            <div className="text-xs text-gray-500">Derived from API/state; resubscribe if events stale.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionOverview;
