import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Users, Eye, EyeOff, Crown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { SportsCommittee, SportsTeamMember } from '../../types/data';
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
    sanitizeUrl
  } = useData() as any;

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
    color: '#22C55E',
    order_position: 1,
    enabled: true,
  });

  const [memberForm, setMemberForm] = useLocalStorage('admin_sports_member_form_draft', {
    committee_id: 0,
    name: '',
    role: '',
    image: '',
    order_position: 1,
    enabled: true,
    is_head: false,
    specialty: '',
    phone: '',
    social_links: { instagram: '', youtube: '', spotify: '' },
  });

  const resetCommitteeForm = () => {
    setCommitteeForm({
      name: '',
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
      order_position: sportsTeamMembers.length + 1,
      enabled: true,
      is_head: false,
      specialty: '',
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
    const membersIn = sportsTeamMembers.filter((m: any) => m.committee_id === id);
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
      order_position: m.order_position,
      enabled: m.enabled,
      is_head: m.is_head,
      specialty: (m as any).specialty || '',
      phone: (m as any).phone || '',
      social_links: m.social_links || { instagram: '', youtube: '', spotify: '' },
    });
    setEditingMember(m.id);
  };


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
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-400 to-amber-600 rounded-full" />
            Sports Team Management
          </h2>
          <p className="text-gray-400 mt-1">Manage sports committees and team members for the Rico Family page</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 p-1 rounded-xl shadow-lg">
            <button
              onClick={() => setActiveSection('committees')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSection === 'committees' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Committees
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSection === 'members' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/20' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Team Members
            </button>
          </div>
        </div>
      </div>

      {/* Sports Heads Marquee settings (shared with Committee Heads marquee) */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Sports Heads Marquee</h3>
            {marqueeMsg && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-emerald-400 border border-green-500/20 rounded-full animate-pulse font-bold">
                {marqueeMsg}
              </span>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-6">Controls the scrolling speed and direction of the Sports Committee Heads marquee across the site.</p>
        
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Speed (px/sec)</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={800}
                step={1}
                value={marqueeSpeed === '' ? '' : marqueeSpeed}
                onChange={(e) => setMarqueeSpeed(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                onBlur={() => setMarqueeSpeed((prev) => (typeof prev === 'number' && !isNaN(prev) ? Math.min(800, Math.max(1, prev)) : 140))}
                className="w-full pl-4 pr-12 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">PX/S</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Direction</label>
            <select
              value={marqueeDirection}
              onChange={(e) => setMarqueeDirection(e.target.value as 'left' | 'right')}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none"
            >
              <option value="left" className="bg-[#181824]">Scroll Left</option>
              <option value="right" className="bg-[#181824]">Scroll Right</option>
            </select>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            type="button"
            onClick={saveMarqueeSettings}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 font-bold hover:-translate-y-0.5"
          >
            Save Marquee Settings
          </button>
        </div>
      </div>

      {/* Committees Section */}
      {activeSection === 'committees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus size={18} className="text-yellow-500" />
              Committees ({sportsCommittees.length})
            </h3>
            <button
              type="button"
              onClick={() => { setIsAddingCommittee(true); resetCommitteeForm(); }}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-5 py-2.5 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/20 flex items-center font-bold hover:-translate-y-0.5"
            >
              <Plus size={18} className="mr-2" /> Add Committee
            </button>
          </div>

          {/* Add Committee Form */}
          {isAddingCommittee && (
            <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 border-l-4 border-l-yellow-500 animate-in slide-in-from-left-2 duration-300">
              <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Add New Sports Committee
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Committee Name *</label>
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Football, Cricket, Badminton"
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white placeholder-gray-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Display Order</label>
                      <input
                        type="number"
                        value={committeeForm.order_position}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min={1}
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white font-mono"
                      />
                    </div>
                    <div className="flex items-end pb-3">
                      <label className="flex items-center group cursor-pointer">
                        <input
                          type="checkbox"
                          checked={committeeForm.enabled}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="w-5 h-5 rounded border-white/10 bg-black/20 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 transition-colors"
                        />
                        <span className="ml-3 text-sm font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-wider">Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Brand Color</label>
                    <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/10">
                      <input
                        type="color"
                        value={committeeForm.color}
                        onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-12 bg-transparent border-none rounded-lg cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-mono text-white mb-1 uppercase tracking-wider">{committeeForm.color}</div>
                        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full transition-all duration-300" style={{ backgroundColor: committeeForm.color, width: '100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleAddCommittee} 
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-3 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all font-bold shadow-lg shadow-yellow-500/20"
                    >
                      Save Committee
                    </button>
                    <button 
                      onClick={() => { setIsAddingCommittee(false); }} 
                      className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-bold border border-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Committees */}
          <div className="grid md:grid-cols-2 gap-4">
            {sortedCommittees.map((c) => (
              <div key={c.id} className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-8 -mt-8 pointer-events-none transition-opacity group-hover:opacity-20" style={{ backgroundColor: c.color }} />
                
                {editingCommittee === c.id ? (
                  <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/5 animate-in fade-in duration-300">
                    <input
                      type="text"
                      value={committeeForm.name}
                      onChange={(e) => setCommitteeForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white font-bold"
                    />
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Order</span>
                        <input
                          type="number"
                          value={committeeForm.order_position}
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                          className="w-16 px-2 py-1 bg-black/40 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white text-sm text-center"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Color</span>
                        <input 
                          type="color" 
                          value={committeeForm.color} 
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, color: e.target.value }))} 
                          className="w-8 h-8 bg-transparent border-none cursor-pointer"
                        />
                      </div>
                      <label className="flex items-center ml-auto group cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={committeeForm.enabled} 
                          onChange={(e) => setCommitteeForm(prev => ({ ...prev, enabled: e.target.checked }))} 
                          className="w-4 h-4 rounded border-white/10 bg-black/20 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 transition-colors"
                        /> 
                        <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span>
                      </label>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button onClick={() => handleUpdateCommittee(c.id)} className="flex-1 bg-yellow-500 text-black px-3 py-2 rounded-lg hover:bg-yellow-400 transition-all font-bold text-sm shadow-lg shadow-yellow-500/10">Update</button>
                      <button onClick={() => setEditingCommittee(null)} className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all font-bold text-sm border border-white/5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: c.color }} />
                        <div className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">{c.name}</div>
                        {!c.enabled && (
                          <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/20 rounded-full font-bold uppercase tracking-widest">Disabled</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5">
                          <Plus size={10} className="text-yellow-500" />
                          Order: {c.order_position}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.color}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/20 p-1.5 rounded-xl border border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditingCommittee(c)} 
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" 
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => toggleSportsCommitteeEnabled(c.id)} 
                        className={`p-2 transition-all rounded-lg ${c.enabled ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} 
                        title={c.enabled ? 'Disable' : 'Enable'}
                      >
                        {c.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteCommittee(c.id)} 
                        className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" 
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
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
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users size={18} className="text-yellow-500" />
              Team Members ({sportsTeamMembers.length})
            </h3>
            <button
              type="button"
              onClick={() => { setIsAddingMember(true); resetMemberForm(); }}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-5 py-2.5 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/20 flex items-center font-bold hover:-translate-y-0.5"
            >
              <Plus size={18} className="mr-2" /> Add Member
            </button>
          </div>

          {/* Add Member Form */}
          {isAddingMember && (
            <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 border-l-4 border-l-yellow-500 animate-in slide-in-from-left-2 duration-300">
              <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Add Sports Team Member
              </h4>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Role / Designation</label>
                    <input
                      type="text"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
                      placeholder="e.g., Captain, Vice-Captain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Specialty / Achievements</label>
                    <input
                      type="text"
                      value={memberForm.specialty}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
                      placeholder="e.g., Best Striker, National Level Player"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Position</label>
                      <input
                        type="number"
                        value={memberForm.order_position}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center group cursor-pointer">
                      <input type="checkbox" checked={memberForm.enabled} onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))} className="w-5 h-5 rounded border-white/10 bg-black/20 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 transition-colors" /> 
                      <span className="ml-3 text-xs font-bold text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">Enabled</span>
                    </label>
                    <label className="flex items-center group cursor-pointer">
                      <input type="checkbox" checked={memberForm.is_head} onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked }))} className="w-5 h-5 rounded border-white/10 bg-black/20 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 transition-colors" /> 
                      <span className="ml-3 text-xs font-bold text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">Committee Head</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Committee</label>
                    <select
                      value={memberForm.committee_id}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white appearance-none"
                    >
                      <option value={0} className="bg-[#181824]">Unassigned / Free Agent</option>
                      {sortedCommittees.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#181824]">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Member Photo *</label>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
                      <ImageUpload
                        onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))}
                        currentImage={memberForm.image}
                        bucket="sports-images"
                        folder="sports-team"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">WhatsApp / Phone</label>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white font-mono"
                      placeholder="+91 00000 00000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Social Links</label>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="url" placeholder="Instagram" value={memberForm.social_links.instagram} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))} className="p-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 text-white text-xs" title="Instagram" />
                      <input type="url" placeholder="YouTube" value={memberForm.social_links.youtube} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))} className="p-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 text-white text-xs" title="YouTube" />
                      <input type="url" placeholder="Spotify" value={memberForm.social_links.spotify} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, spotify: e.target.value } }))} className="p-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-white text-xs" title="Spotify" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-6 border-t border-white/5">
                    <button 
                      onClick={handleAddMember} 
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-3 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all font-bold shadow-lg shadow-yellow-500/20"
                    >
                      Save Member
                    </button>
                    <button 
                      onClick={() => { setIsAddingMember(false); }} 
                      className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-bold border border-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="grid md:grid-cols-2 gap-4">
            {sortedMembers.map((m) => (
              <div key={m.id} className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group relative overflow-hidden">
                {editingMember === m.id ? (
                  <div className="grid md:grid-cols-2 gap-6 bg-black/40 p-4 rounded-xl border border-white/5 animate-in fade-in duration-300">
                    <div className="space-y-3">
                      <input type="text" value={memberForm.name} onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-bold focus:ring-1 focus:ring-yellow-500 focus:outline-none" placeholder="Name" />
                      <input type="text" value={memberForm.role} onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-yellow-500 focus:outline-none" placeholder="Role" />
                      <input type="text" value={memberForm.specialty} onChange={(e) => setMemberForm(prev => ({ ...prev, specialty: e.target.value }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-[10px] focus:ring-1 focus:ring-yellow-500 focus:outline-none" placeholder="Specialty" />
                      <div className="grid grid-cols-1 gap-2">
                        <input type="number" placeholder="Order" value={memberForm.order_position} onChange={(e) => setMemberForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs font-mono focus:ring-1 focus:ring-yellow-500 focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center group cursor-pointer"><input type="checkbox" checked={memberForm.enabled} onChange={(e) => setMemberForm(prev => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 rounded border-white/10 bg-black/20 text-yellow-500" /> <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span></label>
                        <label className="flex items-center group cursor-pointer"><input type="checkbox" checked={memberForm.is_head} onChange={(e) => setMemberForm(prev => ({ ...prev, is_head: e.target.checked }))} className="w-4 h-4 rounded border-white/10 bg-black/20 text-yellow-500" /> <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Head</span></label>
                      </div>
                      <select value={memberForm.committee_id} onChange={(e) => setMemberForm(prev => ({ ...prev, committee_id: parseInt(e.target.value) }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs appearance-none">
                        <option value={0} className="bg-[#181824]">Unassigned</option>
                        {sortedCommittees.map(c => (<option key={c.id} value={c.id} className="bg-[#181824]">{c.name}</option>))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <ImageUpload onImageSelect={(url) => setMemberForm(prev => ({ ...prev, image: url }))} currentImage={memberForm.image} bucket="sports-images" folder="sports-team" />
                      <input type="tel" placeholder="Phone" value={memberForm.phone} onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs font-mono" />
                      <div className="grid grid-cols-3 gap-1">
                        <input type="url" placeholder="Insta" value={memberForm.social_links.instagram} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))} className="p-1.5 bg-black/40 border border-white/10 rounded text-[10px] text-white" />
                        <input type="url" placeholder="YT" value={memberForm.social_links.youtube} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))} className="p-1.5 bg-black/40 border border-white/10 rounded text-[10px] text-white" />
                        <input type="url" placeholder="Spot" value={memberForm.social_links.spotify} onChange={(e) => setMemberForm(prev => ({ ...prev, social_links: { ...prev.social_links, spotify: e.target.value } }))} className="p-1.5 bg-black/40 border border-white/10 rounded text-[10px] text-white" />
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-white/5">
                        <button onClick={() => handleUpdateMember(m.id)} className="flex-1 bg-yellow-500 text-black px-3 py-2 rounded-lg hover:bg-yellow-400 transition-all font-bold text-sm shadow-lg shadow-yellow-500/10">Save</button>
                        <button onClick={() => setEditingMember(null)} className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all font-bold text-sm border border-white/5">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="relative group/photo">
                      <img
                        src={(() => {
                          const sanitized = sanitizeUrl?.(m.image) || m.image;
                          return sanitized;
                        })()}
                        alt={m.name}
                        className="w-20 h-20 rounded-xl object-cover border border-white/10 group-hover/photo:border-yellow-500/50 transition-all"
                      />
                      {m.is_head && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 p-1 rounded-lg shadow-lg">
                          <Crown size={12} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors tracking-tight">
                          {m.name}
                        </div>
                        {!m.enabled && (
                          <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/20 rounded-full font-bold uppercase tracking-widest">Off</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-yellow-500/80 mb-1">{m.role}</div>
                      {m.specialty && (
                        <div className="text-[10px] text-gray-400 font-medium mb-2 italic line-clamp-1">"{m.specialty}"</div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md border border-white/5 inline-flex mb-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sortedCommittees.find(c => c.id === m.committee_id)?.color || '#444' }} />
                        {sortedCommittees.find(c => c.id === m.committee_id)?.name || 'Unassigned'}
                      </div>
                      
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/20 p-1.5 rounded-xl border border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditingMember(m)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => toggleSportsTeamMemberEnabled(m.id)} className={`p-2 rounded-lg transition-all ${m.enabled ? 'text-emerald-400 hover:text-white hover:bg-emerald-500/10' : 'text-gray-500 hover:text-white'}`} title={m.enabled ? 'Disable' : 'Enable'}>{m.enabled ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                      <button onClick={() => toggleSportsTeamMemberIsHead(m.id)} className={`p-2 rounded-lg transition-all ${m.is_head ? 'text-yellow-500 hover:text-white hover:bg-yellow-500/10' : 'text-gray-500 hover:text-white'}`} title={m.is_head ? 'Unset Head' : 'Set as Head'}><Crown size={16} /></button>
                      <button onClick={() => handleDeleteMember(m.id)} className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <div className="font-bold text-white uppercase tracking-widest text-xs mb-1">Database Summary</div>
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{sportsCommittees.length}</span> sports committees and <span className="text-white font-bold">{sportsTeamMembers.length}</span> active team members
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <div className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">System Status</div>
           <div className="text-emerald-500 text-xs font-bold flex items-center gap-1.5 justify-end mt-1">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             Live & Operational
           </div>
        </div>
      </div>
    </div>
  );
};
