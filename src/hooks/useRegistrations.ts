import { useState, useCallback, useEffect, useRef } from 'react';
import { dualRead } from '../lib/dualDb';
import { supabase } from '../lib/supabase';
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
  globalDuplicateIds: Set<string>;
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
      // Fetch counts for different statuses in parallel
      const [allRes, pendingRes, approvedRes, rejectedRes, trashRes] = await Promise.all([
        dualRead({ table: 'registrations', is: ['deleted_at', null], count: 'exact', limit: 1 }),
        dualRead({ table: 'registrations', is: ['deleted_at', null], eq: ['status', 'pending'], count: 'exact', limit: 1 }),
        dualRead({ table: 'registrations', is: ['deleted_at', null], eq: ['status', 'approved'], count: 'exact', limit: 1 }),
        dualRead({ table: 'registrations', is: ['deleted_at', null], eq: ['status', 'rejected'], count: 'exact', limit: 1 }),
        dualRead({ table: 'registrations', gt: ['deleted_at', '1970-01-01'], count: 'exact', limit: 1 })
      ]);

      setStats({
        total: allRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
        trash: trashRes.count || 0
      });
    } catch (e) {
      console.warn('Failed to fetch stats', e);
    }
  }, []);

  const [globalDuplicateIds, setGlobalDuplicateIds] = useState<Set<string>>(new Set());

  const fetchDuplicates = useCallback(async () => {
    try {
      // Fetch only ID, Email, Phone for all active registrations to find duplicates
      const { data } = await dualRead({
        table: 'registrations',
        select: 'id, email, phone, event_title',
        is: ['deleted_at', null],
        limit: 10000 // Upper bound for safety
      });

      if (!data) return;

      const emailMap = new Map<string, string[]>();
      const phoneMap = new Map<string, string[]>();
      const dupes = new Set<string>();

      (data as any[]).forEach(r => {
        if (r.email) {
          const k = `${r.event_title?.trim()}|${r.email.toLowerCase().trim()}`;
          if (!emailMap.has(k)) emailMap.set(k, []);
          emailMap.get(k)?.push(r.id);
        }
        if (r.phone) {
          const k = `${r.event_title?.trim()}|${r.phone.trim()}`;
          if (!phoneMap.has(k)) phoneMap.set(k, []);
          phoneMap.get(k)?.push(r.id);
        }
      });

      for (const ids of emailMap.values()) {
        if (ids.length > 1) ids.forEach(id => dupes.add(id));
      }
      for (const ids of phoneMap.values()) {
        if (ids.length > 1) ids.forEach(id => dupes.add(id));
      }

      setGlobalDuplicateIds(dupes);
    } catch (e) {
      console.warn('Failed to fetch global duplicates', e);
    }
  }, []);

  const fetchRegistrations = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const readOpts: any = {
        table: 'registrations',
        count: 'exact',
        range: [from, to],
        order: [filters?.viewMode === 'trash' ? 'deleted_at' : 'created_at', { ascending: false }]
      };

      // Apply initial duplicates fetch if not already done or on refresh
      if (page === 1) fetchDuplicates();

      // Apply filters server-side
      if (filters?.viewMode === 'trash') {
        readOpts.gt = ['deleted_at', '1970-01-01'];
      } else {
        readOpts.is = ['deleted_at', null];
      }

      if (filters?.event && filters.event !== 'all') {
        // Handle both ID and Title
        if (!isNaN(Number(filters.event))) {
          readOpts.eq = ['event_id', Number(filters.event)];
        } else {
          readOpts.eq = ['event_title', filters.event];
        }
      }

      if (filters?.status && filters.status !== 'all') {
        readOpts.eq = ['status', filters.status];
      }

      if (filters?.batch && filters.batch !== 'all') {
        readOpts.eq = ['participant_type', filters.batch];
      }

      if (filters?.search && filters.search.trim()) {
        const s = filters.search.trim();
        // Construct OR filter for Supabase
        readOpts.or = `full_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,id.ilike.%${s}%`;
      }

      const { data, count: totalCount } = await dualRead(readOpts);

      setRegistrations(data || []);
      setCount(totalCount || 0);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Fetch registrations failed', err);
      setError(err.message || 'Failed to fetch registrations');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, JSON.stringify(filters), fetchDuplicates]);
 // Deep compare filters

  // Initial fetch effect
  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Initial stats fetch (once on mount, or when vital things change?)
  // For now, let's just fetch on mount.
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('public:registrations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          fetchRegistrations();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRegistrations, fetchStats]);

  return {
    registrations,
    count,
    isLoading,
    error,
    refresh: fetchRegistrations,
    stats,
    refreshStats: fetchStats,
    globalDuplicateIds
  };
}
