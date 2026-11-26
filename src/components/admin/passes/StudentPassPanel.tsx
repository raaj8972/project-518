import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../lib/supabase';
import { passService } from '../../../services/passService';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../ToastProvider';
import { ConfirmDialog, EntryPassDialog } from './EntryPassDialog';
import { generateA4SheetPDF, generatePassPDF } from '../../../utils/pdfGenerator';

interface StudentPassPanelProps {
  onCountChange?: (count: number) => void;
  onOpenEditor?: () => void;
}

export const StudentPassPanel: React.FC<StudentPassPanelProps> = ({ onCountChange, onOpenEditor }) => {
  const { siteSettings, securitySettings, updateSecuritySettings } = useData();
  const { push: toast } = useToast();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'missing'>('all');
  const [processingState, setProcessingState] = useState({
    active: false,
    title: '',
    progress: 0,
    item: '',
  });
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);

  const [venue, setVenue] = useState(securitySettings?.venue || 'Main Arena');
  const [eventDates, setEventDates] = useState<string[]>(
    securitySettings?.event_dates || ['2024-03-20', '2024-03-21', '2024-03-22']
  );
  const [isSaving, setIsSaving] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'danger' | 'primary';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    if (securitySettings) {
      setVenue(securitySettings.venue || 'Main Arena');
      if (securitySettings.event_dates?.length) {
        setEventDates(securitySettings.event_dates);
      }
    }
  }, [securitySettings]);

  const batchOptions: string[] = (siteSettings as any)?.registration_participant_types || [];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: profileData, error: profileErr }, { data: passData, error: passErr }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .order('is_approved', { ascending: false })
            .order('full_name', { ascending: true }),
          supabase.from('entry_passes').select('user_id, day_number, valid_date, venue, pass_token, participant_name, pass_type, is_active, is_used'),
        ]);

      if (profileErr) throw profileErr;
      if (passErr) throw passErr;

      const list = profileData || [];
      setProfiles(list);
      setPasses(passData || []);
      onCountChange?.(list.length);
    } catch (err: any) {
      toast({ message: 'Could not load student passes: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const passesByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of passes) {
      if (!p.user_id) continue;
      const arr = map.get(p.user_id) || [];
      arr.push(p);
      map.set(p.user_id, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    }
    return map;
  }, [passes]);

  const stats = useMemo(() => {
    const inBatch =
      selectedBatch === 'all' ? profiles : profiles.filter((p) => p.batch === selectedBatch);
    const total = inBatch.length;
    const approved = inBatch.filter((p) => p.is_approved).length;
    const withPasses = inBatch.filter((p) => (passesByUser.get(p.id)?.length || 0) > 0).length;
    const needsPass = inBatch.filter(
      (p) => p.is_approved && (passesByUser.get(p.id)?.length || 0) === 0
    ).length;

    return { total, approved, withPasses, needsPass };
  }, [profiles, passesByUser, selectedBatch]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (selectedBatch !== 'all' && p.batch !== selectedBatch) return false;
      const hasPass = (passesByUser.get(p.id)?.length || 0) > 0;
      if (statusFilter === 'ready' && !hasPass) return false;
      if (statusFilter === 'missing' && hasPass) return false;
      if (!q) return true;
      return (
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.batch || '').toLowerCase().includes(q)
      );
    });
  }, [profiles, passesByUser, selectedBatch, statusFilter, searchQuery]);

  const handleGenerateIndividual = async (profile: any) => {
    try {
      setProcessingState({
        active: true,
        title: `Creating pass for ${profile.full_name || 'student'}...`,
        progress: 20,
        item: 'Generating QR codes for all event days',
      });
      await passService.generatePassForUser(profile.id, profile);
      toast({ message: `Pass created for ${profile.full_name}`, type: 'success' });
      fetchData();
    } catch (e: any) {
      toast({ message: e.message || 'Could not create pass', type: 'error' });
    } finally {
      setProcessingState({ active: false, title: '', progress: 0, item: '' });
    }
  };

  const askGenerateBulk = () => {
    const targetLabel = selectedBatch === 'all' ? 'all approved students' : `approved ${selectedBatch} students`;
    setConfirmState({
      open: true,
      title: 'Create student passes',
      message: `This will create 3-day entry passes for ${targetLabel} who do not have a pass yet.`,
      confirmLabel: 'Create passes',
      tone: 'primary',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          setProcessingState({ active: true, title: 'Creating student passes...', progress: 0, item: '' });
          const result = await passService.generatePassesForAllUsers(selectedBatch, (progress) => {
            setProcessingState((prev) => ({
              ...prev,
              progress: progress.percentage,
              item: progress.message,
            }));
          });
          toast({ message: `Passes created for ${result.count} students.`, type: 'success' });
          fetchData();
        } catch (e: any) {
          toast({ message: e.message || 'Could not create passes.', type: 'error' });
        } finally {
          setProcessingState({ active: false, title: '', progress: 0, item: '' });
        }
      },
    });
  };

  const askRevokeSingleDay = (profile: any, dayNumber: number) => {
    setConfirmState({
      open: true,
      title: `Remove Day ${dayNumber} pass`,
      message: `Remove the Day ${dayNumber} pass for ${profile.full_name}? The student will no longer be able to use this QR code at the gate.`,
      confirmLabel: 'Remove pass',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          setLoading(true);
          await passService.revokePass(profile.id, dayNumber);
          toast({ message: `Day ${dayNumber} pass removed for ${profile.full_name}`, type: 'success' });
          fetchData();
        } catch (e: any) {
          toast({ message: e.message || 'Could not remove pass', type: 'error' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const askRevokeBatch = () => {
    if (selectedBatch === 'all') {
      toast({ message: 'Please pick a specific batch first.', type: 'error' });
      return;
    }
    setConfirmState({
      open: true,
      title: `Remove all ${selectedBatch} passes`,
      message: `This will remove all entry passes for students in ${selectedBatch}. You can create new passes later if needed.`,
      confirmLabel: 'Remove all',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          setLoading(true);
          const result = await passService.revokePassesByBatch(selectedBatch);
          toast({ message: `Removed passes for ${result.count} students in ${selectedBatch}.`, type: 'success' });
          fetchData();
        } catch (e: any) {
          toast({ message: e.message || 'Could not remove batch passes.', type: 'error' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSecuritySettings({ venue, event_dates: eventDates });
      toast({ message: 'Dates and venue saved', type: 'success' });
      setShowConfig(false);
    } catch (err: any) {
      toast({ message: 'Could not save settings: ' + err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadStudentPasses = async (
    targetPasses: any[],
    studentName: string,
    mode: 'pdf' | 'a4'
  ) => {
    const config = securitySettings?.pass_template_config || {};
    if (Object.keys(config).length === 0) {
      toast({
        message: 'Upload a pass design in the Pass Editor tab first.',
        type: 'info',
      });
      onOpenEditor?.();
      return;
    }
    const dates = securitySettings?.event_dates || [];
    const payload = targetPasses.map((p) => ({
      id: p.pass_token,
      token: p.pass_token,
      type: p.pass_type || 'student',
      name: p.participant_name || studentName,
      valid_date: p.valid_date || undefined,
      includeName: true,
    }));
    const days =
      dates.length > 0
        ? dates.map((_, i) => i)
        : Object.keys(config).map((k) => parseInt(k.replace('day_', ''), 10));

    try {
      toast({ message: mode === 'a4' ? 'Preparing A4 Landscape (2 per page)...' : 'Preparing PDF...', type: 'info' });
      if (mode === 'a4') {
        await generateA4SheetPDF({
          passes: payload,
          templateConfigs: config,
          selectedDays: days,
          eventDates: dates,
          includeName: true,
        });
      } else {
        await generatePassPDF({
          passes: payload,
          templateConfigs: config,
          selectedDays: days,
          eventDates: dates,
          includeName: true,
        });
      }
      toast({ message: 'Download ready!', type: 'success' });
    } catch {
      toast({ message: 'Could not generate pass PDF', type: 'error' });
    }
  };

  const handleBulkPrintFilteredA4 = async () => {
    const allReady = filteredList.flatMap((p) => {
      const uPasses = passesByUser.get(p.id) || [];
      return uPasses.map((up) => ({ ...up, participant_name: p.full_name || up.participant_name }));
    });
    if (!allReady.length) {
      toast({ message: 'No student passes ready to print in this list.', type: 'error' });
      return;
    }
    await handleDownloadStudentPasses(allReady, 'Students', 'a4');
  };

  return (
    <div className="space-y-5">
      {/* Apple Wallet–style Pass Modal */}
      <EntryPassDialog
        open={Boolean(selectedPass)}
        title="Digital Entry Pass"
        subtitle="Apple Wallet pass view"
        onClose={() => setSelectedPass(null)}
        maxWidthClass="w-full max-w-sm"
      >
        {selectedPass && (
          <div className="space-y-4">
            <div className="rounded-[24px] overflow-hidden bg-gradient-to-b from-[#17231d] via-[#1f3027] to-[#131d18] text-white shadow-xl border border-white/10">
              {/* Top Wallet Strip */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#a8c5b1]">
                    RICORRENZA 2026
                  </p>
                  <p className="text-xs font-medium text-white/90 mt-0.5">
                    {selectedPass.pass_type || 'General Admission'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold tracking-wide">
                  {selectedPass.day_number ? `DAY ${selectedPass.day_number}` : 'PASS'}
                </span>
              </div>

              {/* Holder Info */}
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Pass holder</p>
                  <p className="text-lg font-semibold leading-tight mt-0.5">
                    {selectedPass.participant_name || 'Student'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/50">Valid date</p>
                    <p className="font-medium text-white/95 mt-0.5">
                      {selectedPass.valid_date || 'Any event day'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/50">Venue</p>
                    <p className="font-medium text-white/95 mt-0.5 truncate">
                      {selectedPass.venue || venue || 'Main Arena'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Notch Divider */}
              <div className="relative flex items-center py-2">
                <div className="w-4 h-4 rounded-full bg-white -ml-2" />
                <div className="flex-1 border-t border-dashed border-white/20 mx-2" />
                <div className="w-4 h-4 rounded-full bg-white -mr-2" />
              </div>

              {/* Crisp White Large QR Surface */}
              <div className="px-5 pb-5 pt-2 flex flex-col items-center">
                <div className="bg-white p-3.5 rounded-2xl shadow-md">
                  <QRCodeSVG
                    value={
                      selectedPass.valid_date && !selectedPass.pass_token.includes('|')
                        ? `${selectedPass.pass_token}|${selectedPass.valid_date}`
                        : selectedPass.pass_token
                    }
                    size={210}
                    level="H"
                    marginSize={0}
                  />
                </div>
                <p className="text-[11px] text-white/65 mt-3">
                  Show this QR code at the gate for entry
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleDownloadStudentPasses(
                    [selectedPass],
                    selectedPass.participant_name || 'Student',
                    'pdf'
                  )
                }
                className="h-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#65726a]" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDownloadStudentPasses(
                    [selectedPass],
                    selectedPass.participant_name || 'Student',
                    'a4'
                  )
                }
                className="h-9 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print A4
              </button>
            </div>
          </div>
        )}
      </EntryPassDialog>

      {/* Progress banner */}
      {processingState.active && (
        <div className="bg-[#eff4ed] border border-[#cde0cb] rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Loader2 className="w-5 h-5 text-[#426b52] animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#26352e]">{processingState.title}</p>
              {processingState.item && (
                <p className="text-xs text-[#65726a] truncate">{processingState.item}</p>
              )}
            </div>
          </div>
          <span className="text-xs font-semibold text-[#426b52] bg-white px-2.5 py-1 rounded-md border border-[#cde0cb] shrink-0">
            {Math.round(processingState.progress)}%
          </span>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#e2e8df] rounded-xl p-4">
          <p className="text-xs text-[#65726a]">Total students</p>
          <p className="text-2xl font-semibold text-[#26352e] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-4">
          <p className="text-xs text-[#65726a]">Approved students</p>
          <p className="text-2xl font-semibold text-[#26352e] mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-4">
          <p className="text-xs text-[#65726a]">Passes ready</p>
          <p className="text-2xl font-semibold text-[#426b52] mt-1">{stats.withPasses}</p>
        </div>
        <div className="bg-white border border-[#e2e8df] rounded-xl p-4">
          <p className="text-xs text-[#65726a]">Needs a pass</p>
          <p className="text-2xl font-semibold text-[#b45309] mt-1">{stats.needsPass}</p>
        </div>
      </div>

      {/* Controls & filters (phone-friendly) */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name or phone..."
                className="w-full h-10 sm:h-9 pl-9 pr-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] placeholder:text-[#86938b] focus:outline-none focus:border-[#426b52] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex gap-2">
              <div className="relative sm:w-44">
                <Filter className="w-3.5 h-3.5 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Filter by batch"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full h-10 sm:h-9 pl-8 pr-6 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
                >
                  <option value="all">All batches</option>
                  {batchOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <select
                aria-label="Filter by pass status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 sm:h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
              >
                <option value="all">All statuses</option>
                <option value="ready">Pass ready</option>
                <option value="missing">No pass yet</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="h-10 sm:h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
            >
              <Calendar className="w-3.5 h-3.5 text-[#65726a]" />
              Dates & venue
            </button>

            <button
              type="button"
              onClick={handleBulkPrintFilteredA4}
              disabled={loading || stats.withPasses === 0}
              className="h-10 sm:h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none disabled:opacity-45"
            >
              <Printer className="w-3.5 h-3.5 text-[#426b52]" />
              Print A4 (2/page)
            </button>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              aria-label="Refresh student list"
              className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] hover:text-[#26352e] inline-flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={askGenerateBulk}
              disabled={loading || processingState.active || stats.needsPass === 0}
              className="h-10 sm:h-9 px-3.5 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-45"
            >
              <Plus className="w-4 h-4" />
              {selectedBatch === 'all' ? 'Create missing passes' : `Create ${selectedBatch} passes`}
            </button>

            {selectedBatch !== 'all' && stats.withPasses > 0 && (
              <button
                type="button"
                onClick={askRevokeBatch}
                disabled={loading || processingState.active}
                className="h-10 sm:h-9 px-3 rounded-lg border border-[#f2cfd3] bg-[#fdf2f3] hover:bg-[#fbe6e8] text-[#b43c48] text-xs font-medium inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove {selectedBatch}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Phone Cards + Desktop Table */}
      {loading ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <Loader2 className="w-6 h-6 text-[#426b52] animate-spin mx-auto mb-2" />
          Loading student passes...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 px-4 text-center text-xs text-[#65726a]">
          <Users className="w-8 h-8 text-[#a3b0a7] mx-auto mb-2" />
          <p className="font-medium text-[#26352e]">No students found</p>
          <p className="text-xs text-[#65726a] mt-0.5">Try clearing your search or changing the filter.</p>
        </div>
      ) : (
        <>
          {/* Mobile Phone Cards */}
          <div className="md:hidden space-y-3">
            {filteredList.map((profile) => {
              const userPasses = passesByUser.get(profile.id) || [];
              const hasPass = userPasses.length > 0;
              const initials = (profile.full_name || 'S')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={profile.id}
                  className="bg-white border border-[#e2e8df] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#eaf0e5] border border-[#dbe4d6] text-[#426b52] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#26352e] truncate">
                          {profile.full_name || 'Unnamed student'}
                        </p>
                        <p className="text-[11px] text-[#65726a] truncate">
                          {profile.batch || 'No batch'} · {profile.phone || 'No phone'}
                        </p>
                      </div>
                    </div>

                    {hasPass ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246] shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#b45309] shrink-0">
                        <Clock className="w-3 h-3" />
                        No pass
                      </span>
                    )}
                  </div>

                  {hasPass && (
                    <div className="flex flex-wrap gap-1.5">
                      {userPasses.map((p) => (
                        <span
                          key={`${profile.id}-${p.day_number}`}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border border-[#e2e8df] bg-[#fafbf9] text-[11px] text-[#26352e]"
                        >
                          <span>
                            Day {p.day_number}
                            {p.valid_date ? ` · ${p.valid_date}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => askRevokeSingleDay(profile, p.day_number)}
                            aria-label={`Remove Day ${p.day_number} pass`}
                            className="p-0.5 rounded text-[#8a968e] hover:text-[#b43c48]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {!hasPass ? (
                    <button
                      type="button"
                      onClick={() => handleGenerateIndividual(profile)}
                      className="w-full h-10 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Create pass
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadStudentPasses(userPasses, profile.full_name, 'pdf')
                        }
                        className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5 text-[#65726a]" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadStudentPasses(userPasses, profile.full_name, 'a4')
                        }
                        className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center"
                      >
                        A4 Print
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPass(userPasses[0])}
                        className="h-9 rounded-lg border border-[#e2e8df] bg-white text-[#26352e] text-xs font-medium inline-flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#426b52]" />
                        QR
                      </button>
                    </div>
                  )}
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
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Pass days</th>
                    <th className="py-3 px-4">Pass status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec] text-xs">
                  {filteredList.map((profile) => {
                    const userPasses = passesByUser.get(profile.id) || [];
                    const hasPass = userPasses.length > 0;
                    const initials = (profile.full_name || 'S')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={profile.id} className="hover:bg-[#fafcf9] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#eaf0e5] border border-[#dbe4d6] text-[#426b52] font-semibold text-[11px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-[#26352e]">{profile.full_name || 'Unnamed student'}</p>
                              <p className="text-[11px] text-[#65726a]">{profile.phone || 'No phone number'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#4a5750]">{profile.batch || '—'}</td>

                        <td className="py-3.5 px-4">
                          {profile.is_approved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246]">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#5c6660]">
                              <Clock className="w-3 h-3" />
                              Not approved
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {hasPass ? (
                            <div className="flex flex-wrap gap-1.5">
                              {userPasses.map((p) => (
                                <span
                                  key={`${profile.id}-${p.day_number}`}
                                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md border border-[#e2e8df] bg-[#fafbf9] text-[11px] text-[#26352e]"
                                >
                                  <span>
                                    Day {p.day_number}
                                    {p.valid_date ? ` · ${p.valid_date}` : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => askRevokeSingleDay(profile, p.day_number)}
                                    title={`Remove Day ${p.day_number} pass`}
                                    aria-label={`Remove Day ${p.day_number} pass for ${profile.full_name}`}
                                    className="p-0.5 rounded text-[#8a968e] hover:text-[#b43c48] hover:bg-[#fdf2f3]"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8a968e]">No passes yet</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {hasPass ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#426b52]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pass ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b45309]">
                              <Clock className="w-3.5 h-3.5" />
                              Not created
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {!hasPass && (
                              <button
                                type="button"
                                onClick={() => handleGenerateIndividual(profile)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#eff4ed] hover:bg-[#e1ece0] text-[#365a44] text-[11px] font-medium"
                              >
                                Create pass
                              </button>
                            )}
                            {hasPass && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadStudentPasses(userPasses, profile.full_name, 'pdf')
                                  }
                                  title="Download individual PDF"
                                  className="px-2 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3 text-[#65726a]" />
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadStudentPasses(userPasses, profile.full_name, 'a4')
                                  }
                                  title="Print individual pass on A4 Landscape"
                                  className="px-2 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium"
                                >
                                  A4
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              disabled={!hasPass}
                              onClick={() => setSelectedPass(userPasses[0])}
                              className="px-2.5 py-1.5 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#26352e] text-[11px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#426b52]" />
                              QR
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

      {/* Dates & Venue modal */}
      <EntryPassDialog
        open={showConfig}
        title="Pass dates and venue"
        subtitle="Set the event location and the 3 festival dates shown on student passes."
        onClose={() => setShowConfig(false)}
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label htmlFor="ep-venue" className="block text-xs font-medium text-[#26352e] mb-1.5">
              Venue name
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="ep-venue"
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Main Arena"
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx}>
                <label htmlFor={`ep-day-${idx}`} className="block text-xs font-medium text-[#26352e] mb-1.5">
                  Day {idx + 1} date
                </label>
                <input
                  id={`ep-day-${idx}`}
                  type="date"
                  value={eventDates[idx] || ''}
                  onChange={(e) => {
                    const next = [...eventDates];
                    next[idx] = e.target.value;
                    setEventDates(next);
                  }}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eef2ec]">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e2e8df] bg-white text-[#26352e] hover:bg-[#f6f8f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#426b52] hover:bg-[#365a44] text-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
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
