import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Eye, EyeOff, Crown, Instagram, Youtube } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { CoreCommittee, CoreTeamMember } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useSavingProgress } from '../../context/SavingProgressContext';

// Spotify icon component since it's not in lucide-react
const Spotify = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export const CoreTeamManagement: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const savingProgress = useSavingProgress();
  const { 
    coreCommittees,
    coreTeamMembers,
    addCoreCommittee,
    updateCoreCommittee,
    deleteCoreCommittee,
    toggleCoreCommitteeEnabled,
    addCoreTeamMember,
    updateCoreTeamMember,
    deleteCoreTeamMember,
    toggleCoreTeamMemberEnabled,
  toggleCoreTeamMemberIsHead
  } = useData();

  const [activeSection, setActiveSection] = useState<'committees' | 'members'>('committees');
  const [isAddingCommittee, setIsAddingCommittee] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<number | null>(null);

  const [committeeForm, setCommitteeForm] = useLocalStorage('admin_core_committee_form_draft', {
    name: '',
    description: '',
    color: '#3B82F6',
    is_core: false,
    order_position: 1,
    enabled: true
  });

  const [memberForm, setMemberForm] = useLocalStorage('admin_core_member_form_draft', {
    committee_id: 0,
    name: '',
    role: '',
    image: '',
    description: '',
    specialty: '',
    achievements: [] as string[],
    order_position: 1,
    enabled: true,
    is_head: false,
    phone: '',
    social_links: {
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });

  const resetCommitteeForm = () => {
    setCommitteeForm({
      name: '',
      description: '',
      color: '#3B82F6',
      is_core: false,
      order_position: coreCommittees.length + 1,
      enabled: true
    });
  };

  const resetMemberForm = () => {
    setMemberForm({
      committee_id: coreCommittees.length > 0 ? coreCommittees[0].id : 0,
      name: '',
      role: '',
      image: '',
      description: '',
      specialty: '',
      achievements: [],
      order_position: coreTeamMembers.length + 1,
      enabled: true,
      is_head: false,
      phone: '',
      social_links: {
        instagram: '',
        youtube: '',
        spotify: ''
      }
    });
  };

  // Committee Management
  const handleAddCommittee = async () => {
    // Inline validation handles UI feedback; function guard keeps safety.
    if (!committeeForm.name || !committeeForm.name.trim()) return;
    
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      await addCoreCommittee(committeeForm);
      setIsAddingCommittee(false);
      resetCommitteeForm();
      try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding committee:', error);
      alert('Failed to add committee. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdateCommittee = async (id: number) => {
    if (!committeeForm.name || !committeeForm.name.trim()) return;
    
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      await updateCoreCommittee(id, committeeForm);
      setEditingCommittee(null);
      resetCommitteeForm();
      try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating committee:', error);
      alert('Failed to update committee. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleDeleteCommittee = async (id: number) => {
  const membersInCommittee = coreTeamMembers.filter(m => m.committee_id === id);
    
    if (membersInCommittee.length > 0) {
      if (!confirm(`This committee has ${membersInCommittee.length} members. Deleting it will also delete all members. Are you sure?`)) {
        return;
      }
    } else if (!confirm('Are you sure you want to delete this committee?')) {
      return;
    }
    
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Deleting');
      await deleteCoreCommittee(id);
    } catch (error) {
      console.error('Error deleting committee:', error);
      alert('Failed to delete committee. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const startEditingCommittee = (committee: CoreCommittee) => {
    setCommitteeForm({
      name: committee.name,
      description: committee.description,
      color: committee.color,
      is_core: committee.is_core,
      order_position: committee.order_position,
      enabled: committee.enabled
    });
    setEditingCommittee(committee.id);
  };

  // Member Management
  const handleAddMember = async () => {
    // Name & image required (per new requirement); other fields optional.
    if (!memberForm.name || !memberForm.name.trim() || !memberForm.image) return;
    // Prepare payload with optional fields; treat 0 as "no committee"
    const payload = {
      ...memberForm,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    } as any;
    
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      await addCoreTeamMember(payload);
      setIsAddingMember(false);
      resetMemberForm();
      try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdateMember = async (id: number) => {
    if (!memberForm.name || !memberForm.name.trim() || !memberForm.image) return;
    const payload = {
      ...memberForm,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    } as any;
    
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      steps.next('Saving to database');
      await updateCoreTeamMember(id, payload);
      setEditingMember(null);
      resetMemberForm();
      try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating team member:', error);
      alert('Failed to update team member. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (confirm('Are you sure you want to delete this team member? This action cannot be undone.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        await deleteCoreTeamMember(id);
      } catch (error) {
        console.error('Error deleting team member:', error);
        alert('Failed to delete team member. Please try again.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const startEditingMember = (member: CoreTeamMember) => {
    setMemberForm({
      committee_id: member.committee_id,
      name: member.name,
      role: member.role,
      image: member.image,
      description: member.description,
      specialty: member.specialty,
      achievements: member.achievements,
      order_position: member.order_position,
      enabled: member.enabled,
      is_head: member.is_head,
      phone: (member as any).phone || '',
      social_links: member.social_links || { instagram: '', youtube: '', spotify: '' }
    });
    setEditingMember(member.id);
  };

  const addAchievement = () => {
    setMemberForm(prev => ({
      ...prev,
      achievements: [...prev.achievements, '']
    }));
  };

  const updateAchievement = (index: number, value: string) => {
    setMemberForm(prev => ({
      ...prev,
      achievements: prev.achievements.map((a, i) => i === index ? value : a)
    }));
  };

  const removeAchievement = (index: number) => {
    setMemberForm(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const predefinedColors = [
    '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', 
    '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
  ];

  // Sort committees and members
  const sortedCommittees = [...coreCommittees].sort((a, b) => a.order_position - b.order_position);
  const sortedMembers = [...coreTeamMembers].sort((a, b) => a.order_position - b.order_position);

  // Group members by committee
  const membersByCommittee = sortedMembers.reduce((acc, member) => {
    if (!acc[member.committee_id]) {
      acc[member.committee_id] = [];
    }
    acc[member.committee_id].push(member);
    return acc;
  }, {} as Record<number, CoreTeamMember[]>);

  return (
    <div className="space-y-6">
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded" role="alert">
          <p className="text-sm font-medium">You are not logged in. Adding or editing committees and team members may be blocked by security policies. Please log in via the Admin header.</p>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Core Team Management</h2>
          <p className="text-gray-600">Manage committees and team members for the Rico Family page</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setActiveSection('committees')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'committees'
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Committees
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'members'
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Team Members
            </button>
          </div>
        </div>
      </div>

      {/* Committees Section */}
      {activeSection === 'committees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Committees ({coreCommittees.length}/10)</h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingCommittee(true);
                resetCommitteeForm();
              }}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Committee
            </button>
          </div>

          {/* Add Committee Form */}
          {isAddingCommittee && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h4 className="text-lg font-semibold mb-6">Add New Committee</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Committee Name *</label>
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Technical Team"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                    <textarea
                      value={committeeForm.description}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the committee's responsibilities"
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={committeeForm.order_position}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="10"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={committeeForm.is_core}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, is_core: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Core Committee</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={committeeForm.enabled}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible on website</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Committee Color</label>
                  <div className="space-y-3">
                    <input
                      type="color"
                      value={committeeForm.color}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCommitteeForm(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            committeeForm.color === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: committeeForm.color }}
                      />
                      <span className="text-sm text-gray-700">Preview: {committeeForm.name || 'Committee Name'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCommittee(false);
                    resetCommitteeForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCommittee}
                  disabled={!committeeForm.name.trim()}
                  className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                    committeeForm.name.trim()
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save size={16} className="mr-1" />
                  Add Committee
                </button>
              </div>
              {!committeeForm.name.trim() && (
                <p className="mt-2 text-sm text-red-600">Committee name is required.</p>
              )}
            </div>
          )}

          {/* Committees List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCommittees.map((committee) => (
              <div key={committee.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {editingCommittee === committee.id ? (
                  <div className="p-4 space-y-4">
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Committee name"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <textarea
                      value={committeeForm.description}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Description"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="color"
                        value={committeeForm.color}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="number"
                        value={committeeForm.order_position}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="10"
                        placeholder="Order"
                        className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={committeeForm.is_core}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, is_core: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Core Committee</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={committeeForm.enabled}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Enabled</span>
                      </label>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommittee(null);
                          resetCommitteeForm();
                        }}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCommittee(committee.id)}
                        disabled={!committeeForm.name.trim()}
                        className={`px-3 py-1 rounded flex items-center transition-colors ${
                          committeeForm.name.trim()
                            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Save size={14} className="mr-1" />
                        Save
                      </button>
                    </div>
                    {!committeeForm.name.trim() && (
                      <p className="mt-1 text-xs text-red-600">Committee name is required.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div 
                      className="h-3"
                      style={{ backgroundColor: committee.color }}
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-lg text-gray-900">{committee.name}</h4>
                        <div className="flex items-center space-x-2">
                          {committee.is_core && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          {!committee.enabled && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                              Hidden
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{committee.description}</p>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xs text-gray-500">
                          Order: {committee.order_position} | Members: {membersByCommittee[committee.id]?.length || 0}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: committee.color }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => toggleCoreCommitteeEnabled(committee.id)}
                          className={`p-1 rounded transition-colors ${
                            committee.enabled 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-red-100 text-red-600'
                          } hover:bg-green-200`}
                          title={committee.enabled ? 'Hide from public' : 'Show to public'}
                        >
                          {committee.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => startEditingCommittee(committee)}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                            title="Edit committee"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCommittee(committee.id)}
                            className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                            title="Delete committee"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* No Committees Message */}
          {coreCommittees.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <Users size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Committees Yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first committee</p>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCommittee(true);
                  resetCommitteeForm();
                }}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                Add First Committee
              </button>
            </div>
          )}
        </div>
      )}

      {/* Team Members Section */}
      {activeSection === 'members' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Team Members ({coreTeamMembers.length})</h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingMember(true);
                resetMemberForm();
              }}
              className="px-4 py-2 rounded-lg transition-colors flex items-center bg-yellow-400 text-black hover:bg-yellow-300"
            >
              <Plus size={16} className="mr-2" />
              Add Team Member
            </button>
          </div>


          {/* Add Member Form */}
          {isAddingMember && coreCommittees.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h4 className="text-lg font-semibold mb-6">Add New Team Member</h4>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Committee (optional)</label>
                    <select
                      value={memberForm.committee_id}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value={0}>Unassigned</option>
                      {sortedCommittees.map(committee => (
                        <option key={committee.id} value={committee.id}>
                          {committee.name} {committee.is_core ? '(Core)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={memberForm.name}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Smith"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role/Position (optional)</label>
                      <input
                        type="text"
                        value={memberForm.role}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="Team Lead"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 98765 43210 (optional)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialty (optional)</label>
                    <input
                      type="text"
                      value={memberForm.specialty}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g., Full-Stack Development"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                    <textarea
                      value={memberForm.description}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the team member's role and contributions"
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={memberForm.order_position}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={memberForm.enabled}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Visible on website</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={memberForm.is_head}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Committee Head</span>
                  </div>
                  
                  {/* Social Links */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Links (Optional)</label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <input
                          type="url"
                          value={memberForm.social_links.instagram}
                          onChange={(e) => setMemberForm(prev => ({ 
                            ...prev, 
                            social_links: { ...prev.social_links, instagram: e.target.value }
                          }))}
                          placeholder="Instagram profile URL"
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Youtube className="w-5 h-5 text-red-500" />
                        <input
                          type="url"
                          value={memberForm.social_links.youtube}
                          onChange={(e) => setMemberForm(prev => ({ 
                            ...prev, 
                            social_links: { ...prev.social_links, youtube: e.target.value }
                          }))}
                          placeholder="YouTube channel URL"
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Spotify className="w-5 h-5 text-green-500" />
                        <input
                          type="url"
                          value={memberForm.social_links.spotify}
                          onChange={(e) => setMemberForm(prev => ({ 
                            ...prev, 
                            social_links: { ...prev.social_links, spotify: e.target.value }
                          }))}
                          placeholder="Spotify artist URL"
                          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                    <div className="space-y-2">
                      {memberForm.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) => updateAchievement(index, e.target.value)}
                            placeholder="Achievement or accomplishment"
                            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeAchievement(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addAchievement}
                        className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Achievement
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo *</label>
                    <ImageUpload
                      onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))}
                      currentImage={memberForm.image}
                      bucket="team-images"
                      folder="core-team"
                      cropAspect={1}
                    />
                    {!memberForm.image && (
                      <p className="mt-1 text-xs text-red-600">Profile photo is required.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingMember(false);
                    resetMemberForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!memberForm.name.trim() || !memberForm.image}
                  className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                    memberForm.name.trim() && memberForm.image
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save size={16} className="mr-1" />
                  Add Member
                </button>
              </div>
              {(!memberForm.name.trim() || !memberForm.image) && (
                <p className="mt-2 text-sm text-red-600 flex flex-col space-y-1">
                  {!memberForm.name.trim() && <span>Member full name is required.</span>}
                  {!memberForm.image && <span>Profile photo is required.</span>}
                </p>
              )}
            </div>
          )}

          {/* Members by Committee */}
          {sortedCommittees.map((committee) => {
            const committeeMembers = membersByCommittee[committee.id] || [];

            return (
              <div key={committee.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: committee.color }}
                    />
                    <h4 className="text-lg font-semibold text-gray-900">{committee.name}</h4>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">{committeeMembers.length} members</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMember(true);
                        setMemberForm(prev => ({ ...prev, committee_id: committee.id }));
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-500 flex items-center"
                    >
                      <Plus size={12} className="mr-1" />
                      Add Member
                    </button>
                  </div>
                </div>
                
                {committeeMembers.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {committeeMembers.map((member) => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition-colors">
                      {editingMember === member.id ? (
                        <div className="space-y-3">
                          <select
                            value={memberForm.committee_id}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          >
                            {sortedCommittees.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={memberForm.name}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <input
                            type="text"
                            value={memberForm.role}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <input
                            type="tel"
                            value={memberForm.phone}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone (optional)"
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <input
                            type="text"
                            value={memberForm.specialty}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <textarea
                            value={memberForm.description}
                            onChange={(e) => setMemberForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          
                          {/* Social Links editing */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Instagram className="w-4 h-4 text-pink-500" />
                              <input
                                type="url"
                                value={memberForm.social_links.instagram}
                                onChange={(e) => setMemberForm(prev => ({ 
                                  ...prev, 
                                  social_links: { ...prev.social_links, instagram: e.target.value }
                                }))}
                                placeholder="Instagram URL"
                                className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Youtube className="w-4 h-4 text-red-500" />
                              <input
                                type="url"
                                value={memberForm.social_links.youtube}
                                onChange={(e) => setMemberForm(prev => ({ 
                                  ...prev, 
                                  social_links: { ...prev.social_links, youtube: e.target.value }
                                }))}
                                placeholder="YouTube URL"
                                className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Spotify className="w-4 h-4 text-green-500" />
                              <input
                                type="url"
                                value={memberForm.social_links.spotify}
                                onChange={(e) => setMemberForm(prev => ({ 
                                  ...prev, 
                                  social_links: { ...prev.social_links, spotify: e.target.value }
                                }))}
                                placeholder="Spotify URL"
                                className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
                              />
                            </div>
                          </div>

                          <ImageUpload
                            onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))}
                            currentImage={memberForm.image}
                            bucket="team-images"
                            folder="core-team"
                            className="h-24"
                            cropAspect={1}
                          />
                          <div className="w-full flex justify-end space-x-2 mt-2 pt-4 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMember(null);
                                resetMemberForm();
                              }}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                            >
                              <X size={12} className="mr-1" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMember(member.id)}
                              disabled={!memberForm.name.trim() || !memberForm.image}
                              className={`px-3 py-1 rounded flex items-center transition-colors ${
                                memberForm.name.trim() && memberForm.image
                                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Save size={12} className="mr-1" />
                              Save
                            </button>
                          </div>
                          {(!memberForm.name.trim() || !memberForm.image) && (
                            <p className="mt-1 text-xs text-red-600 flex flex-col space-y-0.5">
                              {!memberForm.name.trim() && <span>Member name is required.</span>}
                              {!memberForm.image && <span>Profile photo is required.</span>}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center mb-3">
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-12 h-12 object-cover rounded mr-3"
                            />
                            <div className="flex-grow">
                              <h5 className="font-semibold text-sm">{member.name}</h5>
                              <p className="text-xs text-gray-600">{member.role}</p>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {member.specialty}
                              </span>
                            </div>
                            {!member.enabled && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs mb-3 line-clamp-2">{member.description}</p>
                          
                          {/* Social Links Display */}
                          {member.social_links && Object.values(member.social_links).some(link => link) && (
                            <div className="flex space-x-2 mb-3">
                              {member.social_links.instagram && (
                                <Instagram className="w-4 h-4 text-pink-500" />
                              )}
                              {member.social_links.youtube && (
                                <Youtube className="w-4 h-4 text-red-500" />
                              )}
                              {member.social_links.spotify && (
                                <Spotify className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          )}
                          
                          {member.achievements.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                {member.achievements.length} Achievement{member.achievements.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              onClick={() => toggleCoreTeamMemberEnabled(member.id)}
                              className={`p-1 rounded transition-colors ${
                                member.enabled 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-red-100 text-red-600'
                              } hover:bg-green-200`}
                              title={member.enabled ? 'Hide from public' : 'Show to public'}
                            >
                              {member.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => toggleCoreTeamMemberIsHead(member.id)}
                                className={`p-1 rounded transition-colors ${
                                  member.is_head 
                                    ? 'bg-yellow-100 text-yellow-600' 
                                    : 'bg-gray-100 text-gray-600'
                                } hover:bg-yellow-200`}
                                title={member.is_head ? 'Remove as head' : 'Make committee head'}
                              >
                                <Crown size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditingMember(member)}
                                className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                                title="Edit member"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id)}
                                className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                                title="Delete member"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Users size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600 text-sm mb-3">No team members in {committee.name} yet</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMember(true);
                        setMemberForm(prev => ({ ...prev, committee_id: committee.id }));
                      }}
                      className="bg-yellow-400 text-black px-4 py-2 rounded text-sm hover:bg-yellow-300 flex items-center mx-auto"
                    >
                      <Plus size={14} className="mr-1" />
                      Add First Member
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* No Members Message */}
          {coreTeamMembers.length === 0 && coreCommittees.length > 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <Users size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Team Members Yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first team member</p>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMember(true);
                  resetMemberForm();
                }}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                Add First Member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">{coreCommittees.length}</div>
            <div className="text-gray-600 text-sm">Total Committees</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {coreCommittees.filter(c => c.is_core).length}
            </div>
            <div className="text-gray-600 text-sm">Core Committees</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">{coreTeamMembers.length}</div>
            <div className="text-gray-600 text-sm">Team Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-500 mb-1">
              {coreTeamMembers.filter(m => m.enabled).length}
            </div>
            <div className="text-gray-600 text-sm">Visible Members</div>
          </div>
        </div>
      </div>
    </div>
  );
};