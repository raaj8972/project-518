import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Eye, EyeOff, Crown, Instagram, Youtube, GripVertical } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { CoreCommittee, CoreTeamMember } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import PreserveNewlines from '../PreserveNewlines';

// Spotify icon component since it's not in lucide-react
// Spotify icon component removed
import { AdminModal } from './layout/AdminModal';
import { AICoreTeamScanner, type ExtractedCoreTeamData } from './AICoreTeamScanner';
import { toast } from 'react-hot-toast';

export const CoreTeamManagement: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

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
  toggleCoreTeamMemberIsHead,
    sanitizeUrl
  } = useData() as any;

  const [activeSection, setActiveSection] = useState<'committees' | 'members'>('committees');
  const [isAddingCommittee, setIsAddingCommittee] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<number | null>(null);
  
  // Drag and drop state
  const [draggedCommittee, setDraggedCommittee] = useState<number | null>(null);
  const [draggedMember, setDraggedMember] = useState<number | null>(null);
  const [dragOverCommittee, setDragOverCommittee] = useState<number | null>(null);
  const [dragOverMember, setDragOverMember] = useState<number | null>(null);

  const [showAIScanner, setShowAIScanner] = useState(false);
  const [showCommitteePicker, setShowCommitteePicker] = useState(false);
  const [scannerTargetCommitteeId, setScannerTargetCommitteeId] = useState<number | null>(null);

  const openMemberScanner = () => {
    // For Team Members tab, show committee picker first
    setShowCommitteePicker(true);
  };

  const confirmCommitteeAndScan = (committeeId: number) => {
    setScannerTargetCommitteeId(committeeId);
    setShowCommitteePicker(false);
    setShowAIScanner(true);
  };

  const handleScanComplete = async (data: ExtractedCoreTeamData) => {
    try {
      setShowAIScanner(false);
      savingProgress.withSteps(data.committees.length + data.members.length, 'Saving Team Structure...');

      // If scanning for a specific committee (Team Members tab), skip committee creation
      if (scannerTargetCommitteeId) {
        // All members go to the selected committee
        for (const member of data.members) {
          try {
            await addCoreTeamMember({
              committee_id: scannerTargetCommitteeId,
              name: member.name,
              role: member.role,
              is_head: member.is_head,
              phone: member.phone,
              specialty: member.specialty,
              description: member.description,
              image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
              achievements: [],
              order_position: 99,
              enabled: true,
              social_links: { instagram: '', linkedin: '', twitter: '', youtube: '', facebook: '' }
            });
            savingProgress.advance('Added member...');
          } catch (err) {
            console.error('Failed to create member:', err);
            savingProgress.advance('Skipped member...');
          }
        }
        setScannerTargetCommitteeId(null);
        toast.success(`Added ${data.members.length} members!`);
        return;
      }

      // Full scan mode (Committees tab) — process both committees and members
      const committeeMap = new Map<string, number>();
      
      for (const committee of data.committees) {
        const existing = coreCommittees.find((c: any) => c.name.toLowerCase() === committee.name.toLowerCase());
        
        if (existing) {
          committeeMap.set(committee.name.toLowerCase(), existing.id);
          savingProgress.advance('Found existing committee...');
        } else {
          try {
            const result = await addCoreCommittee({
              name: committee.name,
              description: committee.description,
              is_core: committee.is_core,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              order_position: coreCommittees.length + 1,
              enabled: true
            });
            if (result && result.id) {
              committeeMap.set(committee.name.toLowerCase(), result.id);
            }
            savingProgress.advance('Created new committee...');
          } catch (err) {
            console.error('Failed to create committee:', err);
            savingProgress.advance('Skipped committee...');
          }
        }
      }

      for (const member of data.members) {
        const committeeId = committeeMap.get(member.committee_name.toLowerCase());
        
        if (committeeId) {
          try {
            await addCoreTeamMember({
              committee_id: committeeId,
              name: member.name,
              role: member.role,
              is_head: member.is_head,
              phone: member.phone,
              specialty: member.specialty,
              description: member.description,
              image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
              achievements: [],
              order_position: 99,
              enabled: true,
              social_links: { instagram: '', linkedin: '', twitter: '', youtube: '', facebook: '' }
            });
            savingProgress.advance('Added member...');
          } catch (err) {
            console.error('Failed to create member:', err);
            savingProgress.advance('Skipped member...');
          }
        } else {
           savingProgress.advance('Skipped member (no committee)...');
        }
      }

      toast.success('Successfully imported team roster!');
    } catch (error) {
      console.error('Error saving scanned data:', error);
      toast.error('Failed to save scanned team structure');
    }
  };

  const toggleCoreCommitteeIsCore = async (id: number, currentVal: boolean) => {
    try {
      await updateCoreCommittee?.(id, { is_core: !currentVal });
    } catch(e) { console.error(e); }
  };


  // Refs for scrolling


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
  isCouncil: false,
    phone: '',
    social_links: {
      instagram: '',
      linkedin: '',
      twitter: '',
      youtube: '',
      facebook: ''
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
      isCouncil: false,
      phone: '',
      social_links: {
        instagram: '',
        linkedin: '',
        twitter: '',
        youtube: '',
        facebook: ''
      }
    });
  };


  // Committee Management
  const handleAddCommittee = async () => {
    // Inline validation handles UI feedback; function guard keeps safety.
    if (!committeeForm.name || !committeeForm.name.trim()) return;
    
    try {
      savingProgress.withSteps(3, 'Preparing…');
      if (requiresApproval) {
        await submitForApproval(
          'core_committee',
          'create',
          {
            name: committeeForm.name,
            description: committeeForm.description,
            color: committeeForm.color,
            is_core: committeeForm.is_core,
            order_position: committeeForm.order_position,
            enabled: committeeForm.enabled
          }
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setIsAddingCommittee(false);
        resetCommitteeForm();
        try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
      } else {
        await addCoreCommittee(committeeForm);
        setIsAddingCommittee(false);
        resetCommitteeForm();
        try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
      }
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
      savingProgress.withSteps(3, 'Preparing…');
      if (requiresApproval) {
        await submitForApproval(
          'core_committee',
          'update',
          {
            name: committeeForm.name,
            description: committeeForm.description,
            color: committeeForm.color,
            is_core: committeeForm.is_core,
            order_position: committeeForm.order_position,
            enabled: committeeForm.enabled
          },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setEditingCommittee(null);
        resetCommitteeForm();
        try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
      } else {
        await updateCoreCommittee(id, committeeForm);
        setEditingCommittee(null);
        resetCommitteeForm();
        try { localStorage.removeItem('admin_core_committee_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error updating committee:', error);
      alert('Failed to update committee. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleDeleteCommittee = async (id: number) => {
  const membersInCommittee = coreTeamMembers.filter((m: any) => m.committee_id === id);
    
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
        if (requiresApproval) {
          await submitForApproval(
            'core_committee',
            'delete',
            {},
            id
          );
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          await deleteCoreCommittee(id);
        }
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
      description: committee.description || '',
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
      is_council: memberForm.isCouncil,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    } as any;
    delete payload.isCouncil;
    
    try {
      savingProgress.withSteps(3, 'Preparing…');
      if (requiresApproval) {
        await submitForApproval(
          'core_team_member',
          'create',
          {
            name: memberForm.name,
            role: memberForm.role,
            image: memberForm.image,
            committee_id: memberForm.committee_id,
            is_head: memberForm.is_head,
            order_position: memberForm.order_position,
            enabled: memberForm.enabled,
            description: memberForm.description,
            specialty: memberForm.specialty,
            achievements: memberForm.achievements,
            is_council: memberForm.isCouncil,
            phone: memberForm.phone,
            social_links: memberForm.social_links
          }
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setIsAddingMember(false);
        resetMemberForm();
        try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
      } else {
        await addCoreTeamMember(payload);
        setIsAddingMember(false);
        resetMemberForm();
        try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdateMember = async (id: number) => {
    const member = coreTeamMembers.find((m: any) => m.id === id);
    if (!member) return;
    if (!memberForm.name || !memberForm.name.trim() || !memberForm.image) return;
    const payload = {
      ...memberForm,
      is_council: memberForm.isCouncil,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    } as any;
    delete payload.isCouncil; // Remove camelCase field
    
    try {
      savingProgress.withSteps(3, 'Preparing…');
      if (requiresApproval) {
        await submitForApproval(
          'core_team_member',
          'update',
          {
            name: memberForm.name,
            role: memberForm.role,
            image: memberForm.image,
            committee_id: memberForm.committee_id,
            is_head: memberForm.is_head,
            order_position: memberForm.order_position,
            enabled: memberForm.enabled,
            description: memberForm.description,
            specialty: memberForm.specialty,
            achievements: memberForm.achievements,
            is_council: memberForm.isCouncil,
            phone: memberForm.phone,
            social_links: memberForm.social_links
          },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setEditingMember(null);
        resetMemberForm();
        try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
      } else {
        await updateCoreTeamMember(id, payload);
        setEditingMember(null);
        resetMemberForm();
        try { localStorage.removeItem('admin_core_member_form_draft'); } catch {}
      }
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
        if (requiresApproval) {
          await submitForApproval(
            'core_team_member',
            'delete',
            {},
            id
          );
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          await deleteCoreTeamMember(id);
        }
      } catch (error) {
        console.error('Error deleting team member:', error);
        alert('Failed to delete team member. Please try again.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const startEditingMember = (member: CoreTeamMember) => {
    setEditingMember(member.id);
    setMemberForm({
      name: member.name,
      role: member.role,
      image: member.image,
      committee_id: member.committee_id,
      description: member.description || '',
      order_position: member.order_position,
      is_head: member.is_head,
      enabled: member.enabled || true, // Default to true if undefined
      specialty: member.specialty || '', // Add specialty
      social_links: {
        instagram: (member.social_links as any)?.instagram || '',
        linkedin: (member.social_links as any)?.linkedin || '',
        twitter: (member.social_links as any)?.twitter || '',
        youtube: (member.social_links as any)?.youtube || '',
        facebook: (member.social_links as any)?.facebook || '', 
      },
      achievements: member.achievements || [], // Add achievements
      isCouncil: ((member as any).isCouncil ?? false) || false,
      phone: (member as any).phone || '',
    });
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
  
  // Members are sorted: Fixed Web Devs first, then by order_position
  const sortedMembers = [...coreTeamMembers].sort((a, b) => a.order_position - b.order_position);

  // Group members by committee
  const membersByCommittee = sortedMembers.reduce((acc, member) => {
    if (!acc[member.committee_id]) {
      acc[member.committee_id] = [];
    }
    acc[member.committee_id].push(member);
    return acc;
  }, {} as Record<number, CoreTeamMember[]>);



  // Committee drag handlers
  const handleCommitteeDragStart = (e: React.DragEvent, id: number) => {
    setDraggedCommittee(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCommitteeDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCommittee(id);
  };

  const handleCommitteeDragLeave = () => {
    setDragOverCommittee(null);
  };

  const handleCommitteeDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverCommittee(null);
    
    if (!draggedCommittee || draggedCommittee === targetId) {
      setDraggedCommittee(null);
      return;
    }

    const draggedIndex = sortedCommittees.findIndex(c => c.id === draggedCommittee);
    const targetIndex = sortedCommittees.findIndex(c => c.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCommittee(null);
      return;
    }

    try {
      const steps = savingProgress.withSteps(3, 'Reordering…');
      steps.next('Updating positions');
      
      // Create new array with reordered items
      const newOrder = [...sortedCommittees];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      
      // Update order_position for all affected committees
      steps.next('Saving changes');
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i].order_position !== i + 1) {
          await updateCoreCommittee(newOrder[i].id, { order_position: i + 1 });
        }
      }
    } catch (error) {
      console.error('Error reordering committees:', error);
      alert('Failed to reorder committees. Please try again.');
    } finally {
      savingProgress.done();
      setDraggedCommittee(null);
    }
  };

  const handleCommitteeDragEnd = () => {
    setDraggedCommittee(null);
    setDragOverCommittee(null);
  };

  // Member drag handlers
  const handleMemberDragStart = (e: React.DragEvent, id: number) => {
    setDraggedMember(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMemberDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverMember(id);
  };

  const handleMemberDragLeave = () => {
    setDragOverMember(null);
  };

  const handleMemberDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverMember(null);
    
    if (!draggedMember || draggedMember === targetId) {
      setDraggedMember(null);
      return;
    }

    const draggedIndex = sortedMembers.findIndex(m => m.id === draggedMember);
    const targetIndex = sortedMembers.findIndex(m => m.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMember(null);
      return;
    }

    try {
      const steps = savingProgress.withSteps(3, 'Reordering…');
      steps.next('Updating positions');
      
      // Create new array with reordered items
      const newOrder = [...sortedMembers];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      
      // Update order_position for all affected members
      steps.next('Saving changes');
      for (let i = 0; i < newOrder.length; i++) {
        if (newOrder[i].order_position !== i + 1) {
          await updateCoreTeamMember(newOrder[i].id, { order_position: i + 1 });
        }
      }
    } catch (error) {
      console.error('Error reordering members:', error);
      alert('Failed to reorder members. Please try again.');
    } finally {
      savingProgress.done();
      setDraggedMember(null);
    }
  };

  const handleMemberDragEnd = () => {
    setDraggedMember(null);
    setDragOverMember(null);
  };

  return (
    <div className="space-y-6">
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded" role="alert">
          <p className="text-sm font-medium">You are not logged in. Adding or editing committees and team members may be blocked by security policies. Please log in via the Admin header.</p>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-purple-400 to-indigo-600 rounded-full" />
            Core Team Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage committees and team members for the Rico Family page</p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-1.5 flex gap-1.5">
            <button
              onClick={() => setActiveSection('committees')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${
                activeSection === 'committees'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-yellow-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Committees
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${
                activeSection === 'members'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-yellow-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              Committees ({coreCommittees.length}/10)
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAIScanner(true)}
                className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-500 border border-amber-500/20 hover:border-amber-500/40 px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center font-bold hover:-translate-y-0.5"
                title="Scan Org Chart"
              >
                <Users size={16} className="mr-2" />
                AI Scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCommittee(true);
                  resetCommitteeForm();
                }}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-5 py-2.5 rounded-xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-500/20 flex items-center font-bold hover:-translate-y-0.5"
              >
                <Plus size={16} className="mr-2" />
                Add Committee
              </button>
            </div>
          </div>

          {/* Inline AI Scanner for Committees */}
          {showAIScanner && activeSection === 'committees' && (
            <div className="mb-6 animate-in slide-in-from-top duration-300">
              <AICoreTeamScanner
                onScanComplete={handleScanComplete}
                onCancel={() => setShowAIScanner(false)}
              />
            </div>
          )}

          {/* Add Committee Modal */}
          <AdminModal
            isOpen={isAddingCommittee}
            onClose={() => {
              setIsAddingCommittee(false);
              resetCommitteeForm();
            }}
            title="Add New Committee"
            footer={
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCommittee(false);
                    resetCommitteeForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2 font-medium"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCommittee}
                  disabled={!committeeForm.name.trim()}
                  className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold ${
                    committeeForm.name.trim()
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-yellow-500/20 hover:-translate-y-0.5'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save size={16} />
                  Add Committee
                </button>
              </div>
            }
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Committee Name *</label>
                  <input
                    type="text"
                    value={committeeForm.name}
                    onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Technical Team"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                  />
                  {!committeeForm.name.trim() && (
                    <p className="mt-2 text-xs text-red-400">Committee name is required.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Description (optional)</label>
                  <textarea
                    value={committeeForm.description}
                    onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the committee's responsibilities"
                    rows={3}
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Display Order</label>
                    <input
                      type="number"
                      value={committeeForm.order_position}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="10"
                      className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={committeeForm.is_core}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, is_core: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                      />
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Core Committee</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={committeeForm.enabled}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                    />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Visible on website</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Committee Color</label>
                <div className="space-y-3">
                  <input
                    type="color"
                    value={committeeForm.color}
                    onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-12 border border-white/20 rounded-xl cursor-pointer bg-black/20"
                  />
                  <div className="grid grid-cols-5 gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCommitteeForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          committeeForm.color === color ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
                    <div
                      className="w-6 h-6 rounded-full shadow-lg"
                      style={{ backgroundColor: committeeForm.color }}
                    />
                    <span className="text-sm text-gray-300 font-medium">Preview: {committeeForm.name || 'Committee Name'}</span>
                  </div>
                </div>
              </div>
            </div>
          </AdminModal>


          {/* Committees List - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCommittees.map((committee) => (
              <div key={committee.id} className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden group hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 hover:-translate-y-1">
                {/* Decorative Top Border */}
                <div className="h-1.5 w-full opacity-75" style={{ backgroundColor: committee.color }} />
                
                {editingCommittee === committee.id && (
                  <AdminModal
                    isOpen={editingCommittee === committee.id}
                    onClose={() => {
                      setEditingCommittee(null);
                      resetCommitteeForm();
                    }}
                    title={`Edit Committee: ${committee.name}`}
                    footer={
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommittee(null);
                            resetCommitteeForm();
                          }}
                          className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2 font-medium"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCommittee(committee.id)}
                          disabled={!committeeForm.name.trim()}
                          className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg font-bold ${
                            committeeForm.name.trim()
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-yellow-500/20 hover:-translate-y-0.5'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Save size={16} />
                          Update Committee
                        </button>
                      </div>
                    }
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Committee Name *</label>
                          <input
                            type="text"
                            value={committeeForm.name}
                            onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Technical Team"
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Description (optional)</label>
                          <textarea
                            value={committeeForm.description}
                            onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the committee's responsibilities"
                            rows={3}
                            className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Display Order</label>
                            <input
                              type="number"
                              value={committeeForm.order_position}
                              onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                              min="1"
                              max="10"
                              className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={committeeForm.is_core}
                                onChange={(e) => setCommitteeForm(prev => ({ ...prev, is_core: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                              />
                              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Core Committee</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={committeeForm.enabled}
                              onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                              className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                            />
                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Visible on website</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Committee Color</label>
                        <div className="space-y-3">
                          <input
                            type="color"
                            value={committeeForm.color}
                            onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                            className="w-full h-12 border border-white/20 rounded-xl cursor-pointer bg-black/20"
                          />
                          <div className="grid grid-cols-5 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setCommitteeForm(prev => ({ ...prev, color }))}
                                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                  committeeForm.color === color ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
                            <div
                              className="w-6 h-6 rounded-full shadow-lg"
                              style={{ backgroundColor: committeeForm.color }}
                            />
                            <span className="text-sm text-gray-300 font-medium">Preview: {committeeForm.name || committee.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AdminModal>
                )}
                  <div 
                    className={`p-6 cursor-move relative transition-colors bg-gradient-to-br from-transparent to-white/[0.02] ${
                      draggedCommittee === committee.id ? 'opacity-50' : ''
                    } ${
                      dragOverCommittee === committee.id ? 'ring-2 ring-amber-500/30 bg-amber-500/5' : ''
                    }`}
                    draggable={editingCommittee !== committee.id}
                    onDragStart={(e) => handleCommitteeDragStart(e, committee.id)}
                    onDragOver={(e) => handleCommitteeDragOver(e, committee.id)}
                    onDragLeave={handleCommitteeDragLeave}
                    onDrop={(e) => handleCommitteeDrop(e, committee.id)}
                    onDragEnd={handleCommitteeDragEnd}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-white/5 text-white/80"
                          style={{ borderLeft: `2px solid ${committee.color}` }}
                        >
                          <GripVertical size={14} className="text-gray-600 group-hover:text-white/50 transition-colors" />
                        </div>
                        <div>
                           <h4 className="font-bold text-lg text-white leading-tight">{committee.name}</h4>
                           <span className="text-[10px] text-gray-500 font-mono">ID: {committee.id}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {committee.is_core && (
                          <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20" title="Core Committee">
                            <Crown size={12} className="text-amber-500" />
                          </div>
                        )}
                        {!committee.enabled && (
                          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center">
                            Hidden
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-6 line-clamp-2 min-h-[40px]">
                      {committee.description || <span className="text-gray-600 italic">No description provided</span>}
                    </p>
                    
                    {/* Meta & Stats */}
                    <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-black/20 border border-white/5">
                      <div className="text-center">
                         <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Order</div>
                         <div className="text-white font-mono">{committee.order_position}</div>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                         <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Members</div>
                         <div className="text-emerald-400 font-bold">{membersByCommittee[committee.id]?.length || 0}</div>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Status</div>
                          <div className={`w-2 h-2 rounded-full mx-auto ${committee.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleCoreCommitteeEnabled(committee.id)}
                        className={`p-2 rounded-lg transition-all ${
                          committee.enabled 
                            ? 'text-emerald-500 hover:bg-emerald-500/10' 
                            : 'text-gray-500 hover:bg-gray-700'
                        }`}
                        title={committee.enabled ? 'Hide Committee' : 'Show Committee'}
                      >
                        {committee.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      <div className="flex gap-2">
                         <button
                           type="button"
                           onClick={() => toggleCoreCommitteeIsCore(committee.id, committee.is_core)}
                           className={`p-2 rounded-lg transition-all ${
                             committee.is_core
                               ? 'text-amber-400 bg-amber-500/10' 
                               : 'text-gray-500 hover:bg-amber-500/10 hover:text-amber-400'
                           }`}
                           title="Toggle Core Status"
                         >
                           <Crown size={16} />
                         </button>
                         <button
                           type="button"
                           onClick={() => startEditingCommittee(committee)}
                           className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all"
                           title="Edit Committee"
                         >
                           <Edit size={16} />
                         </button>
                         <button
                           type="button"
                           onClick={() => handleDeleteCommittee(committee.id)}
                           className="p-2 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                           title="Delete Committee"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  </div>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openMemberScanner}
                className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-500 border border-amber-500/20 hover:border-amber-500/40 px-4 py-2 rounded-lg transition-all flex items-center font-bold"
                title="Scan Team Members for a Committee"
              >
                <Users size={16} className="mr-2" />
                AI Scanner
              </button>
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
          </div>

          {/* Committee Picker for AI Scanner */}
          {showCommitteePicker && (
            <div className="mb-6 animate-in slide-in-from-top duration-300 bg-gradient-to-br from-amber-900/80 via-orange-900/60 to-[#181824] rounded-2xl border border-amber-500/30 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Select Committee for AI Scan</h3>
              </div>
              <p className="text-sm text-amber-200/60 mb-5">Choose which committee the scanned members should be added to:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                {coreCommittees.map((committee: any) => (
                  <button
                    key={committee.id}
                    type="button"
                    onClick={() => confirmCommitteeAndScan(committee.id)}
                    className="group flex items-center gap-3 p-4 bg-black/30 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 rounded-xl transition-all text-left hover:scale-[1.02]"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10 group-hover:ring-amber-500/50"
                      style={{ backgroundColor: committee.color }}
                    />
                    <span className="text-sm font-semibold text-white truncate">{committee.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCommitteePicker(false)}
                  className="px-5 py-2 rounded-xl font-medium text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Inline AI Scanner for Team Members */}
          {showAIScanner && activeSection === 'members' && (
            <div className="mb-6 animate-in slide-in-from-top duration-300">
              <AICoreTeamScanner
                onScanComplete={handleScanComplete}
                onCancel={() => { setShowAIScanner(false); setScannerTargetCommitteeId(null); }}
              />
            </div>
          )}

          {/* Add/Edit Member Modal */}
          <AdminModal
            isOpen={isAddingMember || editingMember !== null}
            onClose={() => {
              setIsAddingMember(false);
              setEditingMember(null);
              resetMemberForm();
            }}
            title={editingMember ? 'Edit Team Member' : 'Add New Team Member'}
            maxWidth="max-w-5xl"
            footer={
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingMember(false);
                    setEditingMember(null);
                    resetMemberForm();
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingMember ? () => handleUpdateMember(editingMember) : handleAddMember}
                  disabled={!memberForm.name.trim() || !memberForm.image}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-xl transition-all flex items-center gap-2 transform active:scale-95 ${
                    memberForm.name.trim() && memberForm.image
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-amber-500/25 hover:from-amber-400 hover:to-orange-500'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <Save size={16} />
                  {editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              {/* Left Column: Media & Identity */}
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Profile Photo</label>
                  <div className="bg-black/20 rounded-2xl p-2 border border-white/5">
                    <ImageUpload
                      onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))}
                      currentImage={memberForm.image}
                      bucket="team-images"
                      folder="core-team"
                      cropAspect={1}
                      className="rounded-xl overflow-hidden aspect-square"
                    />
                  </div>
                  {!memberForm.image && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5 pl-1">
                      <span className="w-1 h-1 rounded-full bg-red-400" /> Photo is required
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Committee Assignment</label>
                  <div className="relative group">
                     <select
                      value={memberForm.committee_id}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))}
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none transition-all cursor-pointer font-medium"
                    >
                      <option value={0} className="text-gray-500">Unassigned</option>
                      {sortedCommittees.map(committee => (
                        <option key={committee.id} value={committee.id}>
                          {committee.name} {committee.is_core ? '(Core)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <GripVertical size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f0f13] rounded-xl p-4 border border-white/5 space-y-1">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Visibility & Status</h5>
                  
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">Active on Website</span>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${memberForm.enabled ? 'bg-green-500' : 'bg-gray-700'}`}>
                      <input type="checkbox" checked={memberForm.enabled} onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))} className="sr-only" />
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${memberForm.enabled ? 'left-6' : 'left-1'}`} />
                    </div>
                  </label>

                  <div className="h-px bg-white/5 my-1" />

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2">
                       <Crown size={14} className={memberForm.is_head ? "text-amber-500" : "text-gray-600"} />
                       <span className={`text-sm font-medium group-hover:text-white ${memberForm.is_head ? "text-amber-400" : "text-gray-300"}`}>Committee Head</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={memberForm.is_head} 
                      onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked, ...(e.target.checked ? { isCouncil: false } : {}) }))}
                      className="w-4 h-4 rounded border-gray-600 bg-black/40 text-amber-500 focus:ring-amber-500/50 transition-all cursor-pointer" 
                    />
                  </label>

                  <div className="h-px bg-white/5 my-1" />

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-red-500/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2">
                       <div className={`w-3.5 h-3.5 rounded-full border-2 ${memberForm.isCouncil ? "border-red-500" : "border-gray-600"}`} />
                       <span className={`text-sm font-medium group-hover:text-red-300 ${memberForm.isCouncil ? "text-red-400" : "text-gray-300"}`}>Council Member</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={memberForm.isCouncil} 
                      onChange={(e) => setMemberForm(prev => ({ ...prev, isCouncil: e.target.checked, ...(e.target.checked ? { is_head: false } : {}) }))}
                      className="w-4 h-4 rounded border-gray-600 bg-black/40 text-red-500 focus:ring-red-500/50 transition-all cursor-pointer" 
                    />
                  </label>
                </div>
              </div>

              {/* Right Column: Member Details */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name *</label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Rahul Kapoor"
                      className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Role / Title</label>
                     <input
                      type="text"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="e.g. Lead Coordinator"
                       className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number (Hidden)</label>
                     <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91..."
                       className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    />
                  </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Specialty Tag</label>
                     <input
                      type="text"
                      value={memberForm.specialty}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="e.g. Developer"
                       className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Bio / Description</label>
                  <textarea
                    value={memberForm.description}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Share a brief description of their role and contributions..."
                    rows={3}
                     className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
                  />
                </div>

                <div className="space-y-3 pt-2">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                     Social Profiles <span className="text-[10px] font-normal opacity-50 lowercase">(optional)</span>
                   </label>
                   <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <Instagram className="absolute left-3 top-3.5 text-pink-500 transition-transform group-focus-within:scale-110" size={16} />
                         <input
                          type="url"
                          value={memberForm.social_links.instagram}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
                          placeholder="Instagram URL"
                           className="w-full bg-[#0f0f13] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                      </div>
                      <div className="relative group">
                        <Youtube className="absolute left-3 top-3.5 text-red-500 transition-transform group-focus-within:scale-110" size={16} />
                         <input
                          type="url"
                          value={memberForm.social_links.youtube}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))}
                          placeholder="YouTube URL"
                           className="w-full bg-[#0f0f13] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-all"
                        />
                      </div>

                   </div>
                </div>

                {/* Achievements */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Key Achievements</label>
                  <div className="space-y-2">
                     {memberForm.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 flex-shrink-0" />
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => updateAchievement(index, e.target.value)}
                          placeholder="e.g. Best Organizer 2025"
                           className="flex-1 bg-transparent border-b border-white/10 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-all"
                        />
                         <button onClick={() => removeAchievement(index)} className="p-1.5 hover:bg-white/10 rounded-full text-red-400/70 hover:text-red-400 transition-colors">
                          <X size={14} />
                         </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addAchievement}
                      className="mt-2 text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all"
                    >
                      <Plus size={12} /> Add Achievement
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </AdminModal>

          {/* Members by Committee */}
          {sortedCommittees.map((committee) => {
            const committeeMembers = membersByCommittee[committee.id] || [];

            return (
              <div key={committee.id} className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl p-6 sm:p-8 relative overflow-hidden group">
                {/* Subtle highlight effect */}
                <div 
                  className="absolute top-0 left-0 w-1.5 h-full opacity-50 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: committee.color }}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 duration-300"
                      style={{ backgroundColor: `${committee.color}20`, border: `1px solid ${committee.color}40` }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: committee.color }} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white tracking-tight">{committee.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">{committeeMembers.length} active members</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMember(true);
                      setMemberForm(prev => ({ ...prev, committee_id: committee.id }));
                    }}
                    className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-300"
                  >
                    <div className="p-1 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30">
                      <Plus size={12} />
                    </div>
                    <span>Add Member</span>
                  </button>
                </div>
                
                {committeeMembers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
                  {committeeMembers.map((member: any) => (
                    <div key={member.id} className={`bg-black/20 backdrop-blur-sm border border-white/5 rounded-2xl p-5 transition-all duration-300 group/card hover:bg-white/[0.02] hover:border-white/10 ${editingMember === member.id ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-[#181824]' : dragOverMember === member.id ? 'border-amber-500 scale-[1.02] shadow-2xl shadow-amber-500/10' : 'hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50'}`}>
                        <div 
                          className={`cursor-move relative flex flex-col h-full ${
                            draggedMember === member.id ? 'opacity-50 scale-95' : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleMemberDragStart(e, member.id)}
                          onDragOver={(e) => handleMemberDragOver(e, member.id)}
                          onDragLeave={handleMemberDragLeave}
                          onDrop={(e) => handleMemberDrop(e, member.id)}
                          onDragEnd={handleMemberDragEnd}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={(() => {
                                    const sanitized = sanitizeUrl?.(member.image) || member.image;
                                    return sanitized;
                                  })()}
                                  alt={member.name}
                                  className="w-14 h-14 object-cover rounded-xl shadow-lg ring-1 ring-white/10"
                                />
                                {(member as any).isCouncil && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-[#0f0f13] rounded-full p-0.5">
                                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-[#0f0f13]" title="Council Member" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-base text-white leading-tight mb-1">{member.name}</h5>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 border border-white/5">
                                  {member.role || 'Member'}
                                </span>
                              </div>
                            </div>
                            <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab hover:text-gray-400" />
                          </div>

                          <div className="mb-4 flex-grow">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {member.specialty && (
                                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20 font-medium truncate max-w-full">
                                  {member.specialty}
                                </span>
                              )}
                              {!member.enabled && (
                                <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20 font-medium flex items-center gap-1">
                                  <EyeOff size={10} /> Hidden
                                </span>
                              )}
                            </div>
                            
                            {member.description && (
                              <div className="relative">
                                <PreserveNewlines text={member.description} className="text-gray-400 text-xs leading-relaxed line-clamp-3" />
                              </div>
                            )}
                          </div>
                          
                          {/* Footer Actions */}
                          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                             
                             {/* Socials */}
                             <div className="flex items-center gap-2">
                                {member.social_links?.instagram && (
                                  <a href={member.social_links.instagram} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors">
                                    <Instagram size={14} />
                                  </a>
                                )}
                                {member.social_links?.youtube && (
                                  <a href={member.social_links.youtube} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-red-500 transition-colors">
                                    <Youtube size={14} />
                                  </a>
                                )}
                             </div>

                             {/* Edit Actions */}
                             <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                               <button
                                 type="button"
                                 onClick={() => toggleCoreTeamMemberEnabled(member.id)}
                                 className={`p-1.5 rounded-lg transition-all ${
                                   member.enabled 
                                     ? 'text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-400' 
                                     : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                 }`}
                                 title={member.enabled ? 'Hide from public' : 'Show to public'}
                               >
                                 {member.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                               </button>
                               <button
                                 type="button"
                                 onClick={() => toggleCoreTeamMemberIsHead(member.id)}
                                 className={`p-1.5 rounded-lg transition-all ${
                                   member.is_head 
                                     ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' 
                                     : 'text-gray-500 hover:bg-amber-500/10 hover:text-amber-400'
                                 }`}
                                 title={member.is_head ? 'Remove as head' : 'Make committee head'}
                               >
                                 <Crown size={12} />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => startEditingMember(member)}
                                 className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                 title="Edit Member"
                               >
                                 <Edit size={12} />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => handleDeleteMember(member.id)}
                                 className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                 title="Delete Member"
                               >
                                 <Trash2 size={12} />
                               </button>
                             </div>
                          </div>
                      </div>
                    </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-in fade-in zoom-in duration-500">
                      <Users size={24} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm mb-4 font-medium">No team members in {committee.name} yet</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMember(true);
                        setMemberForm(prev => ({ ...prev, committee_id: committee.id }));
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wide transition-all border border-white/5 hover:border-white/10"
                    >
                      <Plus size={12} />
                      Add First Member
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* No Members Message */}
          {coreTeamMembers.length === 0 && coreCommittees.length > 0 && (
            <div className="text-center py-24 bg-[#181824]/40 backdrop-blur-md rounded-2xl border border-white/5 border-dashed">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Team Members Yet</h3>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">Start building your core team by adding members to your committees.</p>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMember(true);
                  resetMemberForm();
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-orange-500/20 hover:scale-105 transition-all"
              >
                Add First Member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-white/5">
          <div className="p-2">
            <div className="text-3xl font-black text-amber-500 mb-1">{coreCommittees.length}</div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Committees</div>
          </div>
          <div className="p-2">
            <div className="text-3xl font-black text-blue-500 mb-1">
              {coreCommittees.filter((c: any) => c.is_core).length}
            </div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Core Committees</div>
          </div>
          <div className="p-2">
            <div className="text-3xl font-black text-emerald-500 mb-1">{coreTeamMembers.length}</div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Team Members</div>
          </div>
          <div className="p-2">
            <div className="text-3xl font-black text-purple-500 mb-1">
              {coreTeamMembers.filter((m: any) => m.enabled).length}
            </div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Visible Members</div>
          </div>
        </div>
      </div>


    </div>
  );
};