import { useState, useCallback, useEffect, useRef } from 'react';
import { dualRead, type ReadOptions } from '../lib/dualDb';
import { useDomainRealtime } from './useDomainRealtime';
import type { Registration } from '../types/data';

export interface UseRegistrationsOptions {
  page: number;
  pageSize: number;
  filters?: {
    event?: string;
    status?: string;
    batch?: string;
    search?: string;
    viewMode?: 'active' | 'trash';
  };
}
export interface UseRegistrationsResult {
  registrations: Registration[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stats: { total: number; pending: number; approved: number; rejected: number; trash: number };
  refreshStats: () => Promise<void>;
  globalDuplicateIds: Set<string>;
  statsLoading: boolean;
  statsError: string | null;
}

/** Query every selected filter together. Search text stays a literal PostgREST value. */
export function registrationReadOptions({ page, pageSize, filters }: UseRegistrationsOptions, forceRefresh = false): ReadOptions {
  const eqAll: [string, unknown][] = [];
  if (filters?.event && filters.event !== 'all') {
    // Event IDs can be UUIDs as well as legacy numeric IDs; callers may also pass a title.
    const isId = /^\d+$/.test(filters.event) || /^[\da-f]{8}-[\da-f-]{27}$/i.test(filters.event);
    eqAll.push([isId ? 'event_id' : 'event_title', filters.event]);
  }
  if (filters?.status && filters.status !== 'all') eqAll.push(['status', filters.status]);
  if (filters?.batch && filters.batch !== 'all') eqAll.push(['participant_type', filters.batch]);
  const size = Math.max(1, Math.min(100, pageSize));
  const start = (Math.max(1, page) - 1) * size;
  const search = filters?.search?.trim();
  // Quoting prevents commas/parentheses in a name from becoming filter operators.
  const pattern = search ? `"*${search.replace(/[\\"%*_]/g, character => `\\${character}`)}*"` : '';
  return {
    table: 'registrations', count: 'exact', range: [start, start + size - 1], eqAll,
    order: [filters?.viewMode === 'trash' ? 'deleted_at' : 'created_at', { ascending: false }],
    ...(filters?.viewMode === 'trash' ? { gt: ['deleted_at', '1970-01-01'] as [string, string] } : { is: ['deleted_at', null] as [string, null] }),
    ...(search ? { or: ['full_name', 'email', 'phone', 'id'].map(column => `${column}.ilike.${pattern}`).join(',') } : {}),
    forceRefresh,
  };
}

export function useRegistrations(options: UseRegistrationsOptions): UseRegistrationsResult {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, trash: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [globalDuplicateIds] = useState<Set<string>>(new Set());
  const optionsRef = useRef(options); optionsRef.current = options;
  const generation = useRef(0);
  const statsGeneration = useRef(0);

  const loadStats = useCallback(async (forceRefresh = false) => {
    const request = ++statsGeneration.current;
    setStatsLoading(true);
    try {
      const counts = await Promise.all(['all', 'pending', 'approved', 'rejected', 'trash'].map(status => dualRead({
        table: 'registrations', select: 'id', count: 'exact', limit: 1, forceRefresh,
        ...(status === 'trash' ? { gt: ['deleted_at', '1970-01-01'] as [string, string] } : { is: ['deleted_at', null] as [string, null] }),
        ...(status !== 'all' && status !== 'trash' ? { eq: ['status', status] as [string, string] } : {}),
      })));
      if (request === statsGeneration.current) { setStats({ total: counts[0].count || 0, pending: counts[1].count || 0, approved: counts[2].count || 0, rejected: counts[3].count || 0, trash: counts[4].count || 0 }); setStatsError(null); }
    } catch { if (request === statsGeneration.current) setStatsError('Registration totals could not refresh.'); }
    finally { if (request === statsGeneration.current) setStatsLoading(false); }
  }, []);

  const load = useCallback(async (forceRefresh = false) => {
    const request = ++generation.current;
    setIsLoading(true); setError(null);
    try {
      const result = await dualRead(registrationReadOptions(optionsRef.current, forceRefresh));
      if (request !== generation.current) return;
      setRegistrations(result.data || []); setCount(result.count || 0);
    } catch (failure) {
      if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Registrations could not load. Please retry.');
    } finally { if (request === generation.current) setIsLoading(false); }
  }, []);
  const refresh = useCallback(async () => { await Promise.all([load(true), loadStats(true)]); }, [load, loadStats]);
  const refreshStats = useCallback(() => loadStats(true), [loadStats]);
  const filterKey = JSON.stringify(options);
  useEffect(() => {
    // Short debounce keeps typing from issuing a request per keystroke.
    ++generation.current;
    setIsLoading(true);
    const timer = setTimeout(() => { void load(); }, options.filters?.search ? 200 : 0);
    return () => { clearTimeout(timer); ++generation.current; };
  }, [filterKey, load]);
  useEffect(() => { void loadStats(); return () => { ++statsGeneration.current; }; }, [loadStats]);
  useDomainRealtime('registration-workspace-realtime', true, ['registrations'], refresh);
  return { registrations, count, isLoading, error, refresh, stats, refreshStats, globalDuplicateIds, statsLoading, statsError };
}
