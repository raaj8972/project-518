import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Crown,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { dualRead } from '../../../lib/dualDb';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../ToastProvider';
import { QRCodeGenerator } from '../QRCodeGenerator';
import { generatePassPDF, generateA4SheetPDF } from '../../../utils/pdfGenerator';
import { generatePassImages } from '../../../utils/passImageGenerator';
import { ConfirmDialog, EntryPassDialog } from './EntryPassDialog';

interface VipPass {
  id: string;
  pass_id: string;
  participant_name: string | null;
  pass_type: string;
  created_at: string;
  notes: string | null;
  pass_token: string;
  is_used: boolean;
  is_active: boolean;
  valid_date?: string | null;
}

interface VipPassPanelProps {
  onCountChange?: (count: number) => void;
  onOpenEditor?: () => void;
}

export const VipPassPanel: React.FC<VipPassPanelProps> = ({ onCountChange, onOpenEditor }) => {
  const { securitySettings } = useData();
  const { push: toast } = useToast();

  const [vipPasses, setVipPasses] = useState<VipPass[]>([]);
  const [passUsage, setPassUsage] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [vipSearch, setVipSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [qrPass, setQrPass] = useState<VipPass | null>(null);
  const [creating, setCreating] = useState(false);
  const [newVIP, setNewVIP] = useState({ name: '', notes: '', validDate: '' });

  const [importData, setImportData] = useState<any[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);

  const [showNameOnDownload, setShowNameOnDownload] = useState(true);
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState('');

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'danger' | 'primary';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const loadVipPasses = async () => {
    setLoading(true);
    try {
      const { data: vip } = await dualRead({
        table: 'entry_passes',
        eq: ['pass_type', 'vip'],
        order: ['created_at', { ascending: false }],
      });
      const list: VipPass[] = vip || [];
      setVipPasses(list);
      onCountChange?.(list.length);

      if (list.length > 0) {
        const ids = list.map((p) => p.id);
        const { data: scans } = await dualRead({
          table: 'pass_scans',
          in: ['pass_id', ids],
          eq: ['scan_result', 'valid'],
        });
        if (scans) {
          const usage: Record<string, number[]> = {};
          scans.forEach((scan: any) => {
            const scanDate = new Date(scan.scanned_at);
            const istDate = scanDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const utcDate = scanDate.toISOString().split('T')[0];
            let dayIdx = (securitySettings?.event_dates || []).indexOf(istDate);
            if (dayIdx === -1) dayIdx = (securitySettings?.event_dates || []).indexOf(utcDate);
            if (dayIdx !== -1) {
              if (!usage[scan.pass_id]) usage[scan.pass_id] = [];
              if (!usage[scan.pass_id].includes(dayIdx + 1)) usage[scan.pass_id].push(dayIdx + 1);
            }
          });
          setPassUsage(usage);
        }
      } else {
        setPassUsage({});
      }
    } catch (err: any) {
      toast({ message: 'Could not load VIP passes: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVipPasses();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('vip_passes_panel_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_passes' }, () => loadVipPasses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pass_scans' }, () => loadVipPasses())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [securitySettings?.event_dates]);

  const filteredPasses = useMemo(() => {
    const term = vipSearch.trim().toLowerCase();
    if (!term) return vipPasses;
    return vipPasses.filter(
      (p) =>
        (p.participant_name?.toLowerCase() || '').includes(term) ||
        (p.notes?.toLowerCase() || '').includes(term) ||
        (p.pass_token?.toLowerCase() || '').includes(term)
    );
  }, [vipPasses, vipSearch]);

  const stats = useMemo(() => {
    const total = vipPasses.length;
    const usedCount = vipPasses.filter((p) => p.is_used || (passUsage[p.id]?.length || 0) > 0).length;
    return { total, unused: total - usedCount, usedCount };
  }, [vipPasses, passUsage]);

  const allSelected =
    filteredPasses.length > 0 && filteredPasses.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
      filteredPasses.forEach((p) => next.delete(p.id));
    } else {
      filteredPasses.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreateVIP = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { error } = await supabase.rpc('create_vip_pass_v3', {
        p_name: newVIP.name.trim() || null,
        p_notes: newVIP.notes.trim() || null,
        p_valid_date: newVIP.validDate || null,
      });
      if (error) throw error;
      toast({ message: 'VIP pass created', type: 'success' });
      setNewVIP({ name: '', notes: '', validDate: '' });
      setShowCreateModal(false);
      loadVipPasses();
    } catch (err: any) {
      toast({ message: err.message || 'Could not create VIP pass', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ message: 'Please use a file smaller than 5 MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const XLSX = await import('xlsx');
        const wb = XLSX.read(bstr, { type: 'binary', sheetRows: 5001, bookVBA: false, cellFormula: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (!data.length) {
          toast({ message: 'This spreadsheet is empty', type: 'error' });
          return;
        }
        const firstRow = data[0] as any;
        const nameKey = Object.keys(firstRow).find(
          (k) => k.toLowerCase() === 'name' || k.toLowerCase() === 'participant_name'
        );
        if (!nameKey) {
          toast({ message: 'Your file needs a "name" column', type: 'error' });
          return;
        }
        setImportData(data);
        toast({ message: `${data.length} guests loaded and ready to create.`, type: 'success' });
      } catch {
        toast({ message: 'Could not read that file. Please upload an Excel or CSV file.', type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessBulk = async () => {
    if (!importData.length) return;
    setProcessingBulk(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const row of importData) {
        const nameKey = Object.keys(row).find(
          (k) => k.toLowerCase() === 'name' || k.toLowerCase() === 'participant_name'
        );
        const notesKey = Object.keys(row).find(
          (k) => k.toLowerCase() === 'notes' || k.toLowerCase() === 'internal_notes'
        );
        const { error } = await supabase.rpc('create_vip_pass_v3', {
          p_name: nameKey ? row[nameKey] : null,
          p_notes: notesKey ? row[notesKey] : null,
        });
        if (error) fail++;
        else ok++;
      }
      toast({
        message: fail > 0 ? `Created ${ok} passes (${fail} failed)` : `Created ${ok} VIP passes!`,
        type: fail > 0 ? 'info' : 'success',
      });
      setImportData([]);
      setShowBulkModal(false);
      loadVipPasses();
    } finally {
      setProcessingBulk(false);
    }
  };

  const downloadSampleExcel = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { name: 'Rohan Sharma', notes: 'Chief Guest' },
      { name: 'Ananya Verma', notes: 'Sponsor Guest' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VIP Guests');
    XLSX.writeFile(wb, 'vip_guests_sample.xlsx');
  };

  const ensureTemplateReady = () => {
    const config = securitySettings?.pass_template_config || {};
    if (Object.keys(config).length === 0) {
      toast({
        message: 'No pass design uploaded yet. Opening Pass Editor so you can upload Day 1/2/3 backgrounds.',
        type: 'info',
      });
      onOpenEditor?.();
      return null;
    }
    return config;
  };

  const handleDownload = async (target: VipPass | VipPass[], kind: 'pdf' | 'a4' | 'png' | 'jpg') => {
    const config = ensureTemplateReady();
    if (!config) return;

    const passes = Array.isArray(target) ? target : [target];
    const eventDates = securitySettings?.event_dates || [];
    const selectedDays =
      eventDates.length > 0
        ? eventDates.map((_, i) => i)
        : Object.keys(config).map((k) => parseInt(k.replace('day_', ''), 10));

    const payload = passes.map((p) => ({
      id: p.id,
      token: p.pass_token,
      type: p.pass_type,
      name: p.participant_name || undefined,
      valid_date: p.valid_date || undefined,
    }));

    try {
      toast({ message: `Preparing ${kind.toUpperCase()}...`, type: 'info' });
      if (kind === 'pdf') {
        await generatePassPDF({
          passes: payload,
          templateConfigs: config,
          selectedDays,
          eventDates,
          includeName: showNameOnDownload,
        });
      } else if (kind === 'a4') {
        await generateA4SheetPDF({
          passes: payload,
          templateConfigs: config,
          selectedDays,
          eventDates,
          includeName: showNameOnDownload,
        });
      } else {
        await generatePassImages({
          passes: payload,
          templateConfigs: config,
          selectedDays,
          eventDates,
          format: kind === 'jpg' ? 'jpg' : 'png',
          includeName: showNameOnDownload,
        });
      }
      toast({ message: 'Download complete!', type: 'success' });
    } catch {
      toast({ message: 'Could not generate download file', type: 'error' });
    }
  };

  const handleSaveDate = async (passId: string) => {
    const { error } = await supabase.rpc('update_pass_date', {
      p_pass_id: passId,
      p_new_date: editDateValue || null,
    });
    if (error) {
      toast({ message: error.message || 'Could not update date', type: 'error' });
    } else {
      toast({ message: 'Valid date updated', type: 'success' });
      setEditingPassId(null);
      loadVipPasses();
    }
  };

  const askResetDay = (pass: VipPass, dayNum: number) => {
    const dateStr = (securitySettings?.event_dates || [])[dayNum - 1];
    if (!dateStr) {
      askResetPass(pass);
      return;
    }
    setConfirmState({
      open: true,
      title: `Reset Day ${dayNum} scan`,
      message: `Remove the Day ${dayNum} (${dateStr}) scan record for "${pass.participant_name || 'Guest'}" so they can scan again on Day ${dayNum}?`,
      confirmLabel: `Reset Day ${dayNum}`,
      tone: 'primary',
      onConfirm: async () => {
        setConfirmState(null);
        const { error } = await supabase.rpc('delete_pass_scan_for_date', {
          p_pass_id: pass.id,
          p_date: dateStr,
        });
        if (error) toast({ message: error.message || 'Could not reset day scan', type: 'error' });
        else {
          toast({ message: `Day ${dayNum} scan cleared`, type: 'success' });
          loadVipPasses();
        }
      },
    });
  };

  const askResetPass = (pass: VipPass) => {
    setConfirmState({
      open: true,
      title: 'Reset VIP pass usage',
      message: `Clear scan history for "${pass.participant_name || 'Guest'}" so this pass can be used again as new?`,
      confirmLabel: 'Reset pass',
      tone: 'primary',
      onConfirm: async () => {
        setConfirmState(null);
        const { error } = await supabase.rpc('reset_pass_usage', { p_pass_id: pass.id });
        if (error) toast({ message: 'Could not reset pass', type: 'error' });
        else {
          toast({ message: 'Pass usage cleared', type: 'success' });
          loadVipPasses();
        }
      },
    });
  };

  const askDeletePass = (pass: VipPass) => {
    setConfirmState({
      open: true,
      title: 'Delete VIP pass',
      message: `Delete the VIP pass for "${pass.participant_name || 'Guest'}"? This cannot be undone.`,
      confirmLabel: 'Delete pass',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        const { error } = await supabase.rpc('delete_entry_pass_v3', { p_pass_id: pass.id });
        if (error) toast({ message: error.message || 'Could not delete pass', type: 'error' });
        else {
          toast({ message: 'VIP pass deleted', type: 'success' });
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(pass.id);
            return next;
          });
          loadVipPasses();
        }
      },
    });
  };

  const askDeleteSelected = () => {
    const count = selectedIds.size;
    if (!count) return;
    setConfirmState({
      open: true,
      title: `Delete ${count} VIP passes`,
      message: `Are you sure you want to delete ${count} selected VIP passes? This cannot be undone.`,
      confirmLabel: `Delete ${count} passes`,
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        let deleted = 0;
        for (const id of selectedIds) {
          const { error } = await supabase.rpc('delete_entry_pass_v3', { p_pass_id: id });
          if (!error) deleted++;
        }
        toast({ message: `Deleted ${deleted} VIP passes`, type: 'success' });
        setSelectedIds(new Set());
        loadVipPasses();
      },
    });
  };

  const selectedList = vipPasses.filter((p) => selectedIds.has(p.id));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Total VIP</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#26352e] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Not used</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#426b52] mt-1">{stats.unused}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#65726a]">Scanned</p>
          <p className="text-xl sm:text-2xl font-semibold text-[#b45309] mt-1">{stats.usedCount}</p>
        </div>
      </div>

      {/* Controls & actions (phone-friendly) */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={vipSearch}
              onChange={(e) => setVipSearch(e.target.value)}
              placeholder="Search guest name, note, or code..."
              className="w-full h-10 sm:h-9 pl-9 pr-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] placeholder:text-[#86938b] focus:outline-none focus:border-[#426b52] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 h-10 sm:h-9 rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-xs text-[#26352e] cursor-pointer select-none flex-1 sm:flex-none justify-center">
              <input
                type="checkbox"
                checked={showNameOnDownload}
                onChange={(e) => setShowNameOnDownload(e.target.checked)}
                className="accent-[#426b52] rounded"
              />
              Show guest name
            </label>

            <button
              type="button"
              onClick={loadVipPasses}
              disabled={loading}
              aria-label="Refresh VIP list"
              className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] hover:text-[#26352e] inline-flex items-center justify-center shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="h-10 sm:h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#426b52]" />
              Import Excel
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-10 sm:h-9 px-3.5 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              New VIP pass
            </button>
          </div>
        </div>

        {/* Bulk selection bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#eef2ec] bg-[#f7faf6] -mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 px-3.5 sm:px-4 py-3 rounded-b-xl">
            <span className="text-xs font-medium text-[#26352e]">
              {selectedIds.size} {selectedIds.size === 1 ? 'pass' : 'passes'} selected
            </span>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedList, 'pdf')}
                className="h-9 sm:h-8 px-2.5 rounded-lg bg-white border border-[#e2e8df] hover:bg-[#f6f8f4] text-[11px] font-medium text-[#26352e] inline-flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedList, 'a4')}
                className="h-9 sm:h-8 px-2.5 rounded-lg bg-white border border-[#e2e8df] hover:bg-[#f6f8f4] text-[11px] font-medium text-[#26352e] inline-flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                A4 sheet
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedList, 'png')}
                className="h-9 sm:h-8 px-2.5 rounded-lg bg-white border border-[#e2e8df] hover:bg-[#f6f8f4] text-[11px] font-medium text-[#26352e] inline-flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                PNG
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedList, 'jpg')}
                className="h-9 sm:h-8 px-2.5 rounded-lg bg-white border border-[#e2e8df] hover:bg-[#f6f8f4] text-[11px] font-medium text-[#26352e] inline-flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                JPG
              </button>
              <button
                type="button"
                onClick={askDeleteSelected}
                className="h-9 sm:h-8 px-2.5 rounded-lg border border-[#f2cfd3] bg-[#fdf2f3] hover:bg-[#fbe6e8] text-[11px] font-medium text-[#b43c48] inline-flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading / Empty states */}
      {loading ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <Loader2 className="w-6 h-6 text-[#426b52] animate-spin mx-auto mb-2" />
          Loading VIP passes...
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 px-4 text-center text-xs text-[#65726a]">
          <Crown className="w-8 h-8 text-[#c2a463] mx-auto mb-2" />
          <p className="font-medium text-[#26352e]">No VIP passes yet</p>
          <p className="text-xs text-[#65726a] mt-0.5">
            Tap "New VIP pass" to create one for a special guest.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Phone Cards */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#26352e]"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#426b52]" />
                ) : (
                  <Square className="w-4 h-4 text-[#65726a]" />
                )}
                {allSelected ? 'Unselect all' : 'Select all'}
              </button>
              <span className="text-[11px] text-[#65726a]">{filteredPasses.length} passes</span>
            </div>

            {filteredPasses.map((pass) => {
              const usedDays = passUsage[pass.id] || [];
              const isEditingDate = editingPassId === pass.id;

              return (
                <div
                  key={pass.id}
                  className="bg-white border border-[#e2e8df] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelect(pass.id)}
                        aria-label={`Select pass for ${pass.participant_name || 'Guest'}`}
                        className="p-1 -ml-1 text-[#65726a]"
                      >
                        {selectedIds.has(pass.id) ? (
                          <CheckSquare className="w-4 h-4 text-[#426b52]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="w-8 h-8 rounded-full bg-[#fef7e6] border border-[#f5e3b3] text-[#a16207] flex items-center justify-center shrink-0">
                        <Crown className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#26352e] truncate">
                          {pass.participant_name || 'Unnamed guest'}
                        </p>
                        <p className="text-[11px] text-[#65726a] truncate">
                          {pass.notes || 'VIP guest'} ·{' '}
                          <span className="font-mono">{pass.pass_token.slice(0, 10)}</span>
                        </p>
                      </div>
                    </div>

                    {usedDays.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#92400e] shrink-0">
                        Used
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246] shrink-0">
                        Ready
                      </span>
                    )}
                  </div>

                  {/* Date row */}
                  <div className="flex items-center justify-between text-xs bg-[#fafbf9] px-3 py-2 rounded-lg border border-[#eef2ec]">
                    {isEditingDate ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="h-8 px-2 text-xs rounded border border-[#426b52] bg-white text-[#26352e] flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveDate(pass.id)}
                          className="h-8 px-2.5 rounded bg-[#426b52] text-white text-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPassId(null)}
                          className="h-8 px-2 rounded border border-[#e2e8df] text-[#65726a] text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[#4a5750]">
                          <Calendar className="w-3.5 h-3.5 text-[#8a968e]" />
                          {pass.valid_date || 'Any event day'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPassId(pass.id);
                            setEditDateValue(pass.valid_date || '');
                          }}
                          className="text-[#426b52] text-[11px] font-medium inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Change
                        </button>
                      </>
                    )}
                  </div>

                  {/* Touch-friendly buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrPass(pass)}
                      className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#426b52]" />
                      QR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(pass, 'pdf')}
                      className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(pass, 'a4')}
                      className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center"
                    >
                      A4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(pass, 'jpg')}
                      className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center"
                    >
                      JPG
                    </button>
                  </div>

                  {usedDays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {usedDays.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => askResetDay(pass, d)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]"
                        >
                          Day {d} used · Tap to reset
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#eef2ec]">
                    {usedDays.length > 0 && (
                      <button
                        type="button"
                        onClick={() => askResetPass(pass)}
                        className="h-8 px-2.5 rounded-lg border border-[#e2e8df] text-xs text-[#4a5750] inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => askDeletePass(pass)}
                      className="h-8 px-2.5 rounded-lg border border-[#f2cfd3] bg-[#fdf2f3] text-xs text-[#b43c48] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
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
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        aria-label={allSelected ? 'Deselect all VIP passes' : 'Select all VIP passes'}
                        className="text-[#65726a] hover:text-[#26352e]"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#426b52]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Guest & note</th>
                    <th className="py-3 px-4">Valid date</th>
                    <th className="py-3 px-4">Gate usage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec] text-xs">
                  {filteredPasses.map((pass) => {
                    const usedDays = passUsage[pass.id] || [];
                    const isEditingDate = editingPassId === pass.id;

                    return (
                      <tr key={pass.id} className="hover:bg-[#fafcf9] transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSelect(pass.id)}
                            aria-label={`Select pass for ${pass.participant_name || 'Guest'}`}
                            className="text-[#65726a] hover:text-[#26352e]"
                          >
                            {selectedIds.has(pass.id) ? (
                              <CheckSquare className="w-4 h-4 text-[#426b52]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#fef7e6] border border-[#f5e3b3] text-[#a16207] flex items-center justify-center shrink-0">
                              <Crown className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-medium text-[#26352e]">
                                {pass.participant_name || 'Unnamed guest'}
                              </p>
                              <p className="text-[11px] text-[#65726a]">
                                {pass.notes || 'VIP guest'} ·{' '}
                                <span className="font-mono">{pass.pass_token.slice(0, 10)}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isEditingDate ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="h-7 px-2 text-[11px] rounded border border-[#426b52] bg-white text-[#26352e]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDate(pass.id)}
                                className="px-2 py-1 rounded bg-[#426b52] text-white text-[11px]"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPassId(null)}
                                className="px-2 py-1 rounded border border-[#e2e8df] text-[#65726a] text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-[#4a5750]">
                              <Calendar className="w-3.5 h-3.5 text-[#8a968e]" />
                              <span>{pass.valid_date || 'Any event day'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPassId(pass.id);
                                  setEditDateValue(pass.valid_date || '');
                                }}
                                aria-label="Edit valid date"
                                className="p-1 rounded text-[#8a968e] hover:text-[#26352e] hover:bg-[#eff4ed]"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {usedDays.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {usedDays.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => askResetDay(pass, d)}
                                  title={`Click to reset Day ${d} scan`}
                                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a] transition-colors"
                                >
                                  Day {d} used ×
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246]">
                              Ready to scan
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQrPass(pass)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#426b52]" />
                              QR
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(pass, 'pdf')}
                              title="Download single pass PDF"
                              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5 text-[#65726a]" />
                              PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(pass, 'a4')}
                              title="Print on A4 Landscape (2 per page)"
                              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1"
                            >
                              A4
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(pass, 'jpg')}
                              title="Download JPG image"
                              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1"
                            >
                              JPG
                            </button>

                            {usedDays.length > 0 && (
                              <button
                                type="button"
                                onClick={() => askResetPass(pass)}
                                title="Reset pass scan history"
                                aria-label="Reset pass scan history"
                                className="p-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] hover:text-[#26352e]"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => askDeletePass(pass)}
                              title="Delete VIP pass"
                              aria-label={`Delete VIP pass for ${pass.participant_name || 'Guest'}`}
                              className="p-1.5 rounded-lg border border-[#f2cfd3] bg-[#fdf2f3] hover:bg-[#fbe6e8] text-[#b43c48]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Create single VIP pass modal */}
      <EntryPassDialog
        open={showCreateModal}
        title="Create a new VIP pass"
        subtitle="Enter guest name and date to create a VIP pass."
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={handleCreateVIP} className="space-y-4">
          <div>
            <label htmlFor="vip-name" className="block text-xs font-medium text-[#26352e] mb-1.5">
              Guest name
            </label>
            <input
              id="vip-name"
              type="text"
              autoFocus
              value={newVIP.name}
              onChange={(e) => setNewVIP((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Dr. Anjali Mehta (leave blank for unnamed pass)"
              className="w-full h-10 sm:h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="vip-notes" className="block text-xs font-medium text-[#26352e] mb-1.5">
              Note or role (optional)
            </label>
            <input
              id="vip-notes"
              type="text"
              value={newVIP.notes}
              onChange={(e) => setNewVIP((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Chief Guest, Sponsor, Alumni"
              className="w-full h-10 sm:h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="vip-date" className="block text-xs font-medium text-[#26352e] mb-1.5">
              Valid date (optional)
            </label>
            <input
              id="vip-date"
              type="date"
              value={newVIP.validDate}
              onChange={(e) => setNewVIP((p) => ({ ...p, validDate: e.target.value }))}
              className="w-full h-10 sm:h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
            />
            <p className="text-[11px] text-[#65726a] mt-1">
              Leave empty if the guest can enter on any event day.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eef2ec]">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e2e8df] bg-white text-[#26352e] hover:bg-[#f6f8f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#426b52] hover:bg-[#365a44] text-white disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create VIP pass'}
            </button>
          </div>
        </form>
      </EntryPassDialog>

      {/* Bulk import modal */}
      <EntryPassDialog
        open={showBulkModal}
        title="Import VIP guests from Excel"
        subtitle="Upload an Excel or CSV file with a 'name' column and optional 'notes' column."
        onClose={() => setShowBulkModal(false)}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#fafbf9] border border-[#e2e8df]">
            <span className="text-xs text-[#4a5750]">Need an example file?</span>
            <button
              type="button"
              onClick={downloadSampleExcel}
              className="text-xs font-medium text-[#426b52] hover:underline inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download sample Excel
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26352e] mb-1.5">Choose spreadsheet</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-xs text-[#4a5750] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[#e2e8df] file:text-xs file:font-medium file:bg-[#fafbf9] file:text-[#26352e] hover:file:bg-[#eff4ed]"
            />
          </div>

          {importData.length > 0 && (
            <p className="text-xs font-medium text-[#426b52] bg-[#eff4ed] px-3 py-2 rounded-lg">
              Ready to create {importData.length} VIP passes.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eef2ec]">
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e2e8df] bg-white text-[#26352e] hover:bg-[#f6f8f4]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!importData.length || processingBulk}
              onClick={handleProcessBulk}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#426b52] hover:bg-[#365a44] text-white disabled:opacity-45"
            >
              {processingBulk ? 'Creating passes...' : `Create ${importData.length || ''} passes`}
            </button>
          </div>
        </div>
      </EntryPassDialog>

      {/* QR Code preview modal */}
      <EntryPassDialog
        open={Boolean(qrPass)}
        title={qrPass?.participant_name || 'VIP Pass QR Code'}
        subtitle={qrPass?.notes || 'Scan this QR code at the entry gate.'}
        onClose={() => setQrPass(null)}
        maxWidthClass="w-full max-w-md"
      >
        {qrPass && (
          <div className="flex flex-col items-center">
            <QRCodeGenerator
              passToken={qrPass.pass_token}
              participantName={qrPass.participant_name}
              passType={qrPass.pass_type}
              size={220}
            />
          </div>
        )}
      </EntryPassDialog>

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          tone={confirmState.tone}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
