import React from 'react';
import { useData } from '../../context/DataContext';

export const HealthBadge: React.FC = () => {
  const { connectionStatus, latencyMs, lastError } = useData();
  const color = connectionStatus === 'ok' ? 'bg-green-600' : connectionStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-600';
  const pulse = connectionStatus === 'offline' ? 'animate-pulse' : '';
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color} ${pulse}`} title={connectionStatus}></div>
      <div className="text-xs text-gray-600">
        {connectionStatus.toUpperCase()} {latencyMs != null && connectionStatus==='ok' && (<span className="ml-1 text-gray-500">{latencyMs}ms</span>)}
        {connectionStatus !== 'ok' && lastError && (
          <span className="block max-w-xs truncate text-red-600" title={lastError}>{lastError}</span>
        )}
      </div>
    </div>
  );
};