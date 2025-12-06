import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Download, Filter, Search, Calendar, Users, Mail, Phone, Building, Eye, Trash2, FileCheck, Ban, RefreshCw, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabase';
import { exportRegistrationsToExcel } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, exportCsv, exportExcel, RegistrationColumnKey } from '../../utils/reportExport';
import { exportRegistrationsToPDF, exportRegistrationsByEvent as exportRegistrationsByEventPDF, exportRegistrationsByStatus as exportRegistrationsByStatusPDF, preloadWatermark } from '../../utils/pdfExport';
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
  const { registrations, updateRegistrationStatus, deleteRegistration, bulkApproveRegistrations, bulkRejectRegistrations, bulkDeleteRegistrations, resetRegistrationIdSequence, siteSettings, updateSiteSettings } = useData();
  const { push } = useToast();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('all');
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
  const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [pdfExporting] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<RegistrationColumnKey[]>(EXPORT_PRESETS.full);
  const [exportPreset, setExportPreset] = useState<string>('full');
  const [splitThreshold, setSplitThreshold] = useState<number>(0);
  const [exportingGeneric, setExportingGeneric] = useState<boolean>(false);
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
  const filteredRegistrations = registrations.filter(registration => {
    const matchesEvent = selectedEvent === 'all' || registration.event_title === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || registration.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || (registration as any).event_category === selectedCategory;
    const matchesParticipantType = selectedParticipantType === 'all' || registration.participant_type === selectedParticipantType;
    const matchesSearch = searchTerm === '' || 
      registration.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.college.toLowerCase().includes(searchTerm.toLowerCase());

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
    
    return matchesEvent && matchesStatus && matchesCategory && matchesParticipantType && matchesSearch && matchesDate;
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
    if (!confirm(`Delete ${ids.length} registration(s)? This cannot be undone.`)) return;
    try { setBulkDeleting(true); await (bulkDeleteRegistrations?.(ids)); setSelectedIds(new Set()); push({ message: `Deleted ${ids.length} registrations.`, type: 'success' }); }
    catch (e) { console.error(e); push({ message: 'Bulk delete failed.', type: 'error' }); }
    finally { setBulkDeleting(false); }
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

  const handleStatusUpdate = async (registrationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      console.log('Updating status for registration:', registrationId, 'to:', newStatus);
      await updateRegistrationStatus(registrationId, newStatus);
      console.log('Status updated successfully');
    } catch (error) {
      console.error('Error updating registration status:', error);
      push({ message: 'Failed to update registration status. Please try again.', type: 'error' });
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    // Prevent multiple delete attempts
    if (deletingIds.has(registrationId)) {
      console.log('Delete already in progress for:', registrationId);
      return;
    }

    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) {
      console.error('Registration not found:', registrationId);
      push({ message: 'Registration not found.', type: 'error' });
      return;
    }

    const confirmMessage = `Are you sure you want to delete the registration for "${registration.full_name}" (${registration.event_title})?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      // Add to deleting set to prevent duplicate requests
      setDeletingIds(prev => new Set(prev).add(registrationId));
      
      try {
        console.log('Starting deletion process for registration:', registrationId);
        await deleteRegistration(registrationId);
        console.log('Registration deleted successfully');
        
        // Close expanded view if this registration was expanded
        if (expandedRegistration === registrationId) {
          setExpandedRegistration(null);
        }
      } catch (error) {
        console.error('Error deleting registration:', error);
        push({ message: 'Failed to delete registration. Please try again.', type: 'error' });
      } finally {
        // Remove from deleting set
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(registrationId);
          return newSet;
        });
      }
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
      label: 'Export All Registrations',
      action: () => exportRegistrationsToExcel(filteredRegistrations, 'all-registrations.xlsx')
    }
  ];

  const handleBulkApprove = async () => {
    const pending = filteredRegistrations.filter(r => r.status === 'pending').map(r => r.id);
    if (!pending.length) {
      push({ message: 'No pending registrations in current filter.', type: 'info' });
      return;
    }
    if (!confirm(`Approve ${pending.length} pending registration(s)?`)) return;
    try {
      setBulkSaving(true);
      await (bulkApproveRegistrations?.(pending));
      push({ message: `Approved ${pending.length} registrations.`, type: 'success' });
    } catch (e) {
      console.error(e);
      push({ message: 'Bulk approve failed.', type: 'error' });
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

  const doCsv = async () => {
    if (exportingGeneric) return;
    if (!filteredRegistrations.length) { push({ message: 'No rows.', type: 'info' }); return; }
    setExportingGeneric(true);
    try { exportCsv(filteredRegistrations, selectedColumns, `registrations-${Date.now()}.csv`); push({ message: 'CSV downloaded.', type: 'success' }); } catch(e:any){ push({ message: 'CSV export failed: '+e.message, type: 'error'});} finally { setExportingGeneric(false);} }

  const doExcel = async () => {
    if (exportingGeneric) return;
    if (!filteredRegistrations.length) { push({ message: 'No rows.', type: 'info' }); return; }
    setExportingGeneric(true);
    try { await exportExcel(filteredRegistrations, selectedColumns, `registrations-${Date.now()}.xlsx`); push({ message: 'Excel downloaded.', type: 'success' }); } catch(e:any){ push({ message: 'Excel export failed: '+e.message, type: 'error'});} finally { setExportingGeneric(false);} }

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
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registration Management</h2>
            <p className="text-gray-600">Manage event registrations and participant data</p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkSaving}
              className={`flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm ${bulkSaving ? 'opacity-70 cursor-not-allowed':''}`}
              title="Approve all pending registrations"
            >
              {bulkSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : <FileCheck size={16} className="mr-1" />}
              Bulk Approve
            </button>
            <button
              onClick={handleBulkReject}
              disabled={bulkRejecting}
              className={`flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-500 transition-colors text-sm ${bulkRejecting ? 'opacity-70 cursor-not-allowed':''}`}
              title="Reject all pending registrations"
            >
              {bulkRejecting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : <Ban size={16} className="mr-1" />}
              Bulk Reject
            </button>
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
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-500 transition-colors flex items-center text-sm"
              >
                <Download size={14} className="mr-1" />
                Export All
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
                  Date
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
                      {new Date(registration.registration_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedRegistration(
                            expandedRegistration === registration.id ? null : registration.id
                          )}
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
                              onClick={() => handleStatusUpdate(registration.id, 'rejected')}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Reject Registration"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteRegistration(registration.id)}
                          disabled={deletingIds.has(registration.id)}
                          className={`p-1 rounded transition-colors ${
                            deletingIds.has(registration.id)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          }`}
                          title={deletingIds.has(registration.id) ? 'Deleting...' : 'Delete Registration'}
                        >
                          {deletingIds.has(registration.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
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
                                    <a
                                      href={(registration as any).photo_url as any}
                                      download
                                      className="text-gray-700 hover:text-gray-900 text-sm"
                                    >Download</a>
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
    </div>
  );
};