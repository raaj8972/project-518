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
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'reviewed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={16} className="text-emerald-400" />;
      case 'reviewed':
        return <Eye size={16} className="text-blue-400" />;
      default:
        return <Clock size={16} className="text-yellow-400" />;
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
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full" />
            Membership Management
          </h2>
          <p className="text-gray-400 mt-1">Manage Rico Family membership applications</p>
        </div>
        <div className="flex items-center space-x-2">
          {exportOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center font-bold hover:-translate-y-0.5"
            >
              <Download size={16} className="mr-2" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Filter by Status</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white appearance-none"
              >
                <option value="all" className="bg-[#181824]">All Statuses</option>
                <option value="pending" className="bg-[#181824]">Pending</option>
                <option value="reviewed" className="bg-[#181824]">Reviewed</option>
                <option value="accepted" className="bg-[#181824]">Accepted</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or college..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing <span className="text-white font-bold">{filteredMemberships.length}</span> of <span className="text-white font-bold">{memberships.length}</span> applications
          </div>
          <button
            onClick={() => {
              setSelectedStatus('all');
              setSearchTerm('');
            }}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center group hover:border-emerald-500/30 transition-all hover:-translate-y-1">
          <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">
            {memberships.length}
          </div>
          <div className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total Applications</div>
        </div>
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center group hover:border-yellow-500/30 transition-all hover:-translate-y-1">
          <div className="text-3xl font-bold text-yellow-500 mb-2 group-hover:scale-110 transition-transform">
            {memberships.filter(m => m.status === 'pending').length}
          </div>
          <div className="text-gray-400 text-sm font-bold uppercase tracking-wider">Pending</div>
        </div>
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center group hover:border-blue-500/30 transition-all hover:-translate-y-1">
          <div className="text-3xl font-bold text-blue-400 mb-2 group-hover:scale-110 transition-transform">
            {memberships.filter(m => m.status === 'reviewed').length}
          </div>
          <div className="text-gray-400 text-sm font-bold uppercase tracking-wider">Reviewed</div>
        </div>
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center group hover:border-emerald-500/30 transition-all hover:-translate-y-1">
          <div className="text-3xl font-bold text-emerald-500 mb-2 group-hover:scale-110 transition-transform">
            {memberships.filter(m => m.status === 'accepted').length}
          </div>
          <div className="text-gray-400 text-sm font-bold uppercase tracking-wider">Accepted</div>
        </div>
      </div>

      {/* Memberships List */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-[#1c1c2a]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  College/Department
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMemberships.map((membership) => (
                <React.Fragment key={membership.id}>
                  <tr className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {membership.full_name}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Mail size={12} className="mr-1.5 text-emerald-500/60" />
                            {membership.email}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center mt-0.5">
                            <Phone size={12} className="mr-1.5 text-emerald-500/60" />
                            {membership.phone}
                          </div>
                         <div className="text-xs font-medium text-emerald-500/80 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                           {membership.participant_type}
                         </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-300 flex items-center">
                        <Building size={14} className="mr-2 text-emerald-500/60" />
                        {membership.college_department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-lg ${getStatusColor(membership.status)}`}>
                        {getStatusIcon(membership.status)}
                        <span className="ml-1.5">{membership.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">
                      {new Date(membership.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setExpandedMembership(
                            expandedMembership === membership.id ? null : membership.id
                          )}
                          className="text-blue-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {membership.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(membership.id, 'reviewed')}
                            className="text-emerald-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                            title="Mark as Reviewed"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {membership.status === 'reviewed' && (
                          <button
                            onClick={() => handleStatusUpdate(membership.id, 'accepted')}
                            className="text-emerald-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                            title="Accept Application"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMembership(membership.id)}
                          disabled={deletingIds.has(membership.id)}
                          className={`p-2 rounded-lg transition-all ${
                            deletingIds.has(membership.id)
                              ? 'text-gray-600 cursor-not-allowed'
                              : 'text-red-400 hover:text-white hover:bg-white/5'
                          }`}
                          title={deletingIds.has(membership.id) ? 'Deleting...' : 'Delete Application'}
                        >
                          {deletingIds.has(membership.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedMembership === membership.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 bg-black/40 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-4 max-w-4xl">
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-white uppercase tracking-widest border-l-2 border-emerald-500 pl-3">Application Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                  <span className="text-gray-500">Membership ID</span>
                                  <span className="text-gray-300 font-mono">{membership.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                  <span className="text-gray-500">Participant Type</span>
                                  <span className="text-emerald-400 font-bold">{membership.participant_type}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                  <span className="text-gray-500">College / Dept</span>
                                  <span className="text-gray-300 font-bold">{membership.college_department}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-1">
                                  <span className="text-gray-500">Applied On</span>
                                  <span className="text-gray-300">{new Date(membership.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            {membership.motivation && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest border-l-2 border-emerald-500 pl-3">Motivation</h4>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <p className="text-sm text-gray-300 leading-relaxed italic">{membership.motivation}</p>
                                </div>
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
          <div className="text-center py-20 bg-black/20 rounded-b-2xl">
            <Users size={64} className="mx-auto text-gray-600 mb-4 animate-pulse" />
            <h3 className="text-xl font-bold text-white mb-2">No applications found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {memberships.length === 0 
                ? "No membership applications have been submitted yet. Once applications arrive, they will appear here."
                : "We couldn't find any applications matching your current filter criteria. Try broadening your search."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};