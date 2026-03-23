import { useState, useCallback, useEffect, useRef } from 'react';
import { dualRead } from '../lib/dualDb';
import type { Registration } from '../types/data';

export interface UseRegistrationsOptions {
  page: number;
  pageSize: number;
  filters?: {
    event?: string; // 'all' or event title
    status?: string; // 'all' or status
    batch?: string; // 'all' or batch
    search?: string;
    showDuplicatesOnly?: boolean;
    dateFrom?: string;
    dateTo?: string;
    category?: string; // 'all' or category
    emailStatus?: string; // 'all', 'sent', 'not-sent'
    viewMode?: 'active' | 'trash';
  };
}

export interface UseRegistrationsResult {
  registrations: Registration[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    trash: number;
  };
  refreshStats: () => Promise<void>;
}

export function useRegistrations({ page, pageSize, filters }: UseRegistrationsOptions): UseRegistrationsResult {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    trash: 0
  });

  // Debounce ref for search
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      // For now, we fetch all and count in memory or do multiple dualReads
      // Ideally dualRead should support count, but we'll approximate for now
      const { data } = await dualRead({ table: 'registrations' });
      if (!data) return;

      const all = data as Registration[];
      const active = all.filter(r => !r.deleted_at);
      const trash = all.filter(r => !!r.deleted_at);

      setStats({
        total: active.length,
        pending: active.filter(r => r.status === 'pending').length,
        approved: active.filter(r => r.status === 'approved').length,
        rejected: active.filter(r => r.status === 'rejected').length,
        trash: trash.length
      });
    } catch (e) {
      console.warn('Failed to fetch stats', e);
    }
  }, []);

  const fetchRegistrations = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Use dualRead for primary fetch
      // Note: Full-text search and complex OR queries will fallback to Supabase inside dualRead if we structure correctly
      // For now, doing a basic fetch and filtering in memory if primary is Firestore
      const { data, source } = await dualRead({ 
        table: 'registrations',
        order: [filters?.viewMode === 'trash' ? 'deleted_at' : 'created_at', { ascending: false }]
      });

      let filtered = (data || []) as Registration[];

      // Apply filters in-memory if we got a large batch or if firestore is primary
      if (source === 'firestore') {
        if (filters?.viewMode === 'trash') {
          filtered = filtered.filter(r => !!r.deleted_at);
        } else {
          filtered = filtered.filter(r => !r.deleted_at);
        }

        if (filters?.event && filters.event !== 'all') {
          filtered = filtered.filter(r => r.event_title === filters.event);
        }
        if (filters?.status && filters.status !== 'all') {
          filtered = filtered.filter(r => r.status === filters.status);
        }
        if (filters?.batch && filters.batch !== 'all') {
          filtered = filtered.filter(r => r.participant_type === filters.batch);
        }
        if (filters?.category && filters.category !== 'all') {
          filtered = filtered.filter(r => (r as any).category === filters.category);
        }
        if (filters?.search && filters.search.trim()) {
          const s = filters.search.toLowerCase();
          filtered = filtered.filter(r => 
            r.full_name?.toLowerCase().includes(s) || 
            r.email?.toLowerCase().includes(s) || 
            r.phone?.toLowerCase().includes(s)
          );
        }
      }

      setCount(filtered.length);
      
      // Pagination
      const from = (page - 1) * pageSize;
      const paginated = filtered.slice(from, from + pageSize);
      
      setRegistrations(paginated);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Fetch registrations failed', err);
      setError(err.message || 'Failed to fetch registrations');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, JSON.stringify(filters)]); // Deep compare filters

  // Initial fetch effect
  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Initial stats fetch (once on mount, or when vital things change?)
  // For now, let's just fetch on mount.
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    registrations,
    count,
    isLoading,
    error,
    refresh: fetchRegistrations,
    stats,
    refreshStats: fetchStats
  };
}
