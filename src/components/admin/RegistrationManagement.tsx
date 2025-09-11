import React, { useState } from 'react';
import { CheckCircle, XCircle, Download, Filter, Search, Calendar, Users, Mail, Phone, Building, Eye, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exportRegistrationsToExcel, exportRegistrationsByEvent, exportRegistrationsByStatus } from '../../utils/excelExport';

export const RegistrationManagement: React.FC = () => {
  const { registrations, updateRegistrationStatus, deleteRegistration } = useData();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegistration, setExpandedRegistration] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
      alert('Failed to update registration status. Please try again.');
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
      alert('Registration not found.');
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
        alert('Failed to delete registration. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Management</h2>
          <p className="text-gray-600">Manage event registrations and participant data</p>
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