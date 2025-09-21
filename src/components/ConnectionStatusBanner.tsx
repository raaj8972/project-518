import React from 'react';
import { useData } from '../context/DataContext';

export const ConnectionStatusBanner: React.FC = () => {
  const { connectionStatus, lastError, refreshAll, showConnectionBanner } = useData();

  if (connectionStatus === 'ok' || showConnectionBanner === false) return null;

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
