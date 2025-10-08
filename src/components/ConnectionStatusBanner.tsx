import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export const ConnectionStatusBanner: React.FC = () => {
  const { connectionStatus, lastError, refreshAll, showConnectionBanner, adminUsers } = useData() as any;
  const { user } = useAuth();

  // Only show connection health banner to admin/owner users. Hide for public viewers.
  const isAdminOrOwner = (() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch {
      return false;
    }
  })();

  if (connectionStatus === 'ok' || showConnectionBanner === false) return null;
  if (!isAdminOrOwner) return null;

  const color = connectionStatus === 'offline' ? 'bg-rose-600' : 'bg-amber-500';
  const label = connectionStatus === 'offline' ? 'Offline' : 'Degraded';

  return (
    <div className={`fixed top-8 inset-x-0 z-[9999] ${color} text-white text-sm px-4 py-2 shadow`}
      role="status" aria-live="polite">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1">
          <strong className="mr-2">Connection {label}.</strong>
          {lastError && <span className="opacity-90">{lastError}</span>}
        </div>
        <button
          onClick={() => refreshAll(true)}
          className="shrink-0 bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-xs"
        >
          Retry
        </button>
      </div>
    </div>
  );
};
