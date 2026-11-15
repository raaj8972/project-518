import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { invalidateTableCache } from '../lib/dualDb';

/** Coalesce bursts of row changes and refresh only after invalidating affected cached tables. */
export function useDomainRealtime(name: string, enabled: boolean, tables: string[], refresh: () => Promise<unknown>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const tableKey = tables.join(',');

  useEffect(() => {
    if (!enabled || !tableKey) return;
    let active = true;
    let running = false;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      timer = undefined;
      if (!active) return;
      if (running) { queued = true; return; }
      running = true;
      try { await refreshRef.current(); }
      catch (error) { console.error(`[${name}] Realtime refresh failed`, error); }
      finally {
        running = false;
        if (active && queued) {
          queued = false;
          timer = setTimeout(run, 150);
        }
      }
    };
    const channel = supabase.channel(name);
    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        invalidateTableCache(table);
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, 150);
      });
    }
    channel.subscribe();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, name, tableKey]);
}
