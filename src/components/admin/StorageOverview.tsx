import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, HardDrive, RefreshCw, Layers, Clipboard, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../ToastProvider';
import { supabase } from '../../lib/supabase';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const DEFAULT_BUCKETS = [
  'registration-photos',
  'gallery-images',
  'sponsor-logos',
  'event-images',
  'guest-artist-images',
  'guest-artist-videos',
  'team-images',
  'faculty-images',
  'band-images',
  'hero-media',
  'hero-videos',
  'hero-video',
  'pdf',
  'documents',
];

export const StorageOverview: React.FC = () => {
  const { computeBucketUsage, getBucketObjects, deleteBucketObject, computeAllBucketsUsage, listStorageBuckets, storageQuotaBytes } = useData();
  const { push } = useToast();
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [usage, setUsage] = useState<{ totalBytes: number; count: number }>({ totalBytes: 0, count: 0 });
  const [loadingTotal, setLoadingTotal] = useState(true);
  const [totalUsage, setTotalUsage] = useState<{ totalBytes: number; count: number }>({ totalBytes: 0, count: 0 });
  const [items, setItems] = useState<Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bucket, setBucket] = useState<string>('registration-photos');
  const [buckets, setBuckets] = useState<string[]>(DEFAULT_BUCKETS);
  const [lastTotalUpdatedMs, setLastTotalUpdatedMs] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState<boolean>(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState<boolean>(false);
  const [breakdown, setBreakdown] = useState<Array<{ id: string; totalBytes: number; count: number }>>([]);
  const [topOpen, setTopOpen] = useState<boolean>(false);
  const [topScope, setTopScope] = useState<'bucket' | 'all'>('bucket');
  const [loadingTop, setLoadingTop] = useState<boolean>(false);
  const [topItems, setTopItems] = useState<Array<{ bucket: string; name: string; publicUrl: string; size: number; created_at: string | null }>>([]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadUsage = async () => {
    setLoadingUsage(true);
    try {
      const u = await computeBucketUsage(bucket);
      setUsage(u);
    } finally {
      setLoadingUsage(false);
    }
  };

  const loadPage = async (p = page) => {
    const { items, total } = await getBucketObjects(bucket, p, pageSize);
    setItems(items);
    setTotal(total);
  };

  const loadTotalUsage = async () => {
    setLoadingTotal(true);
    try {
      const u = await computeAllBucketsUsage();
      setTotalUsage(u);
      setLastTotalUpdatedMs(Date.now());
    } finally {
      setLoadingTotal(false);
    }
  };

  const loadBreakdown = async () => {
    setLoadingBreakdown(true);
    try {
      const list = await listStorageBuckets();
      const ids = Array.isArray(list) && list.length ? list : DEFAULT_BUCKETS;
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const u = await computeBucketUsage(id);
            return { id, totalBytes: u.totalBytes, count: u.count };
          } catch {
            return { id, totalBytes: 0, count: 0 };
          }
        })
      );
      // Sort by size desc for easier scanning
      results.sort((a, b) => b.totalBytes - a.totalBytes);
      setBreakdown(results);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  useEffect(() => {
    // Load initial bucket list (if accessible) and fallback to defaults
    (async () => {
      try {
        const list = await listStorageBuckets();
        if (Array.isArray(list) && list.length) {
          setBuckets(list);
          if (!list.includes(bucket)) setBucket(list[0]);
        }
      } catch {}
    })();
    loadUsage();
    loadPage(1);
    loadTotalUsage();
    loadBreakdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset to page 1 when bucket changes
    setPage(1);
    loadUsage();
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  useEffect(() => {
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Realtime: refresh when storage objects in the selected bucket change
  useEffect(() => {
    // Subscribe to changes in storage.objects for the chosen bucket
    const channel = supabase
      .channel(`storage-objects-${bucket}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'storage', table: 'objects', filter: `bucket_id=eq.${bucket}` },
        (payload: any) => {
          // Lightweight refresh: reload usage and current page
          // Avoid spamming setState; debounce slightly via microtask
          Promise.all([loadUsage(), loadPage(page)]).catch(() => {});
          try {
            const evt = payload?.eventType as string | undefined;
            const name = (payload?.new?.name || payload?.old?.name || '') as string;
            if (evt === 'INSERT') push({ type: 'success', message: `File added: ${name}`, ttl: 2500 });
            else if (evt === 'UPDATE') push({ type: 'info', message: `File updated: ${name}`, ttl: 2500 });
            else if (evt === 'DELETE') push({ type: 'success', message: `File deleted: ${name}`, ttl: 2500 });
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, page, push]);

  // Realtime: update total usage for any object change across all buckets
  useEffect(() => {
    const channel = supabase
      .channel('storage-objects-all')
      .on('postgres_changes', { event: '*', schema: 'storage', table: 'objects' }, () => {
        loadTotalUsage();
        loadBreakdown();
        if (topOpen) loadTop();
      })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (name: string) => {
    if (!confirm('Delete this item? If it is a folder, all contents will be removed.')) return;
    setBusyName(name);
    try {
      const res = await deleteBucketObject(bucket, name);
      if (!res.ok) {
        alert('Failed to delete file. Check storage policies and try again.');
        return;
      }
    } finally {
      setBusyName(null);
    }
    await Promise.all([loadUsage(), loadPage(page), loadTotalUsage(), loadBreakdown()]);
  };

  // Delete for a specific bucket (used in Top 10 list)
  const onDeleteFor = async (bkt: string, name: string) => {
    if (!confirm(`Delete this item from '${bkt}'? If it is a folder, all contents will be removed.`)) return;
    setBusyName(`${bkt}/${name}`);
    try {
      const res = await deleteBucketObject(bkt, name);
      if (!res.ok) {
        alert('Failed to delete file. Check storage policies and try again.');
        return;
      }
    } finally {
      setBusyName(null);
    }
    await Promise.all([loadUsage(), loadPage(page), loadTotalUsage(), loadBreakdown()]);
    if (topOpen) loadTop();
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsage(), loadPage(page), loadTotalUsage(), loadBreakdown()]);
    setRefreshing(false);
  };

  const onCopyLink = async (name: string, publicUrl: string, forBucket?: string) => {
    try {
      let urlToCopy = publicUrl;
      try {
        const { data, error } = await supabase.storage.from(forBucket ?? bucket).createSignedUrl(name, 60 * 60 * 24 * 7);
        if (!error && data?.signedUrl) urlToCopy = data.signedUrl;
      } catch {
        // If signing fails (public bucket or no permission), fall back to the provided public URL
        urlToCopy = publicUrl;
      }
      await navigator.clipboard.writeText(urlToCopy);
      push({ type: 'success', message: 'Link copied', ttl: 2000 });
    } catch {
      push({ type: 'error', message: 'Failed to copy link', ttl: 2500 });
    }
  };

  // Load Top 10 largest files
  const loadTop = async () => {
    setLoadingTop(true);
    try {
      const collectForBucket = async (bkt: string) => {
        const pageSize = 500;
        let page = 1;
        let results: Array<{ bucket: string; name: string; publicUrl: string; size: number; created_at: string | null }> = [];
        while (true) {
          const { items, total } = await getBucketObjects(bkt, page, pageSize);
          results = results.concat(items.map(i => ({ bucket: bkt, ...i })));
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          if (page >= totalPages) break;
          page += 1;
          // Minor yield to keep UI responsive
          await new Promise(r => setTimeout(r, 0));
          // Early stop optimization: if we already have > 10 and remaining pages are small, continue anyway to be exact
        }
        return results;
      };

      let all: Array<{ bucket: string; name: string; publicUrl: string; size: number; created_at: string | null }> = [];
      if (topScope === 'bucket') {
        all = await collectForBucket(bucket);
      } else {
        const ids = (buckets.length ? buckets : DEFAULT_BUCKETS);
        for (const bkt of ids) {
          try {
            const one = await collectForBucket(bkt);
            all = all.concat(one);
          } catch {}
        }
      }
      all.sort((a, b) => b.size - a.size);
      setTopItems(all.slice(0, 10));
    } finally {
      setLoadingTop(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-indigo-600"/> 
          Storage Overview
        </h3>
        <button onClick={refresh} className={`inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-gray-900 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all ${refreshing ? 'opacity-60 pointer-events-none' : ''}`}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Top 10 largest files */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTopOpen(v => {
                const next = !v;
                if (!v && !loadingTop) {
                  // just opened -> load
                  loadTop();
                }
                return next;
              });
            }}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            {topOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
            Top 10 largest files
          </button>
          {topOpen && (
            <>
              <select
                value={topScope}
                onChange={(e) => {
                  const val = (e.target.value as 'bucket' | 'all');
                  setTopScope(val);
                  // Recompute immediately on scope change when open
                  setTimeout(() => loadTop(), 0);
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                title="Scope"
              >
                <option value="bucket">Selected bucket</option>
                <option value="all">All buckets</option>
              </select>
              <button
                onClick={loadTop}
                className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50 ${loadingTop ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <RefreshCw className={`w-3 h-3 ${loadingTop ? 'animate-spin' : ''}`}/> Recalculate
              </button>
              {loadingTop && <span className="text-xs text-gray-500">Loading…</span>}
            </>
          )}
        </div>
        {topOpen && (
          <div className="mt-2 overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topItems.map((it) => (
                  <tr key={`${it.bucket}/${it.name}`}>
                    <td className="px-4 py-2">
                      <img src={it.publicUrl} alt={it.name} className="w-10 h-10 object-cover rounded"/>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm font-mono text-gray-900 truncate max-w-[24rem]" title={it.name}>{it.name}</div>
                      <a href={it.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open</a>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 font-mono">{it.bucket}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{formatBytes(it.size)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{it.created_at ? new Date(it.created_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onCopyLink(it.name, it.publicUrl, it.bucket)}
                        className="inline-flex items-center px-2.5 py-1 text-xs rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 mr-2"
                      >
                        <Clipboard className="w-4 h-4 mr-1.5"/> Copy
                      </button>
                      <button
                        onClick={() => onDeleteFor(it.bucket, it.name)}
                        className={`inline-flex items-center px-2.5 py-1 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 ${busyName === `${it.bucket}/${it.name}` ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1.5"/> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {topItems.length === 0 && !loadingTop && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No files found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Bucket Usage ({bucket})</div>
          <div className="text-xl font-semibold text-gray-900">{loadingUsage ? '—' : formatBytes(usage.totalBytes)}</div>
          <div className="text-xs text-gray-500">{usage.count} files</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Total Project Storage</div>
          <div className="text-sm text-gray-900">
            {loadingTotal ? '—' : (
              storageQuotaBytes ? `${formatBytes(totalUsage.totalBytes)} of ${formatBytes(storageQuotaBytes)}` : `${formatBytes(totalUsage.totalBytes)} used`
            )}
          </div>
          <div className="mt-2 h-2 rounded bg-gray-200 overflow-hidden">
            <div
              className="h-2 bg-blue-500"
              style={{ width: storageQuotaBytes ? `${Math.min(100, (totalUsage.totalBytes / storageQuotaBytes) * 100).toFixed(1)}%` : '100%', transition: 'width 200ms ease' }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-500">{totalUsage.count} files across all buckets</div>
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-gray-500 inline-flex items-center gap-1" title={lastTotalUpdatedMs ? new Date(lastTotalUpdatedMs).toLocaleString() : ''}>
                <Clock className="w-3 h-3"/>
                {lastTotalUpdatedMs ? `Updated ${new Date(lastTotalUpdatedMs).toLocaleTimeString()}` : '—'}
              </div>
              <button onClick={() => Promise.all([loadTotalUsage(), loadBreakdown()])} className="text-xs inline-flex items-center gap-1 px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50">
                <RefreshCw className="w-3 h-3"/> Recalculate
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-2"><Layers className="w-4 h-4"/> Bucket</div>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
          >
            {(buckets.length ? buckets : DEFAULT_BUCKETS).map((b) => {
              const info = breakdown.find(x => x.id === b);
              const label = info ? `${b} (${formatBytes(info.totalBytes)})` : b;
              return <option key={b} value={b}>{label}</option>;
            })}
          </select>
          <div className="text-xs text-gray-500 mt-1">Public URLs shown; ensure your RLS allows listing/deleting.</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-xs text-yellow-700 mb-1">Note</div>
          <div className="text-xs text-yellow-800">Deleting clears known references (e.g., registrations.photo_url, sponsors.logo, gallery_images.src) but does not remove the row itself.</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Per Page</div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="mt-1 w-full text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <div className="text-xs text-gray-500 mt-1 text-right">
            Showing {items.length} of {total}
          </div>
        </div>
      </div>

      {/* Per-bucket breakdown */}
      <div className="mt-4">
        <button
          onClick={() => setBreakdownOpen(v => !v)}
          className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          {breakdownOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          Per-bucket breakdown
          {loadingBreakdown && <span className="text-xs text-gray-500 ml-2">(loading...)</span>}
        </button>
        {breakdownOpen && (
          <div className="mt-2 overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {breakdown.map((b) => {
                  const totalBytes = totalUsage.totalBytes || 0;
                  const pct = totalBytes > 0 ? b.totalBytes / totalBytes : 0;
                  const pct100 = (pct * 100);
                  const barColor = pct >= 0.5 ? 'bg-red-500' : pct >= 0.2 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300';
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 font-mono">{b.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{b.count}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">{formatBytes(b.totalBytes)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 w-64">
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums">{pct100.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 rounded bg-gray-200 overflow-hidden" title={`${pct100.toFixed(2)}%`}>
                          <div className={`h-2 ${barColor}`} style={{ width: `${Math.min(100, pct100).toFixed(1)}%`, transition: 'width 200ms ease' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {breakdown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No buckets visible or accessible.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((it) => (
              <tr key={it.name}>
                <td className="px-4 py-2">
                  <img src={it.publicUrl} alt={it.name} className="w-12 h-12 object-cover rounded"/>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm font-mono text-gray-900 truncate max-w-[24rem]" title={it.name}>{it.name}</div>
                  <a href={it.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open</a>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">{formatBytes(it.size)}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{it.created_at ? new Date(it.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onCopyLink(it.name, it.publicUrl)}
                    className="inline-flex items-center px-3 py-1 text-sm rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 mr-2"
                  >
                    <Clipboard className="w-4 h-4 mr-2"/> Copy Link
                  </button>
                  <button
                    onClick={() => onDelete(it.name)}
                    className={`inline-flex items-center px-3 py-1 text-sm rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 ${busyName === it.name ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2"/> Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No files found in this bucket.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50" disabled={page === 1}>Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50" disabled={page === totalPages}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
