import React, { useState } from 'react';
import { Download, Filter, Search, Music, Mail, Phone, Eye, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exportAuditionsToExcel } from '../../utils/excelExport';
// import type { Audition } from '../../context/DataContext';

export const AuditionManagement: React.FC = () => {
  const { auditions, updateAuditionStatus, deleteAudition } = useData();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAudition, setExpandedAudition] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter auditions based on selected filters
  const filteredAuditions = auditions.filter(audition => {
    const matchesStatus = selectedStatus === 'all' || audition.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      audition.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audition.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audition.instrument_role.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

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
      label: 'Export All Auditions',
      action: () => exportAuditionsToExcel(filteredAuditions, 'all-auditions.xlsx')
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-3 gap-4">
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
                         <div className="text-sm text-gray-500">
                           {audition.participant_type}
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
                               <div><strong>Participant Type:</strong> {audition.participant_type}</div>
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