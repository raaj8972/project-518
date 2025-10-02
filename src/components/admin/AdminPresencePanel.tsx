import React from 'react';
import { MonitorSmartphone, Users, RefreshCw, Activity } from 'lucide-react';
import { useAdminPresence } from '../../hooks/useAdminPresence';

interface Props {
  enabled?: boolean;
}

export const AdminPresencePanel: React.FC<Props> = ({ enabled = true }) => {
  const presence = useAdminPresence(enabled);
  const { totalSessions, uniqueUsers, byDevice, sessions, isConnected, lastSync } = presence;

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
        </div>
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
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Device</th>
              <th className="py-2 pr-4">Platform</th>
              <th className="py-2 pr-4">Browser</th>
              <th className="py-2 pr-4">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-800">{s.email || s.user_id.slice(0,8)}</td>
                <td className="py-2 pr-4 text-gray-600 capitalize">{s.device_type}</td>
                <td className="py-2 pr-4 text-gray-600">{s.platform || '—'}</td>
                <td className="py-2 pr-4 text-gray-600">{s.browser || '—'}</td>
                <td className="py-2 pr-4 text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3 text-green-500" /> {new Date(s.ts).toLocaleTimeString()}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">No other active admin sessions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  <p className="mt-4 text-[11px] text-gray-500">Updates in real time using Supabase Presence. Stale sessions (&gt;2m) are automatically cleared.</p>
    </div>
  );
};

export default AdminPresencePanel;
