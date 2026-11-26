import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, History, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { dualRead } from '../../../lib/dualDb';
import { useToast } from '../../ToastProvider';

export const ScanHistoryPanel: React.FC = () => {
  const { push: toast } = useToast();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'valid' | 'invalid'>('all');

  const loadScans = async () => {
    setLoading(true);
    try {
      const { data } = await dualRead({
        table: 'pass_scans',
        order: ['scanned_at', { ascending: false }],
        limit: 250,
      });
      setScans(data || []);
    } catch (err: any) {
      toast({ message: 'Could not load scan history: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
    const channel = supabase
      .channel('entry_pass_scan_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pass_scans' }, () => loadScans())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = scans.length;
    const valid = scans.filter((s) => s.scan_result === 'valid').length;
    return { total, valid, denied: total - valid };
  }, [scans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scans.filter((s) => {
      if (resultFilter === 'valid' && s.scan_result !== 'valid') return false;
      if (resultFilter === 'invalid' && s.scan_result === 'valid') return false;
      if (!q) return true;
      return (
        (s.participant_name || '').toLowerCase().includes(q) ||
        (s.pass_token || '').toLowerCase().includes(q) ||
        (s.guard_name || s.scanned_by_username || '').toLowerCase().includes(q)
      );
    });
  }, [scans, search, resultFilter]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Total scans</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#26352e] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Allowed entry</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#426b52] mt-1">{stats.valid}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Blocked / Invalid</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#b43c48] mt-1">{stats.denied}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, or gate staff..."
            className="w-full h-10 sm:h-9 pl-9 pr-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] placeholder:text-[#86938b] focus:outline-none focus:border-[#426b52] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter scan results"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as any)}
            className="h-10 sm:h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] flex-1 sm:flex-none"
          >
            <option value="all">All scans</option>
            <option value="valid">Allowed only</option>
            <option value="invalid">Blocked only</option>
          </select>

          <button
            type="button"
            onClick={loadScans}
            disabled={loading}
            aria-label="Refresh scan history"
            className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] inline-flex items-center justify-center shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <Loader2 className="w-6 h-6 text-[#426b52] animate-spin mx-auto mb-2" />
          Loading scan history...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <History className="w-8 h-8 text-[#a3b0a7] mx-auto mb-2" />
          <p className="font-medium text-[#26352e]">No gate scans recorded yet</p>
          <p className="text-xs text-[#65726a] mt-0.5">
            Live check-ins from the gate scanner will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Phone Cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((scan) => {
              const isOk = scan.scan_result === 'valid';
              const staff = scan.guard_name || scan.scanned_by_username || 'Gate staff';
              return (
                <div key={scan.id} className="bg-white border border-[#e2e8df] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#26352e] truncate">
                        {scan.participant_name || 'Guest'}
                      </p>
                      <p className="text-[11px] font-mono text-[#65726a] truncate">
                        {scan.pass_token?.slice(0, 14)}
                      </p>
                    </div>
                    {isOk ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246] shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Allowed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fdf2f3] text-[#b43c48] shrink-0">
                        <XCircle className="w-3 h-3" />
                        {scan.scan_result || 'Blocked'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#65726a] pt-1 border-t border-[#eef2ec]">
                    <span>{new Date(scan.scanned_at).toLocaleString()}</span>
                    <span>By {staff}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-[#e2e8df] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8df] bg-[#fafbf9] text-[11px] font-semibold text-[#65726a]">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Guest / Student</th>
                    <th className="py-3 px-4">Pass type</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Scanned by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec] text-xs">
                  {filtered.map((scan) => {
                    const isOk = scan.scan_result === 'valid';
                    return (
                      <tr key={scan.id} className="hover:bg-[#fafcf9]">
                        <td className="py-3 px-4 text-[#4a5750] whitespace-nowrap">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#26352e]">
                            {scan.participant_name || 'Guest'}
                          </p>
                          <p className="text-[11px] font-mono text-[#65726a]">
                            {scan.pass_token?.slice(0, 16)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              scan.pass_type === 'vip'
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#eff4ed] text-[#3d6246]'
                            }`}
                          >
                            {scan.pass_type === 'vip' ? 'VIP' : 'Student'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isOk ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#426b52]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Allowed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b43c48]">
                              <XCircle className="w-3.5 h-3.5" />
                              {scan.scan_result || 'Blocked'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#4a5750]">
                          {scan.guard_name || scan.scanned_by_username || 'Gate staff'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
