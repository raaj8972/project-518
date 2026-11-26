import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Square,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useData } from '../../context/DataContext';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';
import { AIChatScanner } from './AIChatScanner';

const EditableBatch: React.FC<{
  profile: any;
  options: string[];
  onSave: (email: string, newBatch: string) => Promise<void>;
}> = ({ profile, options, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(profile.batch || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tempValue.trim() === (profile.batch || '').trim()) {
      setIsEditing(false);
      return;
    }
    if (!profile.email) {
      toast.error('No email found for this student');
      return;
    }
    setSaving(true);
    try {
      await onSave(profile.email, tempValue);
      profile.batch = tempValue;
      setIsEditing(false);
    } catch (err) {
      console.error('Batch save failed', err);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <select
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className="h-7 px-2 text-xs rounded border border-[#426b52] bg-white text-[#26352e] focus:outline-none"
        >
          <option value="">No batch</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save batch"
          className="p-1 rounded bg-[#426b52] text-white"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setTempValue(profile.batch || '');
          }}
          aria-label="Cancel batch edit"
          className="p-1 rounded border border-[#e2e8df] text-[#65726a]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f6ef] border border-[#e2e8df] text-[#3d6246] hover:border-[#426b52] transition-colors"
    >
      <span>{profile.batch || 'No batch'}</span>
      <Pencil className="w-2.5 h-2.5 opacity-60" />
    </button>
  );
};

export const StudentApprovals: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAIScanner, setShowAIScanner] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [aiSelectedBatch, setAiSelectedBatch] = useState('Unassigned');

  const { siteSettings } = useData();
  const { updateBatchGlobally } = useRegistrationMutations();

  const batchOptions = useMemo(() => {
    const fromSettings = (siteSettings as any)?.registration_participant_types || [];
    const fromProfiles = Array.from(new Set(profiles.map((p) => p.batch).filter(Boolean)));
    return Array.from(new Set([...fromSettings, ...fromProfiles])).sort() as string[];
  }, [siteSettings, profiles]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (filter === 'pending') query = query.eq('is_approved', false);
      else if (filter === 'approved') query = query.eq('is_approved', true);

      const { data, error } = await query;
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      toast.error('Could not load students: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_approve_student_profiles', {
        p_student_ids: [id],
        p_password: '',
        p_is_approved: !currentStatus,
      });
      if (error) throw error;
      toast.success(currentStatus ? 'Approval removed' : 'Student approved');
      fetchProfiles();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error('Could not update approval: ' + (err.message || 'Unknown error'));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkApproving(true);
    try {
      const { error } = await supabase.rpc('admin_approve_student_profiles', {
        p_student_ids: Array.from(selectedIds),
        p_password: '',
        p_is_approved: true,
      });
      if (error) throw error;
      toast.success(`Approved ${selectedIds.size} students`);
      setSelectedIds(new Set());
      fetchProfiles();
    } catch (err: any) {
      toast.error('Bulk approval failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsBulkApproving(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
      if (selectedBatch !== 'all' && p.batch !== selectedBatch) return false;
      if (!q) return true;
      return (
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    });
  }, [profiles, searchQuery, selectedBatch]);

  const allPendingSelected =
    filter === 'pending' &&
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allPendingSelected) {
      filteredProfiles.forEach((p) => next.delete(p.id));
    } else {
      filteredProfiles.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary & Controls */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status filter pills */}
          <div className="inline-flex items-center gap-1 bg-[#fafbf9] border border-[#e2e8df] rounded-lg p-1 self-start">
            {(
              [
                { id: 'pending', label: 'Needs approval' },
                { id: 'approved', label: 'Approved' },
                { id: 'all', label: 'All students' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === item.id
                    ? 'bg-white text-[#26352e] shadow-sm border border-[#e2e8df]'
                    : 'text-[#65726a] hover:text-[#26352e]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && filter === 'pending' && (
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
                className="h-9 px-3.5 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                {isBulkApproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve selected ({selectedIds.size})
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAIScanner(true)}
              className="h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-[#426b52]" />
              AI Scan List
            </button>

            <button
              type="button"
              onClick={fetchProfiles}
              disabled={loading}
              aria-label="Refresh student list"
              className="h-9 w-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] inline-flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search + Batch filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#eef2ec]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, email, or phone..."
              className="w-full h-10 sm:h-9 pl-9 pr-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] placeholder:text-[#86938b] focus:outline-none focus:border-[#426b52] focus:bg-white"
            />
          </div>

          <div className="relative sm:w-52">
            <Filter className="w-3.5 h-3.5 text-[#65726a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filter by batch"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full h-10 sm:h-9 pl-8 pr-7 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
            >
              <option value="all">All batches</option>
              {batchOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading / Empty */}
      {loading ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <Loader2 className="w-6 h-6 text-[#426b52] animate-spin mx-auto mb-2" />
          Loading student accounts...
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 px-4 text-center text-xs text-[#65726a]">
          <Users className="w-8 h-8 text-[#a3b0a7] mx-auto mb-2" />
          <p className="font-medium text-[#26352e]">No students found</p>
          <p className="text-xs text-[#65726a] mt-0.5">
            {filter === 'pending'
              ? 'Everyone in this list is already approved.'
              : 'Try clearing your search or changing the batch filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Phone Cards */}
          <div className="md:hidden space-y-3">
            {filter === 'pending' && (
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-medium text-[#26352e]"
                >
                  {allPendingSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#426b52]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#65726a]" />
                  )}
                  {allPendingSelected ? 'Unselect all' : 'Select all'}
                </button>
                <span className="text-[11px] text-[#65726a]">{filteredProfiles.length} students</span>
              </div>
            )}

            {filteredProfiles.map((profile) => {
              const initials = (profile.full_name || 'S')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={profile.id}
                  className="bg-white border border-[#e2e8df] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {filter === 'pending' && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(profile.id)}
                          aria-label={`Select ${profile.full_name}`}
                          className="p-1 -ml-1 text-[#65726a]"
                        >
                          {selectedIds.has(profile.id) ? (
                            <CheckSquare className="w-4 h-4 text-[#426b52]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div className="w-9 h-9 rounded-full bg-[#eaf0e5] border border-[#dbe4d6] text-[#426b52] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#26352e] truncate">
                          {profile.full_name || 'Unnamed student'}
                        </p>
                        <p className="text-[11px] text-[#65726a] truncate">
                          {profile.phone || 'No phone'} · {profile.college || 'No college'}
                        </p>
                      </div>
                    </div>

                    {profile.is_approved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246] shrink-0">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#b45309] shrink-0">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#eef2ec]">
                    <EditableBatch
                      profile={profile}
                      options={batchOptions}
                      onSave={updateBatchGlobally}
                    />
                    <span className="text-[11px] text-[#65726a]">
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleApproval(profile.id, profile.is_approved)}
                    className={`w-full h-10 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                      profile.is_approved
                        ? 'border border-[#f2cfd3] bg-[#fdf2f3] text-[#b43c48]'
                        : 'bg-[#426b52] hover:bg-[#365a44] text-white'
                    }`}
                  >
                    {profile.is_approved ? 'Remove approval' : 'Approve student'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-[#e2e8df] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8df] bg-[#fafbf9] text-[11px] font-semibold text-[#65726a]">
                    {filter === 'pending' && (
                      <th className="py-3 px-4 w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          aria-label={allPendingSelected ? 'Deselect all' : 'Select all'}
                          className="text-[#65726a] hover:text-[#26352e]"
                        >
                          {allPendingSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#426b52]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Contact & college</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec] text-xs">
                  {filteredProfiles.map((profile) => {
                    const initials = (profile.full_name || 'S')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={profile.id} className="hover:bg-[#fafcf9] transition-colors">
                        {filter === 'pending' && (
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => toggleSelect(profile.id)}
                              aria-label={`Select ${profile.full_name}`}
                              className="text-[#65726a] hover:text-[#26352e]"
                            >
                              {selectedIds.has(profile.id) ? (
                                <CheckSquare className="w-4 h-4 text-[#426b52]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#eaf0e5] border border-[#dbe4d6] text-[#426b52] font-semibold text-[11px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <span className="font-medium text-[#26352e]">
                              {profile.full_name || 'Unnamed student'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px] text-[#4a5750]">
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#8a968e]" />
                              {profile.phone || '—'}
                              {profile.email && (
                                <span className="text-[#65726a] flex items-center gap-1 ml-2">
                                  <Mail className="w-3 h-3 text-[#8a968e]" />
                                  {profile.email}
                                </span>
                              )}
                            </p>
                            {profile.college && (
                              <p className="flex items-center gap-1.5 text-[#65726a]">
                                <GraduationCap className="w-3 h-3 text-[#8a968e]" />
                                {profile.college}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <EditableBatch
                            profile={profile}
                            options={batchOptions}
                            onSave={updateBatchGlobally}
                          />
                        </td>

                        <td className="py-3.5 px-4 text-[#65726a] whitespace-nowrap">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          {profile.is_approved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246]">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fef3c7] text-[#b45309]">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleApproval(profile.id, profile.is_approved)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                              profile.is_approved
                                ? 'border border-[#f2cfd3] bg-[#fdf2f3] hover:bg-[#fbe6e8] text-[#b43c48]'
                                : 'bg-[#426b52] hover:bg-[#365a44] text-white'
                            }`}
                          >
                            {profile.is_approved ? 'Remove approval' : 'Approve'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAIScanner && (
        <AIChatScanner
          title="AI Bulk Approvals"
          description="Upload a photo or paste a list of students to automatically match and approve pending accounts."
          systemInstruction={`You are an AI assistant for a student management portal.
The user will provide an image or text containing a list of students to bulk approve, along with their batch.

Your ONLY job is to match the provided student names and batches to the correct IDs from this list of currently pending students:
${JSON.stringify(
  profiles
    .filter((p) => !p.is_approved)
    .map((p) => ({
      id: p.id,
      name: p.full_name,
      batch: p.batch || 'Unassigned',
    }))
)}

Instructions:
1. Extract the names and batches from the user's input.
2. Find the best match from the pending students list.
3. If the user explicitly sets the Default Batch to "${aiSelectedBatch}" and it isn't "Unassigned", apply it as "new_batch" for matched students unless the image specifies otherwise.
4. Return ONLY a valid JSON array of objects, containing the exact "id" from the pending list and optional "new_batch". Example: [{"id": "uuid-here", "new_batch": "New Batch"}]
5. Do not include markdown formatting or any other text. Return [] if nothing matches.`}
          customControls={
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#26352e]">Default batch:</span>
              <select
                value={aiSelectedBatch}
                onChange={(e) => setAiSelectedBatch(e.target.value)}
                className="h-8 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-white text-[#26352e]"
              >
                <option value="Unassigned">Keep current batch</option>
                {batchOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          }
          onCancel={() => setShowAIScanner(false)}
          onDataComplete={async (parsedData) => {
            setShowAIScanner(false);
            try {
              let matches = typeof parsedData === 'string' ? JSON.parse(parsedData) : parsedData;
              if (!Array.isArray(matches)) {
                if (matches.students && Array.isArray(matches.students)) matches = matches.students;
                else if (matches.ids && Array.isArray(matches.ids)) matches = matches.ids;
                else throw new Error('Invalid format');
              }
              if (matches.length === 0) {
                toast.error('No matching pending students found.');
                return;
              }

              const idsToApprove: string[] = [];
              for (const match of matches) {
                const profileId = typeof match === 'string' ? match : match.id;
                if (!profileId) continue;
                idsToApprove.push(profileId);
                if (match.new_batch) {
                  await supabase.from('profiles').update({ batch: match.new_batch }).eq('id', profileId);
                }
              }

              if (idsToApprove.length > 0) {
                const { error } = await supabase.rpc('admin_approve_student_profiles', {
                  p_student_ids: idsToApprove,
                  p_password: '',
                  p_is_approved: true,
                });
                if (error) throw error;
                toast.success(`Approved ${idsToApprove.length} student(s)`);
                fetchProfiles();
              } else {
                toast.error('Could not approve any students.');
              }
            } catch (err) {
              console.error('AI Data Error', err);
              toast.error('Could not read AI matches. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
};
