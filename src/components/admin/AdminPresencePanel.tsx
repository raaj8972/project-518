import React from 'react';
import { MonitorSmartphone, Users, RefreshCw, Activity, Lock, Unlock } from 'lucide-react';
import { useAdminPresence } from '../../hooks/useAdminPresence';

interface Props {
  enabled?: boolean;
}

export const AdminPresencePanel: React.FC<Props> = ({ enabled = true }) => {
  const presence = useAdminPresence(enabled);
  const { 
    totalSessions, 
    uniqueUsers, 
    byDevice, 
    sessions, 
    isConnected, 
    lastSync, 
    myPresenceKey, 
    forceLogout,
    blockDevice,
    unblockDevice,
    isBlocked,
    blockedFingerprints,
    offlineSessions,
    refreshHistory,
    resolveMissingIPs,
    blockMode,
    setBlockMode,
    ipDiagnostics
    ,presenceDiagnostics
  } = presence;
  const SECURITY_CODE = '9693';
  const canForce = true; // Owner panel only renders this component currently; could add prop later.

  const confirmAndLogout = async (presenceKey?: string) => {
    if (!presenceKey || !forceLogout) return;
    const entered = window.prompt('Enter security code to force logout this device:');
    if (entered !== SECURITY_CODE) {
      if (entered !== null) alert('Invalid security code');
      return;
    }
    const ok = await forceLogout(presenceKey, entered);
    if (!ok) alert('Failed to send logout signal');
  };

  const confirmBlock = (fingerprint?: string) => {
    if (!fingerprint || !blockDevice) return;
    const entered = window.prompt('Enter security code to BLOCK this device:');
    if (entered !== SECURITY_CODE) {
      if (entered !== null) alert('Invalid security code');
      return;
    }
    const ok = blockDevice(fingerprint, entered);
    if (!ok) alert('Block failed or already blocked.');
  };

  const confirmUnblock = (fingerprint?: string) => {
    if (!fingerprint || !unblockDevice) return;
    const entered = window.prompt('Enter security code to UNBLOCK this device:');
    if (entered !== SECURITY_CODE) {
      if (entered !== null) alert('Invalid security code');
      return;
    }
    const ok = unblockDevice(fingerprint, entered);
    if (!ok) alert('Unblock failed.');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-indigo-500" /> Real-time Admin Sessions
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-medium ${isConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{isConnected ? 'Live' : 'Offline'}</span>
          {lastSync && (
            <span className="text-gray-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {new Date(lastSync).toLocaleTimeString()}</span>
          )}
          <div className="hidden md:flex items-center ml-2">
            <div className="flex border rounded overflow-hidden">
              <button
                className={`px-2 py-1 text-[10px] font-medium ${blockMode === 'device' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setBlockMode && setBlockMode('device')}
                title="Block only this device fingerprint (safer)"
              >Device</button>
              <button
                className={`px-2 py-1 text-[10px] font-medium border-l ${blockMode === 'ip' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setBlockMode && setBlockMode('ip')}
                title="Block entire IP (all devices using that IP)"
              >IP</button>
            </div>
          </div>
          <div className="relative group ml-2">
            <button className="text-[10px] px-2 py-1 border rounded bg-gray-50 hover:bg-gray-100 text-gray-600" title="IP diagnostics">Diag</button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-20 bg-white shadow-lg border rounded p-2 w-64 text-[11px] text-gray-700">
              <div className="font-semibold text-gray-800 mb-1">IP Diagnostics</div>
              <div>Cached: <span className="font-mono">{ipDiagnostics?.cachedIp || '—'}</span></div>
              <div>Error: <span className="truncate inline-block max-w-[150px] align-bottom" title={ipDiagnostics?.lastError ? String(ipDiagnostics.lastError) : ''}>{ipDiagnostics?.lastError ? 'err' : '—'}</span></div>
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => resolveMissingIPs && resolveMissingIPs()}
                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
                >Retry</button>
                <button
                  onClick={() => refreshHistory && refreshHistory(true)}
                  className="text-[10px] px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                >History</button>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-gray-500">Switch block mode to control scope. Device mode stores fingerprint; IP mode stores IP-only global block.</p>
            </div>
          </div>
        </div>
        {presenceDiagnostics && (
          <div className="text-[10px] text-gray-500 ml-2">
            showing {totalSessions}/{presenceDiagnostics.raw} (window {Math.round(presenceDiagnostics.staleWindowMs/60000)}m)
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-indigo-50 rounded-lg">
          <div className="text-xs font-medium text-indigo-600 mb-1 flex items-center gap-1"><Users className="w-4 h-4" /> Active Sessions</div>
          <div className="text-2xl font-bold text-indigo-700">{totalSessions}</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-xs font-medium text-blue-600 mb-1">Unique Admin Users</div>
          <div className="text-2xl font-bold text-blue-700">{uniqueUsers}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-xs font-medium text-green-600 mb-1">Desktop</div>
          <div className="text-2xl font-bold text-green-700">{byDevice.desktop || 0}</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <div className="text-xs font-medium text-yellow-600 mb-1">Mobile/Tablet</div>
          <div className="text-2xl font-bold text-yellow-700">{(byDevice.mobile || 0) + (byDevice.tablet || 0)}</div>
        </div>
      </div>
      {presenceDiagnostics && presenceDiagnostics.raw !== presenceDiagnostics.fresh && (
        <div className="mb-4 p-3 border rounded bg-yellow-50 text-[11px] text-yellow-800">
          Some sessions filtered (blocked or stale). Raw: {presenceDiagnostics.raw} / Visible: {presenceDiagnostics.fresh}. Stale window: {Math.round(presenceDiagnostics.staleWindowMs/60000)}m.
        </div>
      )}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Device</th>
              <th className="py-2 pr-4">Platform</th>
              <th className="py-2 pr-4">Browser</th>
              <th className="py-2 pr-4">IP {sessions.some(s => !s.ip) && (
                <button
                  onClick={() => resolveMissingIPs && resolveMissingIPs()}
                  className="ml-1 text-[10px] px-1.5 py-0.5 border rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                >Resolve</button>
              )}</th>
              <th className="py-2 pr-4">Last Seen</th>
              {canForce && <th className="py-2 pr-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => {
              const isMe = s.presence_key && s.presence_key === myPresenceKey;
              const blocked = isBlocked?.(s.device_fingerprint);
              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-800">{s.email || s.user_id.slice(0,8)} {isMe && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">You</span>}</td>
                  <td className="py-2 pr-4 text-gray-600 capitalize">{s.device_type}</td>
                  <td className="py-2 pr-4 text-gray-600">{s.platform || '—'}</td>
                  <td className="py-2 pr-4 text-gray-600">{s.browser || '—'}</td>
                  <td className="py-2 pr-4 font-mono text-[11px] text-gray-500 truncate max-w-[140px]" title={s.ip || ''}>{s.ip || 'resolving…'}</td>
                  <td className="py-2 pr-4 text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3 text-green-500" /> {new Date(s.ts).toLocaleTimeString()}</td>
                  {canForce && (
                    <td className="py-2 pr-4 text-right space-x-2">
                      {!isMe && s.presence_key && (
                        <button
                          onClick={() => confirmAndLogout(s.presence_key!)}
                          className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-[0.97]"
                          title="Force logout this device"
                        >Logout</button>
                      )}
                      {!isMe && !blocked && s.device_fingerprint && (
                        <button
                          onClick={() => confirmBlock(s.device_fingerprint)}
                          className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 active:scale-[0.97] inline-flex items-center gap-1"
                          title="Block this device"
                        ><Lock className="w-3 h-3"/>Block</button>
                      )}
                      {!isMe && blocked && s.device_fingerprint && (
                        <button
                          onClick={() => confirmUnblock(s.device_fingerprint)}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 active:scale-[0.97] inline-flex items-center gap-1"
                          title="Unblock this device"
                        ><Unlock className="w-3 h-3"/>Unblock</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={canForce ? 7 : 6} className="py-4 text-center text-gray-500">No other active admin sessions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  <p className="mt-4 text-[11px] text-gray-500">Updates in real time using Supabase Presence. Stale sessions (&gt;2m) auto-cleared. Force logout & block/unblock require security code.</p>

      {blockedFingerprints.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-orange-600"/> Blocked Devices</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {blockedFingerprints.map(f => (
              <li key={f} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded border border-gray-200">
                <span className="font-mono">{f}</span>
                <button
                  onClick={() => confirmUnblock(f)}
                  className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 inline-flex items-center gap-1"
                ><Unlock className="w-3 h-3"/>Unblock</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Offline / Historical Sessions */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-800">Past Device Sessions (inactive)</h4>
          <button
            onClick={() => refreshHistory && refreshHistory(true)}
            className="text-[11px] px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 active:scale-[0.97]"
          >Refresh</button>
        </div>
        {offlineSessions.length === 0 && (
          <p className="text-[11px] text-gray-500">No historical device sessions recorded (or all are currently active).</p>
        )}
        {offlineSessions.length > 0 && (
          <div className="overflow-x-auto -mx-2 px-2 mt-2">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b">
                  <th className="py-1 pr-3">Device</th>
                  <th className="py-1 pr-3">Platform</th>
                  <th className="py-1 pr-3">Browser</th>
                  <th className="py-1 pr-3">IP</th>
                  <th className="py-1 pr-3">Last Seen</th>
                  <th className="py-1 pr-3">Fingerprint</th>
                  <th className="py-1 pr-3 text-right">Block</th>
                </tr>
              </thead>
              <tbody>
                {offlineSessions.map((s, i) => {
                  const blocked = isBlocked?.(s.device_fingerprint);
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 pr-3 capitalize">{s.device_type}</td>
                      <td className="py-1 pr-3">{s.platform || '—'}</td>
                      <td className="py-1 pr-3">{s.browser || '—'}</td>
                      <td className="py-1 pr-3 font-mono text-[10px] text-gray-500 truncate max-w-[90px]" title={s.ip || ''}>{s.ip || '—'}</td>
                      <td className="py-1 pr-3 text-gray-500">{new Date(s.ts).toLocaleString()}</td>
                      <td className="py-1 pr-3 font-mono text-[10px]">{s.device_fingerprint}</td>
                      <td className="py-1 pr-3 text-right">
                        {!blocked && s.device_fingerprint && (
                          <button
                            onClick={() => confirmBlock(s.device_fingerprint)}
                            className="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
                          >Block</button>
                        )}
                        {blocked && s.device_fingerprint && (
                          <button
                            onClick={() => confirmUnblock(s.device_fingerprint)}
                            className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                          >Unblock</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[10px] text-gray-500">Historical sessions sourced from admin_device_sessions table; active ones are excluded so they appear only in the live list.</p>
      </div>
    </div>
  );
};

export default AdminPresencePanel;
