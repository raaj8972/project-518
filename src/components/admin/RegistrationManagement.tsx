import { ParticipantEmailStatus } from './participants/ParticipantEmailStatus';
import { CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, DownloadIcon, EnvelopeClosedIcon, EyeOpenIcon, FileTextIcon, MixerHorizontalIcon, ReloadIcon, ResetIcon, TrashIcon, MagnifyingGlassIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { ParticipantMenu, ParticipantMetrics, ParticipantStatus, ParticipantLoading, participantDate, participantInitials } from './participants/ParticipantWorkspace';
import { EventAdminDialog } from './events/EventAdminDialog';
import ParticipationVerification from '../shared/ParticipationVerification';
import '../../styles/EventsAdmin.css';
import { PrivateMediaImage, PrivateMediaLink } from '../PrivateMedia';
import { usePdfBranding } from '../../hooks/usePdfBranding';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, Filter, Download, RefreshCw,
  CheckCircle, XCircle,
  Mail, Eye, Loader2, AlertTriangle,
  X,
  Pencil, Check, Image as ImageIcon
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { adminDataService } from '../../services/adminDataService';
import { dualRead, dualUpdate } from '../../lib/dualDb';
import { exportRegistrationsToExcel } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, RegistrationColumnKey } from '../../utils/reportExport';
import {
  exportRegistrationsToPDF,
  exportRegistrationsByEvent as exportRegistrationsByEventPDF,
  exportRegistrationsByStatus as exportRegistrationsByStatusPDF,
  exportEventSummaryPDF
} from '../../utils/pdfExport';
import ExportPdfButton from '../../components/ExportPdfButton';
import { useRegistrations } from '../../hooks/useRegistrations';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';
import { getAccessibleEventWhatsAppGroups } from '../../services/eventWhatsAppGroups';

// Inline Editable Row Component for details
const EditableRow = ({
  label,
  value,
  onSave,
  canEdit = false,
  multiline = false,
  className = ''
}: {
  label: string,
  value: string | number | null | undefined,
  onSave: (val: string) => Promise<boolean>,
  canEdit?: boolean,
  multiline?: boolean,
  className?: string
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTempValue(String(value || ''));
  }, [value]);

  const handleSave = async () => {
    if (tempValue.trim() === String(value || '').trim()) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const success = await onSave(tempValue);
      if (success) setIsEditing(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex items-start gap-2 group min-h-[24px] text-sm ${className}`}>
      <strong className="text-gray-400 w-[140px] flex-shrink-0 pt-0.5">{label}:</strong>
      {isEditing ? (
        <div className="flex-1 flex items-start gap-2 max-w-md">
          {multiline ? (
             <textarea
               className="flex-1 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border-white/10 min-h-[60px] text-gray-200 bg-white/5 placeholder-gray-500"
               value={tempValue}
               onChange={e => setTempValue(e.target.value)}
             />
          ) : (
             <input
               type="text"
               className="flex-1 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border-white/10 text-gray-200 bg-white/5 placeholder-gray-500"
               value={tempValue}
               onChange={e => setTempValue(e.target.value)}
             />
          )}
          <div className="flex flex-col gap-1 pt-0.5">
            <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-800 p-0.5 rounded hover:bg-green-50" title="Save">
               {saving ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}
            </button>
            <button onClick={() => { setIsEditing(false); setTempValue(String(value || '')); }} className="text-red-600 hover:text-red-800 p-0.5 rounded hover:bg-red-50" title="Cancel">
               <X size={16}/>
            </button>
          </div>
        </div>
      ) : (
         <div className="flex-1 flex items-center gap-2 min-h-[24px]">
            <span className="text-gray-200 break-words">{value || <span className="text-gray-500 italic">None</span>}</span>
            {canEdit && (
               <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-indigo-400 p-1 rounded hover:bg-white/5" title="Edit">
                  <Pencil size={12} />
               </button>
            )}
         </div>
      )}
    </div>
  );
};
// Removed static jsPDF + autotable imports; will lazy load to reduce initial bundle & avoid side-effect race

// Defensive helper: some old rows may store team_members as JSON string or null
const safeTeamMembers = (r: any): any[] => {
  const tm = (r as any)?.team_members;
  if (Array.isArray(tm)) return tm;
  if (typeof tm === 'string') {
    try {
      const parsed = JSON.parse(tm);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

// --- Processing Overlay Component ---
const ProcessingOverlay: React.FC<{ title: string; progress: number; currentItem?: string }> = ({ title, progress, currentItem }) => {
  return (
    <div className="fixed top-24 right-6 z-[100] w-96 max-w-[90vw] animate-in fade-in slide-in-from-right-8 duration-500 pointer-events-auto">
      <div className="rico-glass-card p-5 rounded-2xl shadow-2xl border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
              <Loader2 className="animate-spin text-indigo-400" size={18} />
              {title}
            </h3>
            <span className="text-indigo-400 font-black bg-indigo-500/10 px-2 py-0.5 rounded text-[10px] tabular-nums uppercase tracking-widest border border-indigo-500/20">{Math.round(progress)}%</span>
          </div>

          {currentItem && <p className="text-gray-400 mb-4 text-xs font-bold truncate pl-6.5 italic uppercase tracking-tighter opacity-80">{currentItem}</p>}

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-gray-400 mt-1.5">Processing in background...</p>
        </div>
      </div>
    </div>
  );
};

interface RegistrationManagementProps {
  coordinatorMode?: boolean;
  coordinatorEventId?: number;
}

export function RegistrationManagement({ coordinatorMode = false, coordinatorEventId }: RegistrationManagementProps) {
  // Removed registrations, deletedRegistrations and mutation methods from useData
  const { events, siteSettings, updateSiteSettings, adminUsers, eventCoordinators, resetRegistrationIdSequence, isOwner: checkIsOwner } = useData();
  const { user } = useAuth();
  const [eventGroups, setEventGroups] = useState<Record<string, string>>({});
  useEffect(() => {
    setEventGroups({});
    if (!user && !coordinatorMode) return;
    let active = true;
    const load = () => { void getAccessibleEventWhatsAppGroups().then(groups => { if (active) setEventGroups(groups); }).catch(() => { if (active) setEventGroups({}); }); };
    load();
    const channel = supabase.channel('registration-event-groups').on('postgres_changes', { event: '*', schema: 'public', table: 'event_whatsapp_groups' }, load).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user?.id, coordinatorMode, coordinatorEventId]);

  const isOwner = useMemo(() => {
    const admin = adminUsers?.find(u => u.user_id === user?.id);
    return checkIsOwner() || admin?.role === 'owner' || user?.user_metadata?.is_super_admin;
  }, [user, adminUsers, checkIsOwner]);

  const { push } = useToast();

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const location = useLocation();

  // Filters State
  const [selectedEvent, setSelectedEvent] = useState<string>(
    coordinatorMode && coordinatorEventId ? String(coordinatorEventId) : 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Registrations using new Hook
  const {
    registrations,
    count,
    isLoading: isRegistrationsLoading,
    error: registrationsError,
    refresh: refreshRegistrations,
    stats, statsLoading, statsError, refreshStats
  } = useRegistrations({
    page,
    pageSize,
    filters: {
      event: selectedEvent,
      status: selectedStatus,
      batch: selectedBatch,
      search: searchTerm,
      viewMode
    }
  });

  // Mutations Hook
  const {
    isMutating,
    updateStatus: updateRegistrationStatus,
    deleteRegistration,
    restoreRegistration,
    permanentDelete: permanentDeleteRegistration,
    bulkApprove: bulkApproveRegistrations,
    bulkReject: bulkRejectRegistrations,
    bulkDelete: bulkDeleteRegistrations,
    bulkRestore: bulkRestoreRegistrations,
    bulkPermanentDelete,
    updateBatchGlobally
  } = useRegistrationMutations(() => {
    refreshRegistrations();
  });

  // const [bulkSaving, setBulkSaving] = useState(false);
  // const [bulkRejecting, setBulkRejecting] = useState(false);

  // Processing State for Progress Bar
  const [processingState, setProcessingState] = useState<{ active: boolean, title: string, progress: number, item?: string }>({
    active: false, title: '', progress: 0
  });

  const [emailProvider, setEmailProvider] = useState<'smtp' | 'resend'>('smtp'); // Uses the configured server-side SMTP host
  const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);
  useEffect(() => {
    if (coordinatorMode) return;
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    setSelectedStatus(status && ['pending', 'approved', 'rejected'].includes(status) ? status : 'all');
    setSearchTerm(params.get('search') || '');
    setExpandedRegistration(params.get('registration'));
    setPage(1);
  }, [location.search, coordinatorMode]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]); // New state for logs
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [emailStatusState, setEmailStatusState] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Email status tracking: map registration ID to email sent status
  const [emailStatusMap, setEmailStatusMap] = useState<Record<string, { sent: boolean; count: number }>>({})

  // Download handler for participant photos
  const downloadPhoto = async (photoUrl: string, participantName: string) => {
    const result = await adminDataService.downloadPhoto(photoUrl, participantName);
    if (!result.success) {
      push({ message: result.message, type: 'error' });
    } else {
      push({ message: result.message, type: 'success' });
    }
  };
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<RegistrationColumnKey[]>(EXPORT_PRESETS.full);
  const [exportPreset, setExportPreset] = useState<string>('full');
  // Institution visibility controls (moved from Site Settings into Registration admin)
  const [registrationInstitutionVisible, setRegistrationInstitutionVisible] = useState<boolean>(true);
  const [registrationInstitutionOptional, setRegistrationInstitutionOptional] = useState<boolean>(false);
  const [savingRegSettings, setSavingRegSettings] = useState<boolean>(false);
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => { setSelectedIds(new Set()); }, [page, pageSize, selectedEvent, selectedStatus, selectedBatch, searchTerm, viewMode]);
  // const [bulkDeleting, setBulkDeleting] = useState(false);
  // User option: exclude Registration ID and College/Institution specifically for PDF
  const [pdfExcludeIdCollege, setPdfExcludeIdCollege] = useState<boolean>(true);

  // Report settings
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Compute duplicates map:
  // We flag a registration as duplicate if another active registration exists
  // with the same (event_title + email) OR (event_title + phone).
  const duplicateIds = useMemo(() => {
    const dupes = new Set<string>();
    const emailMap = new Map<string, string[]>();
    const phoneMap = new Map<string, string[]>();

    // Only check active registrations (not trash)
    registrations.forEach(r => {
      // Key: Event + Email
      if (r.email) {
        const k = `${r.event_title.trim()}|${r.email.trim().toLowerCase()}`;
        if (!emailMap.has(k)) emailMap.set(k, []);
        emailMap.get(k)?.push(r.id);
      }
      // Key: Event + Phone
      if (r.phone) {
         // Normalize phone: strip spaces/dashes for comparison if needed,
         // but simple trim is safer with varying formats
        const k = `${r.event_title.trim()}|${r.phone.trim()}`;
        if (!phoneMap.has(k)) phoneMap.set(k, []);
        phoneMap.get(k)?.push(r.id);
      }
    });

    // Collect IDs that appear in groups > 1
    for (const ids of emailMap.values()) {
      if (ids.length > 1) ids.forEach(id => dupes.add(id));
    }
    for (const ids of phoneMap.values()) {
      if (ids.length > 1) ids.forEach(id => dupes.add(id));
    }
    return dupes;
  }, [registrations]);

  const branding = usePdfBranding();
  const { watermarkUrl, watermarkDataUrl, stampUrl, stampDataUrl } = branding;
  const watermarkUploading = branding.busy === 'watermark';
  const stampUploading = branding.busy === 'stamp';
  // Map registration.id -> preview URL (signed if bucket is private)
  const [photoPreviewMap, setPhotoPreviewMap] = useState<Record<string, string>>({});

  // Compute current page rows used for signing (filtered)
  const rowsNeedingPreview = useMemo(() => {
    return registrations
      .filter(r => !!(r as any).photo_url)
      .map(r => ({ id: r.id as string, url: String((r as any).photo_url) }))
  }, [registrations]);

  useEffect(() => {
    try {
      setRegistrationInstitutionVisible((siteSettings as any)?.registration_institution_visible !== false);
      setRegistrationInstitutionOptional((siteSettings as any)?.registration_institution_optional === true);
    } catch {}
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      const namesList = rowsNeedingPreview.map(r => {
        let name = '';
        try {
          const m = r.url.match(/\/storage\/v1\/object\/public\/registration-photos\/(.+)$/);
          if (m && m[1]) name = decodeURIComponent(m[1]);
        } catch {}
        if (!name) {
          const idx = r.url.indexOf('registration-photos/');
          if (idx >= 0) name = decodeURIComponent(r.url.slice(idx + 'registration-photos/'.length));
        }
        return { id: r.id, name, url: r.url };
      });

      const validNames = namesList.filter(n => !!n.name);

      // Initialize with original URLs
      namesList.forEach(n => { next[n.id] = n.url; });

      if (validNames.length > 0) {
        try {
          const { data, error } = await supabase.storage
            .from('registration-photos')
            .createSignedUrls(validNames.map(n => n.name), 60 * 60 * 24);

          if (!error && data) {
            data.forEach((signed, index) => {
              if (signed.signedUrl) {
                const originalId = validNames[index].id;
                next[originalId] = signed.signedUrl;
              }
            });
          }
        } catch (err) {
          console.error('Bulk signing failed:', err);
        }
      }
      if (!cancelled) setPhotoPreviewMap(next);
    })();
    return () => { cancelled = true; };
  }, [rowsNeedingPreview]);

  const handleWatermarkUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void branding.upload('watermark', file); };
  const handleStampUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void branding.upload('stamp', file); };
  const handleWatermarkDelete = () => { if (confirm('Remove the PDF watermark?')) void branding.remove('watermark'); };
  const handleStampDelete = () => { if (confirm('Remove the shared PDF stamp?')) void branding.remove('stamp'); };

  // Server-side filtered via useRegistrations hook
  const filteredRegistrations = registrations;


  // Get unique event titles from events context instead of registrations list
  const uniqueEvents = useMemo(() =>
    events.map(e => e.title).sort(),
    [events]
  );

  const batchOptions = useMemo(() => {
    const fromSettings = (siteSettings as any)?.registration_participant_types || [];
    const fromRegs = Array.from(new Set(registrations.map(r => r.participant_type).filter(Boolean)));
    return Array.from(new Set([...fromSettings, ...fromRegs])).sort();
  }, [siteSettings, registrations]);

  // Selection helpers
  const toggleRowSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAllVisible = () => setSelectedIds(prev => {
    const n = new Set(prev);
    const allSelected = filteredRegistrations.length > 0 && filteredRegistrations.every(r => n.has(r.id));
    if (allSelected) filteredRegistrations.forEach(r => n.delete(r.id)); else filteredRegistrations.forEach(r => n.add(r.id));
    return n;
  });
  const allVisibleSelected = filteredRegistrations.length > 0 && filteredRegistrations.every(r => selectedIds.has(r.id));

  const doBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) { push({ message: 'Select at least one row to delete.', type: 'info' }); return; }

      if (viewMode === 'trash') {
      if (!confirm(`PERMANENTLY DELETE ${ids.length} registration(s)?\n\nThis cannot be undone.`)) return;
      try {
        await bulkPermanentDelete?.(ids);
        setSelectedIds(new Set());
      }
      catch (e) { console.error(e); }
    } else {
      if (!confirm(`Move ${ids.length} registration(s) to Trash?`)) return;
      try {
        await bulkDeleteRegistrations?.(ids);
        setSelectedIds(new Set());
      }
      catch (e) { console.error(e); }
    }
  };

  const doBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) { push({ message: 'Select at least one row to restore.', type: 'info' }); return; }
    if (!confirm(`Restore ${ids.length} registration(s)?`)) return;
    try {
        await bulkRestoreRegistrations?.(ids);
        setSelectedIds(new Set());
    }
    catch (e) { console.error(e); }
  };
  // Fetch email status for all registrations (not just filtered ones to avoid flicker)
  // EXTRACTED: Made fetchEmailStatuses a stable function to call after sending emails
  const fetchEmailStatuses = React.useCallback(async () => {
    setEmailStatusState('checking');
    try {
      // Use all registrations from current view mode (active or trash)
      const sourceRegs = registrations;
      const regIds = sourceRegs.map(r => r.id);
      if (regIds.length === 0) return;

      // Fetch confirmation email logs for all registrations in current view
      const { data } = await dualRead({
        table: 'email_logs',
        in: ['registration_id', regIds],
        eq: ['template_type', 'confirmation']
      });

      // Build status map
      const statusMap: Record<string, { sent: boolean; count: number }> = {};
      data?.forEach((log: any) => {
        if (!statusMap[log.registration_id]) {
          statusMap[log.registration_id] = { sent: false, count: 0 };
        }
        if (log.status === 'sent' || log.delivery_status === 'sent' || log.delivery_status === 'delivered') {
          statusMap[log.registration_id].sent = true;
        }
        statusMap[log.registration_id].count++;
      });

      setEmailStatusMap(statusMap);
      setEmailStatusState('ready');
    } catch (err) {
      setEmailStatusState('unavailable');
      console.error('Error fetching email statuses:', err);
    }
  }, [registrations]);

  useEffect(() => {
    fetchEmailStatuses();
  }, [fetchEmailStatuses]);

  // Helper to send approval email (extracted for reuse)
  const sendApprovalEmail = async (reg: any, onProgress?: (pct: number, stage: string) => void) => {
    return adminDataService.sendApprovalEmail(reg, {
      emailProvider,
      events,
      eventCoordinators,
      watermarkDataUrl,
      stampDataUrl,
      onProgress: (p) => onProgress?.(p.pct, p.stage)
    });
  };

  const handleStatusUpdate = async (registrationId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      console.log('Updating status for registration:', registrationId, 'to:', newStatus);
      await updateRegistrationStatus(registrationId, newStatus);

      // If approved, trigger confirmation email
      if (newStatus === 'approved') {
        const reg = registrations.find(r => r.id === registrationId);
        if (reg) {
            setProcessingState({ active: true, title: 'Approving Registration', progress: 0, item: `Generating receipt for ${reg.full_name}...` });

            const result = await sendApprovalEmail(reg, (pct, stage) => {
              setProcessingState(prev => ({ ...prev, progress: pct, item: stage }));
            });

            setProcessingState({ active: false, title: '', progress: 0 });

            if (result.success) {
                push({ message: `Status updated & Email sent to ${reg.full_name}!`, type: 'success' });
                // BADGE FIX: Refresh email statuses to update badge immediately
                await fetchEmailStatuses();
            } else {
                push({ message: `Status updated, but email failed: ${result.error}`, type: 'error' });
            }
        }
      } else {
         push({ message: 'Registration status updated.', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating registration status:', error);
      push({ message: 'Failed to update registration status. Please try again.', type: 'error' });
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    // Prevent multiple delete attempts
    if (deletingIds.has(registrationId)) {
      console.log('[Delete] Already deleting registration:', registrationId);
      return;
    }

    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) {
      console.error('[Delete] Registration not found:', registrationId);
      push({ message: 'Registration not found.', type: 'error' });
      return;
    }

    const isTrash = viewMode === 'trash';
    const confirmMessage = isTrash
      ? `PERMANENTLY DELETE registration for "${registration.full_name}"?\n\nThis cannot be undone.`
      : `Move registration for "${registration.full_name}" to Trash?`;

    const confirmed = confirm(confirmMessage);
    console.log('[Delete] User confirmation:', confirmed, 'ViewMode:', viewMode);

    if (confirmed) {
      setDeletingIds(prev => new Set(prev).add(registrationId));
      try {
        console.log('[Delete] Starting deletion process for:', registrationId, 'isTrash:', isTrash);
        if (isTrash) {
          await permanentDeleteRegistration(registrationId);
          console.log('[Delete] Permanent delete successful');
          push({ message: 'Registration permanently deleted.', type: 'success' });
        } else {
          console.log('[Delete] Calling soft delete function...');
          await deleteRegistration(registrationId);
          console.log('[Delete] Soft delete successful');
          push({ message: 'Registration moved to Trash.', type: 'success' });
        }
        if (expandedRegistration === registrationId) setExpandedRegistration(null);
      } catch (error: any) {
        console.error('[Delete] Error deleting registration:', error);
        console.error('[Delete] Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });
        const errorMessage = error?.message || 'Failed to delete registration.';
        push({ message: `Failed to delete: ${errorMessage}`, type: 'error' });
      } finally {
        setDeletingIds(prev => { const n = new Set(prev); n.delete(registrationId); return n; });
      }
    }
  };

  const handleRestoreRegistration = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!confirm(`Restore registration for "${registration?.full_name || 'Unknown'}"?`)) return;

    try {
      await restoreRegistration(registrationId);
      push({ message: 'Registration restored.', type: 'success' });
    } catch (e) {
      console.error(e);
      push({ message: 'Restore failed.', type: 'error' });
    }
  };

  const handleResetSequence = async () => {
    if (!confirm('Are you sure you want to reset the Registration ID sequence to 1? This should only be done if you have deleted all registrations. If existing IDs conflict, new registrations may fail.')) return;
    try {
      if (resetRegistrationIdSequence) {
        await resetRegistrationIdSequence();
        push({ message: 'Registration ID sequence reset to 1.', type: 'success' });
      } else {
        push({ message: 'Feature not available.', type: 'error' });
      }
    } catch (e: any) {
      push({ message: 'Failed to reset sequence: ' + e.message, type: 'error' });
    }

  };


  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSendingRejection, setIsSendingRejection] = useState(false);

  const fetchEmailLogs = async (regId: string) => {
    setLogsLoading(true);
    setEmailLogs([]);
    setLogsError(false);
    try {
        const { data } = await dualRead({
            table: 'email_logs',
            eq: ['registration_id', regId],
            order: ['created_at', { ascending: false }]
        });
        setEmailLogs(data || []);
    } catch (err) {
        setLogsError(true);
        console.error('Error fetching logs:', err);
    } finally {
        setLogsLoading(false);
    }
  };

  // --- Custom Email State ---
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<'winner' | 'selection' | 'custom'>('custom');
  const [emailCustomSubject, setEmailCustomSubject] = useState('');
  const [emailCustomBody, setEmailCustomBody] = useState('');
  const [emailAdditionalData, setEmailAdditionalData] = useState<any>({});
  const [emailSending, setEmailSending] = useState(false);

  const handleOpenEmailModal = () => {
      const selectedCount = selectedIds.size;
      if (selectedCount === 0) {
          push({ message: 'Please select at least one participant to email.', type: 'info' });
          return;
      }
      setShowEmailModal(true);
      // Reset defaults
      setEmailTemplate('custom');
      setEmailCustomSubject('');
      setEmailCustomBody('');
      setEmailAdditionalData({});
  };

  const handleCopyPhones = async () => {
    const phones = new Set<string>();
    filteredRegistrations.forEach(r => {
      // Basic cleaning: remove non-numeric chars except +
      if (!r.phone) return;
      const p = String(r.phone).replace(/[^0-9+]/g, '').trim();
      if (p.length >= 10) phones.add(p);
    });

    if (phones.size === 0) {
      push({ message: 'No valid phone numbers found in current filter.', type: 'info' });
      return;
    }

    // Format as comma-separated
    const text = Array.from(phones).join(',');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        push({ message: `Copied ${phones.size} phone numbers to clipboard!`, type: 'success' });
      } else {
         // Fallback?
         prompt('Copy these numbers:', text);
      }
    } catch (e) {
      console.error(e);
      prompt('Copy these numbers:', text);
    }
  };

  const handleSendCustomEmail = async () => {
      const recipients = filteredRegistrations.filter(r => selectedIds.has(r.id));
      if (!recipients.length) return;

      try {
          setEmailSending(true);
          let sent = 0;
          let failed = 0;
          const failedIds = new Set<string>();
          let failureMessage = '';

          // Send sequentially to avoid rate limits/timeouts
          for (const reg of recipients) {
              const token = (await supabase.auth.getSession()).data.session?.access_token;
              if (token) {
                 const res = await fetch('/api/send-custom-email', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                      body: JSON.stringify({
                          registrationId: reg.id,
                          templateType: emailTemplate,
                          customSubject: emailTemplate === 'custom' ? emailCustomSubject : undefined,
                          customMessage: emailCustomBody,
                          additionalData: emailAdditionalData,
                          provider: emailProvider
                      })
                 });
                 if (res.ok) sent++;
                 else { failed++; failedIds.add(reg.id); const result = await res.json().catch(() => ({})); failureMessage = result.error || 'Email delivery failed.'; }
              } else { failed++; failedIds.add(reg.id); failureMessage = 'Your session expired. Sign in again before sending.'; }
          }

          push({ message: failed ? `Sent ${sent}; ${failed} failed. ${failureMessage}` : `Emails sent: ${sent}`, type: failed ? 'error' : 'success' });
          if (!failed) setShowEmailModal(false);
          setSelectedIds(failedIds);

      } catch (e: any) {
          console.error(e);
          push({ message: 'Failed to send batch emails.', type: 'error' });
      } finally {
          setEmailSending(false);
      }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
  };

  const confirmRejection = async () => {
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
        push({ message: 'Please provide a reason for rejection.', type: 'error'});
        return;
    }

    try {
        setIsSendingRejection(true);
        // 1. Update status
        await updateRegistrationStatus(rejectingId, 'rejected');

        // 2. Send Email
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (token) {
             const res = await fetch('/api/send-rejection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    registrationId: rejectingId,
                    reason: rejectionReason,
                    provider: emailProvider,
                    siteUrl: window.location.origin // Pass current origin for re-registration link
                })
            });

            if (!res.ok) {
                console.error('Rejection email failed');
                push({ message: 'Status updated to Rejected, but email failed.', type: 'error' });
            } else {
                push({ message: 'Registration rejected and email sent.', type: 'success' });
            }
        }

        setRejectingId(null);
        setRejectionReason('');
    } catch (e: any) {
        console.error('Rejection failed:', e);
        push({ message: 'Failed to reject registration', type: 'error' });
    } finally {
        setIsSendingRejection(false);
    }
  };

  const handleBulkApprove = async () => {
    // Determine which items are pending in the current view
    const pendingRegs = filteredRegistrations.filter(r => r.status === 'pending');

    if (!pendingRegs.length) {
      push({ message: 'No pending registrations in current filter.', type: 'info' });
      return;
    }
    if (!confirm(`Approve ${pendingRegs.length} pending registration(s)?\nThis will trigger emails for all of them.`)) return;

    try {
      const ids = pendingRegs.map(r => r.id);

      setProcessingState({ active: true, title: 'Bulk Approving...', progress: 0 });

      // Update DB status first
      await (bulkApproveRegistrations?.(ids));
      setProcessingState(prev => ({ ...prev, progress: 10, item: 'Database updated. Sending emails...' }));

      let sentCount = 0;
      const CHUNK_SIZE = 3;  // Reduced chunk size for better visual feedback

      for (let i = 0; i < pendingRegs.length; i += CHUNK_SIZE) {
          const chunk = pendingRegs.slice(i, i + CHUNK_SIZE);

          await Promise.all(chunk.map(async (reg) => {
              setProcessingState(prev => ({ ...prev, item: `Processing ${reg.full_name}...` }));
              // We don't pass granular callback for bulk to avoid flickering progress bar
              const res = await sendApprovalEmail(reg);
              if (res && res.success) sentCount++;
          }));

          const processed = Math.min(pendingRegs.length, i + CHUNK_SIZE);
          const pct = 10 + ((processed / pendingRegs.length) * 90); // Scale from 10% to 100%

          setProcessingState(prev => ({
            ...prev,
            progress: pct,
            title: `Approved ${processed}/${pendingRegs.length}`
          }));
      }

      setProcessingState({ active: false, title: '', progress: 0 });

      push({ message: `Sent ${sentCount}/${pendingRegs.length} confirmation emails.`, type: 'success' });

      // BADGE FIX: Refresh email statuses to update badges immediately
      await fetchEmailStatuses();

    } catch (e) {
      console.error(e);
      push({ message: 'Bulk approve partially failed.', type: 'error' });
    }
  };

  const handleBulkReject = async () => {
    const pending = filteredRegistrations.filter(r => r.status === 'pending').map(r => r.id);
    if (!pending.length) {
      push({ message: 'No pending registrations in current filter.', type: 'info' });
      return;
    }
    if (!confirm(`Reject ${pending.length} pending registration(s)?`)) return;
    try {
      await (bulkRejectRegistrations?.(pending));
      push({ message: `Rejected ${pending.length} registrations.`, type: 'success' });
    } catch (e) {
      console.error(e);
      push({ message: 'Bulk reject failed.', type: 'error' });
    }
  };



  // PDF export now handled by ExportPdfButton which dynamically imports the
  // heavy PDF libraries when a user triggers export. The previous helper
  // function was kept for reference but isn't used here anymore.

  const handlePresetChange = (preset: string) => {
    setExportPreset(preset);
    const cols = EXPORT_PRESETS[preset];
    if (cols) setSelectedColumns(cols);
  };

  const toggleColumn = (key: RegistrationColumnKey) => {
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };



  // Compute columns for PDF export:
  // 1. Respect "PDF: exclude ID & College" checkbox
  // 2. Respect global "Show Institution field" setting
  // 3. Ensure "Team Members" is included if not explicitly removed (to fix user issue)
  const pdfColumns = useMemo(() => {
    let cols = [...selectedColumns];

    // If user wants to exclude ID & College specifically for PDF
    if (pdfExcludeIdCollege) {
      cols = cols.filter(c => c !== 'id' && c !== 'college');
    }

    // If College is globally disabled, remove it
    if (!registrationInstitutionVisible) {
      cols = cols.filter(c => c !== 'college');
    }

    // Remove Status column from PDF as requested
    cols = cols.filter(c => c !== 'status');

    // Ensure Team Members is present if we have Team Name or Total Members,
    // unless the user has explicitly deselected it?
    // The user said "it does not show the team member information".
    // I'll add it if it's missing, but only if 'team_name' is present (implying team context).
    if (cols.includes('team_name') && !cols.includes('team_members')) {
      // Insert after total_members if possible
      const idx = cols.indexOf('total_members');
      if (idx >= 0) {
        cols.splice(idx + 1, 0, 'team_members');
      } else {
        cols.push('team_members');
      }
    }

    return cols;
  }, [selectedColumns, pdfExcludeIdCollege, registrationInstitutionVisible]);

  return (
    <div className="participants-workspace">
      {processingState.active && (
        <ProcessingOverlay
          title={processingState.title}
          progress={processingState.progress}
          currentItem={processingState.item}
        />
      )}

      <ParticipantMetrics value={selectedStatus} loading={isRegistrationsLoading || statsLoading || !!statsError} onChange={status => { setSelectedStatus(status); setPage(1); }} items={[
        { id: 'all', label: 'Total registrations', count: stats.total, description: 'Across all festival events' },
        { id: 'pending', label: 'Pending review', count: stats.pending, description: 'Ready for your decision' },
        { id: 'approved', label: 'Approved', count: stats.approved, description: 'Confirmed participants' },
        { id: 'rejected', label: 'Rejected', count: stats.rejected, description: 'Applications not approved' },
      ]} />

      <div className="participants-tools">
        <div><h2>{viewMode === 'trash' ? 'Deleted registrations' : 'Event registrations'}<small>{isRegistrationsLoading ? '…' : count}</small></h2><p>Review entries, manage teams and keep participants informed.</p></div>
        <div className="participants-tools__actions">
          <button className="participants-button is-quiet" onClick={() => { setViewMode(viewMode === 'trash' ? 'active' : 'trash'); setPage(1); }}><TrashIcon />{viewMode === 'trash' ? 'Active entries' : `Trash${stats.trash ? ` (${stats.trash})` : ''}`}</button>
          <ParticipantMenu label="More" icon={<DotsHorizontalIcon />}>
            <button onClick={() => void refreshRegistrations()}><ReloadIcon />Refresh entries</button>
            {viewMode === 'active' && <><button disabled={isMutating || !filteredRegistrations.some(r => r.status === 'pending')} onClick={handleBulkApprove}><CheckIcon />Approve pending on this page</button><button disabled={isMutating || !filteredRegistrations.some(r => r.status === 'pending')} onClick={handleBulkReject}><Cross2Icon />Reject pending on this page</button></>}
            <button onClick={handleCopyPhones}><FileTextIcon />Copy phone numbers on this page</button>
            <hr /><button onClick={() => setShowAdvancedSettings(true)}><MixerHorizontalIcon />Report & registration settings</button>
          </ParticipantMenu>
          <ParticipantMenu label="Export" icon={<DownloadIcon />} disabled={branding.loading || !!branding.busy || !!branding.error}>
            <small>Export {filteredRegistrations.length} entries on this page</small>
            <button disabled={!filteredRegistrations.length} onClick={() => exportRegistrationsToExcel(filteredRegistrations, 'registrations.xlsx')}><DownloadIcon />Excel spreadsheet</button>
            <ExportPdfButton rows={filteredRegistrations} columns={pdfColumns} filename={`registrations-${new Date().toISOString().slice(0,10)}.pdf`} className="participants-export-pdf" watermarkDataUrl={watermarkDataUrl} stampDataUrl={stampDataUrl} />
            <button disabled={!filteredRegistrations.length} onClick={() => exportRegistrationsToPDF(filteredRegistrations as any, { title: 'Event Registrations Report', watermarkDataUrl: watermarkDataUrl || undefined, stampDataUrl: stampDataUrl || undefined })}><FileTextIcon />Detailed PDF with teams</button>
            <hr /><button disabled={!filteredRegistrations.length} onClick={() => exportEventSummaryPDF(filteredRegistrations as any, { watermarkDataUrl: watermarkDataUrl || undefined, stampDataUrl: stampDataUrl || undefined })}><FileTextIcon />Event summary</button>
            <button disabled={!filteredRegistrations.length} onClick={() => exportRegistrationsByEventPDF(filteredRegistrations as any, watermarkDataUrl, stampDataUrl)}><CalendarIcon />PDF grouped by event</button>
            <button disabled={!filteredRegistrations.length} onClick={() => exportRegistrationsByStatusPDF(filteredRegistrations as any, watermarkDataUrl, stampDataUrl)}><CheckIcon />PDF grouped by status</button>
          </ParticipantMenu>
        </div>
      </div>

      {showAdvancedSettings && <EventAdminDialog title="Report & registration settings" eyebrow="Participant workspace" onClose={() => setShowAdvancedSettings(false)}><div className="participants-workspace participants-legacy p-6">
            <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200 border-t border-white/5 pt-6">
              {/* PDF Watermark & Stamp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Watermark Section */}
                <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                  <div className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wide">PDF Watermark</div>
                  {watermarkUrl ? (
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={watermarkUrl || undefined}
                        alt="Watermark preview"
                        className="h-10 w-auto opacity-50 border border-white/20 rounded"
                      />
                      <span className="text-xs text-emerald-400 font-bold">✓ Active</span>
                      <button
                        onClick={handleWatermarkDelete}
                        className="ml-auto text-xs text-red-400 hover:text-red-300 underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mb-3">No watermark set</div>
                  )}
                  <label className={`flex items-center justify-center bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:from-gray-500 hover:to-gray-600 transition-all font-bold shadow-lg ${watermarkUploading ? 'opacity-60 cursor-wait' : 'hover:-translate-y-0.5'}`}>
                    {watermarkUploading ? 'Uploading...' : 'Upload PNG/SVG'}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      onChange={handleWatermarkUpload}
                      className="hidden"
                      disabled={branding.loading || !!branding.busy || !!branding.error}
                    />
                  </label>
                </div>

                {/* Stamp Section */}
                <div className="bg-black/20 border border-white/10 rounded-xl p-4">
                  <div className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wide">PDF Stamp</div>
                  {stampUrl ? (
                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={stampUrl || undefined}
                        alt="Stamp preview"
                        className="h-10 w-auto border border-white/20 rounded"
                      />
                      <span className="text-xs text-emerald-400 font-bold">✓ Active</span>
                      <button
                        onClick={handleStampDelete}
                        className="ml-auto text-xs text-red-400 hover:text-red-300 underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mb-3">No stamp set</div>
                  )}
                  <label className={`flex items-center justify-center bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:from-amber-500 hover:to-orange-500 transition-all font-bold shadow-lg ${stampUploading ? 'opacity-60 cursor-wait' : 'hover:-translate-y-0.5'}`}>
                    {stampUploading ? 'Uploading...' : 'Upload Stamp'}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      onChange={handleStampUpload}
                      className="hidden"
                      disabled={branding.loading || !!branding.busy || !!branding.error}
                    />
                  </label>
                </div>
              </div>

              {/* Export Options */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-gray-300 uppercase tracking-wide">Export Options</div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setShowColumnModal(true)}
                    className="flex items-center bg-gray-700 text-white px-4 py-2.5 rounded-xl hover:bg-gray-600 transition-all shadow-lg text-sm font-bold"
                    title="Choose export columns & presets"
                  >
                    <Filter size={14} className="mr-2" />
                    Select Columns
                  </button>

                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pdfExcludeIdCollege}
                      onChange={(e) => setPdfExcludeIdCollege(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                    />
                    <span className="font-medium group-hover:text-white transition-colors">PDF: Exclude ID & College</span>
                  </label>
                </div>
              </div>

              {/* Owners manage profile fields in Students. Delegated registration admins retain their assigned controls. */}
              {isOwner ? <div className="owner-notice"><p>Institution field visibility and required/optional settings are managed in Students.</p><Link className="owner-button" to="/admin/student-system?section=settings">Open profile settings</Link></div> : (
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-gray-300 uppercase tracking-wide">Registration Form Settings</div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={registrationInstitutionVisible}
                      onChange={(e) => setRegistrationInstitutionVisible(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                    />
                    <span className="font-medium group-hover:text-white transition-colors">Show Institution Field</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={registrationInstitutionOptional}
                      onChange={(e) => setRegistrationInstitutionOptional(e.target.checked)}
                      disabled={!registrationInstitutionVisible}
                      className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50 disabled:opacity-40"
                    />
                    <span className="font-medium group-hover:text-white transition-colors">Make Optional</span>
                  </label>

                  <button
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold shadow-lg ${savingRegSettings ? 'opacity-60 cursor-not-allowed' : 'hover:from-amber-500 hover:to-orange-500 hover:-translate-y-0.5 transition-all'}`}
                    disabled={savingRegSettings}
                    onClick={async () => {
                      try {
                        setSavingRegSettings(true);
                        await updateSiteSettings({ registration_institution_visible: registrationInstitutionVisible, registration_institution_optional: registrationInstitutionOptional } as any);
                        push({ message: 'Settings saved successfully', type: 'success' });
                      } catch (e) {
                        console.error(e);
                        push({ message: 'Failed to save settings', type: 'error' });
                      } finally {
                        setSavingRegSettings(false);
                      }
                    }}
                  >
                    {savingRegSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
              )}

              {/* Dangerous Actions */}
              {isOwner && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Danger Zone
                  </div>
                  <button
                    onClick={handleResetSequence}
                    className="flex items-center bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 text-sm font-bold"
                    title="Reset Registration ID sequence to 1 - Only use if all registrations are deleted"
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Reset ID Sequence
                  </button>
                </div>
              )}
            </div>

        <label className="participants-field"><span>Email provider</span><select value={emailProvider} onChange={event => setEmailProvider(event.target.value as 'smtp' | 'resend')}><option value="smtp">Configured SMTP</option><option value="resend">Resend API</option></select></label>
        <ParticipantEmailStatus />
      </div></EventAdminDialog>}
      {showColumnModal && <EventAdminDialog title="PDF report columns" eyebrow="Report settings" onClose={() => setShowColumnModal(false)} footer={<><button className="event-admin-button is-secondary" onClick={() => setShowColumnModal(false)}>Close</button><button className="event-admin-button is-primary" onClick={() => { setShowColumnModal(false); push({ message: 'Report columns updated.', type: 'success' }); }}>Apply columns</button></>}><div className="participants-dialog-body"><div className="participants-template-tabs" aria-label="Column presets">{Object.keys(EXPORT_PRESETS).map(preset => <button key={preset} aria-pressed={exportPreset === preset} onClick={() => handlePresetChange(preset)}>{preset}</button>)}</div><div className="participants-column-grid">{REGISTRATION_COLUMNS.map(column => <label key={column.key}><input type="checkbox" checked={selectedColumns.includes(column.key as RegistrationColumnKey)} onChange={() => toggleColumn(column.key as RegistrationColumnKey)} /><span>{column.header}</span></label>)}</div></div></EventAdminDialog>}
      {branding.error && <div className="participants-error" role="alert"><span>{branding.error}</span><button className="participants-button" onClick={() => void branding.reload()}>Retry branding</button></div>}
      {statsError && <div className="participants-error" role="alert"><span>{statsError}</span><button className="participants-button" onClick={() => void refreshStats()}>Retry totals</button></div>}
      {registrationsError && <div className="participants-error" role="alert"><span>Registrations could not load. {registrationsError}</span><button className="participants-button" onClick={() => void refreshRegistrations()}><ReloadIcon />Retry</button></div>}
      <section className="participants-catalog" aria-label="Event registration entries" aria-busy={isRegistrationsLoading}>
        <div className="participants-filters">
          <label className="participants-field"><span>Search registrations</span><div className="participants-search"><MagnifyingGlassIcon /><input type="search" placeholder="Search name, email, phone or ID…" value={searchTerm} onChange={event => { setSearchTerm(event.target.value); setPage(1); }} /></div></label>
          <label className="participants-field"><span>Event</span><select value={selectedEvent} disabled={coordinatorMode} onChange={event => { setSelectedEvent(event.target.value); setPage(1); }}><option value="all">All events</option>{uniqueEvents.map(title => <option key={title} value={title}>{title}</option>)}</select></label>
          <label className="participants-field"><span>Batch</span><select value={selectedBatch} onChange={event => { setSelectedBatch(event.target.value); setPage(1); }}><option value="all">All batches</option>{batchOptions.map(batch => <option key={batch} value={batch}>{batch}</option>)}</select></label>
          <label className="participants-field"><span>Status</span><select value={selectedStatus} onChange={event => { setSelectedStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        </div>
        <div className="participants-result-bar"><span>{isRegistrationsLoading ? 'Loading entries…' : `${count} ${count === 1 ? 'registration' : 'registrations'}${viewMode === 'trash' ? ' in trash' : ''}`}<span aria-hidden="true"> · </span>Newest first</span><div>{(searchTerm || selectedEvent !== 'all' || selectedBatch !== 'all' || selectedStatus !== 'all') && <button className="participants-text-button" onClick={() => { setSearchTerm(''); if (!coordinatorMode) setSelectedEvent('all'); setSelectedBatch('all'); setSelectedStatus('all'); setPage(1); }}>Clear filters</button>}<span>Select entries for bulk actions</span></div></div>
        {selectedIds.size > 0 && <div className="participants-selection"><span>{selectedIds.size} selected</span>{viewMode === 'active' ? <button className="participants-button" onClick={handleOpenEmailModal}><EnvelopeClosedIcon />Email selected</button> : <button className="participants-button" disabled={isMutating} onClick={doBulkRestore}><ResetIcon />Restore selected</button>}<button className="participants-button is-danger" disabled={isMutating} onClick={doBulkDelete}><TrashIcon />{viewMode === 'trash' ? 'Delete permanently' : 'Move to trash'}</button><button className="participants-icon" aria-label="Clear selection" onClick={() => setSelectedIds(new Set())}><Cross2Icon /></button></div>}
        {isRegistrationsLoading ? <ParticipantLoading label="Loading registrations" /> : !registrationsError && <div className="participants-table-scroll">
          <table className="participants-table">
            <thead><tr><th><input type="checkbox" aria-label="Select all registrations on this page" checked={allVisibleSelected} onChange={toggleSelectAllVisible} /></th><th>Participant</th><th>Event</th><th>Entry type / batch</th><th>Status</th><th className="participants-optional">{viewMode === 'trash' ? 'Deleted' : 'Registered'}</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {filteredRegistrations.map(registration => (
                <React.Fragment key={registration.id}>
                  <tr className={selectedIds.has(registration.id) ? 'is-selected' : ''}>
                    <td><input type="checkbox" aria-label={`Select ${registration.full_name}`} checked={selectedIds.has(registration.id)} onChange={() => toggleRowSelect(registration.id)} /></td>
                    <td><div className="participants-person"><span className="participants-avatar">{registration.photo_url ? <img src={photoPreviewMap[registration.id] || registration.photo_url} alt="" referrerPolicy="no-referrer" loading="lazy" /> : participantInitials(registration.full_name)}</span><div><button aria-expanded={expandedRegistration === registration.id} onClick={() => { const id = expandedRegistration === registration.id ? null : registration.id; setExpandedRegistration(id); if (id) void fetchEmailLogs(id); }}>{registration.full_name}</button><small>{registration.email}</small>{duplicateIds.has(registration.id) && <span className="participants-tag">Possible duplicate</span>}</div></div></td>
                    <td><div className="participants-cell"><strong>{registration.event_title}</strong><small>{registration.college || 'Institution not provided'}</small></div></td>
                    <td><div className="participants-cell"><strong>{registration.is_team_registration ? registration.team_name || 'Team entry' : 'Individual'}</strong><small>{registration.participant_type || '—'}{registration.is_team_registration ? ` · ${registration.total_members} members` : ''}</small></div></td>
                    <td><div className="participants-cell"><ParticipantStatus status={registration.status} />{registration.status === 'approved' && <small>{emailStatusMap[registration.id]?.sent ? 'Confirmation sent' : emailStatusState === 'checking' ? 'Checking email…' : emailStatusState === 'unavailable' ? 'Email status unavailable' : 'Email not sent'}</small>}</div></td>
                    <td className="participants-optional"><span className="whitespace-nowrap text-[10px]">{participantDate(viewMode === 'trash' ? registration.deleted_at : registration.registration_date || registration.created_at)}</span></td>
                    <td><div className="participants-actions"><button className="participants-icon" aria-label={`View ${registration.full_name}`} aria-expanded={expandedRegistration === registration.id} onClick={() => { const id = expandedRegistration === registration.id ? null : registration.id; setExpandedRegistration(id); if (id) void fetchEmailLogs(id); }}><EyeOpenIcon /></button>
                      {viewMode === 'active' ? <>
                        {registration.status === 'pending' && <button className="participants-icon" aria-label={`Approve ${registration.full_name}`} disabled={isMutating} onClick={() => handleStatusUpdate(registration.id, 'approved')}><CheckIcon /></button>}
                        <ParticipantMenu label={`Actions for ${registration.full_name}`} icon={<DotsHorizontalIcon />} compact>
                          {registration.status === 'pending' && <button onClick={() => handleRejectClick(registration.id)}><Cross2Icon />Reject registration</button>}
                          {registration.status === 'approved' && <button onClick={async () => { if (!confirm(`Resend confirmation email to ${registration.full_name}?`)) return; const result = await sendApprovalEmail(registration); if (result.success) { setEmailStatusMap(previous => ({ ...previous, [registration.id]: { sent: true, count: (previous[registration.id]?.count || 0) + 1 } })); } push({ message: result.success ? 'Confirmation email sent.' : 'Email could not be sent. Please retry.', type: result.success ? 'success' : 'error' }); }}><EnvelopeClosedIcon />Resend confirmation</button>}
                          {registration.phone && <><a href={`tel:${registration.phone}`}>Call participant</a><a href={`https://wa.me/${registration.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${registration.full_name.split(' ')[0]}! This is regarding your registration for ${registration.event_title} at ${BRAND_NAME} ${BRAND_YEAR}.${registration.status === 'approved' && registration.is_active === true && !registration.deleted_at && eventGroups[String(registration.event_id)] ? ` Join the official event group: ${eventGroups[String(registration.event_id)]}` : ''}`)}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></>}
                          {registration.status !== 'pending' && isOwner && <button disabled={isMutating} onClick={() => handleStatusUpdate(registration.id, 'pending')}><ResetIcon />Return to pending</button>}
                          <hr /><button disabled={deletingIds.has(registration.id)} onClick={() => handleDeleteRegistration(registration.id)}><TrashIcon />Move to trash</button>
                        </ParticipantMenu>
                      </> : <><button className="participants-icon" aria-label={`Restore ${registration.full_name}`} disabled={isMutating} onClick={() => handleRestoreRegistration(registration.id)}><ResetIcon /></button><button className="participants-icon" aria-label={`Permanently delete ${registration.full_name}`} disabled={deletingIds.has(registration.id)} onClick={() => handleDeleteRegistration(registration.id)}><TrashIcon /></button></>}
                    </div></td>
                  </tr>
                  {/* Expanded Details Row */}
                  {expandedRegistration === registration.id && (
                    <tr className="participants-detail">
                      <td colSpan={7} className="px-6 py-8 bg-black/20 border-b border-white/5">
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-white mb-2">Registration Details</h4>
                              <div className="space-y-1 sm:space-y-2">
                                <EditableRow
                                  label="Full Name"
                                  value={registration.full_name}
                                  onSave={async (val) => {
                                    try {
                                      await dualUpdate('registrations', registration.id, { full_name: val });
                                    } catch (err) {
                                      push({ message: 'Update failed', type: 'error' });
                                      return false;
                                    }
                                    await refreshRegistrations();
                                    push({ message: 'Name updated', type: 'success' });
                                    return true;
                                  }}
                                  canEdit={isOwner}
                                />
                                <div className="flex items-start gap-2 min-h-[24px] text-sm">
                                  <strong className="text-gray-400 w-[140px] flex-shrink-0 pt-0.5">Registration ID:</strong>
                                  <span className="text-gray-200 font-mono text-xs pt-0.5 select-all">{registration.id}</span>
                                </div>
                                <EditableRow
                                  label="College"
                                  value={registration.college}
                                  onSave={async (val) => {
                                    try {
                                      await dualUpdate('registrations', registration.id, { college: val });
                                    } catch (err) {
                                      push({ message: 'Update failed', type: 'error' });
                                      return false;
                                    }
                                    await refreshRegistrations();
                                    push({ message: 'College updated', type: 'success' });
                                    return true;
                                  }}
                                  canEdit={isOwner}
                                />
                                <EditableRow
                                  label="Email"
                                  value={registration.email}
                                  onSave={async (val) => {
                                    try {
                                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) { push({ message: 'Enter a valid email address.', type: 'error' }); return false; }
                                      await dualUpdate('registrations', registration.id, { email: val.trim().toLowerCase() });
                                    } catch (err) {
                                      push({ message: 'Update failed', type: 'error' });
                                      return false;
                                    }
                                    await refreshRegistrations();
                                    push({ message: 'Email updated', type: 'success' });
                                    return true;
                                  }}
                                  canEdit={isOwner}
                                />
                                <EditableRow
                                  label="Phone"
                                  value={registration.phone}
                                  onSave={async (val) => {
                                    try {
                                      if (!/^[+\d\s()-]{7,40}$/.test(val.trim())) { push({ message: 'Enter a valid phone number.', type: 'error' }); return false; }
                                      await dualUpdate('registrations', registration.id, { phone: val.trim() });
                                    } catch (err) {
                                      push({ message: 'Update failed', type: 'error' });
                                      return false;
                                    }
                                    await refreshRegistrations();
                                    push({ message: 'Phone updated', type: 'success' });
                                    return true;
                                  }}
                                  canEdit={isOwner}
                                />
                                  <EditableRow
                                    label="Batch"
                                    value={registration.participant_type}
                                    onSave={async (val) => {
                                      try {
                                        // Update the batch globally for this user's email
                                        if (registration.email && val) {
                                           await updateBatchGlobally(registration.email, val);
                                           return true;
                                        }
                                        return false;
                                      } catch (err) {
                                        push({ message: 'Global batch update failed', type: 'error' });
                                        return false;
                                      }
                                    }}
                                    canEdit={isOwner}
                                  />
                                <div className="flex items-start gap-2 min-h-[24px] text-sm">
                                  <strong className="text-gray-400 w-[140px] flex-shrink-0 pt-0.5">Date:</strong>
                                  <span className="text-gray-200 pt-0.5">{new Date(registration.registration_date).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            {((registration as any).photo_url) && (
                              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl">
                                <h4 className="font-black text-[10px] text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <ImageIcon size={14} /> Participant Photo
                                </h4>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                  <PrivateMediaImage
                                    src={(registration as any).photo_url as any}
                                    alt={`${registration.full_name} photo`}
                                    className="w-32 h-32 rounded-xl object-cover border-2 border-white/10 shadow-lg hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex flex-col gap-2 w-full">
                                    <PrivateMediaLink
                                      href={(registration as any).photo_url as any}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-white/10"
                                    >
                                      <Eye size={14} /> View Original
                                    </PrivateMediaLink>
                                    <button
                                      onClick={() => downloadPhoto((registration as any).photo_url as string, registration.full_name)}
                                      className="flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-indigo-500/20"
                                    >
                                      <Download size={14} /> Download Image
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Motivation removed from registration details */}
                          </div>

                          {/* Team Members */}
                          {registration.is_team_registration && (
                            <div>
                            <div className="space-y-2">
                                <EditableRow
                                  label="Team Name"
                                  value={registration.team_name}
                                  onSave={async (val) => {
                                    try {
                                      await dualUpdate('registrations', registration.id, { team_name: val });
                                    } catch (err) {
                                      push({ message: 'Update failed', type: 'error' });
                                      return false;
                                    }
                                    await refreshRegistrations();
                                    push({ message: 'Team name updated', type: 'success' });
                                    return true;
                                  }}
                                  canEdit={isOwner}
                                />
                              <h4 className="font-black text-[10px] text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2 mt-4">
                                <Users size={14} /> Team Members ({registration.total_members})
                              </h4>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {safeTeamMembers(registration).map((member: any, index: number) => (
                                  <div key={index} className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                                    <EditableRow
                                      label="Name"
                                      value={member.name}
                                      onSave={async (val) => {
                                        try {
                                          const members = safeTeamMembers(registration);
                                          members[index] = { ...members[index], name: val };
                                          await dualUpdate('registrations', registration.id, { team_members: members });
                                        } catch (err) {
                                          push({ message: 'Update failed', type: 'error' });
                                          return false;
                                        }
                                        await refreshRegistrations();
                                        return true;
                                      }}
                                      canEdit={isOwner}
                                      className="!min-h-[24px]"
                                    />
                                    <EditableRow
                                      label="Email"
                                      value={member.email}
                                      onSave={async (val) => {
                                        try {
                                          const members = safeTeamMembers(registration);
                                          members[index] = { ...members[index], email: val };
                                          await dualUpdate('registrations', registration.id, { team_members: members });
                                        } catch (err) {
                                          push({ message: 'Update failed', type: 'error' });
                                          return false;
                                        }
                                        await refreshRegistrations();
                                        return true;
                                      }}
                                      canEdit={isOwner}
                                      className="!min-h-[24px]"
                                    />
                                    <EditableRow
                                      label="Phone"
                                      value={member.phone}
                                      onSave={async (val) => {
                                        try {
                                          const members = safeTeamMembers(registration);
                                          members[index] = { ...members[index], phone: val };
                                          await dualUpdate('registrations', registration.id, { team_members: members });
                                        } catch (err) {
                                          push({ message: 'Update failed', type: 'error' });
                                          return false;
                                        }
                                        await refreshRegistrations();
                                        return true;
                                      }}
                                      canEdit={isOwner}
                                      className="!min-h-[24px]"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            </div>
                          )}
                          {/* Notification History */}
                          <div className="mt-8 border-t border-white/10 pt-6">
                            <h4 className="font-black text-[10px] text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Mail size={14} /> Notification History
                            </h4>
                            {logsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase tracking-tighter animate-pulse">
                                  <Loader2 className="animate-spin" size={14} /> Loading logs...
                                </div>
                            ) : logsError ? <div className="participants-error" role="alert"><span>Notification history could not load.</span><button className="participants-button" onClick={() => void fetchEmailLogs(registration.id)}>Retry</button></div> : emailLogs.length > 0 ? (
                                <div className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-white/10">
                                          <thead className="bg-white/5">
                                              <tr>
                                                  <th className="px-4 py-3 text-left text-[10px] font-black text-indigo-300 uppercase tracking-widest">Sent At</th>
                                                  <th className="px-4 py-3 text-left text-[10px] font-black text-indigo-300 uppercase tracking-widest">Type</th>
                                                  <th className="px-4 py-3 text-left text-[10px] font-black text-indigo-300 uppercase tracking-widest">Status</th>
                                                  <th className="px-4 py-3 text-left text-[10px] font-black text-indigo-300 uppercase tracking-widest">Provider</th>
                                                  <th className="px-4 py-3 text-left text-[10px] font-black text-indigo-300 uppercase tracking-widest">Details</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white/5">
                                              {emailLogs.map((log) => (
                                                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                      <td className="px-4 py-3 text-sm text-gray-200 font-medium">{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                      <td className="px-4 py-3 text-sm text-gray-300 font-bold uppercase tracking-tight italic opacity-80">{log.template_type}</td>
                                                      <td className="px-4 py-3 text-sm">
                                                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest inline-flex items-center gap-1 border border-white/5 ${log.status === 'sent' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-red-500/20 text-red-200 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'}`}>
                                                              {log.status === 'sent' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                              {log.status}
                                                          </span>
                                                      </td>
                                                      <td className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.provider}</td>
                                                      <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">
                                                          {log.template_type === 'update' && log.details?.newDetails ? (
                                                              <div className="space-y-1">
                                                                  <div className="text-indigo-400 font-black tracking-widest uppercase mb-1">Updates:</div>
                                                                  {log.details.newDetails.date && <div>📅 {log.details.newDetails.date}</div>}
                                                                  {log.details.newDetails.time && <div>⏰ {log.details.newDetails.time}</div>}
                                                                  {log.details.newDetails.venue && <div>📍 {log.details.newDetails.venue}</div>}
                                                              </div>
                                                          ) : log.template_type === 'confirmation' ? (
                                                              <span className="text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">{log.details?.eventTitle}</span>
                                                          ) : (
                                                              <span className="truncate max-w-[200px] block opacity-60" title={JSON.stringify(log.details)}>{JSON.stringify(log.details || {})}</span>
                                                          )}
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest italic">No notification logs found for this registration.</p>
                                </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

        </div>}
        {!isRegistrationsLoading && !registrationsError && filteredRegistrations.length === 0 && <div className="participants-empty"><span><CalendarIcon /></span><h3>{viewMode === 'trash' ? 'Your trash is empty' : searchTerm || selectedEvent !== 'all' || selectedBatch !== 'all' || selectedStatus !== 'all' ? 'No matching registrations' : 'The first entry starts here'}</h3><p>{viewMode === 'trash' ? 'Deleted event registrations will appear here.' : 'Submitted event registrations appear here for review. Try clearing filters or check back after registrations open.'}</p>{(searchTerm || selectedEvent !== 'all' || selectedBatch !== 'all' || selectedStatus !== 'all') && <button className="participants-button" onClick={() => { setSearchTerm(''); if (!coordinatorMode) setSelectedEvent('all'); setSelectedBatch('all'); setSelectedStatus('all'); setPage(1); }}>Clear filters</button>}</div>}
        {count > 0 && <div className="participants-pagination"><div><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} of {count}</span><select className="participants-inline-select" aria-label="Registrations per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map(size => <option key={size} value={size}>{size} / page</option>)}</select></div><div><button className="participants-icon" aria-label="Previous registration page" disabled={page === 1 || isRegistrationsLoading} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeftIcon /></button><span>{page} / {Math.max(1, Math.ceil(count / pageSize))}</span><button className="participants-icon" aria-label="Next registration page" disabled={page >= Math.ceil(count / pageSize) || isRegistrationsLoading} onClick={() => setPage(value => value + 1)}><ChevronRightIcon /></button></div></div>}
      </section>
      <div className="participants-bottom-tools"><span><CheckIcon />Review each application before confirming participation.</span><span>Exports follow the entries on your current page.</span></div>
      {!coordinatorMode && <ParticipationVerification />}
      {rejectingId && <EventAdminDialog title="Reject registration" eyebrow="Participant review" description="The participant will receive your reason by email." busy={isSendingRejection} onClose={() => { setRejectingId(null); setRejectionReason(''); }} footer={<><button className="event-admin-button is-secondary" disabled={isSendingRejection} onClick={() => { setRejectingId(null); setRejectionReason(''); }}>Cancel</button><button className="event-admin-button is-danger" disabled={isSendingRejection || !rejectionReason.trim()} onClick={confirmRejection}>{isSendingRejection ? 'Sending…' : 'Reject & notify'}</button></>}><div className="participants-dialog-body"><label className="participants-dialog-field"><span>Reason for rejection</span><textarea rows={4} placeholder="Explain which information needs attention…" value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} /></label></div></EventAdminDialog>}
      {showEmailModal && <EventAdminDialog title={`Email ${selectedIds.size} ${selectedIds.size === 1 ? 'participant' : 'participants'}`} eyebrow="Participant communication" description="Send an update to the entries you selected." busy={emailSending} onClose={() => setShowEmailModal(false)} footer={<><button className="event-admin-button is-secondary" disabled={emailSending} onClick={() => setShowEmailModal(false)}>Cancel</button><button className="event-admin-button is-primary" disabled={emailSending || (emailTemplate === 'custom' && (!emailCustomSubject.trim() || !emailCustomBody.trim()))} onClick={handleSendCustomEmail}><EnvelopeClosedIcon />{emailSending ? 'Sending…' : 'Send email'}</button></>}><div className="participants-dialog-body">
        <div className="participants-template-tabs" aria-label="Email template">{([{ id: 'custom', label: 'Custom message' }, { id: 'selection', label: 'Selection update' }, { id: 'winner', label: 'Winner announcement' }] as const).map(template => <button key={template.id} aria-pressed={emailTemplate === template.id} onClick={() => setEmailTemplate(template.id)}>{template.label}</button>)}</div>
        {emailTemplate === 'custom' && <label className="participants-dialog-field"><span>Subject</span><input placeholder="An update about your registration" value={emailCustomSubject} onChange={event => setEmailCustomSubject(event.target.value)} /></label>}
        {emailTemplate === 'winner' && <label className="participants-dialog-field"><span>Position / achievement</span><input placeholder="For example, 1st place or Best performer" value={emailAdditionalData.position || ''} onChange={event => setEmailAdditionalData({ ...emailAdditionalData, position: event.target.value })} /></label>}
        {emailTemplate === 'selection' && <label className="participants-dialog-field"><span>Selection stage</span><input placeholder="For example, Round 2 or Finals" value={emailAdditionalData.stage || ''} onChange={event => setEmailAdditionalData({ ...emailAdditionalData, stage: event.target.value })} /></label>}
        <label className="participants-dialog-field"><span>{emailTemplate === 'custom' ? 'Message' : 'Additional message (optional)'}</span><textarea rows={5} placeholder="Write your message to participants…" value={emailCustomBody} onChange={event => setEmailCustomBody(event.target.value)} /></label>
        <div className="participants-email-note"><EnvelopeClosedIcon /><span>Sending to {selectedIds.size} selected {selectedIds.size === 1 ? 'participant' : 'participants'} via {emailProvider === 'smtp' ? 'SMTP' : 'Resend'}.</span></div>
      </div></EventAdminDialog>}
    </div>
  );
};
