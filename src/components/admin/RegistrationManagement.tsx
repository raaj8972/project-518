import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, Trash2, RefreshCw, 
  CheckCircle, XCircle, 
  Mail, Eye, Loader2, Sparkles, AlertTriangle,
  Phone, Building, Award, Send, Calendar, X, FileText, RotateCcw, ChevronDown, Settings, MailCheck, MailX,
  Pencil, Check
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { exportRegistrationsToExcel } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, RegistrationColumnKey } from '../../utils/reportExport';
import { exportRegistrationsToPDF, exportRegistrationsByEvent as exportRegistrationsByEventPDF, exportRegistrationsByStatus as exportRegistrationsByStatusPDF, preloadWatermark, generateRegistrationReceiptPDF, exportEventSummaryPDF } from '../../utils/pdfExport';
import { encryptData } from '../../utils/encryption';
import ExportPdfButton from '../../components/ExportPdfButton';

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
      <strong className="text-gray-900 w-[140px] flex-shrink-0 pt-0.5">{label}:</strong>
      {isEditing ? (
        <div className="flex-1 flex items-start gap-2 max-w-md">
          {multiline ? (
             <textarea 
               className="flex-1 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 min-h-[60px] text-gray-900 bg-white" 
               value={tempValue} 
               onChange={e => setTempValue(e.target.value)}
             /> 
          ) : (
             <input 
               type="text" 
               className="flex-1 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 text-gray-900 bg-white" 
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
            <span className="text-gray-700 break-words">{value || <span className="text-gray-400 italic">None</span>}</span>
            {canEdit && (
               <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50" title="Edit">
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
const ProcessingOverlay = ({ title, progress, currentItem }: { title: string, progress: number, currentItem?: string }) => (
  // Changed from fixed inset-0 (modal) to fixed top-right (toast-style)
  // Removed bg-black/50 overlay to allow interaction with the page behind it
  <div className="fixed top-20 right-4 z-[100] w-96 max-w-[90vw] animate-in fade-in slide-in-from-right-5 duration-300 pointer-events-auto">
    <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-blue-100 ring-1 ring-blue-500/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={18} />
          {title}
        </h3>
        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs tabular-nums">{Math.round(progress)}%</span>
      </div>
      
      {currentItem && <p className="text-gray-600 mb-3 text-xs font-medium truncate pl-6.5">{currentItem}</p>}
      
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(2, progress)}%` }}
        />
      </div>
      <p className="text-right text-[10px] text-gray-400 mt-1.5">Processing in background...</p>
    </div>
  </div>
);

export function RegistrationManagement() {
  const { events, registrations, deletedRegistrations, updateRegistrationStatus, deleteRegistration, restoreRegistration, permanentDeleteRegistration, bulkApproveRegistrations, bulkRejectRegistrations, bulkDeleteRegistrations, bulkRestoreRegistrations, bulkPermanentDeleteRegistrations, resetRegistrationIdSequence, siteSettings, updateSiteSettings, adminUsers, eventCoordinators } = useData();
  const { user } = useAuth();
  
  const isOwner = useMemo(() => {
    const admin = adminUsers?.find(u => u.user_id === user?.id);
    return admin?.role === 'owner' || admin?.is_primary;
  }, [adminUsers, user]);

  const { push } = useToast();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  
  // Processing State for Progress Bar
  const [processingState, setProcessingState] = useState<{ active: boolean, title: string, progress: number, item?: string }>({
    active: false, title: '', progress: 0
  });
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('all');
  const [selectedEmailStatus, setSelectedEmailStatus] = useState<string>('all'); // 'all', 'sent', 'not-sent'
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    // Allow other admin panels to pre-fill the search via localStorage key
    const [searchTerm, setSearchTerm] = useState(() => {
      try {
        const raw = localStorage.getItem('admin_registrations_search');
        if (raw) {
          localStorage.removeItem('admin_registrations_search');
          return raw;
        }
      } catch {}
      return '';
    });
  const [emailProvider, setEmailProvider] = useState<'smtp' | 'resend'>('smtp'); // Default to Hostinger
  const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]); // New state for logs
  const [logsLoading, setLogsLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  // Email status tracking: map registration ID to email sent status
  const [emailStatusMap, setEmailStatusMap] = useState<Record<string, { sent: boolean; count: number }>>({})

  // Download handler for participant photos
  const downloadPhoto = async (photoUrl: string, participantName: string) => {
    try {
      // Parse the storage path from the URL
      const parseStoragePath = (url: string): { bucket: string; name: string } | null => {
        const m = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
        if (m) return { bucket: decodeURIComponent(m[1]), name: decodeURIComponent(m[2]) };
        
        // Fallback: try to extract from known bucket patterns
        const knownBuckets = ['registration-photos'];
        for (const b of knownBuckets) {
          const idx = url.indexOf(`${b}/`);
          if (idx >= 0) return { bucket: b, name: decodeURIComponent(url.slice(idx + b.length + 1)) };
        }
        return null;
      };

      const parsed = parseStoragePath(photoUrl);
      let blob: Blob | null = null;

      if (parsed) {
        // Download from Supabase storage with authentication
        const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.name);
        if (error) throw error;
        blob = data as Blob;
      } else {
        // Fallback: try direct fetch for public URLs
        const response = await fetch(photoUrl);
        if (!response.ok) throw new Error('Failed to fetch photo');
        blob = await response.blob();
      }

      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Extract file extension from URL or blob type
      const extension = blob.type.split('/')[1] || 'jpg';
      const filename = `${participantName.replace(/[^a-z0-9]/gi, '_')}_photo.${extension}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      push({ message: 'Photo downloaded successfully', type: 'success' });
    } catch (error) {
      console.error('Error downloading photo:', error);
      push({ message: 'Failed to download photo', type: 'error' });
    }
  };
  const [pdfExporting] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<RegistrationColumnKey[]>(EXPORT_PRESETS.full);
  const [exportPreset, setExportPreset] = useState<string>('full');
  const [splitThreshold, setSplitThreshold] = useState<number>(0);
  // Institution visibility controls (moved from Site Settings into Registration admin)
  const [registrationInstitutionVisible, setRegistrationInstitutionVisible] = useState<boolean>(true);
  const [registrationInstitutionOptional, setRegistrationInstitutionOptional] = useState<boolean>(false);
  const [savingRegSettings, setSavingRegSettings] = useState<boolean>(false);
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // User option: exclude Registration ID and College/Institution specifically for PDF
  const [pdfExcludeIdCollege, setPdfExcludeIdCollege] = useState<boolean>(true);
  // Date range filter
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  
  // UI state for collapsible sections
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  // Watermark state
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [watermarkDataUrl, setWatermarkDataUrl] = useState<string | null>(null);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);

  // Stamp state (bottom corner image)
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);
  const [uploadingStamp, setUploadingStamp] = useState(false);

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
      // Attempt to sign each URL; if signing fails (public bucket or no access), fall back to original URL
      const tasks = rowsNeedingPreview.map(async (r) => {
        // Try to derive the object path from a stored public-style URL
        // Accept patterns .../storage/v1/object/public/registration-photos/<name>
        let name = '';
        try {
          const m = r.url.match(/\/storage\/v1\/object\/public\/registration-photos\/(.+)$/);
          if (m && m[1]) name = decodeURIComponent(m[1]);
        } catch {}
        // If not matched, try to find after the bucket name directly
        if (!name) {
          const idx = r.url.indexOf('registration-photos/');
          if (idx >= 0) name = decodeURIComponent(r.url.slice(idx + 'registration-photos/'.length));
        }
        if (!name) {
          // Fallback: use original URL
          next[r.id] = r.url;
          return;
        }
        try {
          const { data, error } = await supabase.storage.from('registration-photos').createSignedUrl(name, 60 * 60 * 24); // 24h
          if (!error && data?.signedUrl) next[r.id] = data.signedUrl;
          else next[r.id] = r.url;
        } catch {
          next[r.id] = r.url;
        }
      });
      await Promise.all(tasks);
      if (!cancelled) setPhotoPreviewMap(next);
    })();
    return () => { cancelled = true; };
  }, [rowsNeedingPreview]);

  // Load existing watermark from Supabase storage on mount
  useEffect(() => {
    const loadWatermark = async () => {
      try {
        const { data } = await supabase.storage
          .from('pdf-watermarks')
          .getPublicUrl('watermark.png');
        
        if (data?.publicUrl) {
          // Check if file actually exists by fetching it
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            setWatermarkUrl(data.publicUrl);
            const dataUrl = await preloadWatermark(data.publicUrl);
            setWatermarkDataUrl(dataUrl);
          }
        }
      } catch (error) {
        console.log('No existing watermark found');
      }
    };
    loadWatermark();
  }, []);

  // Handle watermark upload to Supabase
  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.includes('png') && !file.type.includes('svg')) {
      push({ message: 'Please upload a PNG or SVG file for the watermark.', type: 'error' });
      return;
    }
    
    try {
      setUploadingWatermark(true);
      
      // Get file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `watermark.${ext}`;
      
      // Upload to Supabase storage (replace existing)
      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { 
          cacheControl: '0',
          upsert: true 
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data } = await supabase.storage
        .from('pdf-watermarks')
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        // Add cache buster
        const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
        setWatermarkUrl(urlWithCacheBuster);
        const dataUrl = await preloadWatermark(urlWithCacheBuster);
        setWatermarkDataUrl(dataUrl);
        push({ message: 'Watermark uploaded successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Watermark upload failed:', error);
      push({ message: 'Failed to upload watermark.', type: 'error' });
    } finally {
      setUploadingWatermark(false);
    }
  };

  // Delete watermark from Supabase
  const handleWatermarkDelete = async () => {
    try {
      await supabase.storage
        .from('pdf-watermarks')
        .remove(['watermark.png', 'watermark.svg']);
      
      setWatermarkUrl(null);
      setWatermarkDataUrl(null);
      push({ message: 'Watermark removed.', type: 'success' });
    } catch (error) {
      console.error('Failed to delete watermark:', error);
    }
  };

  // Load existing stamp from Supabase storage on mount
  useEffect(() => {
    const loadStamp = async () => {
      try {
        // Try PNG first, then SVG
        for (const ext of ['png', 'svg']) {
          const { data } = await supabase.storage
            .from('pdf-watermarks')
            .getPublicUrl(`stamp.${ext}`);
          
          if (data?.publicUrl) {
            const response = await fetch(data.publicUrl, { method: 'HEAD' });
            if (response.ok) {
              setStampUrl(data.publicUrl);
              const dataUrl = await preloadWatermark(data.publicUrl);
              setStampDataUrl(dataUrl);
              break;
            }
          }
        }
      } catch (error) {
        console.log('No existing stamp found');
      }
    };
    loadStamp();
  }, []);

  // Handle stamp upload to Supabase
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.includes('png') && !file.type.includes('svg')) {
      push({ message: 'Please upload a PNG or SVG file for the stamp.', type: 'error' });
      return;
    }
    
    try {
      setUploadingStamp(true);
      
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `stamp.${ext}`;
      
      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { 
          cacheControl: '0',
          upsert: true 
        });
      
      if (error) throw error;
      
      const { data } = await supabase.storage
        .from('pdf-watermarks')
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
        setStampUrl(urlWithCacheBuster);
        const dataUrl = await preloadWatermark(urlWithCacheBuster);
        setStampDataUrl(dataUrl);
        push({ message: 'Stamp uploaded successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Stamp upload failed:', error);
      push({ message: 'Failed to upload stamp.', type: 'error' });
    } finally {
      setUploadingStamp(false);
    }
  };

  // Delete stamp from Supabase
  const handleStampDelete = async () => {
    try {
      await supabase.storage
        .from('pdf-watermarks')
        .remove(['stamp.png', 'stamp.svg']);
      
      setStampUrl(null);
      setStampDataUrl(null);
      push({ message: 'Stamp removed.', type: 'success' });
    } catch (error) {
      console.error('Failed to delete stamp:', error);
    }
  };

  // Filter registrations based on selected filters
  const sourceRegistrations = viewMode === 'trash' ? deletedRegistrations : registrations;
  const filteredRegistrations = sourceRegistrations.filter(registration => {
    const matchesEvent = selectedEvent === 'all' || registration.event_title === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || registration.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || (registration as any).event_category === selectedCategory;
    const matchesParticipantType = selectedParticipantType === 'all' || registration.participant_type === selectedParticipantType;
    const matchesSearch = searchTerm === '' || 
      registration.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.college.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Duplicate filter
    const matchesDuplicate = showDuplicatesOnly ? duplicateIds.has(registration.id) : true;

    // Email status filter (only for approved registrations)
    let matchesEmailStatus = true;
    if (selectedEmailStatus !== 'all' && registration.status === 'approved') {
      const emailStatus = emailStatusMap[registration.id];
      if (selectedEmailStatus === 'sent') {
        matchesEmailStatus = emailStatus?.sent === true;
      } else if (selectedEmailStatus === 'not-sent') {
        matchesEmailStatus = !emailStatus || emailStatus.sent !== true;
      }
    }

    // Date range filter (inclusive). Uses local timezone for inputs.
    let matchesDate = true;
    try {
      const regDate = new Date((registration as any).registration_date);
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (regDate < from) matchesDate = false;
      }
      if (matchesDate && dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`);
        if (regDate > to) matchesDate = false;
      }
    } catch {}
    
    return matchesEvent && matchesStatus && matchesCategory && matchesParticipantType && matchesSearch && matchesDate && matchesDuplicate && matchesEmailStatus;
  });

  // Selection helpers (needs filteredRegistrations)
  const toggleRowSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAllVisible = () => setSelectedIds(prev => {
    const n = new Set(prev);
    const allSelected = filteredRegistrations.every(r => n.has(r.id));
    if (allSelected) filteredRegistrations.forEach(r => n.delete(r.id)); else filteredRegistrations.forEach(r => n.add(r.id));
    return n;
  });
  const allVisibleSelected = filteredRegistrations.length > 0 && filteredRegistrations.every(r => selectedIds.has(r.id));
  const doBulkDelete = async () => {
    const ids = filteredRegistrations.map(r => r.id).filter(id => selectedIds.has(id));
    if (!ids.length) { push({ message: 'Select at least one row to delete.', type: 'info' }); return; }
    
    if (viewMode === 'trash') {
      if (!confirm(`PERMANENTLY DELETE ${ids.length} registration(s)?\n\nThis cannot be undone.`)) return;
      try { setBulkDeleting(true); await (bulkPermanentDeleteRegistrations?.(ids)); setSelectedIds(new Set()); push({ message: `Permanently deleted ${ids.length} registrations.`, type: 'success' }); }
      catch (e) { console.error(e); push({ message: 'Bulk permanent delete failed.', type: 'error' }); }
      finally { setBulkDeleting(false); }
    } else {
      if (!confirm(`Move ${ids.length} registration(s) to Trash?`)) return;
      try { setBulkDeleting(true); await (bulkDeleteRegistrations?.(ids)); setSelectedIds(new Set()); push({ message: `Moved ${ids.length} registrations to Trash.`, type: 'success' }); }
      catch (e) { console.error(e); push({ message: 'Move to trash failed.', type: 'error' }); }
      finally { setBulkDeleting(false); }
    }
  };

  const doBulkRestore = async () => {
    const ids = filteredRegistrations.map(r => r.id).filter(id => selectedIds.has(id));
    if (!ids.length) { push({ message: 'Select at least one row to restore.', type: 'info' }); return; }
    if (!confirm(`Restore ${ids.length} registration(s)?`)) return;
    try { setBulkSaving(true); await (bulkRestoreRegistrations?.(ids)); setSelectedIds(new Set()); push({ message: `Restored ${ids.length} registrations.`, type: 'success' }); }
    catch (e) { console.error(e); push({ message: 'Bulk restore failed.', type: 'error' }); }
    finally { setBulkSaving(false); }
  };

  // Get unique event titles, categories, and participant types for filter dropdowns
  const uniqueEvents = useMemo(() => 
    Array.from(new Set(registrations.map(reg => reg.event_title))), 
    [registrations]
  );
  const uniqueCategories = useMemo(() => 
    Array.from(new Set(registrations.map(reg => (reg as any).event_category).filter(Boolean))), 
    [registrations]
  );
  const uniqueParticipantTypes = useMemo(() => 
    Array.from(new Set(registrations.map(reg => reg.participant_type).filter(Boolean))), 
    [registrations]
  );
  
  // Compute counts per event for the dropdown
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach(r => {
      counts[r.event_title] = (counts[r.event_title] || 0) + 1;
    });
    return counts;
  }, [registrations]);

  // Compute counts per participant type for the dropdown (filtered by selected event)
  const participantTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Filter by selected event first to show event-specific batch counts
    const eventFilteredRegs = selectedEvent === 'all' 
      ? registrations 
      : registrations.filter(r => r.event_title === selectedEvent);
    
    eventFilteredRegs.forEach(r => {
      if (r.participant_type) {
        counts[r.participant_type] = (counts[r.participant_type] || 0) + 1;
      }
    });
    return counts;
  }, [registrations, selectedEvent]);

  // Fetch email status for all registrations (not just filtered ones to avoid flicker)
  // EXTRACTED: Made fetchEmailStatuses a stable function to call after sending emails
  const fetchEmailStatuses = React.useCallback(async () => {
    try {
      // Use all registrations from current view mode (active or trash)
      const sourceRegs = viewMode === 'trash' ? deletedRegistrations : registrations;
      const regIds = sourceRegs.map(r => r.id);
      if (regIds.length === 0) return;
      
      // Fetch confirmation email logs for all registrations in current view
      const { data, error } = await supabase
        .from('email_logs')
        .select('registration_id, status, template_type')
        .in('registration_id', regIds)
        .eq('template_type', 'confirmation');
      
      if (error) throw error;
      
      // Build status map
      const statusMap: Record<string, { sent: boolean; count: number }> = {};
      data?.forEach(log => {
        if (!statusMap[log.registration_id]) {
          statusMap[log.registration_id] = { sent: false, count: 0 };
        }
        if (log.status === 'sent') {
          statusMap[log.registration_id].sent = true;
        }
        statusMap[log.registration_id].count++;
      });
      
      setEmailStatusMap(statusMap);
    } catch (err) {
      console.error('Error fetching email statuses:', err);
    }
  }, [viewMode, deletedRegistrations, registrations]);

  useEffect(() => {
    fetchEmailStatuses();
  }, [fetchEmailStatuses]);

  // Helper to send approval email (extracted for reuse)
  const sendApprovalEmail = async (reg: any, onProgress?: (pct: number, stage: string) => void) => { 
    try {
      onProgress?.(5, 'Preparing data...');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      // Get event details to include in email
      const event = events.find(e => e.id === reg.event_id);

      if (token) {
          // Generate PDF receipt
          let pdfBase64: string | null = null;
          try {
            console.log('[sendApprovalEmail] Generating PDF receipt...');
            onProgress?.(20, 'Generating Receipt PDF...');
            
            // Force status to 'approved' for the receipt, as this is the approval email
            pdfBase64 = await generateRegistrationReceiptPDF({ ...reg, status: 'approved' }, watermarkDataUrl, stampDataUrl);
            
            onProgress?.(50, 'Compressing & Validating...');
            
            // Check size (Base64 length * 0.75 = roughly bytes). Limit to 3MB to stay under Netlify 6MB limit.
            const sizeInBytes = pdfBase64.length * 0.75;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            console.log(`[sendApprovalEmail] PDF size: ${sizeInMB.toFixed(2)} MB`);

            if (sizeInMB > 3) {
              console.warn('[sendApprovalEmail] PDF too large for email attachment');
              alert(`Warning: The generated PDF receipt is too large (${sizeInMB.toFixed(2)} MB). The email will be sent WITHOUT the attachment to ensure delivery. Please compress your watermark/stamp images.`);
              pdfBase64 = null;
            }
          } catch (pdfError) {
            console.error('[sendApprovalEmail] Failed to generate PDF receipt:', pdfError);
            alert('PDF generation failed, but email will be sent without attachment. Error: ' + (pdfError as Error).message);
          }

          onProgress?.(70, 'Sending Email...');

          const res = await fetch('/api/send-confirmation', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  registrationId: reg.id,
                  email: reg.email,
                  fullName: reg.full_name,
                  eventTitle: reg.event_title,
                  eventDate: event?.date || 'TBA',
                  eventTime: event?.time || 'TBA',
                  eventVenue: event?.venue || 'TBA',
                  provider: emailProvider,
                  coordinators: eventCoordinators
                      // @ts-ignore
                      .filter(c => c.event_id === reg.event_id)
                      // @ts-ignore
                      .map(c => `${c.name}${c.phone ? ` (${c.phone})` : ''}`)
                      .join(', '),
                  teamMembers: safeTeamMembers(reg),
                  pdfAttachment: pdfBase64 // Add PDF as base64
              })
          });

          onProgress?.(95, 'Finalizing...');

          if (!res.ok) {
              const err = await res.json();
              console.warn(`Email failed for ${reg.email}:`, err);
              // We return false or throw to indicate failure, but for bulk ops we might want to just log
              return { success: false, error: err.error || 'Server error' };
          }
          return { success: true };
      }
    } catch (emailErr: any) {
       console.error('Failed to initiate email:', emailErr);
       return { success: false, error: emailErr.message };
    }
    return { success: false, error: 'No token' };
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

    const registration = registrations.concat(deletedRegistrations).find(r => r.id === registrationId);
    if (!registration) {
      console.error('[Delete] Registration not found:', registrationId);
      push({ message: 'Registration not found.', type: 'error' });
      return;
    }

    const isTrash = viewMode === 'trash';
    const confirmMessage = isTrash
      ? `PERMANENTLY DELETE registration for \"${registration.full_name}\"?\n\nThis cannot be undone.`
      : `Move registration for \"${registration.full_name}\" to Trash?`;
    
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
    if (bulkSaving) return;
    const registration = deletedRegistrations.find(r => r.id === registrationId);
    if (!confirm(`Restore registration for "${registration?.full_name || 'Unknown'}"?`)) return;
    
    try {
      setBulkSaving(true); 
      await restoreRegistration(registrationId);
      push({ message: 'Registration restored.', type: 'success' });
    } catch (e) {
      console.error(e);
      push({ message: 'Restore failed.', type: 'error' });
    } finally {
      setBulkSaving(false);
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
    try {
        const { data, error } = await supabase
            .from('email_logs')
            .select('*')
            .eq('registration_id', regId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setEmailLogs(data || []);
    } catch (err) {
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

  const handleSendCustomEmail = async () => {
      const recipients = filteredRegistrations.filter(r => selectedIds.has(r.id));
      if (!recipients.length) return;
      
      try {
          setEmailSending(true);
          let sent = 0;
          let failed = 0;
          
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
                 else failed++;
              }
          }
          
          push({ message: `Emails sent: ${sent}, Failed: ${failed}`, type: sent > 0 ? 'success' : 'error' });
          setShowEmailModal(false);
          setSelectedIds(new Set()); // Deselect after sending
          
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <AlertTriangle size={16} className="text-yellow-600" />;
    }
  };

  const exportOptions = [
    {
      label: 'Send Email',
      action: handleOpenEmailModal
    },
    {
      label: 'Export All Registrations',
      action: () => exportRegistrationsToExcel(filteredRegistrations, 'all-registrations.xlsx')
    }
  ];

  const handleBulkApprove = async () => {
    // Determine which items are pending in the current view
    const pendingRegs = filteredRegistrations.filter(r => r.status === 'pending');
    
    if (!pendingRegs.length) {
      push({ message: 'No pending registrations in current filter.', type: 'info' });
      return;
    }
    if (!confirm(`Approve ${pendingRegs.length} pending registration(s)?\nThis will trigger emails for all of them.`)) return;
    
    try {
      setBulkSaving(true);
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
    } finally {
      setBulkSaving(false);
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
      setBulkRejecting(true);
      await (bulkRejectRegistrations?.(pending));
      push({ message: `Rejected ${pending.length} registrations.`, type: 'success' });
    } catch (e) {
      console.error(e);
      push({ message: 'Bulk reject failed.', type: 'error' });
    } finally {
      setBulkRejecting(false);
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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {processingState.active && (
        <ProcessingOverlay 
          title={processingState.title} 
          progress={processingState.progress} 
          currentItem={processingState.item} 
        />
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registrations</h2>
          <p className="text-gray-600">Manage participant registrations</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-100 rounded-lg px-2 border border-gray-200">
                <span className="text-xs text-gray-500 mr-2 font-medium">Email Via:</span>
                <select 
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value as any)}
                    className="bg-transparent border-none py-2 text-sm focus:ring-0 cursor-pointer text-gray-900"
                >
                    <option value="smtp">Hostinger (SMTP)</option>
                    <option value="resend">Resend API</option>
                </select>
             </div>
             
             {/* Stats Cards (existing or other buttons) */}
        </div>
      </div>
          
          {/* Quick Actions Bar - Organized & Responsive */}
          <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 md:gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Actions (only in active view) */}
                {viewMode !== 'trash' && (
                  <>
                    <button
                      onClick={handleBulkApprove}
                      disabled={bulkSaving}
                      className={`flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium ${bulkSaving ? 'opacity-70 cursor-not-allowed':''}`}
                      title="Approve all pending registrations in current filter"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve All Pending
                    </button>
                    
                    <button
                      onClick={handleBulkReject}
                      disabled={bulkRejecting}
                      className={`flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium ${bulkRejecting ? 'opacity-70 cursor-not-allowed':''}`}
                      title="Reject all pending registrations in current filter"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject All Pending
                    </button>

                    <div className="h-8 w-px bg-gray-300 mx-1"></div>
                  </>
                )}

                {/* Selection Actions */}
                <button
                  onClick={handleOpenEmailModal}
                  disabled={selectedIds.size === 0}
                  className={`flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium ${selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  title={`Send email to ${selectedIds.size} selected registration(s)`}
                >
                  <Send size={16} className="mr-2" />
                  Email Selected ({selectedIds.size})
                </button>

                {viewMode === 'trash' ? (
                  <button
                    onClick={doBulkRestore}
                    disabled={bulkSaving || selectedIds.size === 0}
                    className={`flex items-center bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium ${bulkSaving || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-700'}`}
                    title="Restore selected registrations"
                  >
                    <RotateCcw size={16} className="mr-2" />
                    Restore Selected
                  </button>
                ) : null}

                <button
                  onClick={doBulkDelete}
                  disabled={bulkDeleting || selectedIds.size === 0}
                  className={`flex items-center bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium ${bulkDeleting || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-800'}`}
                  title={viewMode === 'trash' ? "Permanently delete selected registrations" : "Move selected to trash"}
                >
                  {bulkDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : <Trash2 size={16} className="mr-2" />}
                  {viewMode === 'trash' ? 'Delete Forever' : 'Delete Selected'}
                </button>
              </div>

              {/* View Toggle */}
              <button
                onClick={() => setViewMode(prev => prev === 'active' ? 'trash' : 'active')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  viewMode === 'trash'
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Trash2 size={16} className="mr-2" />
                {viewMode === 'trash' ? 'Back to Active' : `Trash (${deletedRegistrations.length})`}
              </button>
            </div>
          </div>

        {/* Export Section - Organized & Responsive */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Download size={20} className="mr-2" />
              Export ({filteredRegistrations.length} records)
            </h3>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="rounded"
              />
              <span className="font-medium">Select All Visible</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PDF Exports */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">PDF Exports</div>
              <div className="flex flex-col gap-2">
                <ExportPdfButton
                  rows={filteredRegistrations}
                  columns={pdfColumns}
                  filename={`registrations-${new Date().toISOString().slice(0,10)}.pdf`}
                  className={`flex items-center justify-center bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium ${pdfExporting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-700'}`}
                  watermarkDataUrl={watermarkDataUrl}
                  stampDataUrl={stampDataUrl}
                />
                <button
                  onClick={() => exportRegistrationsToPDF(filteredRegistrations, {
                    filename: `registrations-detailed-${new Date().toISOString().slice(0,10)}.pdf`,
                    title: 'Event Registrations Report',
                    watermarkDataUrl,
                    stampDataUrl
                  })}
                  className="flex items-center justify-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  title="Detailed PDF with team information"
                >
                  <FileText size={16} className="mr-2" />
                  Detailed Report
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => exportEventSummaryPDF(filteredRegistrations, {
                      watermarkDataUrl,
                      stampDataUrl
                    })}
                    className="flex items-center justify-center bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm"
                    title="Summary: Count & Batch breakdown"
                  >
                    <FileText size={14} className="mr-1" />
                    Summary
                  </button>
                  <button
                    onClick={() => exportRegistrationsByEventPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
                    className="flex items-center justify-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    title="PDF grouped by event"
                  >
                    <FileText size={14} className="mr-1" />
                    By Event
                  </button>
                  <button
                    onClick={() => exportRegistrationsByStatusPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
                    className="flex items-center justify-center bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    title="PDF grouped by status"
                  >
                    <FileText size={14} className="mr-1" />
                    By Status
                  </button>
                </div>
              </div>
            </div>

            {/* Excel Exports */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Excel Exports</div>
              <div className="flex flex-col gap-2">
                {exportOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.action}
                    className={`flex items-center justify-center ${option.label === 'Send Email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium`}
                  >
                    {option.label === 'Send Email' ? <Send size={16} className="mr-2" /> : <Download size={16} className="mr-2" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings - Collapsible & Responsive */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-4">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings size={20} className="mr-2" />
              Advanced Settings
            </h3>
            <ChevronDown 
              size={20} 
              className={`text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvancedSettings && (
            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 border-t pt-4">
              {/* PDF Watermark & Stamp */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Watermark Section */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">PDF Watermark</div>
                  {watermarkUrl ? (
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={watermarkUrl || undefined} 
                        alt="Watermark preview" 
                        className="h-10 w-auto opacity-50 border border-gray-300 rounded"
                      />
                      <span className="text-xs text-green-600 font-medium">Active</span>
                      <button
                        onClick={handleWatermarkDelete}
                        className="ml-auto text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mb-2">No watermark set</div>
                  )}
                  <label className={`flex items-center justify-center bg-gray-600 text-white px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-700 transition-colors ${uploadingWatermark ? 'opacity-60 cursor-wait' : ''}`}>
                    {uploadingWatermark ? 'Uploading...' : 'Upload PNG/SVG'}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      onChange={handleWatermarkUpload}
                      className="hidden"
                      disabled={uploadingWatermark}
                    />
                  </label>
                </div>

                {/* Stamp Section */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">PDF Stamp</div>
                  {stampUrl ? (
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={stampUrl || undefined} 
                        alt="Stamp preview" 
                        className="h-10 w-auto border border-gray-300 rounded"
                      />
                      <span className="text-xs text-green-600 font-medium">Active</span>
                      <button
                        onClick={handleStampDelete}
                        className="ml-auto text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mb-2">No stamp set</div>
                  )}
                  <label className={`flex items-center justify-center bg-amber-600 text-white px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-amber-700 transition-colors ${uploadingStamp ? 'opacity-60 cursor-wait' : ''}`}>
                    {uploadingStamp ? 'Uploading...' : 'Upload Stamp'}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      onChange={handleStampUpload}
                      className="hidden"
                      disabled={uploadingStamp}
                    />
                  </label>
                </div>
              </div>

              {/* Export Options */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Export Options</div>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setShowColumnModal(true)}
                    className="flex items-center bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    title="Choose export columns & presets"
                  >
                    <Filter size={14} className="mr-2" />
                    Select Columns
                  </button>
                  
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={pdfExcludeIdCollege}
                      onChange={(e) => setPdfExcludeIdCollege(e.target.checked)}
                      className="rounded"
                    />
                    <span>PDF: Exclude ID & College</span>
                  </label>
                </div>
              </div>

              {/* Registration Settings */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Registration Form Settings</div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={registrationInstitutionVisible}
                      onChange={(e) => setRegistrationInstitutionVisible(e.target.checked)}
                      className="rounded"
                    />
                    <span>Show Institution Field</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={registrationInstitutionOptional}
                      onChange={(e) => setRegistrationInstitutionOptional(e.target.checked)}
                      disabled={!registrationInstitutionVisible}
                      className="rounded"
                    />
                    <span>Make Optional</span>
                  </label>
                  
                  <button 
                    className={`px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-sm font-medium ${savingRegSettings ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-700'}`} 
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

              {/* Dangerous Actions */}
              {isOwner && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                    <AlertTriangle size={14} className="mr-2" />
                    Danger Zone
                  </div>
                  <button
                    onClick={handleResetSequence}
                    className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    title="Reset Registration ID sequence to 1 - Only use if all registrations are deleted"
                  >
                    <RefreshCw size={14} className="mr-2" />
                    Reset ID Sequence
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select Columns</h3>
              <button onClick={() => setShowColumnModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="flex space-x-2 mb-2">
              {Object.keys(EXPORT_PRESETS).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`px-3 py-1 rounded text-sm border ${exportPreset===p?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 hover:bg-gray-50'}`}
                >{p}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto border p-2 rounded">
              {REGISTRATION_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key as RegistrationColumnKey)}
                    onChange={() => toggleColumn(col.key as RegistrationColumnKey)}
                  />
                  <span>{col.header}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">PDF Split every</label>
              <input type="number" min={0} value={splitThreshold} onChange={e => setSplitThreshold(parseInt(e.target.value)||0)} className="w-24 border rounded px-2 py-1 text-sm" />
              <span className="text-sm text-gray-500">rows (0 = no split)</span>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={()=>setShowColumnModal(false)} className="px-4 py-2 rounded border text-sm">Close</button>
              <button onClick={()=>{ setShowColumnModal(false); push({ message: 'Column selection updated.', type: 'success'}); }} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-500">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(selectedEvent !== 'all' || selectedStatus !== 'all' || selectedParticipantType !== 'all' || selectedCategory !== 'all' || selectedEmailStatus !== 'all' || dateFrom || dateTo || searchTerm || showDuplicatesOnly) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 flex items-center">
              <Filter size={16} className="mr-2" />
              Active Filters:
            </span>
            
            {selectedEvent !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Event:</span> {selectedEvent}
                <X size={14} onClick={() => setSelectedEvent('all')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Status:</span> {selectedStatus}
                <X size={14} onClick={() => setSelectedStatus('all')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {selectedParticipantType !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Type:</span> {selectedParticipantType}
                <X size={14} onClick={() => setSelectedParticipantType('all')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Category:</span> {selectedCategory}
                <X size={14} onClick={() => setSelectedCategory('all')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {dateFrom && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">From:</span> {dateFrom}
                <X size={14} onClick={() => setDateFrom('')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {dateTo && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">To:</span> {dateTo}
                <X size={14} onClick={() => setDateTo('')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Search:</span> "{searchTerm}"
                <X size={14} onClick={() => setSearchTerm('')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}

            {selectedEmailStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <span className="text-xs text-gray-500">Email:</span> {selectedEmailStatus === 'sent' ? '✓ Sent' : '✗ Not Sent'}
                <X size={14} onClick={() => setSelectedEmailStatus('all')} className="cursor-pointer hover:text-red-600" />
              </span>
            )}
            
            {showDuplicatesOnly && (
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:border-blue-400 transition-colors">
                <AlertTriangle size={14} className="text-amber-600" />
                Duplicates Only
                <X size={14} onClick={() => setShowDuplicatesOnly(false)} className="cursor-pointer hover:text-red-600" />
              </span>
            )}

            <button
              onClick={() => {
                setSelectedEvent('all');
                setSelectedStatus('all');
                setSelectedCategory('all');
                setSelectedParticipantType('all');
                setSelectedEmailStatus('all');
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
                setShowDuplicatesOnly(false);
              }}
              className="ml-auto inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              <X size={14} />
              Clear All
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            Showing <span className="font-semibold">{filteredRegistrations.length}</span> of <span className="font-semibold">{registrations.length}</span> registrations
          </div>
        </div>
      )}

      {/* Filters Section - Reorganized */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter size={20} className="mr-2" />
            Filters
          </h3>
          <div className="text-sm text-gray-600">
            {filteredRegistrations.length} results
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Event Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Event</label>
              <div className="relative">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all" className="text-gray-900">All Events ({registrations.length})</option>
                  {uniqueEvents.map(eventTitle => (
                    <option key={eventTitle} value={eventTitle} className="text-gray-900">
                      {eventTitle} ({eventCounts[eventTitle] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <div className="relative">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all" className="text-gray-900">All Statuses</option>
                  <option value="pending" className="text-gray-900">Pending</option>
                  <option value="approved" className="text-gray-900">Approved</option>
                  <option value="rejected" className="text-gray-900">Rejected</option>
                </select>
              </div>
            </div>

            {/* Participant Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedParticipantType}
                  onChange={(e) => setSelectedParticipantType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all" className="text-gray-900">All Types</option>
                  {uniqueParticipantTypes.map(type => (
                    <option key={type} value={type} className="text-gray-900">
                      {type} ({participantTypeCounts[type] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email Status Filter - Only show for active view (not trash) */}
            {viewMode === 'active' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Status</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={selectedEmailStatus}
                    onChange={(e) => setSelectedEmailStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all" className="text-gray-900">All Emails</option>
                    <option value="sent" className="text-gray-900">✓ Email Sent</option>
                    <option value="not-sent" className="text-gray-900">✗ Email Not Sent</option>
                  </select>
                </div>
              </div>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, email, college..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
          >
            <span className="flex items-center">
              <Settings size={16} className="mr-2" />
              Advanced Filters
            </span>
            <ChevronDown 
              size={16} 
              className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvancedFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all" className="text-gray-900">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category} className="text-gray-900">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duplicates Filter */}
              <div className="md:col-span-3">
                <label className={`inline-flex items-center space-x-3 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${showDuplicatesOnly ? 'bg-amber-50 border-amber-400' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={showDuplicatesOnly} 
                      onChange={(e) => setShowDuplicatesOnly(e.target.checked)} 
                      className="peer appearance-none w-5 h-5 border-2 border-gray-400 rounded checked:bg-amber-600 checked:border-amber-600 focus:ring-2 focus:ring-amber-500" 
                    />
                    <CheckCircle className="absolute w-4 h-4 text-white hidden peer-checked:block pointer-events-none left-0.5" />
                  </div>
                  <span className="flex items-center text-sm font-medium">
                    <AlertTriangle size={16} className="mr-2 text-amber-600" />
                    Show Duplicates Only
                    <span className="ml-2 text-xs text-gray-500">(Same email/phone for event)</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards - Enhanced & Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Registrations */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-4 md:p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <div className="text-3xl md:text-4xl font-bold text-blue-700">{filteredRegistrations.length}</div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Total Registrations</div>
          <div className="text-xs text-gray-600 mt-1">
            {filteredRegistrations.length !== registrations.length && (
              <span>of {registrations.length} total</span>
            )}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-md p-4 md:p-6 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-amber-600" />
            <div className="text-3xl md:text-4xl font-bold text-amber-700">
              {filteredRegistrations.filter(r => r.status === 'pending').length}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Pending</div>
          <div className="text-xs text-gray-600 mt-1">Awaiting approval</div>
        </div>

        {/* Approved */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-4 md:p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            <div className="text-3xl md:text-4xl font-bold text-green-700">
              {filteredRegistrations.filter(r => r.status === 'approved').length}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Approved</div>
          <div className="text-xs text-gray-600 mt-1">Confirmed participants</div>
        </div>

        {/* Rejected */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md p-4 md:p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
            <div className="text-3xl md:text-4xl font-bold text-red-700">
              {filteredRegistrations.filter(r => r.status === 'rejected').length}
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-700">Rejected</div>
          <div className="text-xs text-gray-600 mt-1">Not approved</div>
        </div>
      </div>

      {/* Registrations List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewMode === 'trash' ? 'Deleted On' : 'Date'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.map((registration) => (
                <React.Fragment key={registration.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <input type="checkbox" checked={selectedIds.has(registration.id)} onChange={() => toggleRowSelect(registration.id)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {((registration as any).photo_url) ? (
                            <img
                              src={(photoPreviewMap[registration.id] || (registration as any).photo_url) as any}
                              alt={`${registration.full_name} photo`}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                              N/A
                            </div>
                          )}
                        </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {registration.full_name}
                              {duplicateIds.has(registration.id) && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200"
                                title="Duplicate registration detected for this event + email/phone"
                              >
                                Duplicate
                              </span>
                            )}
                              {/* Email Status Indicator */}
                              {registration.status === 'approved' && (() => {
                                const emailStatus = emailStatusMap[registration.id];
                                if (emailStatus?.sent) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200"
                                      title={`Confirmation email sent (${emailStatus.count} time${emailStatus.count > 1 ? 's' : ''})`}
                                    >
                                      <MailCheck size={10} />
                                      Sent
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200"
                                      title="Confirmation email not sent"
                                    >
                                      <MailX size={10} />
                                      Not Sent
                                    </span>
                                  );
                                }
                              })()}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {registration.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone size={12} className="mr-1" />
                            {registration.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{registration.event_title}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Building size={12} className="mr-1" />
                        {registration.college}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {registration.is_team_registration ? 'Team' : 'Individual'}
                      </div>
                      {registration.is_team_registration && (
                        <div className="text-sm text-gray-500">
                          {registration.team_name} ({registration.total_members} members)
                        </div>
                      )}
                      <div className="text-xs text-gray-500">{registration.participant_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(registration.status)}`}>
                        {getStatusIcon(registration.status)}
                        <span className="ml-1 capitalize">{registration.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {viewMode === 'trash' ? (
                        <div>
                          <div>{new Date((registration as any).deleted_at).toLocaleDateString()}</div>
                          <div className="text-xs text-red-500">
                            {Math.max(0, 7 - Math.floor((Date.now() - new Date((registration as any).deleted_at).getTime()) / (1000 * 60 * 60 * 24)))} days left
                          </div>
                        </div>
                      ) : (
                        new Date(registration.registration_date).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {viewMode === 'active' ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newId = expandedRegistration === registration.id ? null : registration.id;
                        setExpandedRegistration(newId);
                        if (newId) fetchEmailLogs(newId); // Fetch logs
                      }}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    {registration.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(registration.id, 'approved')}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Approve Registration"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleRejectClick(registration.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Reject Registration"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {registration.status === 'approved' && (
                        <button
                            onClick={async () => {
                                if (confirm(`Resend confirmation email to ${registration.full_name}?`)) {
                                    const success = await sendApprovalEmail(registration);
                                    if (success) {
                                        push({ message: `Email sent to ${registration.full_name}`, type: 'success' });
                                        // Refresh email status
                                        const { data } = await supabase
                                          .from('email_logs')
                                          .select('registration_id, status, template_type')
                                          .eq('registration_id', registration.id)
                                          .eq('template_type', 'confirmation');
                                        if (data && data.length > 0) {
                                          setEmailStatusMap(prev => ({
                                            ...prev,
                                            [registration.id]: { 
                                              sent: data.some(log => log.status === 'sent'), 
                                              count: data.length 
                                            }
                                          }));
                                        }
                                    } else {
                                        push({ message: `Failed to send email to ${registration.full_name}`, type: 'error' });
                                    }
                                }
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Resend Confirmation Email"
                        >
                            <Send size={16} />
                        </button>
                    )}

                    {registration.status !== 'pending' && isOwner && (
                      <button
                        onClick={() => handleStatusUpdate(registration.id, 'pending')}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Undo (Revert to Pending)"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRegistration(registration.id)}
                      disabled={deletingIds.has(registration.id)}
                      className={`p-1 rounded transition-colors ${
                        deletingIds.has(registration.id)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                      }`}
                      title="Move to Trash"
                    >
                      {deletingIds.has(registration.id) ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestoreRegistration(registration.id)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                        title="Restore Registration"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRegistration(registration.id)}
                        disabled={deletingIds.has(registration.id)}
                        className={`p-1 rounded transition-colors ${
                          deletingIds.has(registration.id)
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                        }`}
                        title="Permanently Delete"
                      >
                        {deletingIds.has(registration.id) ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedRegistration === registration.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Registration Details</h4>
                              <div className="space-y-1 sm:space-y-2">
                                <EditableRow 
                                  label="Full Name" 
                                  value={registration.full_name} 
                                  onSave={async (val) => {
                                    const { error } = await supabase.from('registrations').update({ full_name: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status); 
                                    push({ message: 'Name updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                                <div className="flex items-start gap-2 min-h-[24px] text-sm">
                                  <strong className="text-gray-900 w-[140px] flex-shrink-0 pt-0.5">Registration ID:</strong>
                                  <span className="text-gray-700 font-mono text-xs pt-0.5 select-all">{registration.id}</span>
                                </div>
                                <EditableRow 
                                  label="College" 
                                  value={registration.college} 
                                  onSave={async (val) => {
                                    const { error } = await supabase.from('registrations').update({ college: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
                                    push({ message: 'College updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                                <EditableRow 
                                  label="Email" 
                                  value={registration.email} 
                                  onSave={async (val) => {
                                    const enc = encryptData(val);
                                    const { error } = await supabase.from('registrations').update({ email: enc }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
                                    push({ message: 'Email updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                                <EditableRow 
                                  label="Phone" 
                                  value={registration.phone} 
                                  onSave={async (val) => {
                                    const enc = encryptData(val);
                                    const { error } = await supabase.from('registrations').update({ phone: enc }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
                                    push({ message: 'Phone updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                                <EditableRow 
                                  label="Part. Type" 
                                  value={registration.participant_type} 
                                  onSave={async (val) => {
                                    const { error } = await supabase.from('registrations').update({ participant_type: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
                                    push({ message: 'Participant type updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                                <div className="flex items-start gap-2 min-h-[24px] text-sm">
                                  <strong className="text-gray-900 w-[140px] flex-shrink-0 pt-0.5">Date:</strong>
                                  <span className="text-gray-700 pt-0.5">{new Date(registration.registration_date).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            {((registration as any).photo_url) && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Photo</h4>
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={(registration as any).photo_url as any}
                                    alt={`${registration.full_name} photo`}
                                    className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex items-center gap-3">
                                    <a
                                      href={(registration as any).photo_url as any}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >Open full</a>
                                    <button
                                      onClick={() => downloadPhoto((registration as any).photo_url as string, registration.full_name)}
                                      className="text-gray-700 hover:text-gray-900 text-sm cursor-pointer"
                                    >Download</button>
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
                                    const { error } = await supabase.from('registrations').update({ team_name: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
                                    push({ message: 'Team name updated', type: 'success' });
                                    return true;
                                  }} 
                                  canEdit={isOwner} 
                                />
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Team Members ({registration.total_members})
                              </h4>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {safeTeamMembers(registration).map((member: any, index: number) => (
                                  <div key={index} className="bg-white p-3 rounded border space-y-2">
                                    <EditableRow 
                                      label="Name" 
                                      value={member.name} 
                                      onSave={async (val) => {
                                        const members = safeTeamMembers(registration);
                                        members[index] = { ...members[index], name: val };
                                        const { error } = await supabase.from('registrations').update({ team_members: members }).eq('id', registration.id);
                                        if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                        await updateRegistrationStatus(registration.id, registration.status);
                                        return true;
                                      }}
                                      canEdit={isOwner}
                                      className="!min-h-[24px]"
                                    />
                                    <EditableRow 
                                      label="Email" 
                                      value={member.email} 
                                      onSave={async (val) => {
                                        const members = safeTeamMembers(registration);
                                        members[index] = { ...members[index], email: val };
                                        const { error } = await supabase.from('registrations').update({ team_members: members }).eq('id', registration.id);
                                        if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                        await updateRegistrationStatus(registration.id, registration.status);
                                        return true;
                                      }}
                                      canEdit={isOwner}
                                      className="!min-h-[24px]"
                                    />
                                    <EditableRow 
                                      label="Phone" 
                                      value={member.phone} 
                                      onSave={async (val) => {
                                        const members = safeTeamMembers(registration);
                                        members[index] = { ...members[index], phone: val };
                                        const { error } = await supabase.from('registrations').update({ team_members: members }).eq('id', registration.id);
                                        if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                        await updateRegistrationStatus(registration.id, registration.status);
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
                          <div className="mt-6 border-t pt-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Notification History</h4>
                            {logsLoading ? (
                                <p className="text-sm text-gray-500">Loading logs...</p>
                            ) : emailLogs.length > 0 ? (
                                <div className="bg-white rounded border overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {emailLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="px-3 py-2 text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-sm text-gray-900 capitalize">{log.template_type}</td>
                                                    <td className="px-3 py-2 text-sm">
                                                        <span className={`px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {log.status === 'sent' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                            <span className="capitalize">{log.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-500 uppercase">{log.provider}</td>
                                                    <td className="px-3 py-2 text-sm text-gray-500 font-mono text-xs">
                                                        {log.template_type === 'update' && log.details?.newDetails ? (
                                                            <div className="space-y-1">
                                                                <div className="text-orange-700 font-medium">Updates:</div>
                                                                {log.details.newDetails.date && <div>📅 {log.details.newDetails.date}</div>}
                                                                {log.details.newDetails.time && <div>⏰ {log.details.newDetails.time}</div>}
                                                                {log.details.newDetails.venue && <div>📍 {log.details.newDetails.venue}</div>}
                                                            </div>
                                                        ) : log.template_type === 'confirmation' ? (
                                                            <span>Event: {log.details?.eventTitle}</span>
                                                        ) : (
                                                            <span className="truncate max-w-xs block" title={JSON.stringify(log.details)}>{JSON.stringify(log.details || {})}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No emails sent yet.</p>
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
        </div>

        {/* No Results */}
        {filteredRegistrations.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations found</h3>
            <p className="text-gray-500">
              {registrations.length === 0 
                ? "No registrations have been submitted yet."
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        )}
      </div>
      {/* Rejection Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Reject Registration</h3>
                <p className="text-sm text-gray-600 mb-4">Please provide a reason for this rejection. This will be emailed to the user.</p>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border rounded p-2 mb-4 text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                    rows={4}
                    placeholder="e.g., ID card not clear, Invalid details..."
                />
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        disabled={isSendingRejection}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmRejection}
                        disabled={isSendingRejection || !rejectionReason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                    >
                        {isSendingRejection ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : 'Reject & Notify'}
                    </button>
                </div>
            </div>
        </div>
      )}
      {/* Custom Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Mail size={20} className="text-blue-600" />
                Send Email to {selectedIds.size} Recipient(s)
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Template Type Selector */}
                <div className="grid grid-cols-3 gap-4">
                    <button 
                        onClick={() => setEmailTemplate('winner')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${emailTemplate === 'winner' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Award size={24} className={emailTemplate === 'winner' ? 'text-yellow-600' : 'text-gray-400'} />
                        <span className="font-bold text-sm">Winner</span>
                    </button>
                    <button 
                        onClick={() => setEmailTemplate('selection')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${emailTemplate === 'selection' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <CheckCircle size={24} className={emailTemplate === 'selection' ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="font-bold text-sm">Selection</span>
                    </button>
                    <button 
                        onClick={() => setEmailTemplate('custom')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${emailTemplate === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <Mail size={24} className={emailTemplate === 'custom' ? 'text-blue-600' : 'text-gray-400'} />
                        <span className="font-bold text-sm">Custom</span>
                    </button>
                </div>

                {/* Dynamic Inputs */}
                {emailTemplate === 'winner' && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm text-yellow-900">
                             <Sparkles size={16} className="inline mr-2" />
                             Sends a celebratory email with gold/yellow theme.
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Position</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {['Winner', '1st Runner Up', '2nd Runner Up'].map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => setEmailAdditionalData({...emailAdditionalData, position: pos})}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${emailAdditionalData.position === pos ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white border-gray-300 text-gray-600 hover:border-yellow-400'}`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-yellow-500 outline-none text-gray-900"
                                placeholder="Or type custom position..."
                                value={emailAdditionalData.position || ''}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, position: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message (Optional)</label>
                            <textarea 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-yellow-500 outline-none h-24 text-gray-900"
                                placeholder="Any specific instructions for the winner..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {emailTemplate === 'selection' && (
                    <div className="space-y-4">
                         <div className="bg-teal-50 p-4 rounded border border-teal-200 text-sm text-teal-900">
                             <CheckCircle size={16} className="inline mr-2" />
                             Sends a professional selection notice (Green/Teal theme).
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Round Cleared</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500 outline-none text-gray-900"
                                placeholder="e.g. preliminary round, audition round, first evaluation"
                                value={emailAdditionalData.roundCleared || 'preliminary round'}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, roundCleared: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selection Stage</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500 outline-none text-gray-900"
                                placeholder="e.g. Round 2, Finals, Interview Round"
                                value={emailAdditionalData.stage || ''}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, stage: e.target.value})}
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message (Optional)</label>
                            <textarea 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500 outline-none h-24 text-gray-900"
                                placeholder="Instructions for the next round..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {emailTemplate === 'custom' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                placeholder="e.g. Important Update regarding..."
                                value={emailCustomSubject}
                                onChange={e => setEmailCustomSubject(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                            <textarea 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none h-32 text-gray-900"
                                placeholder="Type your full message here..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            
                {/* Preview Box - Simple text preview of key vars to avoid full HTML complexity in client */}
                <div className="bg-gray-100 p-4 rounded text-sm text-gray-800 space-y-1">
                    <p className="font-bold text-gray-900 uppercase mb-2">Summary Preview</p>
                    <p><strong className="text-gray-900">Recipients:</strong> {selectedIds.size} users</p>
                    <p><strong className="text-gray-900">Template:</strong> {emailTemplate.toUpperCase()}</p>
                    <p><strong className="text-gray-900">Subject:</strong> {
                        emailTemplate === 'winner' ? `🎉 Congratulations! You are a ${emailAdditionalData.position || 'Winner'}...` :
                        emailTemplate === 'selection' ? `Selection Update: You're selected for ${emailAdditionalData.stage || 'next round'}!` :
                        emailCustomSubject || '(No subject)'
                    }</p>
                </div>

            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <button 
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSendCustomEmail}
                    disabled={emailSending}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2 disabled:opacity-50"
                >
                    {emailSending ? (
                        <>
                           <RefreshCw size={18} className="animate-spin" /> Sending...
                        </>
                    ) : (
                        <>
                           <Send size={18} /> Send Application
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};