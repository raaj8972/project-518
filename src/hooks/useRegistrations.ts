import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Registration } from '../context/DataContext';

export interface UseRegistrationsOptions {
  page: number;
  pageSize: number;
  filters?: {
    event?: string; // 'all' or event title
    status?: string; // 'all' or status
    type?: string; // 'all' or type
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
      // Parallel requests for counts
      // Note: We are NOT applying filters to these 'global' stats typically shown in cards
      // unless the user EXPECTS the stats cards to filter. 
      // Usually "Total Registrations" on the dashboard implies "All time" or at least "All active".
      // Let's stick to "Active" (non-deleted) for now.

      const base = supabase.from('registrations').select('*', { count: 'exact', head: true });
      
      const p1 = base.is('deleted_at', null);
      const p2 = base.is('deleted_at', null).eq('status', 'pending');
      const p3 = base.is('deleted_at', null).eq('status', 'approved');
      const p4 = base.is('deleted_at', null).eq('status', 'rejected');

      const p5 = supabase.from('registrations').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null);

      const [r1, r2, r3, r4, r5] = await Promise.all([p1, p2, p3, p4, p5]);
      
      setStats({
        total: r1.count || 0,
        pending: r2.count || 0,
        approved: r3.count || 0,
        rejected: r4.count || 0,
        trash: r5.count || 0
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
      let query = supabase
        .from('registrations')
        .select('*', { count: 'exact' });

      // 1. Handling View Mode (Active vs Trash)
      if (filters?.viewMode === 'trash') {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      // 2. Event Filter
      if (filters?.event && filters.event !== 'all') {
        query = query.eq('event_title', filters.event);
      }

      // 3. Status Filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // 4. Participant Type Filter
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('participant_type', filters.type);
      }

      // 5. Category Filter
      // Note: Category is often joined or on the event. 
      // If 'category' column exists on 'registrations' view/table, we use it. 
      // Based on previous code: uniqueCategories comes from registrations.map(r => r.category)
      // so it likely exists on the specific row or view.
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // 6. Search
      if (filters?.search && filters.search.trim()) {
        const term = filters.search.trim();
        // naive search across columns
        query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,college.ilike.%${term}%`);
      }

      // 7. Date Range
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        // Includes the whole day
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      
      // 8. Sorting
      // Default newest first
      // If viewing trash, maybe sort by deleted_at?
      if (filters?.viewMode === 'trash') {
        query = query.order('deleted_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // 9. Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute
      const { data, error, count } = await query;

      if (error) throw error;
      
      setRegistrations(data as Registration[] || []);
      setCount(count || 0);
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
