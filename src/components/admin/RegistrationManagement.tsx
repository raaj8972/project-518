import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Download, Filter, Search, Calendar, Users, Mail, Phone, Building, Eye, Trash2, RefreshCw, FileText, RotateCcw, AlertTriangle, X, Send, Award, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { exportRegistrationsToExcel } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, RegistrationColumnKey } from '../../utils/reportExport';
import { exportRegistrationsToPDF, exportRegistrationsByEvent as exportRegistrationsByEventPDF, exportRegistrationsByStatus as exportRegistrationsByStatusPDF, preloadWatermark, generateRegistrationReceiptPDF } from '../../utils/pdfExport';
import ExportPdfButton from '../../components/ExportPdfButton';
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

export const RegistrationManagement: React.FC = () => {
  const { events, registrations, deletedRegistrations, updateRegistrationStatus, deleteRegistration, restoreRegistration, permanentDeleteRegistration, bulkApproveRegistrations, bulkRejectRegistrations, bulkDeleteRegistrations, bulkRestoreRegistrations, bulkPermanentDeleteRegistrations, resetRegistrationIdSequence, siteSettings, updateSiteSettings, adminUsers, eventCoordinators } = useData();
  const { user } = useAuth();
  
  const isOwner = useMemo(() => {
    const admin = adminUsers?.find(u => u.user_id === user?.id);
    return admin?.role === 'owner' || admin?.is_primary;
  }, [adminUsers, user]);

  const { push } = useToast();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('all');
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
      registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.college.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Duplicate filter
    const matchesDuplicate = showDuplicatesOnly ? duplicateIds.has(registration.id) : true;

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
    
    return matchesEvent && matchesStatus && matchesCategory && matchesParticipantType && matchesSearch && matchesDate && matchesDuplicate;
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
  const uniqueEvents = Array.from(new Set(registrations.map(reg => reg.event_title)));
  const uniqueCategories = Array.from(new Set(registrations.map(reg => (reg as any).event_category).filter(Boolean)));
  const uniqueParticipantTypes = Array.from(new Set(registrations.map(reg => reg.participant_type).filter(Boolean)));
  
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

  // Helper to send approval email (extracted for reuse)
  const sendApprovalEmail = async (reg: any) => { // using any to avoid type gymnastics with the join
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      // Get event details to include in email
      const event = events.find(e => e.id === reg.event_id);

      if (token) {
          // Generate PDF receipt
          let pdfBase64: string | null = null;
          try {
            pdfBase64 = await generateRegistrationReceiptPDF(reg, watermarkDataUrl, stampDataUrl);
          } catch (pdfError) {
            console.error('Failed to generate PDF receipt:', pdfError);
            // Continue sending email even if PDF fails
          }

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
            const result = await sendApprovalEmail(reg);
            if (result.success) {
                push({ message: `Status updated & Email sent to ${reg.full_name}!`, type: 'success' });
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
    if (deletingIds.has(registrationId)) return;

    const registration = registrations.concat(deletedRegistrations).find(r => r.id === registrationId);
    if (!registration) {
      push({ message: 'Registration not found.', type: 'error' });
      return;
    }

    const isTrash = viewMode === 'trash';
    const confirmMessage = isTrash
      ? `PERMANENTLY DELETE registration for "${registration.full_name}"?\n\nThis cannot be undone.`
      : `Move registration for "${registration.full_name}" to Trash?`;
    
    if (confirm(confirmMessage)) {
      setDeletingIds(prev => new Set(prev).add(registrationId));
      try {
        if (isTrash) {
          await permanentDeleteRegistration(registrationId);
          push({ message: 'Registration permanently deleted.', type: 'success' });
        } else {
          await deleteRegistration(registrationId);
          push({ message: 'Registration moved to Trash.', type: 'success' });
        }
        if (expandedRegistration === registrationId) setExpandedRegistration(null);
      } catch (error) {
        console.error('Error deleting registration:', error);
        push({ message: 'Failed to delete registration.', type: 'error' });
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
        return <Calendar size={16} className="text-yellow-600" />;
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
      
      // Update DB status first
      await (bulkApproveRegistrations?.(ids));
      push({ message: `Approved ${pendingRegs.length} registrations. Sending emails...`, type: 'success' });
      
      // Send emails sequentially (or parallel with limit) to avoid rate limits
      // Using sequence to be safe and provide granular feedback if needed, 
      // but purely sequential might be slow. Let's do small batches or just parallel catch-all.
      // Netlify functions might time out if we wait for all.
      // For now, let's just fire them off.
      let sentCount = 0;
      const CHUNK_SIZE = 5; 
      
      for (let i = 0; i < pendingRegs.length; i += CHUNK_SIZE) {
          const chunk = pendingRegs.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(async (reg) => {
              const res = await sendApprovalEmail(reg);
              if (res && res.success) sentCount++;
          }));
      }

      push({ message: `Sent ${sentCount}/${pendingRegs.length} confirmation emails.`, type: 'success' });

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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
          
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkSaving}
              className={`flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm ${bulkSaving ? 'opacity-70 cursor-not-allowed':''}`}
              title="Approve all pending registrations"
              hidden={viewMode === 'trash'}
            >
              <CheckCircle size={16} className="mr-2" />
              Approve All
            </button>
            
            <button
              onClick={handleBulkReject}
              disabled={bulkRejecting}
              className={`flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-500 transition-colors text-sm ${bulkRejecting ? 'opacity-70 cursor-not-allowed':''}`}
              title="Reject all pending registrations"
              hidden={viewMode === 'trash'}
            >
              <XCircle size={16} className="mr-2" />
              Reject All
            </button>

            {/* Trash View Toggle */}
            <button
              onClick={() => setViewMode(prev => prev === 'active' ? 'trash' : 'active')}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${
                viewMode === 'trash'
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Trash2 size={16} className="mr-2" />
              {viewMode === 'trash' ? 'Back to Active' : `Trash (${deletedRegistrations.length})`}
            </button>

            {viewMode === 'trash' && (
              <button
                onClick={doBulkRestore}
                disabled={bulkSaving}
                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-500 transition-colors text-sm"
              >
                <RotateCcw size={16} className="mr-2" />
                Restore Selected
              </button>
            )}

            <button
              onClick={doBulkDelete}
              disabled={bulkDeleting || selectedIds.size === 0}
              className={`flex items-center bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm ${bulkDeleting || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-600'}`}
              title="Delete selected registrations"
            >
              {bulkDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : <Trash2 size={16} className="mr-1" />}
              Delete Selected
            </button>
          </div>
        </div>

        {/* Export & Tools Row */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {/* Watermark Upload Section */}
          <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">PDF Watermark:</span>
            {watermarkUrl ? (
              <>
                <img 
                  src={watermarkUrl} 
                  alt="Watermark preview" 
                  className="h-8 w-auto opacity-50 border border-gray-300 rounded"
                />
                <span className="text-xs text-green-600 font-medium">Active</span>
                <button
                  onClick={handleWatermarkDelete}
                  className="text-xs text-red-600 hover:text-red-700 underline"
                >
                  Remove
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">No watermark set</span>
            )}
            <label className={`flex items-center bg-gray-600 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-gray-500 transition-colors ${uploadingWatermark ? 'opacity-60 cursor-wait' : ''}`}>
              {uploadingWatermark ? 'Uploading...' : 'Upload PNG/SVG'}
              <input
                type="file"
                accept="image/png,image/svg+xml"
                onChange={handleWatermarkUpload}
                className="hidden"
                disabled={uploadingWatermark}
              />
            </label>

            <span className="text-gray-300 mx-2">|</span>

            {/* Stamp Upload Section */}
            <span className="text-sm font-medium text-gray-600">Stamp:</span>
            {stampUrl ? (
              <>
                <img 
                  src={stampUrl} 
                  alt="Stamp preview" 
                  className="h-8 w-auto border border-gray-300 rounded"
                />
                <span className="text-xs text-green-600 font-medium">Active</span>
                <button
                  onClick={handleStampDelete}
                  className="text-xs text-red-600 hover:text-red-700 underline"
                >
                  Remove
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">No stamp set</span>
            )}
            <label className={`flex items-center bg-amber-600 text-white px-2 py-1 rounded text-xs cursor-pointer hover:bg-amber-500 transition-colors ${uploadingStamp ? 'opacity-60 cursor-wait' : ''}`}>
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
          
          {/* PDF Exports */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">PDF Export:</span>
            <ExportPdfButton
              rows={filteredRegistrations}
              columns={pdfColumns}
              filename={`registrations-${new Date().toISOString().slice(0,10)}.pdf`}
              className={`flex items-center bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm ${pdfExporting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-500'}`}
              watermarkDataUrl={watermarkDataUrl}
              stampDataUrl={stampDataUrl}
            />
            <button
              onClick={() => exportRegistrationsToPDF(filteredRegistrations, {
                filename: `registrations-report-${new Date().toISOString().slice(0,10)}.pdf`,
                title: 'Event Registrations Report',
                watermarkDataUrl,
                stampDataUrl
              })}
              className="flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors text-sm"
              title="Export detailed PDF with team information"
            >
              <FileText size={14} className="mr-1" />
              Detailed
            </button>
            <button
              onClick={() => exportRegistrationsByEventPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
              className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-500 transition-colors text-sm"
              title="Export PDF grouped by event"
            >
              <FileText size={14} className="mr-1" />
              By Event
            </button>
            <button
              onClick={() => exportRegistrationsByStatusPDF(filteredRegistrations, watermarkDataUrl, stampDataUrl)}
              className="flex items-center bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-500 transition-colors text-sm"
              title="Export PDF grouped by status"
            >
              <FileText size={14} className="mr-1" />
              By Status
            </button>
            
            <span className="text-gray-300 mx-2">|</span>
            
            <span className="text-sm font-medium text-gray-600 mr-2">Excel:</span>
            {exportOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className={`${option.label === 'Send Email' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'} text-white px-3 py-1.5 rounded-lg transition-colors flex items-center text-sm`}
              >
                {option.label === 'Send Email' ? <Send size={14} className="mr-1" /> : <Download size={14} className="mr-1" />}
                {option.label}
              </button>
            ))}
          </div>

          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
            <button
              onClick={() => setShowColumnModal(true)}
              className="flex items-center bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              title="Choose export columns & presets"
            >
              <Filter size={14} className="mr-1" /> Columns
            </button>
            
            <label className="flex items-center space-x-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={pdfExcludeIdCollege}
                onChange={(e)=>setPdfExcludeIdCollege(e.target.checked)}
                className="rounded"
              />
              <span>PDF: exclude ID & College</span>
            </label>
            
            <label className="flex items-center space-x-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="rounded" />
              <span>Select all visible</span>
            </label>

            <span className="text-gray-300">|</span>

            <div className="flex items-center gap-2">
              <label className="flex items-center space-x-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={registrationInstitutionVisible} onChange={(e) => setRegistrationInstitutionVisible(e.target.checked)} className="rounded" />
                <span>Show Institution</span>
              </label>
              <label className="flex items-center space-x-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={registrationInstitutionOptional} onChange={(e) => setRegistrationInstitutionOptional(e.target.checked)} disabled={!registrationInstitutionVisible} className="rounded" />
                <span>Optional</span>
              </label>
              <button 
                className={`px-2 py-1 rounded bg-yellow-600 text-white text-xs ${savingRegSettings ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-700'}`} 
                disabled={savingRegSettings}
                onClick={async () => {
                  try {
                    setSavingRegSettings(true);
                    await updateSiteSettings({ registration_institution_visible: registrationInstitutionVisible, registration_institution_optional: registrationInstitutionOptional } as any);
                  } catch (e) { console.error(e); } finally { setSavingRegSettings(false); }
                }}
              >Save</button>
            </div>

            <span className="text-gray-300">|</span>

            <button
              onClick={handleResetSequence}
              className="flex items-center bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-500 transition-colors text-sm"
              title="Reset Registration ID sequence to 1"
            >
              <RefreshCw size={14} className="mr-1" /> Reset IDs
            </button>
          </div>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Special Filters Row */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
           <label className={`flex items-center space-x-2 text-sm font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${showDuplicatesOnly ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={showDuplicatesOnly} 
                  onChange={(e) => setShowDuplicatesOnly(e.target.checked)} 
                  className="peer appearance-none w-4 h-4 border border-gray-400 rounded checked:bg-amber-600 checked:border-amber-600 focus:ring-amber-500" 
                />
                <CheckCircle className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none left-0.5" />
              </div>
              <span className="flex items-center">
                <AlertTriangle size={14} className="mr-1.5" />
                Show Duplicates Only
              </span>
           </label>
        </div>

        <div className="grid md:grid-cols-7 gap-4">
          {/* Event Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Event</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Events ({registrations.length})</option>
                {uniqueEvents.map(eventTitle => (
                  <option key={eventTitle} value={eventTitle}>
                    {eventTitle} ({eventCounts[eventTitle] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Participant Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedParticipantType}
                onChange={(e) => setSelectedParticipantType(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Types ({registrations.length})</option>
                {uniqueParticipantTypes.map(type => (
                  <option key={type} value={type}>
                    {type} ({participantTypeCounts[type] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e)=>setDateFrom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e)=>setDateTo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, event, or college..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredRegistrations.length} of {registrations.length} registrations
          </div>
          <button
            onClick={() => {
              setSelectedEvent('all');
              setSelectedStatus('all');
              setSelectedCategory('all');
              setSelectedParticipantType('all');
              setSearchTerm('');
              setDateFrom('');
              setDateTo('');
              setShowDuplicatesOnly(false);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{registrations.length}</div>
          <div className="text-gray-600">Total Registrations</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {registrations.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {registrations.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-gray-600">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {registrations.filter(r => r.status === 'rejected').length}
          </div>
          <div className="text-gray-600">Rejected</div>
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.full_name}
                            {duplicateIds.has(registration.id) && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded textxs font-medium bg-amber-100 text-amber-800" title="Possible duplicate registration (same email/phone for this event)">
                                <AlertTriangle size={12} className="mr-1" />
                                Duplicate
                              </span>
                            )}
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
                              <div className="space-y-1 text-sm text-gray-900">
                                <div><strong className="text-gray-900">Registration ID:</strong> {registration.id}</div>
                                <div><strong className="text-gray-900">Participant Type:</strong> {registration.participant_type}</div>
                                <div><strong className="text-gray-900">College:</strong> {registration.college}</div>
                                <div><strong className="text-gray-900">Registration Date:</strong> {new Date(registration.registration_date).toLocaleString()}</div>
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
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Team Members ({registration.total_members})
                              </h4>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {safeTeamMembers(registration).map((member: any, index: number) => (
                                  <div key={index} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm text-gray-900">{member.name}</div>
                                    <div className="text-xs text-gray-600">{member.email}</div>
                                    <div className="text-xs text-gray-600">{member.phone}</div>
                                  </div>
                                ))}
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