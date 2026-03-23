import React, { useState, useMemo } from 'react';
import { Download, Filter, Search, Music, Mail, Phone, Eye, Trash2, CheckCircle, Clock, FileText, Upload, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';
import { exportAuditionsToExcel } from '../../utils/excelExport';
import { exportAuditionsToPDF, exportAuditionsByStatus, preloadWatermark } from '../../utils/pdfExport';
import { supabase } from '../../lib/supabase';
// import type { Audition } from '../../context/DataContext';

// Inline Editable Row Component
const EditableRow = ({ 
  label, 
  value, 
  onSave, 
  canEdit = false, 
  className = '',
  showLabel = true
}: { 
  label: string, 
  value: string | number | null | undefined, 
  onSave: (val: string) => Promise<boolean>, 
  canEdit?: boolean,
  className?: string,
  showLabel?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value || ''));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
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
      {showLabel && <strong className="text-gray-400 w-[140px] flex-shrink-0 pt-0.5">{label}:</strong>}
      {isEditing ? (
        <div className="flex-1 flex items-start gap-2 max-w-sm">
          <input 
            type="text" 
            className="flex-1 border rounded px-2 py-0.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none border-gray-200 bg-white text-gray-900" 
            value={tempValue} 
            onChange={e => setTempValue(e.target.value)}
            autoFocus
          />
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-800" title="Save">
               {saving ? <Clock className="animate-spin" size={14}/> : <CheckCircle size={14}/>}
            </button>
            <button onClick={() => { setIsEditing(false); setTempValue(String(value || '')); }} className="text-red-600 hover:text-red-800" title="Cancel">
               <RotateCcw size={14}/>
            </button>
          </div>
        </div>
      ) : (
         <div className="flex-1 flex items-center gap-2 min-h-[20px]">
            <span className="text-gray-700">{value || <span className="text-gray-400 italic text-xs">None</span>}</span>
            {canEdit && (
              <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600" title="Edit">
                <FileText size={10} />
              </button>
            )}
         </div>
      )}
    </div>
  );
};

export const AuditionManagement: React.FC = () => {
  const { auditions, updateAuditionStatus, deleteAudition, adminUsers, refreshAll } = useData();
  const { user } = useAuth();

  const { updateBatchGlobally } = useRegistrationMutations(() => {
    // Refresh all data after a global update
    refreshAll();
  });

  const isOwner = useMemo(() => {
    const admin = adminUsers?.find(u => u.user_id === user?.id);
    return admin?.role === 'owner' || admin?.is_primary;
  }, [adminUsers, user]);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAudition, setExpandedAudition] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  // Watermark & Stamp State
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [watermarkDataUrl, setWatermarkDataUrl] = useState<string | null>(null);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  // Load saved watermark and stamp on component mount
  React.useEffect(() => {
    const loadAssets = async () => {
      // Load Watermark
      const { data: wmList } = await supabase.storage.from('pdf-watermarks').list();
      const wmFile = wmList?.find(f => f.name === 'watermark.png' || f.name === 'watermark.svg');
      if (wmFile) {
        const { data } = supabase.storage.from('pdf-watermarks').getPublicUrl(wmFile.name);
        // Add timestamp to bypass cache
        const publicUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
        setWatermarkUrl(publicUrl);
        const dataUrl = await preloadWatermark(publicUrl);
        setWatermarkDataUrl(dataUrl);
      }

      // Load Stamp
      const { data: stList } = await supabase.storage.from('pdf-watermarks').list();
      const stFile = stList?.find(f => f.name === 'stamp.png' || f.name === 'stamp.svg');
      if (stFile) {
        const { data } = supabase.storage.from('pdf-watermarks').getPublicUrl(stFile.name);
        const publicUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
        setStampUrl(publicUrl);
        const dataUrl = await preloadWatermark(publicUrl); // Reusing preloadWatermark for stamp
        setStampDataUrl(dataUrl);
      }
    };
    loadAssets();
  }, []);

  const handleWatermarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      if (!file.type.includes('image/png') && !file.type.includes('image/svg')) {
        alert('Please upload a PNG or SVG file.');
        return;
      }
      
      setUploadingWatermark(true);
      
      // Determine file extension
      const fileExt = file.type.includes('image/svg') ? 'svg' : 'png';
      const fileName = `watermark.${fileExt}`;
      
      // Delete existing files first to avoid confusion
      await supabase.storage.from('pdf-watermarks').remove(['watermark.png', 'watermark.svg']);

      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { cacheControl: '0', upsert: true });

      if (error) throw error;

      const { data: publicData } = supabase.storage.from('pdf-watermarks').getPublicUrl(fileName);
      const publicUrl = `${publicData.publicUrl}?t=${new Date().getTime()}`;
      setWatermarkUrl(publicUrl);
      const dataUrl = await preloadWatermark(publicUrl);
      setWatermarkDataUrl(dataUrl);
    } catch (error) {
      console.error('Error uploading watermark:', error);
      alert('Failed to upload watermark.');
    } finally {
      setUploadingWatermark(false);
    }
  };

  const handleWatermarkDelete = async () => {
    if (!confirm('Are you sure you want to remove the PDF watermark?')) return;
    try {
      setUploadingWatermark(true);
      await supabase.storage.from('pdf-watermarks').remove(['watermark.png', 'watermark.svg']);
      setWatermarkUrl(null);
      setWatermarkDataUrl(null);
    } catch (error) {
      console.error('Error deleting watermark:', error);
    } finally {
      setUploadingWatermark(false);
    }
  };

  const handleStampUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      if (!file.type.includes('image/png') && !file.type.includes('image/svg')) {
        alert('Please upload a PNG or SVG file.');
        return;
      }
      
      setUploadingStamp(true);
      
      const fileExt = file.type.includes('image/svg') ? 'svg' : 'png';
      const fileName = `stamp.${fileExt}`;
      
      // Delete existing files first
      await supabase.storage.from('pdf-watermarks').remove(['stamp.png', 'stamp.svg']);

      const { error } = await supabase.storage
        .from('pdf-watermarks')
        .upload(fileName, file, { cacheControl: '0', upsert: true });

      if (error) throw error;

      const { data: publicData } = supabase.storage.from('pdf-watermarks').getPublicUrl(fileName);
      const publicUrl = `${publicData.publicUrl}?t=${new Date().getTime()}`;
      setStampUrl(publicUrl);
      const dataUrl = await preloadWatermark(publicUrl);
      setStampDataUrl(dataUrl);
    } catch (error) {
      console.error('Error uploading stamp:', error);
      alert('Failed to upload stamp.');
    } finally {
      setUploadingStamp(false);
    }
  };

  const handleStampDelete = async () => {
    if (!confirm('Are you sure you want to remove the stamp?')) return;
    try {
      setUploadingStamp(true);
      await supabase.storage.from('pdf-watermarks').remove(['stamp.png', 'stamp.svg']);
      setStampUrl(null);
      setStampDataUrl(null);
    } catch (error) {
      console.error('Error deleting stamp:', error);
    } finally {
      setUploadingStamp(false);
    }
  };

  // Filter auditions based on selected filters
  const filteredAuditions = auditions.filter(audition => {
    const matchesStatus = selectedStatus === 'all' || audition.status === selectedStatus;
    const matchesBatch = selectedBatch === 'all' || audition.participant_type === selectedBatch;
    const matchesSearch = searchTerm === '' || 
      audition.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audition.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audition.instrument_role.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesBatch && matchesSearch;
  });

  // Get unique batches for filter
  const batches = useMemo(() => {
    return Array.from(new Set(auditions.map(a => a.participant_type).filter(Boolean))).sort();
  }, [auditions]);

  const handleStatusUpdate = async (auditionId: string, newStatus: 'pending' | 'reviewed' | 'contacted') => {
    try {
      await updateAuditionStatus(auditionId, newStatus);
    } catch (error) {
      console.error('Error updating audition status:', error);
      alert('Failed to update audition status. Please try again.');
    }
  };

  const handleDeleteAudition = async (auditionId: string) => {
    if (deletingIds.has(auditionId)) {
      return;
    }

    const audition = auditions.find(a => a.id === auditionId);
    if (!audition) {
      alert('Audition not found.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete the audition from "${audition.full_name}" for ${audition.instrument_role}?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      setDeletingIds(prev => new Set(prev).add(auditionId));
      
      try {
        await deleteAudition(auditionId);
        
        if (expandedAudition === auditionId) {
          setExpandedAudition(null);
        }
      } catch (error) {
        console.error('Error deleting audition:', error);
        alert('Failed to delete audition. Please try again.');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(auditionId);
          return newSet;
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'contacted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'contacted':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'reviewed':
        return <Eye size={16} className="text-blue-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const exportOptions = [
    {
      label: 'Export Excel',
      icon: Download,
      action: () => exportAuditionsToExcel(filteredAuditions as any, 'all-auditions.xlsx'),
      color: 'bg-green-600 hover:bg-green-500'
    },
    {
      label: 'Export PDF',
      icon: FileText,
      action: () => exportAuditionsToPDF(filteredAuditions as any, {
        filename: 'auditions-report.pdf',
        title: 'Audition Applications Report',
        includeDetails: true,
        watermarkDataUrl,
        stampDataUrl
      } as any),
      color: 'bg-red-600 hover:bg-red-500'
    },
    {
      label: 'PDF by Status',
      icon: FileText,
      action: () => exportAuditionsByStatus(filteredAuditions as any, watermarkDataUrl, stampDataUrl),
      color: 'bg-purple-600 hover:bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audition Management</h2>
          <p className="text-gray-600">Manage Home Bound band audition applications</p>
        </div>
        <div className="flex items-center space-x-2">
          {exportOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <button
                key={index}
                onClick={option.action}
                className={`${option.color} text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-md hover:shadow-lg`}
              >
                <IconComponent size={16} className="mr-2" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Watermark and Stamp Tools */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Watermark Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="mr-2 text-blue-600" size={20} />
            PDF Watermark
          </h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
              {watermarkUrl ? (
                <img src={watermarkUrl} alt="Watermark" className="w-full h-full object-contain opacity-50" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-1">No Watermark</span>
              )}
              {uploadingWatermark && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-gray-600">
                Upload a PNG or SVG to use as a watermark on all PDF exports. 
                Ideally transparent and light.
              </p>
              <div className="flex space-x-2">
                <label className={`flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md cursor-pointer hover:bg-blue-500 transition-colors ${uploadingWatermark ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} className="mr-1.5" />
                  Upload Watermark
                  <input 
                    type="file" 
                    accept="image/png,image/svg+xml" 
                    className="hidden" 
                    onChange={handleWatermarkUpload}
                    disabled={uploadingWatermark}
                  />
                </label>
                {watermarkUrl && (
                  <button 
                    onClick={handleWatermarkDelete}
                    disabled={uploadingWatermark}
                    className="flex items-center px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded-md hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Stamp Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="mr-2 text-amber-600" size={20} />
            Digital Stamp
          </h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
              {stampUrl ? (
                <img src={stampUrl} alt="Stamp" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-1">No Stamp</span>
              )}
              {uploadingStamp && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-gray-600">
                Upload an official stamp (PNG/SVG) to appear at the bottom right of PDF pages.
              </p>
              <div className="flex space-x-2">
                <label className={`flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md cursor-pointer hover:bg-amber-500 transition-colors ${uploadingStamp ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} className="mr-1.5" />
                  Upload Stamp
                  <input 
                    type="file" 
                    accept="image/png,image/svg+xml" 
                    className="hidden" 
                    onChange={handleStampUpload}
                    disabled={uploadingStamp}
                  />
                </label>
                {stampUrl && (
                  <button 
                    onClick={handleStampDelete}
                    disabled={uploadingStamp}
                    className="flex items-center px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded-md hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-4 gap-4">
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
                <option value="reviewed">Reviewed</option>
                <option value="contacted">Contacted</option>
              </select>
            </div>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Batch</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Batches</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
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
                placeholder="Search by name, email, or instrument..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredAuditions.length} of {auditions.length} auditions
          </div>
          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedBatch('all');
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
          <div className="text-3xl font-bold text-blue-600 mb-2">{auditions.length}</div>
          <div className="text-gray-600">Total Auditions</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {auditions.filter(a => a.status === 'pending').length}
          </div>
          <div className="text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {auditions.filter(a => a.status === 'reviewed').length}
          </div>
          <div className="text-gray-600">Reviewed</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {auditions.filter(a => a.status === 'contacted').length}
          </div>
          <div className="text-gray-600">Contacted</div>
        </div>
      </div>

      {/* Auditions List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instrument/Role
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
              {filteredAuditions.map((audition) => (
                <React.Fragment key={audition.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {audition.full_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {audition.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone size={12} className="mr-1" />
                            {audition.phone}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <span className="font-medium mr-1 text-gray-400">Batch:</span>
                            <EditableRow 
                              label="Batch" 
                              showLabel={false}
                              value={audition.participant_type} 
                              onSave={async (val) => {
                                if (audition.email && val) {
                                  await updateBatchGlobally(audition.email, val);
                                  return true;
                                }
                                return false;
                              }}
                              canEdit={isOwner}
                              className="!min-h-0"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{audition.instrument_role}</div>
                      {audition.portfolio_link && (
                        <div className="text-sm text-blue-600">
                          <a href={audition.portfolio_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Portfolio Link
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(audition.status)}`}>
                        {getStatusIcon(audition.status)}
                        <span className="ml-1 capitalize">{audition.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(audition.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedAudition(
                            expandedAudition === audition.id ? null : audition.id
                          )}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {audition.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(audition.id, 'reviewed')}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Mark as Reviewed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {audition.status === 'reviewed' && (
                          <button
                            onClick={() => handleStatusUpdate(audition.id, 'contacted')}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Mark as Contacted"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAudition(audition.id)}
                          disabled={deletingIds.has(audition.id)}
                          className={`p-1 rounded transition-colors ${
                            deletingIds.has(audition.id)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          }`}
                          title={deletingIds.has(audition.id) ? 'Deleting...' : 'Delete Audition'}
                        >
                          {deletingIds.has(audition.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                        {audition.status !== 'pending' && isOwner && (
                          <button
                            onClick={() => handleStatusUpdate(audition.id, 'pending')}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Undo (Revert to Pending)"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedAudition === audition.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Audition Details</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Audition ID:</strong> {audition.id}</div>
                               <div><strong>Batch:</strong> {audition.participant_type}</div>
                                <div><strong>Instrument/Role:</strong> {audition.instrument_role}</div>
                                <div><strong>Application Date:</strong> {new Date(audition.created_at).toLocaleString()}</div>
                                {audition.portfolio_link && (
                                  <div>
                                    <strong>Portfolio:</strong> 
                                    <a 
                                      href={audition.portfolio_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline ml-1"
                                    >
                                      View Portfolio
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {audition.experience_motivation && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Experience & Motivation</h4>
                                <p className="text-sm text-gray-700">{audition.experience_motivation}</p>
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
        </div>

        {/* No Results */}
        {filteredAuditions.length === 0 && (
          <div className="text-center py-12">
            <Music size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No auditions found</h3>
            <p className="text-gray-500">
              {auditions.length === 0 
                ? "No auditions have been submitted yet."
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};