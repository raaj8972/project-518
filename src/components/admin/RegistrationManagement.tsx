import React, { useState } from 'react';
import { CheckCircle, XCircle, Download, Filter, Search, Calendar, Users, Mail, Phone, Building, Eye, Trash2, FileCheck, FileText, Ban } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { exportRegistrationsToExcel, exportRegistrationsByEvent, exportRegistrationsByStatus } from '../../utils/excelExport';
import { REGISTRATION_COLUMNS, EXPORT_PRESETS, exportCsv, exportExcel, exportPdf, RegistrationColumnKey } from '../../utils/reportExport';
// Removed static jsPDF + autotable imports; will lazy load to reduce initial bundle & avoid side-effect race

export const RegistrationManagement: React.FC = () => {
  const { registrations, updateRegistrationStatus, deleteRegistration, bulkApproveRegistrations, bulkRejectRegistrations } = useData();
  const { push } = useToast();
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [pdfExporting, setPdfExporting] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<RegistrationColumnKey[]>(EXPORT_PRESETS.full);
  const [exportPreset, setExportPreset] = useState<string>('full');
  const [splitThreshold, setSplitThreshold] = useState<number>(0);
  const [exportingGeneric, setExportingGeneric] = useState<boolean>(false);

  // Filter registrations based on selected filters
  const filteredRegistrations = registrations.filter(registration => {
    const matchesEvent = selectedEvent === 'all' || registration.event_title === selectedEvent;
    const matchesStatus = selectedStatus === 'all' || registration.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      registration.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.college.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesEvent && matchesStatus && matchesSearch;
  });

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

  const exportToPdf = async () => {
    if (pdfExporting || exportingGeneric) return;
    if (!filteredRegistrations.length) {
      push({ message: 'No rows to export.', type: 'info' });
      return;
    }
    setPdfExporting(true);
    try {
  await exportPdf(filteredRegistrations, selectedColumns, { splitThreshold: splitThreshold || undefined, baseFileName: `registrations-${new Date().toISOString().slice(0,10)}`, photoThumbSize: 20 });
      push({ message: 'PDF export complete.', type: 'success' });
    } catch (err:any) {
      console.error(err);
      push({ message: `PDF export failed: ${err?.message || 'unknown error'}`, type: 'error' });
    } finally { setPdfExporting(false); }
  };

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
          <button
            onClick={() => setShowColumnModal(true)}
            className="flex items-center bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            title="Choose export columns & presets"
          >
            <Filter size={16} className="mr-2" /> Columns
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
          <button
            onClick={exportToPdf}
            disabled={pdfExporting}
            className={`flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors ${pdfExporting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-500'}`}
          >
            {pdfExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating…
              </>
            ) : (
              <>
                <FileText size={16} className="mr-2" /> PDF Export
              </>
            )}
          </button>
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
        <div className="grid md:grid-cols-4 gap-4">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {((registration as any).photo_url) ? (
                            <img
                              src={(registration as any).photo_url as any}
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
                                  <a
                                    href={(registration as any).photo_url as any}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >Open full</a>
                                </div>
                              </div>
                            )}
                            
                            {registration.motivation && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Motivation</h4>
                                <p className="text-sm text-gray-700">{registration.motivation}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Team Members */}
                          {registration.is_team_registration && registration.team_members && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Team Members ({registration.total_members})
                              </h4>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {registration.team_members.map((member: any, index: number) => (
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