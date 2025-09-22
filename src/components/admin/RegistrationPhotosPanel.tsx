import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { ExternalLink, Link as LinkIcon, RefreshCcw, Search, Trash2, Image as ImageIcon, Folder, CheckCircle, XCircle, Info } from 'lucide-react';

// Tiny types for local state
interface PhotoItem {
  name: string;            // storage path within bucket
  publicUrl: string;       // public URL or signed URL when bucket is private
  size: number;            // bytes
  created_at: string | null;
  registration?: { id: string; full_name: string; email: string; event_id: number | null } | null;
  event_title?: string | null;
  folderEventId?: number | null;
}

export const RegistrationPhotosPanel: React.FC = () => {
  const {
    getBucketObjects,
    computeBucketUsage,
    deleteBucketObject,
    registrations,
    events,
    schemaCapabilities,
  } = useData();

  const BUCKET = 'registration-photos';
  const pageSize = 50;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ totalBytes: number; count: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [onlyOrphans, setOnlyOrphans] = useState(false);
  const [eventFilter, setEventFilter] = useState<number | 'all'>('all');
  const [busyName, setBusyName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const registrationsByPhotoUrl = useMemo(() => {
    // Map normalized public URL (without query/fragment) -> registration row
    const map = new Map<string, PhotoItem['registration']>();
    for (const r of registrations) {
      const url = (r as any).photo_url as string | null | undefined;
      if (!url) continue;
      const clean = url.split('?')[0].split('#')[0];
      map.set(clean, { id: String(r.id), full_name: (r as any).full_name || '', email: (r as any).email || '', event_id: (r as any).event_id ?? null });
    }
    return map;
  }, [registrations]);

  const eventsById = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of events) map.set(e.id as number, (e as any).title || String(e.id));
    return map;
  }, [events]);

  const effectiveItems = useMemo(() => {
    const parseFolderEventId = (name: string): number | null => {
      const parts = name.split('/');
      if (parts[0] === 'registrations' && parts[1]) {
        const n = Number(parts[1]);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };
    let list = items
      .map((i) => {
        const reg = registrationsByPhotoUrl.get(i.publicUrl.split('?')[0].split('#')[0]) || null;
        const event_title = reg?.event_id ? (eventsById.get(reg.event_id) || null) : null;
        const folderEventId = parseFolderEventId(i.name);
        return { ...i, registration: reg, event_title, folderEventId } as PhotoItem;
      })
      .filter((i) => {
        if (onlyOrphans && i.registration) return false;
        if (eventFilter !== 'all') {
          const regOk = !!i.registration && i.registration.event_id === eventFilter;
          const folderOk = i.folderEventId === eventFilter;
          if (!regOk && !folderOk) return false;
        }
        if (searchText) {
          const q = searchText.toLowerCase();
          const hit = i.name.toLowerCase().includes(q)
            || (i.registration?.full_name || '').toLowerCase().includes(q)
            || (i.registration?.email || '').toLowerCase().includes(q)
            || (i.event_title || '').toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      });
    return list;
  }, [items, registrationsByPhotoUrl, eventsById, onlyOrphans, eventFilter, searchText]);

  // Build folder groups based on path prefix up to eventId segment: registrations/<eventId>/...
  const groupedByFolder = useMemo(() => {
    const groups = new Map<string, PhotoItem[]>();
    for (const it of effectiveItems) {
      const parts = it.name.split('/');
      let key = 'root';
      const p0 = parts[0] || '';
      const p1 = parts[1] || '';
      if (p0 === 'registrations' && p1) key = `registrations/${p1}`; else if (p0) key = p0;
      const arr = groups.get(key) || [];
      arr.push(it);
      groups.set(key, arr);
    }
    // Sort keys with registrations/<id> first, then alpha
    return Array.from(groups.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [effectiveItems]);

  const load = async () => {
    setLoading(true);
    try {
      const { items: pageItems, total: t } = await getBucketObjects(BUCKET, page, pageSize);
      setItems(pageItems as PhotoItem[]);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async () => {
    try {
      const u = await computeBucketUsage(BUCKET);
      setUsage(u);
    } catch {}
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { refreshUsage(); }, []);

  const formatBytes = (n: number) => {
    if (!n) return '0 B';
    const units = ['B','KB','MB','GB'];
    let v = n; let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this photo from storage? This clears any known references (e.g., registrations.photo_url).')) return;
    setBusyName(name);
    try {
      const res = await deleteBucketObject(BUCKET, name);
      if (!res.ok) alert('Delete failed');
      await Promise.all([load(), refreshUsage()]);
    } finally {
      setBusyName(null);
    }
  };

  const handleBulkDelete = async () => {
    const names = Object.entries(selected).filter(([,v])=>!!v).map(([k])=>k);
    if (!names.length) return;
    if (!confirm(`Delete ${names.length} selected photo(s)? This clears known references.`)) return;
    setBulkBusy(true);
    try {
      for (const n of names) {
        try { await deleteBucketObject(BUCKET, n); } catch {}
      }
      setSelected({});
      await Promise.all([load(), refreshUsage()]);
    } finally { setBulkBusy(false); }
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    const next = { ...selected };
    for (const it of effectiveItems) next[it.name] = checked;
    setSelected(next);
  };

  const deepLinkToRegistration = (it: PhotoItem) => {
    const who = it.registration?.full_name || it.registration?.email || '';
    try { localStorage.setItem('admin_registrations_search', who); } catch {}
    // Switch to Registrations tab by dispatching a custom event that AdminDashboard can listen to if needed
    try { window.dispatchEvent(new CustomEvent('admin:navigate', { detail: { tab: 'registrations' } })); } catch {}
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const openInNew = (url: string) => {
    try { window.open(url, '_blank'); } catch {}
  };

  const bucketExists = schemaCapabilities?.storage_registration_photos_bucket !== false;

  // Safe icon renderer to avoid React #310 if an icon import resolves incorrectly
  const SafeIcon: React.FC<{ C: any; className?: string }> = ({ C, className }) => {
    try {
      let Comp = C;
      if (!Comp) return <span className={className} />;
      if (typeof Comp === 'object' && Comp && 'default' in Comp && typeof (Comp as any).default === 'function') {
        Comp = (Comp as any).default;
      }
      const ok = typeof Comp === 'function' || (Comp && typeof Comp === 'object' && ((Comp as any).$$typeof || (Comp as any).render));
      if (!ok) return <span className={className} />;
      return <Comp className={className} />;
    } catch {
      return <span className={className} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SafeIcon C={ImageIcon} className="w-5 h-5 text-purple-600" /> Registration Photos
          </h3>
          <div className="text-xs text-gray-500">Bucket: {BUCKET} {usage && <>· {usage.count} files · {formatBytes(usage.totalBytes)}</>}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-1"><SafeIcon C={RefreshCcw} className="w-4 h-4"/>Refresh</button>
          <button onClick={() => refreshUsage()} className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200">Recompute Usage</button>
        </div>
      </div>

      {!bucketExists && (
        <div className="p-3 mb-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2"><XCircle className="w-4 h-4"/> Bucket "{BUCKET}" not detected. Ensure migration applied.</div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400"/>
          <input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="Search by file, name, email, event" className="pl-8 pr-3 py-2 border rounded w-72 text-sm"/>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={onlyOrphans} onChange={(e)=>setOnlyOrphans(e.target.checked)} />
            Orphans only
          </label>
        </div>
        <div>
          <select value={eventFilter} onChange={(e)=>setEventFilter(e.target.value==='all'?'all':Number(e.target.value))} className="border rounded px-2 py-2 text-sm">
            <option value="all">All events</option>
            {events.map(e => (
              <option key={e.id} value={String(e.id)}>{(e as any).title || e.id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions and select-all */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" onChange={(e)=>toggleSelectAllVisible(e.target.checked)} />
          Select all (visible)
        </label>
        <button disabled={bulkBusy || Object.values(selected).every(v=>!v)} onClick={handleBulkDelete} className="px-3 py-1.5 text-sm rounded border bg-red-50 text-red-700 disabled:opacity-50">Delete Selected</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6">
        {groupedByFolder.map(([folder, arr]) => (
          <div key={folder} className="border rounded-lg">
                <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium flex items-center gap-2"><SafeIcon C={Folder} className="w-4 h-4"/> {folder}</div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {loading && Array.from({ length: 10 }).map((_,i)=> (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded" />
              ))}
              {!loading && arr.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-600 py-4">
                  <SafeIcon C={Info} className="w-4 h-4 inline-block mr-1"/> No photos in this folder.
                </div>
              )}
              {!loading && arr.map((it) => (
                <div key={it.name} className="border rounded overflow-hidden bg-gray-50">
                  <div className="aspect-square bg-white flex items-center justify-center overflow-hidden">
                    <img src={it.publicUrl} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-mono truncate" title={it.name}>{it.name.split('/').slice(-1)[0]}</div>
                      <input type="checkbox" checked={!!selected[it.name]} onChange={(e)=>setSelected(s=>({ ...s, [it.name]: e.target.checked }))} />
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center justify-between mt-1">
                      <span>{it.size ? formatBytes(it.size) : '—'}</span>
                      <span>{it.created_at ? new Date(it.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    {it.registration ? (
                      <div className="mt-1 text-xs text-green-700 flex items-center gap-1"><SafeIcon C={CheckCircle} className="w-3 h-3"/> {it.registration.full_name}{it.event_title?` · ${it.event_title}`:''}</div>
                    ) : (
                      <div className="mt-1 text-xs text-yellow-700 flex items-center gap-1">
                        <SafeIcon C={Folder} className="w-3 h-3"/> Orphan{it.folderEventId ? ` · registrations/${it.folderEventId}` : ''}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={()=>openInNew(it.publicUrl)} className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center gap-1"><SafeIcon C={ExternalLink} className="w-3 h-3"/>Open</button>
                      <button onClick={()=>copy(it.publicUrl)} className="px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center gap-1"><SafeIcon C={LinkIcon} className="w-3 h-3"/>Copy</button>
                      <button disabled={busyName===it.name} onClick={()=>handleDelete(it.name)} className={`px-2 py-1 text-xs border rounded hover:bg-red-50 text-red-700 flex items-center gap-1 ${busyName===it.name?'opacity-60':''}`}><SafeIcon C={Trash2} className="w-3 h-3"/>Delete</button>
                    </div>
                    {it.registration && (
                      <button onClick={()=>deepLinkToRegistration(it)} className="mt-2 w-full px-2 py-1 text-xs border rounded bg-blue-50 text-blue-700 hover:bg-blue-100">View in Registrations</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-gray-600">Page {page} / {totalPages} · {total} total</div>
        <div className="flex gap-2">
          <button disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 text-sm rounded border disabled:opacity-50">Prev</button>
          <button disabled={page>=totalPages || loading} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 text-sm rounded border disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPhotosPanel;
