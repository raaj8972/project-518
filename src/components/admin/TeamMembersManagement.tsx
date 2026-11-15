import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Users, ScanLine, Filter } from 'lucide-react';
import { AdminModal } from './layout/AdminModal';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { AICoreTeamScanner, type ExtractedCoreTeamData } from './AICoreTeamScanner';
import { instagramProfile, isCouncilPerson, personInstagram } from '../../utils/familyPeople';

interface Props {
  isHeadMode?: boolean;
  isCouncilMode?: boolean;
}

export const TeamMembersManagement: React.FC<Props> = ({ isHeadMode = false, isCouncilMode = false }) => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const { 
    coreTeamMembers, 
    coreCommittees,
    addCoreTeamMember, 
    updateCoreTeamMember, 
    deleteCoreTeamMember,
    toggleCoreTeamMemberEnabled
  } = useData() as any;

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<number | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const draftKey = isCouncilMode ? 'admin_council_form_draft' : `admin_${isHeadMode ? 'heads' : 'members'}_form_draft`;

  const [form, setForm] = useLocalStorage(draftKey, {
    name: '',
    is_head: isHeadMode,
    image: '',
    instagram: '',
    order_position: 1,
    committee_id: null as number | null,
    enabled: true
  });

  const resetForm = () => {
    setFormError('');
    setForm({
      name: '',
      is_head: isHeadMode,
      image: '',
      instagram: '',
      order_position: Math.max(0, ...coreTeamMembers.map((member: any) => member.order_position || 0)) + 1,
      committee_id: selectedCommitteeId === 'all' ? null : selectedCommitteeId,
      enabled: true
    });
  };

  const filteredMembers = (coreTeamMembers || [])
    .filter((m: any) => isCouncilMode ? isCouncilPerson(m) : !isCouncilPerson(m) && Boolean(m.is_head) === isHeadMode)
    .filter((m: any) => isCouncilMode || selectedCommitteeId === 'all' || m.committee_id === selectedCommitteeId)
    .sort((a: any, b: any) => a.order_position - b.order_position);

  const getCommitteeName = (id: number | null) => {
    if (!id) return 'Unassigned';
    return (coreCommittees || []).find((c: any) => c.id === id)?.name || 'Unknown';
  };
  
  const getCommitteeColor = (id: number | null) => {
      if (!id) return 'gray';
      return (coreCommittees || []).find((c: any) => c.id === id)?.color || 'gray';
  };

  const buildPayload = () => {
    const existing = editing === null ? undefined : coreTeamMembers.find((member: any) => member.id === editing);
    const socialLinks = existing?.social_links && typeof existing.social_links === 'object' && !Array.isArray(existing.social_links) ? existing.social_links : {};
    return {
      name: form.name.trim(),
      image: form.image,
      role: existing?.role || ((form.is_head ?? isHeadMode) ? 'Head' : 'Member'),
      order_position: form.order_position,
      enabled: form.enabled,
      committee_id: form.committee_id || null,
      is_head: Boolean(form.is_head ?? isHeadMode),
      is_council: isCouncilMode,
      social_links: { ...socialLinks, instagram: instagramProfile(form.instagram)?.url || '' }
    };
  };

  const saveMember = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.image) { setFormError('Name and profile image are required.'); return; }
    if (!isCouncilMode && !form.committee_id) { setFormError('Please select a department.'); return; }
    if (form.instagram?.trim() && !instagramProfile(form.instagram)) { setFormError('Enter a valid Instagram handle or profile URL.'); return; }
    setFormError('');
    setSaving(true);
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving');
      const payload = buildPayload();
      if (requiresApproval) {
        const result = await submitForApproval('core_team_member', editing === null ? 'create' : 'update', payload, editing ?? undefined);
        if (!result.success) throw new Error(result.error || 'Approval request failed');
        alert('Request submitted for approval.');
      } else if (editing === null) {
        await addCoreTeamMember(payload);
      } else {
        await updateCoreTeamMember(editing, payload);
      }
      setIsAdding(false);
      setEditing(null);
      resetForm();
      localStorage.removeItem(draftKey);
    } catch (error) {
      setFormError('Could not save. Your changes are still here; please try again.');
    } finally {
      setSaving(false);
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this member?')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        if (requiresApproval) {
          await submitForApproval('core_team_member', 'delete', {}, id);
          alert('Request submitted for approval.');
        } else {
          await deleteCoreTeamMember(id);
        }
      } catch (error) {
        alert('Failed to delete member.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const startEditing = (member: any) => {
    setEditing(member.id);
    setFormError('');
    setForm({
      is_head: Boolean(member.is_head),
      name: member.name || '',
      image: member.image || '',
      instagram: member.social_links?.instagram || '',
      order_position: member.order_position || 1,
      committee_id: member.committee_id,
      enabled: member.enabled !== false
    });
  };

  const handleScanComplete = async (data: ExtractedCoreTeamData, uploadedImages: string[]) => {
    try {
      const steps = savingProgress.withSteps(data.members.length, 'Processing Scanned Data');
      
      for (const m of data.members) {
        steps.next(`Importing ${m.name}`);
        
        let committeeId = null;
        if (selectedCommitteeId !== 'all') {
          committeeId = selectedCommitteeId;
        } else if (m.committee_name) {
          const match = (coreCommittees || []).find((c: any) => 
            c.name.toLowerCase().includes(m.committee_name.toLowerCase()) ||
            m.committee_name.toLowerCase().includes(c.name.toLowerCase())
          );
          if (match) committeeId = match.id;
        }
        
        let imageUrl = '';
        if (m.image_index !== undefined && uploadedImages[m.image_index]) {
          imageUrl = uploadedImages[m.image_index];
        }

        const payload = {
          name: m.name,
          role: isHeadMode ? 'Head' : 'Member',
          image: imageUrl || 'https://via.placeholder.com/150',
          order_position: 1,
          enabled: true,
          committee_id: isCouncilMode ? null : committeeId,
          is_head: isHeadMode,
          is_council: isCouncilMode,
          social_links: { instagram: m.instagram }
        };

        if (requiresApproval) {
          await submitForApproval('core_team_member', 'create', payload);
        } else {
          await addCoreTeamMember(payload);
        }
      }
      
      alert(requiresApproval ? 'Scanned members submitted for approval!' : 'Successfully imported members!');
      setShowScanner(false);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import some scanned members.');
    } finally {
      savingProgress.done();
    }
  };

  if (showScanner) {
    return (
      <AICoreTeamScanner 
        onScanComplete={handleScanComplete}
        onCancel={() => setShowScanner(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-gray-400 text-sm">{isCouncilMode ? 'Manage council heads and members.' : isHeadMode ? 'Add 2–3 heads per department. All heads appear together.' : 'Members appear in an automatic image carousel within their department.'} Only the photo, name and Instagram appear on public profiles.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {!isCouncilMode && <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg">
            <Filter size={16} className="text-gray-500" />
            <select
              value={selectedCommitteeId}
              onChange={e => setSelectedCommitteeId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-transparent text-sm text-white focus:outline-none min-w-[150px]"
            >
              <option value="all" className="bg-[#1a1b23]">All Departments</option>
              {(coreCommittees || []).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#1a1b23]">{c.name}</option>
              ))}
            </select>
          </div>}

          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg font-bold shadow-lg transition-all text-sm"
          >
            <ScanLine size={16} />
            <span className="hidden md:inline">AI Scanner</span>
          </button>

          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${isHeadMode ? 'from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400' : 'from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400'} text-white rounded-lg font-bold shadow-lg transition-all text-sm`}
          >
            <Plus size={16} />
            <span>Add {isCouncilMode ? 'Council Person' : isHeadMode ? 'Head' : 'Member'}</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length > 0 ? filteredMembers.map((member: any) => {
          const color = getCommitteeColor(member.committee_id);
          return (
            <div key={member.id} className={`bg-white/[0.03] rounded-2xl p-4 border transition-all ${!member.enabled ? 'opacity-50 grayscale' : `border-white/5 hover:border-${color}-500/30`} flex flex-col`}>
              <div className="flex gap-4 mb-4">
                <img src={member.image || 'https://via.placeholder.com/150'} alt={member.name} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-lg truncate">{member.name}</h4>
                  <p className="text-emerald-400 text-sm font-medium truncate">{member.is_head ? 'Head' : 'Member'}</p>
                  {personInstagram(member) && <p className="text-gray-400 text-xs truncate">{personInstagram(member)?.handle}</p>}
                  <div className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-${color}-500/15 text-${color}-400 border border-${color}-500/20 truncate max-w-full`}>
                    {isCouncilMode ? 'Council' : getCommitteeName(member.committee_id)}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-4 flex gap-2 border-t border-white/5">
                <button aria-label={`${member.enabled ? 'Hide' : 'Show'} ${member.name}`} onClick={() => toggleCoreTeamMemberEnabled(member.id)} className={`flex-1 flex justify-center py-2 rounded-lg transition-colors ${member.enabled ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-red-500/20 text-red-400'}`}>
                  {member.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button aria-label={`Edit ${member.name}`} onClick={() => startEditing(member)} className="flex-1 flex justify-center py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  <Edit size={18} />
                </button>
                <button aria-label={`Delete ${member.name}`} onClick={() => handleDelete(member.id)} className="flex-1 flex justify-center py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <Users size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No {isHeadMode ? 'Heads' : 'Members'} Found</h3>
            <p className="text-gray-500 text-sm">
              {selectedCommitteeId === 'all' 
                ? `Add a ${isHeadMode ? 'Head' : 'Member'} or use the AI Scanner to import them.` 
                : `No ${isHeadMode ? 'heads' : 'members'} in this department yet.`}
            </p>
          </div>
        )}
      </div>

      <AdminModal
        isOpen={isAdding || editing !== null}
        onClose={() => { if (!saving) { setIsAdding(false); setEditing(null); resetForm(); } }}
        title={`${editing !== null ? 'Edit' : 'Add'} ${isCouncilMode ? 'Council Person' : isHeadMode ? 'Head' : 'Member'}`}
        footer={<><button type="button" disabled={saving} onClick={() => { setIsAdding(false); setEditing(null); resetForm(); }} className="px-4 py-2 text-gray-300">Cancel</button><button type="button" disabled={saving} onClick={saveMember} className="px-6 py-2 bg-emerald-700 text-white rounded-xl disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button></>}
      >
        <fieldset disabled={saving} className="space-y-4">
          {formError && <p role="alert" className="text-red-300 text-sm">{formError}</p>}
          <div>
            <label htmlFor="family-person-committee" className="block text-sm font-bold text-gray-300 mb-1">{isCouncilMode ? 'Department (optional)' : 'Department *'}</label>
            <select id="family-person-committee"
              value={form.committee_id || ''} 
              onChange={e => setForm({...form, committee_id: parseInt(e.target.value) || null})} 
              className="w-full bg-[#1a1b23] border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value="">-- Select Department --</option>
              {(coreCommittees || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
           </div>
          <div>
            <label htmlFor="family-person-name" className="block text-sm font-bold text-gray-300 mb-1">Name *</label>
            <input id="family-person-name" type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-1">Profile Image *</label>
            <ImageUpload currentImage={form.image} onImageSelect={(url) => setForm({...form, image: url})} bucket="team-images" folder="team" />
          </div>
          <div>
            <label htmlFor="family-person-instagram" className="block text-sm font-bold text-gray-300 mb-1">Instagram</label>
            <input id="family-person-instagram" type="text" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} placeholder="@handle or Instagram profile URL" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
        </fieldset>
      </AdminModal>
    </div>
  );
};
