import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, HardDrive, RefreshCw, Layers, Clipboard, Clock, ChevronDown, ChevronUp, FileText, Database, Activity, Box, Search, ExternalLink, ShieldCheck, Zap, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../../context/DataContext';
import { useToast } from '../ToastProvider';
import { supabase } from '../../lib/supabase';
import { sanitizeUrl } from '../../utils/dataUtils';

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
  const { push: toast } = useToast();
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
      results.sort((a, b) => b.totalBytes - a.totalBytes);
      setBreakdown(results);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setPage(1);
    loadUsage();
    loadPage(1);
  }, [bucket]);

  useEffect(() => {
    loadPage(page);
  }, [page, pageSize]);

  useEffect(() => {
    const channel = supabase
      .channel(`storage-objects-${bucket}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'storage', table: 'objects', filter: `bucket_id=eq.${bucket}` },
        (payload: any) => {
          Promise.all([loadUsage(), loadPage(page)]).catch(() => {});
          try {
            const evt = payload?.eventType as string | undefined;
            const name = (payload?.new?.name || payload?.old?.name || '') as string;
            if (evt === 'INSERT') toast({ type: 'success', message: `File synchronized: ${name}` });
            else if (evt === 'UPDATE') toast({ type: 'info', message: `File modified: ${name}` });
            else if (evt === 'DELETE') toast({ type: 'success', message: `File purged: ${name}` });
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [bucket, page, toast]);

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
  }, [topOpen]);

  const onDelete = async (name: string) => {
    if (!confirm('Permanent purge core sequence? This action cannot be undone.')) return;
    setBusyName(name);
    try {
      const res = await deleteBucketObject(bucket, name);
      if (!res.ok) {
        toast({ type: 'error', message: 'Purge failed. Access denied or RLS violation.' });
        return;
      }
      toast({ type: 'success', message: 'Data purge complete' });
    } finally {
      setBusyName(null);
    }
    await Promise.all([loadUsage(), loadPage(page), loadTotalUsage(), loadBreakdown()]);
  };

  const onDeleteFor = async (bkt: string, name: string) => {
    if (!confirm(`Purge ${name} from ${bkt}?`)) return;
    setBusyName(`${bkt}/${name}`);
    try {
      const res = await deleteBucketObject(bkt, name);
      if (!res.ok) {
        toast({ type: 'error', message: 'Purge operation failed.' });
        return;
      }
      toast({ type: 'success', message: 'Nexus entry retracted' });
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
    toast({ type: 'info', message: 'Environment re-scanned' });
  };

  const onCopyLink = async (name: string, publicUrl: string, forBucket?: string) => {
    try {
      let urlToCopy = publicUrl;
      try {
        const { data, error } = await supabase.storage.from(forBucket ?? bucket).createSignedUrl(name, 60 * 60 * 24 * 7);
        if (!error && data?.signedUrl) urlToCopy = data.signedUrl;
      } catch {
        urlToCopy = publicUrl;
      }
      await navigator.clipboard.writeText(urlToCopy);
      toast({ type: 'success', message: 'Asset link copied to clipboard' });
    } catch {
      toast({ type: 'error', message: 'Failed to extract asset link' });
    }
  };

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
          await new Promise(r => setTimeout(r, 0));
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
    <div className="rico-glass-card rounded-[2.5rem] p-8 sm:p-10 border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 opacity-50 pointer-events-none" />
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-all duration-500">
            <HardDrive className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
              Storage Hub <span className="text-xs not-italic font-black bg-indigo-500 text-white px-2 py-0.5 rounded tracking-widest uppercase">Nexus</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Distributed Asset Grid</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status: Synchronized</span>
            </div>
          </div>
        </div>
        <button 
          onClick={refresh} 
          disabled={refreshing}
          className="group relative inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
        >
          <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
          <span>{refreshing ? 'Scanning Grid...' : 'Re-index Environment'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        <div className="rico-glass-card border-white/5 bg-white/[0.02] p-6 rounded-3xl relative overflow-hidden">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Current Sector</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-white italic tracking-tighter tabular-nums mb-1">
                {loadingUsage ? <Loader2 className="animate-spin text-indigo-500" size={20} /> : formatBytes(usage.totalBytes)}
              </div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Box size={10} /> {usage.count} Asset Objects
              </div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Database size={18} className="text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="rico-glass-card border-white/5 bg-white/[0.02] p-6 rounded-3xl relative overflow-hidden group/quota">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Project Capacity</div>
          <div className="text-lg font-black text-white italic tracking-tighter mb-4">
            {loadingTotal ? 'ACCESSING...' : (
              storageQuotaBytes ? `${formatBytes(totalUsage.totalBytes)} / ${formatBytes(storageQuotaBytes)}` : `${formatBytes(totalUsage.totalBytes)} Total`
            )}
          </div>
          <div className="h-2 bg-black/40 rounded-full border border-white/10 overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              style={{ width: storageQuotaBytes ? `${Math.min(100, (totalUsage.totalBytes / storageQuotaBytes) * 100)}%` : '100%' }}
            />
          </div>
          <div className="flex items-center justify-between">
             <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{totalUsage.count} Object Nodes</span>
             <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
               {storageQuotaBytes ? `${((totalUsage.totalBytes / storageQuotaBytes) * 100).toFixed(1)}% Usage` : 'Ready'}
             </span>
          </div>
        </div>

        <div className="rico-glass-card border-white/5 bg-white/[0.02] p-6 rounded-3xl relative overflow-hidden">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Active Partition</div>
          <div className="relative group/sel">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/sel:text-indigo-400 transition-colors pointer-events-none" />
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-indigo-500/50 transition-all"
            >
              {(buckets.length ? buckets : DEFAULT_BUCKETS).map((b) => {
                const info = breakdown.find(x => x.id === b);
                return <option key={b} value={b}>{b}{info ? ` (${formatBytes(info.totalBytes)})` : ''}</option>;
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
          <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-4 flex items-center gap-2">
            <ShieldCheck size={10} className="text-emerald-500" /> RLS Enforcement Active
          </p>
        </div>

        <div className="rico-glass-card border-white/5 bg-indigo-500/5 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
             <Zap size={14} className="text-yellow-500 animate-pulse" />
             <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest italic">System Protocol Note</span>
          </div>
          <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
            Data purge operations target asset storage only. Metadata integrity in database remains until manual record termination.
          </p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
             <button
               onClick={() => setTopOpen(v => {
                 if (!v) loadTop();
                 return !v;
               })}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${topOpen ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
             >
               {topOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
               <span className="text-[10px] font-black uppercase tracking-widest italic">Anomaly Detection: Top 10 High-Mass Files</span>
             </button>
             
             <button
               onClick={() => setBreakdownOpen(v => !v)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${breakdownOpen ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
             >
               {breakdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
               <span className="text-[10px] font-black uppercase tracking-widest italic">Grid Partition Breakdown</span>
             </button>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Page Intensity:</span>
             <select
               value={pageSize}
               onChange={(e) => setPageSize(Number(e.target.value))}
               className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black text-white outline-none appearance-none cursor-pointer"
             >
               {[20, 50, 100, 500].map(n => <option key={n} value={n}>{n}</option>)}
             </select>
          </div>
        </div>

        {topOpen && (
          <div className="rico-glass-card border-indigo-500/10 bg-indigo-500/[0.02] rounded-[2rem] overflow-hidden mb-8 animate-in slide-in-from-top-4 duration-500">
             <div className="p-6 border-b border-indigo-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Activity size={16} className="text-indigo-400" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">High-Mass Asset Scan</span>
                   <div className="flex p-1 bg-black/40 rounded-lg border border-white/5 scale-75 origin-left">
                      <button onClick={() => { setTopScope('bucket'); setTimeout(loadTop, 0); }} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${topScope === 'bucket' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Scope: Bucket</button>
                      <button onClick={() => { setTopScope('all'); setTimeout(loadTop, 0); }} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${topScope === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Scope: Global</button>
                   </div>
                </div>
                <button onClick={loadTop} className="text-indigo-400 hover:text-white transition-colors">
                   <RefreshCw size={14} className={loadingTop ? 'animate-spin' : ''} />
                </button>
             </div>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-left">
                   <thead>
                      <tr className="bg-indigo-500/5 text-indigo-400/60 text-[8px] font-black uppercase tracking-[0.2em] border-b border-indigo-500/10">
                         <th className="px-6 py-4">Visual Probe</th>
                         <th className="px-6 py-4">Asset Label</th>
                         <th className="px-6 py-4">Sector</th>
                         <th className="px-6 py-4 text-right">Mass (Size)</th>
                         <th className="px-6 py-4 text-right">Directives</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {topItems.map((it) => (
                         <tr key={`${it.bucket}/${it.name}`} className="hover:bg-indigo-500/[0.03] transition-colors group/row">
                            <td className="px-6 py-4">
                               <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover/row:scale-110 transition-transform shadow-lg shadow-black/50">
                                  <img 
                                    src={sanitizeUrl(it.publicUrl, { width: 100 })} 
                                    alt={it.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = it.publicUrl)}
                                  />
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-1">
                                  <div className="text-xs font-mono text-white truncate max-w-[200px]" title={it.name}>{it.name}</div>
                                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">{it.created_at ? format(new Date(it.created_at), 'MMM d, yyyy HH:mm') : 'TIME_UNKNOWN'}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-[10px] font-mono font-black text-indigo-400/60 uppercase tracking-tighter">{it.bucket}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <span className="text-xs font-black text-white italic tracking-tighter tabular-nums">{formatBytes(it.size)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-3 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                  <button onClick={() => onCopyLink(it.name, it.publicUrl, it.bucket)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Clipboard size={14} /></button>
                                  <button onClick={() => onDeleteFor(it.bucket, it.name)} className={`p-2 hover:bg-rose-500/10 rounded-lg text-gray-500 hover:text-rose-400 transition-all ${busyName === `${it.bucket}/${it.name}` ? 'animate-pulse scale-90' : ''}`}><Trash2 size={14} /></button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {breakdownOpen && (
          <div className="rico-glass-card border-purple-500/10 bg-purple-500/[0.01] rounded-[2.5rem] overflow-hidden mb-8 animate-in slide-in-from-top-4 duration-500">
             <div className="p-8 border-b border-purple-500/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <Layers size={18} className="text-purple-400" />
                   <div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Sector Allocation Mapping</span>
                      <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-0.5">Real-time resource distribution</p>
                   </div>
                </div>
                {loadingBreakdown && <Loader2 size={14} className="animate-spin text-purple-400" />}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {breakdown.map((b) => {
                  const totalBytes = totalUsage.totalBytes || 1;
                  const pct = b.totalBytes / totalBytes;
                  const intensity = Math.min(100, pct * 100);
                  const colorClass = intensity > 50 ? 'from-rose-600 to-rose-400' : intensity > 20 ? 'from-amber-600 to-amber-400' : 'from-purple-600 to-indigo-400';
                  
                  return (
                    <div key={b.id} className="rico-glass-card p-5 border-white/5 bg-white/[0.02] rounded-2xl group/bar hover:bg-white/[0.04] transition-all">
                       <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-400 italic group-hover/bar:text-purple-400 transition-colors">{b.id}</span>
                          <span className="text-white italic tracking-tighter tabular-nums">{intensity.toFixed(1)}%</span>
                       </div>
                       <div className="h-1.5 bg-black/40 rounded-full border border-white/5 overflow-hidden mb-3">
                          <div 
                            className={`h-full bg-gradient-to-r ${colorClass} shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-1000`} 
                            style={{ width: `${intensity}%` }} 
                          />
                       </div>
                       <div className="flex items-center justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                          <span>{b.count} Asset Objects</span>
                          <span className="text-white italic tabular-nums">{formatBytes(b.totalBytes)}</span>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.01] backdrop-blur-3xl shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  <th className="px-8 py-6">Visual Identification</th>
                  <th className="px-8 py-6">Asset Descriptor</th>
                  <th className="px-8 py-6 text-right">Mass (Size)</th>
                  <th className="px-8 py-6 text-right">Temporal Data</th>
                  <th className="px-8 py-6 text-right">Directives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((it) => (
                  <tr key={it.name} className="hover:bg-white/[0.02] transition-colors group/asset">
                    <td className="px-8 py-8">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 group-hover/asset:scale-105 transition-all duration-500 shadow-2xl before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/40 before:to-transparent before:z-10">
                        <img 
                          src={sanitizeUrl(it.publicUrl, { width: 150 })} 
                          alt={it.name} 
                          className="w-full h-full object-cover transform scale-110 group-hover/asset:scale-100 transition-transform duration-700"
                          onError={(e) => (e.currentTarget.src = it.publicUrl)}
                        />
                        <div className="absolute bottom-1 right-1 z-20 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); window.open(it.publicUrl, '_blank'); }} className="p-1 bg-black/60 rounded-lg text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-black/20">
                              <ExternalLink size={10} />
                           </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-black text-white italic tracking-tight truncate max-w-[300px]" title={it.name}>{it.name}</div>
                        <div className="flex items-center gap-2">
                           <FileText size={10} className="text-indigo-500" />
                           <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{it.name.split('.').pop() || 'FILE'} OBJECT</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                       <span className="text-sm font-black text-white italic tracking-tighter tabular-nums">{formatBytes(it.size)}</span>
                    </td>
                    <td className="px-8 py-8 text-right">
                       <div className="flex flex-col gap-1 items-end">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{it.created_at ? format(new Date(it.created_at), 'MMM d, yyyy') : 'TIME_NULL'}</span>
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">{it.created_at ? format(new Date(it.created_at), 'HH:mm:ss') : ''}</span>
                       </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-60 group-hover/asset:opacity-100 transition-opacity">
                        <button
                          onClick={() => onCopyLink(it.name, it.publicUrl)}
                          className="p-3 bg-white/5 hover:bg-white/10 hover:text-indigo-400 text-gray-400 rounded-xl border border-white/5 transition-all active:scale-90"
                          title="Copy Nexus Link"
                        >
                          <Clipboard size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(it.name)}
                          disabled={busyName === it.name}
                          className={`p-3 bg-rose-500/5 hover:bg-rose-500/10 hover:text-rose-400 text-gray-500 rounded-xl border border-white/5 transition-all active:scale-90 ${busyName === it.name ? 'animate-pulse' : ''}`}
                          title="Purge Asset"
                        >
                          {busyName === it.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                       <div className="flex flex-col items-center gap-6 opacity-30">
                          <Database size={48} className="text-gray-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 italic">No asset fragments detected in current sector</span>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-8 py-8 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest tracking-[0.2em]">Paginated Grid Coverage</span>
                 <p className="text-xs font-bold text-gray-400 mt-1 italic uppercase tracking-tighter">Segment <span className="text-indigo-400 tabular-nums">{page}</span> of <span className="text-indigo-400 tabular-nums">{totalPages}</span></p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="group relative flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-indigo-500/50 transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="group relative flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-indigo-500/50 transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
