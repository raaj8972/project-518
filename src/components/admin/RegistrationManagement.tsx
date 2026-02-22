import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Search, Filter, Download, Trash2, RefreshCw, 
  CheckCircle, XCircle, 
  Mail, Eye, Loader2, Sparkles, AlertTriangle,
  Phone, Building, Award, Send, Calendar, X, FileText, RotateCcw, ChevronDown, Settings, MailCheck, MailX,
  Pencil, Check, ChevronLeft, ChevronRight, Image as ImageIcon
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
import { useRegistrations } from '../../hooks/useRegistrations';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';

const WhatsAppLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 16" 
    fill="currentColor" 
    className={className}
  >
    <path d="M13.601 2.326A7.854 7.854 0 0 0 6.979 0c-4.308 0-7.796 3.486-7.796 7.793 0 1.954.555 3.553 1.548 4.903l-1.649 4.8 4.92-1.286a7.862 7.862 0 0 0 3.799.965h.004c4.316 0 7.805-3.48 7.805-7.797 0-2.127-.836-4.13-2.316-5.597zM2.844 13.568l.492-1.656-.25-.398A6.366 6.366 0 0 1 1.768 7.793c0-3.522 2.87-6.393 6.398-6.393 1.708 0 3.315.666 4.524 1.874a6.37 6.37 0 0 1 1.87 4.529c0 3.526-2.87 6.397-6.398 6.397-1.618 0-3.14-.627-4.314-1.78l-.348-.344-1.656.492zm9.143-3.072c-.225-.113-1.333-.658-1.54-.733-.207-.075-.357-.112-.508.113-.15.225-.585.733-.717.883-.131.15-.262.169-.487.056-.225-.113-.951-.35-1.812-1.118-.673-.6-1.125-1.34-1.257-1.565-.131-.225-.014-.347.098-.459.1-.1.225-.262.338-.393.113-.131.15-.225.225-.375.075-.15.038-.281-.019-.393-.056-.113-.508-1.224-.696-1.673-.183-.44-.37-.38-.508-.38l-.432-.008c-.15 0-.394.056-.6.281-.207.225-.788.769-.788 1.875 0 1.106.806 2.175.919 2.325.113.15 3.169 4.838 7.675 6.788 1.071.464 1.907.557 2.56.486.726-.079 1.333-.543 1.521-1.066.188-.524.188-.973.131-1.067-.056-.094-.207-.169-.431-.281z"/>
  </svg>
);

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
      <div className="superia-glass-card p-5 rounded-2xl shadow-2xl border-white/10 relative overflow-hidden">
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
  const { events, siteSettings, updateSiteSettings, adminUsers, eventCoordinators, resetRegistrationIdSequence } = useData();
  const { user } = useAuth();

  const isOwner = useMemo(() => {
    const admin = adminUsers?.find(u => u.user_id === user?.id);
    return admin?.role === 'owner' || user?.user_metadata?.is_super_admin;
  }, [user, adminUsers]);

  const { push } = useToast();
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filters State
  const [selectedEvent, setSelectedEvent] = useState<string>(
    coordinatorMode && coordinatorEventId ? String(coordinatorEventId) : 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('all');
  const [selectedEmailStatus, setSelectedEmailStatus] = useState<string>('all'); 
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Registrations using new Hook
  const { 
    registrations, 
    count, 
    isLoading: isRegistrationsLoading,
    refresh: refreshRegistrations,
    stats
  } = useRegistrations({
    page,
    pageSize,
    filters: {
      event: selectedEvent,
      status: selectedStatus,
      type: selectedParticipantType,
      category: selectedCategory,
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
    bulkPermanentDelete: bulkPermanentDeleteRegistrations
  } = useRegistrationMutations(refreshRegistrations);

  // const [bulkSaving, setBulkSaving] = useState(false);
  // const [bulkRejecting, setBulkRejecting] = useState(false);

  // Processing State for Progress Bar
  const [processingState, setProcessingState] = useState<{ active: boolean, title: string, progress: number, item?: string }>({
    active: false, title: '', progress: 0
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
  // const [bulkDeleting, setBulkDeleting] = useState(false);
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

  // Server-side filtered via useRegistrations hook
  const filteredRegistrations = registrations; 


  // Get unique event titles from events context instead of registrations list
  const uniqueEvents = useMemo(() => 
    events.map(e => e.title).sort(),
    [events]
  );

  const uniqueCategories = useMemo(() => 
    // Use event categories context or derive from events if needed. Using events context is safer.
    // If eventCategories context is empty, we can't show them, but that's fine.
    // Assuming eventCategories is available in useData.
    // Actually useData returns eventCategories.
    (useData().eventCategories || []).map(c => c.name).sort(),
    [useData().eventCategories]
  );

  const uniqueParticipantTypes = ['Individual', 'Team', 'Group']; // simplified

  // Use event.current_registrations for counts
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      counts[e.title] = e.current_registrations || 0;
    });
    return counts;
  }, [events]);

  const participantTypeCounts: Record<string, number> = {}; // Simplified/Removed for performance

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
        await bulkPermanentDeleteRegistrations?.(ids); 
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
    try {
      // Use all registrations from current view mode (active or trash)
      // Hook handles the viewMode filtering so registrations IS the correct source
      const sourceRegs = registrations;
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
  }, [registrations]);

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
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case 'rejected':
        return 'bg-red-500/20 text-red-200 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      default:
        return 'bg-amber-500/20 text-amber-200 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={14} className="text-emerald-400" />;
      case 'rejected':
        return <XCircle size={14} className="text-red-400" />;
      default:
        return <AlertTriangle size={14} className="text-amber-400" />;
    }
  };

  const exportOptions = [
    {
      label: 'Send Email',
      action: handleOpenEmailModal
    },
    ...(!coordinatorMode ? [{
      label: 'Export All Registrations',
      action: () => exportRegistrationsToExcel(filteredRegistrations, 'all-registrations.xlsx')
    }] : [])
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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {processingState.active && (
        <ProcessingOverlay 
          title={processingState.title} 
          progress={processingState.progress} 
          currentItem={processingState.item} 
        />
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
            <div className="w-2 h-10 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">Registrations</span>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 tracking-widest uppercase ml-2">v3.0</div>
          </h2>
          <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
            <Users size={14} className="text-indigo-400" />
            Strategic participant lifecycle management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-black/20 backdrop-blur-sm rounded-xl px-3 py-1 border border-white/10">
                <span className="text-xs text-gray-500 mr-2 font-bold uppercase tracking-wide">Email Via:</span>
                <div className="relative">
                  <select 
                      value={emailProvider}
                      onChange={(e) => setEmailProvider(e.target.value as any)}
                      className="bg-transparent border-none py-2 pr-6 text-sm focus:ring-0 cursor-pointer text-white appearance-none font-medium"
                  >
                      <option value="smtp" className="bg-gray-900">Hostinger (SMTP)</option>
                      <option value="resend" className="bg-gray-900">Resend API</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
        </div>
      </div>
          
          {/* Quick Actions Bar */}
          <div className="superia-glass-card rounded-[2rem] p-5 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[80px] group-hover:bg-indigo-500/10 transition-colors duration-700"></div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 md:gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Actions (only in active view) */}
                {viewMode !== 'trash' && (
                  <>
                    <button
                      onClick={handleBulkApprove}
                      disabled={isMutating}
                      className={`flex items-center bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 text-sm font-bold ${isMutating ? 'opacity-70 cursor-not-allowed':''}`}
                      title="Approve all pending registrations in current filter"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve All Pending
                    </button>
                    
                    <button
                      onClick={handleBulkReject}
                      disabled={isMutating}
                      className={`flex items-center bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 text-sm font-bold ${isMutating ? 'opacity-70 cursor-not-allowed':''}`}
                      title="Reject all pending registrations in current filter"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject All Pending
                    </button>

                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                  </>
                )}

                {/* Selection Actions */}
                <button
                  onClick={handleOpenEmailModal}
                  disabled={selectedIds.size === 0}
                  className={`flex items-center bg-blue-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm font-bold ${selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-500'}`}
                  title={`Send email to ${selectedIds.size} selected registration(s)`}
                >
                  <Send size={16} className="mr-2" />
                  Email Selected ({selectedIds.size})
                </button>

                {viewMode === 'trash' ? (
                  <button
                    onClick={doBulkRestore}
                    disabled={isMutating || selectedIds.size === 0}
                    className={`flex items-center bg-emerald-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 text-sm font-bold ${isMutating || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-500'}`}
                    title="Restore selected registrations"
                  >
                    <RotateCcw size={16} className="mr-2" />
                    Restore Selected
                  </button>
                ) : null}

                <button
                  onClick={doBulkDelete}
                  disabled={isMutating || selectedIds.size === 0}
                  className={`flex items-center bg-red-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-700/20 text-sm font-bold ${isMutating || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-600'}`}
                  title={viewMode === 'trash' ? "Permanently delete selected registrations" : "Move selected to trash"}
                >
                  {isMutating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : <Trash2 size={16} className="mr-2" />}
                  {viewMode === 'trash' ? 'Delete Forever' : 'Delete Selected'}
                </button>
              </div>

              {/* View Toggle */}
              <button
                onClick={() => setViewMode(prev => prev === 'active' ? 'trash' : 'active')}
                className={`flex items-center px-4 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg ${
                  viewMode === 'trash'
                    ? 'bg-gray-700 text-white hover:bg-gray-600 shadow-gray-700/20'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15 shadow-white/5'
                }`}
              >
                <Trash2 size={16} className="mr-2" />
                {viewMode === 'trash' ? 'Back to Active' : `Trash (${stats?.trash || 0})`}
              </button>
            </div>
          </div>

        {/* Export Section */}
        <div className="superia-glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group">
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full translate-x-1/3 translate-y-1/4 blur-[100px] group-hover:bg-purple-500/10 transition-colors duration-700"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Download size={20} className="text-purple-400" />
              </div>
              Export ({filteredRegistrations.length} records)
            </h3>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
              />
              <span className="font-bold group-hover:text-white transition-colors">Select All Visible</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Exports */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">PDF Exports</div>
              <div className="flex flex-col gap-2">
                <ExportPdfButton
                  rows={filteredRegistrations}
                  columns={pdfColumns}
                  filename={`registrations-${new Date().toISOString().slice(0,10)}.pdf`}
                  className={`flex items-center justify-center bg-red-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/20 text-sm font-bold ${pdfExporting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-500 hover:-translate-y-0.5'}`}
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
                  className="flex items-center justify-center bg-purple-600 text-white px-4 py-2.5 rounded-xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 text-sm font-bold hover:-translate-y-0.5"
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
                    className="flex items-center justify-center bg-teal-600 text-white px-3 py-2 rounded-xl hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/20 text-sm font-bold"
                    title="Summary: Count & Batch breakdown"
                  >
                    <FileText size={14} className="mr-1" />
                    Summary
                  </button>
                  <button
                    onClick={() => exportRegistrationsByEventPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
                    className="flex items-center justify-center bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 text-sm font-bold"
                    title="PDF grouped by event"
                  >
                    <FileText size={14} className="mr-1" />
                    By Event
                  </button>
                  <button
                    onClick={() => exportRegistrationsByStatusPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
                    className="flex items-center justify-center bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 text-sm font-bold"
                    title="PDF grouped by status"
                  >
                    <FileText size={14} className="mr-1" />
                    By Status
                  </button>
                </div>
              </div>
            </div>

            {/* Excel Exports */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Excel Exports</div>
              <div className="flex flex-col gap-2">
                {exportOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.action}
                    className={`flex items-center justify-center ${option.label === 'Send Email' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'} text-white px-4 py-2.5 rounded-xl transition-all shadow-lg text-sm font-bold hover:-translate-y-0.5`}
                  >
                    {option.label === 'Send Email' ? <Send size={16} className="mr-2" /> : <Download size={16} className="mr-2" />}
                    {option.label}
                  </button>
                ))}
                
                <button
                  onClick={handleCopyPhones}
                  className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-600/20 text-sm font-bold hover:-translate-y-0.5"
                  title="Copy valid phone numbers to clipboard"
                >
                  <Phone size={16} className="mr-2" />
                  Copy Phones
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="superia-glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[80px] group-hover:bg-amber-500/10 transition-colors duration-700"></div>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center justify-between w-full text-left group"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                  <Settings size={20} className="text-purple-400" />
              </div>
              Advanced Settings
            </h3>
            <ChevronDown 
              size={20} 
              className={`text-gray-500 transition-transform group-hover:text-gray-400 ${showAdvancedSettings ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvancedSettings && (
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
                  <label className={`flex items-center justify-center bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:from-gray-500 hover:to-gray-600 transition-all font-bold shadow-lg ${uploadingWatermark ? 'opacity-60 cursor-wait' : 'hover:-translate-y-0.5'}`}>
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
                  <label className={`flex items-center justify-center bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:from-amber-500 hover:to-orange-500 transition-all font-bold shadow-lg ${uploadingStamp ? 'opacity-60 cursor-wait' : 'hover:-translate-y-0.5'}`}>
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

              {/* Registration Settings */}
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
          )}
        </div>

      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="superia-glass-card rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border-white/10">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xl font-black text-white tracking-tight">Select Columns</h3>
              <button onClick={() => setShowColumnModal(false)} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.keys(EXPORT_PRESETS).map(p => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    exportPreset === p 
                      ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >{p}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {REGISTRATION_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center space-x-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key as RegistrationColumnKey)}
                      onChange={() => toggleColumn(col.key as RegistrationColumnKey)}
                      className="peer appearance-none w-4 h-4 rounded border-2 border-gray-500 checked:bg-indigo-500 checked:border-indigo-500 transition-colors"
                    />
                    <Check size={10} className="absolute text-white pointer-events-none left-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors font-medium">{col.header}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center space-x-3 pt-2 border-t border-white/5">
              <label className="text-sm font-medium text-gray-400">PDF Split Threshold</label>
              <input 
                type="number" 
                min={0} 
                value={splitThreshold} 
                onChange={e => setSplitThreshold(parseInt(e.target.value)||0)} 
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
              />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">(0 = no split)</span>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowColumnModal(false)} 
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { setShowColumnModal(false); push({ message: 'Column selection updated.', type: 'success'}); }} 
                className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(selectedEvent !== 'all' || selectedStatus !== 'all' || selectedParticipantType !== 'all' || selectedCategory !== 'all' || selectedEmailStatus !== 'all' || dateFrom || dateTo || searchTerm || showDuplicatesOnly) && (
        <div className="superia-glass-card border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="flex flex-wrap items-center gap-2 relative z-10">
            <span className="text-sm font-bold text-indigo-300 flex items-center shadow-indigo-500/50 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
              <Filter size={16} className="mr-2" />
              Active Filters:
            </span>
            
            {selectedEvent !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Event:</span> {selectedEvent}
                <button onClick={() => setSelectedEvent('all')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Status:</span> {selectedStatus}
                <button onClick={() => setSelectedStatus('all')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {selectedParticipantType !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Type:</span> {selectedParticipantType}
                <button onClick={() => setSelectedParticipantType('all')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Category:</span> {selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {dateFrom && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">From:</span> {dateFrom}
                <button onClick={() => setDateFrom('')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {dateTo && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">To:</span> {dateTo}
                <button onClick={() => setDateTo('')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Search:</span> "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}

            {selectedEmailStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-lg">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Email:</span> {selectedEmailStatus === 'sent' ? '✓ Sent' : '✗ Not Sent'}
                <button onClick={() => setSelectedEmailStatus('all')} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </span>
            )}
            
            {showDuplicatesOnly && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium text-amber-200 border border-amber-500/20 hover:border-amber-400/50 transition-all shadow-lg">
                <AlertTriangle size={14} className="text-amber-400" />
                Duplicates Only
                <button onClick={() => setShowDuplicatesOnly(false)} className="ml-1 hover:text-red-400 p-0.5 rounded-full hover:bg-amber-500/20 transition-colors">
                  <X size={14} />
                </button>
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
              className="ml-auto inline-flex items-center gap-1 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-white/5 hover:border-red-500/30"
            >
              <X size={14} />
              Clear All
            </button>
          </div>
          
          <div className="mt-3 text-xs font-medium text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Showing <span className="text-white font-bold">{filteredRegistrations.length}</span> of <span className="text-gray-400">{registrations.length}</span> registrations
          </div>
        </div>
      )}

      {/* Filters Section - Reorganized */}
      <div className="superia-glass-card rounded-[2.5rem] p-8 border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-x-1/4 -translate-y-1/4 blur-[100px]"></div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white flex items-center tracking-tight">
            <div className="p-2 bg-indigo-500/20 rounded-lg mr-3 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Filter size={20} className="text-indigo-400" />
            </div>
            Smart Filters
          </h3>
          <div className="text-sm font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 shadow-inner">
            {filteredRegistrations.length} results found
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-4 relative z-10">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Primary Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Event Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Event</label>
              <div className="relative group">
                <Filter className="absolute left-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none group-hover:scale-110 transition-transform" />
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  disabled={coordinatorMode}
                  className={`w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all shadow-lg ${coordinatorMode ? 'bg-white/5 cursor-not-allowed opacity-60' : 'bg-black/20 hover:bg-black/30'}`}
                >
                  <option value="all" className="bg-[#050508] text-gray-300">All Events ({registrations.length})</option>
                  {uniqueEvents.map(eventTitle => (
                    <option key={eventTitle} value={eventTitle} className="bg-[#050508] text-white">
                      {eventTitle} ({eventCounts[eventTitle] || 0})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
              <div className="relative group">
                <Filter className="absolute left-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none group-hover:scale-110 transition-transform" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all shadow-lg"
                >
                  <option value="all" className="bg-[#050508] text-gray-300">All Statuses</option>
                  <option value="pending" className="bg-[#050508] text-amber-400">Pending</option>
                  <option value="approved" className="bg-[#050508] text-emerald-400">Approved</option>
                  <option value="rejected" className="bg-[#050508] text-red-400">Rejected</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Participant Type Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Type</label>
              <div className="relative group">
                <Users className="absolute left-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none group-hover:scale-110 transition-transform" />
                <select
                  value={selectedParticipantType}
                  onChange={(e) => setSelectedParticipantType(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all shadow-lg"
                >
                  <option value="all" className="bg-[#050508] text-gray-300">All Types</option>
                  {uniqueParticipantTypes.map(type => (
                    <option key={type} value={type} className="bg-[#050508] text-white">
                      {type} ({participantTypeCounts[type] || 0})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Email Status Filter */}
            {viewMode === 'active' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Email Status</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none group-hover:scale-110 transition-transform" />
                  <select
                    value={selectedEmailStatus}
                    onChange={(e) => setSelectedEmailStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all shadow-lg"
                  >
                    <option value="all" className="bg-[#050508] text-gray-300">All Emails</option>
                    <option value="sent" className="bg-[#050508] text-emerald-400">✓ Email Sent</option>
                    <option value="not-sent" className="bg-[#050508] text-amber-400">✗ Email Not Sent</option>
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className={`${viewMode !== 'active' ? 'md:col-span-1' : ''}`}>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Search</label>
              <div className="relative group">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none group-hover:scale-110 transition-transform" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, email, college..."
                  className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        <div className="border-t border-white/5 pt-4 mt-4 relative z-10">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-between w-full text-left text-sm font-bold text-gray-400 hover:text-white transition-colors group p-2 rounded-lg hover:bg-white/5"
          >
            <span className="flex items-center">
              <Settings size={16} className="mr-2 group-hover:rotate-45 transition-transform duration-500" />
              Advanced Filters
            </span>
            <ChevronDown 
              size={16} 
              className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180 text-indigo-400' : ''}`}
            />
          </button>

          {showAdvancedFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
                <div className="relative group">
                  <Filter className="absolute left-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
                  >
                    <option value="all" className="bg-[#050508] text-gray-300">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category} className="bg-[#050508] text-white">
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">From Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">To Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/20 hover:bg-black/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Duplicates Filter */}
              <div className="md:col-span-3">
                <label className={`inline-flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all cursor-pointer w-full md:w-auto ${showDuplicatesOnly ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/20 border-white/5 hover:bg-black/30'}`}>
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={showDuplicatesOnly} 
                      onChange={(e) => setShowDuplicatesOnly(e.target.checked)} 
                      className="peer appearance-none w-5 h-5 border-2 border-gray-500 rounded checked:bg-amber-500 checked:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-colors" 
                    />
                    <CheckCircle className="absolute w-4 h-4 text-white hidden peer-checked:block pointer-events-none left-0.5" />
                  </div>
                  <span className="flex items-center text-sm font-medium text-gray-300">
                    <AlertTriangle size={16} className={`mr-2 ${showDuplicatesOnly ? 'text-amber-400' : 'text-gray-500'}`} />
                    <span className={showDuplicatesOnly ? 'text-amber-200 font-bold' : ''}>Show Duplicates Only</span>
                    <span className="ml-2 text-xs text-gray-500 font-normal hidden sm:inline">(Same email/phone per event)</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards - Enhanced & Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Registrations */}
        <div className="superia-glass-card rounded-[2rem] p-8 border-blue-500/10 hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-[40px] group-hover:scale-110 transition-transform duration-700"></div>
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
        <div className="superia-glass-card rounded-[2rem] p-8 border-amber-500/10 hover:border-amber-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-[40px] group-hover:scale-110 transition-transform duration-700"></div>
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
        <div className="superia-glass-card rounded-[2rem] p-8 border-green-500/10 hover:border-green-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-[40px] group-hover:scale-110 transition-transform duration-700"></div>
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
        <div className="superia-glass-card rounded-[2rem] p-8 border-red-500/10 hover:border-red-500/30 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full translate-x-1/4 -translate-y-1/4 blur-[40px] group-hover:scale-110 transition-transform duration-700"></div>
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
      <div className="superia-glass-card rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5 backdrop-blur-sm border-b border-white/10">
              <tr>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500/50 shadow-inner" />
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  Participant
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  Event
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  Type
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  Status
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  {viewMode === 'trash' ? 'Deleted On' : 'Date'}
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRegistrations.map((registration) => (
                <React.Fragment key={registration.id}>
                  <tr className="hover:bg-white/[0.05] transition-all duration-300 group/row border-b border-white/5">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <input type="checkbox" checked={selectedIds.has(registration.id)} onChange={() => toggleRowSelect(registration.id)} className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-indigo-500/50" />
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
                            <div className="text-sm font-bold text-white flex items-center gap-2">
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
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-tighter"
                                      title="Confirmation email not sent"
                                    >
                                      <MailX size={10} />
                                      Pending Dispatch
                                    </span>
                                  );
                                }
                              })()}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {registration.email}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center">
                            <Phone size={12} className="mr-1" />
                            {registration.phone}
                            {registration.phone && (() => {
                              const event = events.find((e: any) => e.id === registration.event_id);
                              const groupLink = event?.whatsapp_group_link || '';
                              const firstName = registration.full_name.split(' ')[0];
                              const eventTitle = registration.event_title;
                              
                              const message = `Hello ${firstName}! 👋\n\nYou have successfully registered for *${eventTitle}* at ${BRAND_NAME} ${BRAND_YEAR}! 🎭\n\nPlease join the official WhatsApp group for important updates:\n\n${groupLink || 'Link will be shared soon'}`;
                              
                              const cleanPhone = registration.phone.replace(/[^0-9]/g, '');
                              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                              
                              console.log('WhatsApp Message Details:', {
                                eventId: registration.event_id,
                                hasEvent: !!event,
                                groupLink,
                                messageLength: message.length
                              });
                              
                              return (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 inline-flex items-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded px-1 transition-colors"
                                  title={`Chat on WhatsApp${groupLink ? ' (Link included)' : ' (No link set)'}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <WhatsAppLogo className="w-4 h-4" />
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white/90">{registration.event_title}</div>
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
                    <tr className="animate-in fade-in slide-in-from-top-2 duration-300">
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
                                    const { error } = await supabase.from('registrations').update({ full_name: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status); 
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
                                  <img
                                    src={(registration as any).photo_url as any}
                                    alt={`${registration.full_name} photo`}
                                    className="w-32 h-32 rounded-xl object-cover border-2 border-white/10 shadow-lg hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex flex-col gap-2 w-full">
                                    <a
                                      href={(registration as any).photo_url as any}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-white/10"
                                    >
                                      <Eye size={14} /> View Original
                                    </a>
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
                                    const { error } = await supabase.from('registrations').update({ team_name: val }).eq('id', registration.id);
                                    if (error) { push({ message: 'Update failed', type: 'error' }); return false; }
                                    await updateRegistrationStatus(registration.id, registration.status);
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
                          <div className="mt-8 border-t border-white/10 pt-6">
                            <h4 className="font-black text-[10px] text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Mail size={14} /> Notification History
                            </h4>
                            {logsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold uppercase tracking-tighter animate-pulse">
                                  <Loader2 className="animate-spin" size={14} /> Loading logs...
                                </div>
                            ) : emailLogs.length > 0 ? (
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
          
          {/* Pagination Controls */}
          {count > 0 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, count)} of {count}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1); // Reset to page 1 on size change
                  }}
                  className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isRegistrationsLoading}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-1">
                  {/* Simplified pagination: just show current page */}
                  <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 uppercase tracking-widest shadow-lg backdrop-blur-md">
                    Page {page} of {Math.ceil(count / pageSize) || 1}
                  </span>
                </div>

                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(count / pageSize), p + 1))}
                  disabled={page >= Math.ceil(count / pageSize) || isRegistrationsLoading}
                  className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* No Results */}
        {filteredRegistrations.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center backdrop-blur-xl shadow-2xl mt-12 relative overflow-hidden group">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -z-10 group-hover:bg-indigo-500/10 transition-colors duration-1000" />
            <Users size={64} className="mx-auto text-indigo-500/30 mb-6 animate-pulse" />
            <h3 className="text-xl font-black text-white mb-3 tracking-tight uppercase">No registrations found</h3>
            <p className="text-gray-400 max-w-sm mx-auto font-bold uppercase tracking-widest text-[10px] opacity-60 italic">
              {registrations.length === 0 
                ? "The database is currently empty. No registrations have been submitted yet."
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        )}
      </div>
      {/* Rejection Reason Modal */}
      {rejectingId && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
            <div className="superia-glass-card rounded-2xl p-6 max-w-md w-full shadow-2xl border-white/10">
                <h3 className="text-lg font-black mb-4 text-white flex items-center gap-2">
                  <XCircle className="text-red-500" />
                  Reject Registration
                </h3>
                <p className="text-sm text-gray-300 mb-4">Please provide a reason for this rejection. This will be emailed to the user.</p>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 mb-4 text-white focus:ring-2 focus:ring-red-500/50 outline-none placeholder-gray-600"
                    rows={4}
                    placeholder="e.g., ID card not clear, Invalid details..."
                />
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"
                        disabled={isSendingRejection}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmRejection}
                        disabled={isSendingRejection || !rejectionReason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 shadow-lg shadow-red-600/20 flex items-center gap-2 font-bold transition-all"
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
      , document.body)}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="superia-glass-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-2xl">
              <h3 className="font-black text-white flex items-center gap-3 text-lg">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                   <Mail size={20} className="text-blue-400" />
                </div>
                Send Email to {selectedIds.size} Recipient(s)
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                
                {/* Template Type Selector */}
                <div className="grid grid-cols-3 gap-4">
                    <button 
                        onClick={() => setEmailTemplate('winner')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all duration-300 relative overflow-hidden group ${emailTemplate === 'winner' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'}`}
                    >
                        <div className={`p-3 rounded-full ${emailTemplate === 'winner' ? 'bg-yellow-500/20' : 'bg-black/20 group-hover:bg-black/40'} transition-colors`}>
                           <Award size={24} className={emailTemplate === 'winner' ? 'text-yellow-400' : 'text-gray-500 group-hover:text-gray-300'} />
                        </div>
                        <span className="font-bold text-sm tracking-wide">Winner</span>
                        {emailTemplate === 'winner' && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />}
                    </button>
                    <button 
                        onClick={() => setEmailTemplate('selection')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all duration-300 relative overflow-hidden group ${emailTemplate === 'selection' ? 'border-teal-500/50 bg-teal-500/10 text-teal-200' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'}`}
                    >
                         <div className={`p-3 rounded-full ${emailTemplate === 'selection' ? 'bg-teal-500/20' : 'bg-black/20 group-hover:bg-black/40'} transition-colors`}>
                           <CheckCircle size={24} className={emailTemplate === 'selection' ? 'text-teal-400' : 'text-gray-500 group-hover:text-gray-300'} />
                        </div>
                        <span className="font-bold text-sm tracking-wide">Selection</span>
                        {emailTemplate === 'selection' && <div className="absolute inset-0 bg-teal-500/5 animate-pulse" />}
                    </button>
                    <button 
                        onClick={() => setEmailTemplate('custom')}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all duration-300 relative overflow-hidden group ${emailTemplate === 'custom' ? 'border-blue-500/50 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'}`}
                    >
                         <div className={`p-3 rounded-full ${emailTemplate === 'custom' ? 'bg-blue-500/20' : 'bg-black/20 group-hover:bg-black/40'} transition-colors`}>
                           <Mail size={24} className={emailTemplate === 'custom' ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
                        </div>
                        <span className="font-bold text-sm tracking-wide">Custom</span>
                         {emailTemplate === 'custom' && <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />}
                    </button>
                </div>

                {/* Dynamic Inputs */}
                {emailTemplate === 'winner' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-sm text-yellow-200 flex items-start gap-3">
                             <Sparkles size={18} className="text-yellow-400 mt-0.5" />
                             <div>
                               <strong className="block text-yellow-400 mb-1">Celebratory Theme</strong>
                               Sends a celebratory email with gold/yellow styling.
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Select Position</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {['Winner', '1st Runner Up', '2nd Runner Up'].map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => setEmailAdditionalData({...emailAdditionalData, position: pos})}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${emailAdditionalData.position === pos ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none placeholder-gray-600 transition-all font-medium"
                                placeholder="Or type custom position..."
                                value={emailAdditionalData.position || ''}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, position: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Additional Message (Optional)</label>
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none h-24 placeholder-gray-600 transition-all font-medium custom-scrollbar"
                                placeholder="Any specific instructions for the winner..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {emailTemplate === 'selection' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                         <div className="bg-teal-500/10 p-4 rounded-xl border border-teal-500/20 text-sm text-teal-200 flex items-start gap-3">
                             <CheckCircle size={18} className="text-teal-400 mt-0.5" />
                             <div>
                               <strong className="block text-teal-400 mb-1">Professional Theme</strong>
                               Sends a professional selection notice (Green/Teal styling).
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Round Cleared</label>
                            <input 
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none placeholder-gray-600 transition-all font-medium"
                                placeholder="e.g. preliminary round, audition round, first evaluation"
                                value={emailAdditionalData.roundCleared || 'preliminary round'}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, roundCleared: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Selection Stage</label>
                            <input 
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none placeholder-gray-600 transition-all font-medium"
                                placeholder="e.g. Round 2, Finals, Interview Round"
                                value={emailAdditionalData.stage || ''}
                                onChange={e => setEmailAdditionalData({...emailAdditionalData, stage: e.target.value})}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Additional Message (Optional)</label>
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none h-24 placeholder-gray-600 transition-all font-medium custom-scrollbar"
                                placeholder="Instructions for the next round..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {emailTemplate === 'custom' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Subject Line</label>
                            <input 
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-600 transition-all font-medium"
                                placeholder="e.g. Important Update regarding..."
                                value={emailCustomSubject}
                                onChange={e => setEmailCustomSubject(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Message Body</label>
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none h-32 placeholder-gray-600 transition-all font-medium custom-scrollbar"
                                placeholder="Type your full message here..."
                                value={emailCustomBody}
                                onChange={e => setEmailCustomBody(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            
                {/* Preview Box */}
                <div className="bg-black/30 border border-white/10 p-5 rounded-xl text-sm text-gray-300 space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <p className="font-black text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                        <Eye size={12} className="text-indigo-400" /> Summary Preview
                    </p>
                    <p className="flex justify-between"><strong className="text-gray-500">Recipients:</strong> <span className="text-white font-mono">{selectedIds.size} users</span></p>
                    <p className="flex justify-between"><strong className="text-gray-500">Template:</strong> <span className="text-white font-mono">{emailTemplate.toUpperCase()}</span></p>
                    <p className="flex justify-between items-start gap-4">
                        <strong className="text-gray-500 flex-shrink-0">Subject:</strong> 
                        <span className="text-white text-right italic opacity-80">{
                            emailTemplate === 'winner' ? `🎉 Congratulations! You are a ${emailAdditionalData.position || 'Winner'}...` :
                            emailTemplate === 'selection' ? `Selection Update: You're selected for ${emailAdditionalData.stage || 'next round'}!` :
                            emailCustomSubject || '(No subject)'
                        }</span>
                    </p>
                </div>

            </div>

            <div className="p-5 border-t border-white/10 bg-white/5 rounded-b-2xl flex justify-end gap-3">
                <button 
                    onClick={() => setShowEmailModal(false)}
                    className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSendCustomEmail}
                    disabled={emailSending}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 font-bold flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-all"
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
      , document.body)}
    </div>
  );
};