import React, { useState } from 'react';
import { Download, Filter, Search, Users, Mail, Phone, Building, Eye, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exportMembershipsToExcel } from '../../utils/excelExport';
// import type { Membership } from '../../context/DataContext';

export const MembershipManagement: React.FC = () => {
  const { memberships, updateMembershipStatus, deleteMembership } = useData();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMembership, setExpandedMembership] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter memberships based on selected filters
  const filteredMemberships = memberships.filter(membership => {
    const matchesStatus = selectedStatus === 'all' || membership.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      membership.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.college_department.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleStatusUpdate = async (membershipId: string, newStatus: 'pending' | 'reviewed' | 'accepted') => {
    try {
      await updateMembershipStatus(membershipId, newStatus);
    } catch (error) {
      console.error('Error updating membership status:', error);
      alert('Failed to update membership status. Please try again.');
    }
  };

  const handleDeleteMembership = async (membershipId: string) => {
    if (deletingIds.has(membershipId)) {
      return;
    }

    const membership = memberships.find(m => m.id === membershipId);
    if (!membership) {
      alert('Membership not found.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete the membership application from "${membership.full_name}" (${membership.college_department})?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      setDeletingIds(prev => new Set(prev).add(membershipId));
      
      try {
        await deleteMembership(membershipId);
        
        if (expandedMembership === membershipId) {
          setExpandedMembership(null);
        }
      } catch (error) {
        console.error('Error deleting membership:', error);
        alert('Failed to delete membership. Please try again.');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(membershipId);
          return newSet;
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'reviewed':
        return <Eye size={16} className="text-blue-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const exportOptions = [
    {
      label: 'Export All Memberships',
      action: () => exportMembershipsToExcel(filteredMemberships, 'all-memberships.xlsx')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Membership Management</h2>
          <p className="text-gray-600">Manage Rico Family membership applications</p>
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
                <option value="accepted">Accepted</option>
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
                placeholder="Search by name, email, or college..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-white dark:text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredMemberships.length} of {memberships.length} applications
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
          <div className="text-3xl font-bold text-blue-600 mb-2">{memberships.length}</div>
          <div className="text-gray-600">Total Applications</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {memberships.filter(m => m.status === 'pending').length}
          </div>
          <div className="text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {memberships.filter(m => m.status === 'reviewed').length}
          </div>
          <div className="text-gray-600">Reviewed</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {memberships.filter(m => m.status === 'accepted').length}
          </div>
          <div className="text-gray-600">Accepted</div>
        </div>
      </div>

      {/* Memberships List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  College/Department
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
              {filteredMemberships.map((membership) => (
                <React.Fragment key={membership.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {membership.full_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {membership.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone size={12} className="mr-1" />
                            {membership.phone}
                          </div>
                         <div className="text-sm text-gray-500">
                           {membership.participant_type}
                         </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        <Building size={14} className="mr-1" />
                        {membership.college_department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(membership.status)}`}>
                        {getStatusIcon(membership.status)}
                        <span className="ml-1 capitalize">{membership.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(membership.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedMembership(
                            expandedMembership === membership.id ? null : membership.id
                          )}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {membership.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(membership.id, 'reviewed')}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Mark as Reviewed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {membership.status === 'reviewed' && (
                          <button
                            onClick={() => handleStatusUpdate(membership.id, 'accepted')}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Accept Application"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMembership(membership.id)}
                          disabled={deletingIds.has(membership.id)}
                          className={`p-1 rounded transition-colors ${
                            deletingIds.has(membership.id)
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          }`}
                          title={deletingIds.has(membership.id) ? 'Deleting...' : 'Delete Application'}
                        >
                          {deletingIds.has(membership.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedMembership === membership.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Application Details</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Membership ID:</strong> {membership.id}</div>
                               <div><strong>Participant Type:</strong> {membership.participant_type}</div>
                                <div><strong>College/Department:</strong> {membership.college_department}</div>
                                <div><strong>Application Date:</strong> {new Date(membership.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                            
                            {membership.motivation && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Motivation</h4>
                                <p className="text-sm text-gray-700">{membership.motivation}</p>
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
        {filteredMemberships.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No membership applications found</h3>
            <p className="text-gray-500">
              {memberships.length === 0 
                ? "No membership applications have been submitted yet."
                : "Try adjusting your filters to see more results."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};