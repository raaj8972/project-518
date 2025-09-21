import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Users, Eye, EyeOff, Crown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { SportsCommittee, SportsTeamMember } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const SportsTeamManagement: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const saving = useSavingProgress();
  const {
    sportsCommittees,
    sportsTeamMembers,
    homepageSettings,
    addSportsCommittee,
    updateSportsCommittee,
    deleteSportsCommittee,
    toggleSportsCommitteeEnabled,
    addSportsTeamMember,
    updateSportsTeamMember,
    deleteSportsTeamMember,
    toggleSportsTeamMemberEnabled,
    toggleSportsTeamMemberIsHead,
    updateHomepageSettings,
  } = useData();

  const [activeSection, setActiveSection] = useState<'committees' | 'members'>('committees');
  const [isAddingCommittee, setIsAddingCommittee] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<number | null>(null);

  // Marquee settings (shared with Committee Heads marquee)
  const [marqueeSpeed, setMarqueeSpeed] = useState<number | ''>((homepageSettings as any)?.committee_marquee_speed_px_per_sec ?? 140);
  const [marqueeDirection, setMarqueeDirection] = useState<'left' | 'right'>(((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right');
  const [marqueeMsg, setMarqueeMsg] = useState<string | null>(null);

  useEffect(() => {
    setMarqueeSpeed((homepageSettings as any)?.committee_marquee_speed_px_per_sec ?? 140);
    setMarqueeDirection(((homepageSettings as any)?.committee_marquee_direction as any) ?? 'right');
  }, [homepageSettings]);

  const saveMarqueeSettings = async () => {
    const normalizedSpeed = typeof marqueeSpeed === 'number' && !isNaN(marqueeSpeed)
      ? Math.min(800, Math.max(1, marqueeSpeed))
      : 140;
    try {
      const step = saving.withSteps(2, 'Saving marquee…');
      step.next('Updating settings');
      await updateHomepageSettings({
        committee_marquee_speed_px_per_sec: normalizedSpeed,
        committee_marquee_direction: marqueeDirection,
      } as any);
      setMarqueeMsg('Marquee settings saved');
      step.done();
      setTimeout(() => setMarqueeMsg(null), 2500);
    } catch (e: any) {
      console.error('Save marquee settings failed', e);
      setMarqueeMsg(e?.message || 'Failed to save marquee settings');
      setTimeout(() => setMarqueeMsg(null), 3500);
    }
  };

  const [committeeForm, setCommitteeForm] = useLocalStorage('admin_sports_committee_form_draft', {
    name: '',
    description: '',
    color: '#22C55E',
    order_position: 1,
    enabled: true,
  });

  const [memberForm, setMemberForm] = useLocalStorage('admin_sports_member_form_draft', {
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
    social_links: { instagram: '', youtube: '', spotify: '' },
  });

  const resetCommitteeForm = () => {
    setCommitteeForm({
      name: '',
      description: '',
      color: '#22C55E',
      order_position: sportsCommittees.length + 1,
      enabled: true,
    });
  };

  const resetMemberForm = () => {
    setMemberForm({
      committee_id: sportsCommittees.length > 0 ? sportsCommittees[0].id : 0,
      name: '',
      role: '',
      image: '',
      description: '',
      specialty: '',
      achievements: [],
      order_position: sportsTeamMembers.length + 1,
      enabled: true,
      is_head: false,
      phone: '',
      social_links: { instagram: '', youtube: '', spotify: '' },
    });
  };

  // Committee handlers
  const handleAddCommittee = async () => {
    if (!committeeForm.name?.trim()) return;
    try {
      const steps = saving.withSteps(3, 'Saving…');
      steps.next('Validating');
      steps.next('Saving');
      await addSportsCommittee(committeeForm);
      setIsAddingCommittee(false);
      resetCommitteeForm();
      try { localStorage.removeItem('admin_sports_committee_form_draft'); } catch {}
    } finally { saving.done(); }
  };

  const handleUpdateCommittee = async (id: number) => {
    if (!committeeForm.name?.trim()) return;
    try {
      const steps = saving.withSteps(3, 'Saving…');
      steps.next('Validating');
      steps.next('Saving');
      await updateSportsCommittee(id, committeeForm);
      setEditingCommittee(null);
      resetCommitteeForm();
      try { localStorage.removeItem('admin_sports_committee_form_draft'); } catch {}
    } finally { saving.done(); }
  };

  const handleDeleteCommittee = async (id: number) => {
    const membersIn = sportsTeamMembers.filter(m => m.committee_id === id);
    if (membersIn.length > 0) {
      if (!confirm(`This committee has ${membersIn.length} members. Deleting it will also delete all members. Proceed?`)) return;
    } else if (!confirm('Delete this committee?')) return;
    try {
      const steps = saving.withSteps(2, 'Deleting…');
      steps.next('Deleting');
      await deleteSportsCommittee(id);
    } finally { saving.done(); }
  };

  const startEditingCommittee = (c: SportsCommittee) => {
    setCommitteeForm({
      name: c.name,
      description: c.description,
      color: c.color,
      order_position: c.order_position,
      enabled: c.enabled,
    });
    setEditingCommittee(c.id);
  };

  // Member handlers
  const handleAddMember = async () => {
    if (!memberForm.name?.trim() || !memberForm.image) return;
    const payload: any = {
      ...memberForm,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    };
    try {
      const steps = saving.withSteps(3, 'Saving…');
      steps.next('Validating');
      steps.next('Saving');
      await addSportsTeamMember(payload);
      setIsAddingMember(false);
      resetMemberForm();
      try { localStorage.removeItem('admin_sports_member_form_draft'); } catch {}
    } finally { saving.done(); }
  };

  const handleUpdateMember = async (id: number) => {
    if (!memberForm.name?.trim() || !memberForm.image) return;
    const payload: any = {
      ...memberForm,
      committee_id: memberForm.committee_id && memberForm.committee_id !== 0 ? memberForm.committee_id : null,
    };
    try {
      const steps = saving.withSteps(3, 'Saving…');
      steps.next('Validating');
      steps.next('Saving');
      await updateSportsTeamMember(id, payload);
      setEditingMember(null);
      resetMemberForm();
      try { localStorage.removeItem('admin_sports_member_form_draft'); } catch {}
    } finally { saving.done(); }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Delete this team member?')) return;
    try {
      const steps = saving.withSteps(2, 'Deleting…');
      steps.next('Deleting');
      await deleteSportsTeamMember(id);
    } finally { saving.done(); }
  };

  const startEditingMember = (m: SportsTeamMember) => {
    setMemberForm({
      // UI uses 0 as "Unassigned"; DB uses null. Normalize here.
      committee_id: (m.committee_id ?? 0),
      name: m.name,
      role: m.role,
      image: m.image,
      description: m.description,
      // Specialty may not exist in schema; treat as optional
      specialty: (m as any).specialty || '',
      achievements: m.achievements,
      order_position: m.order_position,
      enabled: m.enabled,
      is_head: m.is_head,
      phone: (m as any).phone || '',
      social_links: m.social_links || { instagram: '', youtube: '', spotify: '' },
    });
    setEditingMember(m.id);
  };

  const addAchievement = () => setMemberForm(prev => ({ ...prev, achievements: [...prev.achievements, ''] }));
  const updateAchievement = (i: number, v: string) => setMemberForm(prev => ({ ...prev, achievements: prev.achievements.map((a, idx) => idx === i ? v : a) }));
  const removeAchievement = (i: number) => setMemberForm(prev => ({ ...prev, achievements: prev.achievements.filter((_, idx) => idx !== i) }));

  const sortedCommittees = [...sportsCommittees].sort((a, b) => a.order_position - b.order_position);
  const sortedMembers = [...sportsTeamMembers].sort((a, b) => a.order_position - b.order_position);

  return (
    <div className="space-y-6">
      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded" role="alert">
          <p className="text-sm font-medium">You are not logged in. Adding or editing sports committees and team members may be blocked by security policies. Please log in via the Admin header.</p>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sports Team Management</h2>
          <p className="text-gray-600">Manage sports committees and team members for the Rico Family page</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setActiveSection('committees')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'committees' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Committees
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'members' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Team Members
            </button>
          </div>
        </div>
      </div>

      {/* Sports Heads Marquee settings (shared with Committee Heads marquee) */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Sports Heads Marquee</h3>
          {marqueeMsg && <span className="text-sm text-gray-600">{marqueeMsg}</span>}
        </div>
        <p className="text-xs text-gray-500 mb-3">Controls the scrolling of Sports Committee Heads. Shared with the Committee Heads marquee across the site.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Speed (px/sec)</label>
            <input
              type="number"
              min={1}
              max={800}
              step={1}
              value={marqueeSpeed === '' ? '' : marqueeSpeed}
              onChange={(e) => setMarqueeSpeed(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              onBlur={() => setMarqueeSpeed((prev) => (typeof prev === 'number' && !isNaN(prev) ? Math.min(800, Math.max(1, prev)) : 140))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Direction</label>
            <select
              value={marqueeDirection}
              onChange={(e) => setMarqueeDirection(e.target.value as 'left' | 'right')}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={saveMarqueeSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
          >
            Save Marquee Settings
          </button>
        </div>
      </div>

      {/* Committees Section */}
      {activeSection === 'committees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Committees ({sportsCommittees.length})</h3>
            <button
              type="button"
              onClick={() => { setIsAddingCommittee(true); resetCommitteeForm(); }}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" /> Add Committee
            </button>
          </div>

          {/* Add Committee Form */}
          {isAddingCommittee && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h4 className="text-lg font-semibold mb-6">Add New Sports Committee</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Committee Name *</label>
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Football, Cricket, Badminton"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                    <textarea
                      value={committeeForm.description}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this sport/committee"
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
                        min={1}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={committeeForm.enabled}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <input
                      type="color"
                      value={committeeForm.color}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-20 h-10 p-1 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddCommittee} className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors">Save</button>
                    <button onClick={() => { setIsAddingCommittee(false); }} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Committees */}
          <div className="grid md:grid-cols-2 gap-4">
            {sortedCommittees.map((c) => (
              <div key={c.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                {editingCommittee === c.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border rounded"
                    />
                    <textarea
                      value={committeeForm.description}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border rounded"
                      rows={2}
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm">Order</label>
                      <input
                        type="number"
                        value={committeeForm.order_position}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        className="w-20 p-2 border rounded"
                      />
                      <input type="color" value={committeeForm.color} onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))} />
                      <label className="flex items-center ml-auto">
                        <input type="checkbox" checked={committeeForm.enabled} onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))} className="mr-2" /> Enabled
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateCommittee(c.id)} className="bg-yellow-400 text-black px-3 py-1 rounded">Save</button>
                      <button onClick={() => setEditingCommittee(null)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-600">{c.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Order: {c.order_position}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditingCommittee(c)} className="p-2 rounded hover:bg-gray-100" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => toggleSportsCommitteeEnabled(c.id)} className="p-2 rounded hover:bg-gray-100" title={c.enabled ? 'Disable' : 'Enable'}>
                        {c.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => handleDeleteCommittee(c.id)} className="p-2 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Section */}
      {activeSection === 'members' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Team Members ({sportsTeamMembers.length})</h3>
            <button
              type="button"
              onClick={() => { setIsAddingMember(true); resetMemberForm(); }}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" /> Add Member
            </button>
          </div>

          {/* Add Member Form */}
          {isAddingMember && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h4 className="text-lg font-semibold mb-6">Add Sports Team Member</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={memberForm.description}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                      <input
                        type="text"
                        value={memberForm.specialty}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                      <input
                        type="number"
                        value={memberForm.order_position}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input type="checkbox" checked={memberForm.enabled} onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))} className="mr-2" /> Enabled
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" checked={memberForm.is_head} onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked }))} className="mr-2" /> Committee Head
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Committee</label>
                    <select
                      value={memberForm.committee_id}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value={0}>Unassigned</option>
                      {sortedCommittees.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photo *</label>
                    <ImageUpload
                      onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))}
                      currentImage={memberForm.image}
                      bucket="sports-images"
                      folder="sports-team"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Links</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="url" placeholder="Instagram" value={memberForm.social_links.instagram} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))} className="p-2 border rounded" />
                      <input type="url" placeholder="YouTube" value={memberForm.social_links.youtube} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))} className="p-2 border rounded" />
                      <input type="url" placeholder="Spotify" value={memberForm.social_links.spotify} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, spotify: e.target.value } }))} className="p-2 border rounded" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                    <div className="space-y-2">
                      {memberForm.achievements.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={a} onChange={(e) => updateAchievement(i, e.target.value)} className="flex-1 p-2 border rounded" />
                          <button type="button" onClick={() => removeAchievement(i)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={addAchievement} className="text-sm text-blue-600 hover:underline">+ Add achievement</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddMember} className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors">Save</button>
                    <button onClick={() => { setIsAddingMember(false); }} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-4">
            {sortedMembers.map((m) => (
              <div key={m.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                {editingMember === m.id ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <input type="text" value={memberForm.name} onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))} className="w-full p-2 border rounded" />
                      <input type="text" value={memberForm.role} onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))} className="w-full p-2 border rounded" />
                      <textarea value={memberForm.description} onChange={(e) => setMemberForm(prev => ({ ...prev, description: e.target.value }))} className="w-full p-2 border rounded" rows={2} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Specialty" value={memberForm.specialty} onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))} className="p-2 border rounded" />
                        <input type="number" placeholder="Order" value={memberForm.order_position} onChange={(e) => setMemberForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))} className="p-2 border rounded" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center"><input type="checkbox" checked={memberForm.enabled} onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))} className="mr-2" /> Enabled</label>
                        <label className="flex items-center"><input type="checkbox" checked={memberForm.is_head} onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked }))} className="mr-2" /> Head</label>
                      </div>
                      <select value={memberForm.committee_id} onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))} className="w-full p-2 border rounded">
                        <option value={0}>Unassigned</option>
                        {sortedCommittees.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <ImageUpload onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))} currentImage={memberForm.image} bucket="sports-images" folder="sports-team" />
                      <input type="tel" placeholder="Phone" value={memberForm.phone} onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-2 border rounded" />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="url" placeholder="Instagram" value={memberForm.social_links.instagram} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))} className="p-2 border rounded" />
                        <input type="url" placeholder="YouTube" value={memberForm.social_links.youtube} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))} className="p-2 border rounded" />
                        <input type="url" placeholder="Spotify" value={memberForm.social_links.spotify} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, spotify: e.target.value } }))} className="p-2 border rounded" />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Achievements</div>
                        <div className="space-y-2">
                          {memberForm.achievements.map((a, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input value={a} onChange={(e) => updateAchievement(i, e.target.value)} className="flex-1 p-2 border rounded" />
                              <button type="button" onClick={() => removeAchievement(i)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
                            </div>
                          ))}
                          <button type="button" onClick={addAchievement} className="text-sm text-blue-600 hover:underline">+ Add achievement</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateMember(m.id)} className="bg-yellow-400 text-black px-3 py-1 rounded">Save</button>
                        <button onClick={() => setEditingMember(null)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <img src={m.image} alt={m.name} className="w-16 h-16 rounded object-cover" />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {m.is_head && <Crown size={16} className="text-yellow-500" />} {m.name}
                      </div>
                      <div className="text-sm text-gray-600">{m.role}</div>
                      <div className="text-xs text-gray-500">{sortedCommittees.find(c => c.id === m.committee_id)?.name || 'Unassigned'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditingMember(m)} className="p-2 rounded hover:bg-gray-100" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => toggleSportsTeamMemberEnabled(m.id)} className="p-2 rounded hover:bg-gray-100" title={m.enabled ? 'Disable' : 'Enable'}>
                        {m.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => toggleSportsTeamMemberIsHead(m.id)} className="p-2 rounded hover:bg-gray-100" title={m.is_head ? 'Unset Head' : 'Set as Head'}>
                        <Crown size={16} className={m.is_head ? 'text-yellow-500' : 'text-gray-400'} />
                      </button>
                      <button onClick={() => handleDeleteMember(m.id)} className="p-2 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="font-semibold text-gray-900 mb-2 flex items-center"><Users className="w-4 h-4 mr-2" /> Summary</div>
        <div className="text-sm text-gray-600">{sportsCommittees.length} committees • {sportsTeamMembers.length} members</div>
      </div>
    </div>
  );
};
