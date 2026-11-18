import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ScanLine, Filter } from 'lucide-react';
import { AdminModal } from './layout/AdminModal';
import { useData } from '../../context/DataContext';
import { PeopleProfileForm } from './PeopleProfileForm';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { AICoreTeamScanner, type ExtractedCoreTeamData } from './AICoreTeamScanner';
import { instagramProfile, isCouncilPerson, personInstagram, personBatch, phoneProfile } from '../../utils/familyPeople';

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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const draftKey = isCouncilMode ? 'admin_council_form_draft' : `admin_${isHeadMode ? 'heads' : 'members'}_form_draft`;

  const [form, setForm] = useLocalStorage(draftKey, {
    name: '',
    is_head: isHeadMode,
    image: '',
    instagram: '', phone: '', batch: '',
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
      instagram: '', phone: '', batch: '',
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
  
  const buildPayload = () => {
    const existing = editing === null ? undefined : coreTeamMembers.find((member: any) => member.id === editing);
    const socialLinks = existing?.social_links && typeof existing.social_links === 'object' && !Array.isArray(existing.social_links) ? existing.social_links : {};
    return {
      name: form.name.trim(),
      image: form.image,
      phone: form.phone?.trim() || null,
      role: existing?.role || ((form.is_head ?? isHeadMode) ? 'Head' : 'Member'),
      order_position: form.order_position,
      enabled: form.enabled,
      committee_id: form.committee_id || null,
      is_head: Boolean(form.is_head ?? isHeadMode),
      is_council: isCouncilMode,
      social_links: { ...socialLinks, instagram: instagramProfile(form.instagram)?.url || '', batch: form.batch?.trim() || '' }
    };
  };

  const saveMember = async () => {
    if (saving || photoBusy) return;
    if (!form.name.trim() || !form.image) { setFormError('Name and profile image are required.'); return; }
    if (!isCouncilMode && !form.committee_id) { setFormError('Please select a department.'); return; }
    if (form.instagram?.trim() && !instagramProfile(form.instagram)) { setFormError('Enter a valid Instagram handle or profile URL.'); return; }
    if (form.phone?.trim() && !phoneProfile(form.phone)) { setFormError('Enter a valid phone number with country code.'); return; }
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
      phone: member.phone || '', batch: personBatch(member),
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
    <div className="people-management space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-gray-400 text-sm">{isCouncilMode ? 'Manage council heads and members.' : isHeadMode ? 'Add 2–3 heads per department. All heads appear together.' : 'Members appear in an automatic image carousel within their department.'} Manage photos, batch and contact links for each profile.</p>
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
            className="people-button people-button-secondary"
          >
            <ScanLine size={16} />
            <span className="hidden md:inline">AI Scanner</span>
          </button>

          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="people-button people-button-primary"
          >
            <Plus size={16} />
            <span>Add {isCouncilMode ? 'Council Person' : isHeadMode ? 'Head' : 'Member'}</span>
          </button>
        </div>
      </div>

      <div className="people-roster">
        {filteredMembers.map((member: any) => <article key={member.id} className={`people-roster-card ${member.enabled ? '' : 'is-hidden'}`}>
          <img src={member.image || ''} alt={member.name} /><div className="people-roster-details"><span className="people-section-label">{isCouncilMode ? 'Council' : getCommitteeName(member.committee_id)}</span><h3>{member.name}</h3><p>{isCouncilMode ? 'Council member' : isHeadMode ? 'Department head' : 'Team member'} · {member.enabled ? 'Visible' : 'Hidden'}</p>{personBatch(member) && <small>Batch {personBatch(member)}</small>}{personInstagram(member) && <p>{personInstagram(member)?.handle}</p>}</div>
          <div className="people-roster-actions"><button type="button" aria-label={`${member.enabled ? 'Hide' : 'Show'} ${member.name}`} onClick={() => toggleCoreTeamMemberEnabled(member.id)}>{member.enabled ? <Eye size={16} /> : <EyeOff size={16} />}</button><button type="button" aria-label={`Edit ${member.name}`} onClick={() => startEditing(member)}><Edit size={16} /></button><button type="button" aria-label={`Delete ${member.name}`} onClick={() => handleDelete(member.id)}><Trash2 size={16} /></button></div>
        </article>)}
      </div>
      {!filteredMembers.length && <div className="people-empty"><h3>No {isCouncilMode ? 'council profiles' : isHeadMode ? 'heads' : 'members'} yet</h3><p>Add a profile{selectedCommitteeId !== 'all' ? ' to this department' : ''} to get started.</p></div>}

      <AdminModal
        isOpen={isAdding || editing !== null}
        appearance="people" subtitle="Photo, details and contact links in one place."
        onClose={() => { if (!saving && !photoBusy) { setIsAdding(false); setEditing(null); resetForm(); } }}
        title={`${editing !== null ? 'Edit' : 'Add'} ${isCouncilMode ? 'Council Person' : isHeadMode ? 'Head' : 'Member'}`}
        footer={<><button type="button" disabled={saving || photoBusy} onClick={() => { setIsAdding(false); setEditing(null); resetForm(); }} className="people-button people-button-secondary">Cancel</button><button type="button" disabled={saving || photoBusy} onClick={saveMember} className="people-button people-button-primary">{saving ? 'Saving…' : 'Save Changes'}</button></>}
      >
        <fieldset disabled={saving} className="people-form-fieldset">
          {formError && <p role="alert" className="text-red-300 text-sm">{formError}</p>}
          <PeopleProfileForm kind={isCouncilMode ? 'council' : isHeadMode ? 'head' : 'member'} form={form} onChange={patch => setForm({ ...form, ...patch })} departments={coreCommittees || []} onProcessingChange={setPhotoBusy} />
        </fieldset>
      </AdminModal>
    </div>
  );
};
