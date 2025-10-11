import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Download, Filter, Search, Calendar, Users, Mail, Phone, Building, Eye, Trash2, FileCheck, Ban } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabase';
import { exportRegistrationsToExcel, exportRegistrationsByEvent, exportRegistrationsByStatus } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, exportCsv, exportExcel, RegistrationColumnKey } from '../../utils/reportExport';
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
  const { registrations, updateRegistrationStatus, deleteRegistration, bulkApproveRegistrations, bulkRejectRegistrations, bulkDeleteRegistrations, siteSettings, updateSiteSettings } = useData();
  const { push } = useToast();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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

  // Filter registrations based on selected filters
  const filteredRegistrations = registrations.filter(registration => {
    const matchesEvent = selectedEvent === 'all' || registration.event_title === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || registration.status === selectedStatus;
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
    
    return matchesEvent && matchesStatus && matchesSearch && matchesDate;
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

  // Get unique event titles for filter dropdown
  const uniqueEvents = Array.from(new Set(registrations.map(reg => reg.event_title)));

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
    },
    {
      label: 'Export by Event',
      action: () => exportRegistrationsByEvent(filteredRegistrations)
    },
    {
      label: 'Export by Status',
      action: () => exportRegistrationsByStatus(filteredRegistrations)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Management</h2>
          <p className="text-gray-600">Manage event registrations and participant data</p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap justify-end">
          {/* PDF exclude toggle */}
          <label className="flex items-center space-x-2 text-sm text-gray-700 mr-2">
            <input
              type="checkbox"
              checked={pdfExcludeIdCollege}
              onChange={(e)=>setPdfExcludeIdCollege(e.target.checked)}
            />
            <span>PDF: exclude ID & College</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700 mr-2">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
            <span>Select all (visible)</span>
          </label>
          <button
            onClick={() => setShowColumnModal(true)}
            className="flex items-center bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            title="Choose export columns & presets"
          >
            <Filter size={16} className="mr-2" /> Columns
          </button>
          <button
            onClick={doBulkDelete}
            disabled={bulkDeleting || selectedIds.size === 0}
            className={`flex items-center bg-red-700 text-white px-4 py-2 rounded-lg transition-colors ${bulkDeleting || selectedIds.size === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-600'}`}
            title="Delete selected registrations"
          >
            {bulkDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={16} className="mr-2" /> Delete Selected
              </>
            )}
          </button>
          <button
            onClick={handleBulkApprove}
            disabled={bulkSaving}
            className={`flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors ${bulkSaving ? 'opacity-70 cursor-not-allowed':''}`}
            title="Approve all pending registrations (respecting current filters)"
          >
            {bulkSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : <FileCheck size={16} className="mr-2" />}
            Bulk Approve
          </button>
          <button
            onClick={handleBulkReject}
            disabled={bulkRejecting}
            className={`flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors ${bulkRejecting ? 'opacity-70 cursor-not-allowed':''}`}
            title="Reject all pending registrations (respecting current filters)"
          >
            {bulkRejecting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : <Ban size={16} className="mr-2" />}
            Bulk Reject
          </button>
          <ExportPdfButton
            rows={filteredRegistrations}
            columns={selectedColumns}
            filename={`registrations-${new Date().toISOString().slice(0,10)}.pdf`}
            className={`flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors ${pdfExporting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-500'}`}
          />
          <button
            onClick={doExcel}
            disabled={exportingGeneric}
            className={`flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors ${exportingGeneric ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-500'}`}
          >
            {exportingGeneric ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
            Excel (Custom)
          </button>
          <button
            onClick={doCsv}
            disabled={exportingGeneric}
            className={`flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors ${exportingGeneric ? 'opacity-60 cursor-not-allowed' : 'hover:bg-indigo-500'}`}
          >
            {exportingGeneric ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
            CSV
          </button>
          {/* Institution visibility controls (owner-managed) */}
          <div className="ml-4 flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={registrationInstitutionVisible} onChange={(e) => setRegistrationInstitutionVisible(e.target.checked)} />
              <span>Show Institution field</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={registrationInstitutionOptional} onChange={(e) => setRegistrationInstitutionOptional(e.target.checked)} disabled={!registrationInstitutionVisible} />
              <span>Optional</span>
            </label>
            <button className={`px-3 py-1 rounded bg-yellow-600 text-white text-sm ${savingRegSettings ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-700'}`} disabled={savingRegSettings}
              onClick={async () => {
                try {
                  setSavingRegSettings(true);
                  await updateSiteSettings({ registration_institution_visible: registrationInstitutionVisible, registration_institution_optional: registrationInstitutionOptional } as any);
                } catch (e) { console.error(e); } finally { setSavingRegSettings(false); }
              }}
            >Save</button>
          </div>
          {exportOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors flex items-center"
            >
              <Download size={16} className="mr-2" />
              {option.label}
            </button>
          ))}
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
        <div className="grid md:grid-cols-5 gap-4">
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
                <option value="all">All Events</option>
                {uniqueEvents.map(eventTitle => (
                  <option key={eventTitle} value={eventTitle}>{eventTitle}</option>
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
                              <div className="space-y-1 text-sm">
                                <div><strong>Registration ID:</strong> {registration.id}</div>
                                <div><strong>Participant Type:</strong> {registration.participant_type}</div>
                                <div><strong>College:</strong> {registration.college}</div>
                                <div><strong>Registration Date:</strong> {new Date(registration.registration_date).toLocaleString()}</div>
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
                                    <div className="font-medium text-sm">{member.name}</div>
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