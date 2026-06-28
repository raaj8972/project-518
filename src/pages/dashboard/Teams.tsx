import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, User, Check, X, Bell, Sparkles, Clock, Plus, Trash2, Search, UserPlus, Crown, AlertCircle, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME } from '../../constants/brand';
import ProfileModal from '../../components/dashboard/ProfileModal';

interface DashboardContextType {
  user: any;
  profile: any;
  registrations: any[];
  fetchUserRegistrations: () => Promise<void>;
  pendingInvitesCount: number;
  setPendingInvitesCount: React.Dispatch<React.SetStateAction<number>>;
}

interface StudentGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members: GroupMember[];
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_by: string;
  profile?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
    batch?: string;
    phone?: string;
  };
}

export const Teams: React.FC = () => {
  const { 
    user, profile, registrations, fetchUserRegistrations, 
    pendingInvitesCount, setPendingInvitesCount 
  } = useOutletContext<DashboardContextType>();

  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'mygroups' | 'invites'>('mygroups');

  // My Groups state
  const [myGroups, setMyGroups] = useState<StudentGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [pendingNewMembers, setPendingNewMembers] = useState<any[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Pending group invites from others
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [loadingGroupInvites, setLoadingGroupInvites] = useState(true);

  // ─── Fetch My Groups ───────────────────────────────────────────
  const fetchMyGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      // Groups I own
      const { data: owned, error: e1 } = await supabase
        .from('student_groups')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (e1) throw e1;

      // Groups I'm a member of (accepted)
      const { data: memberOf, error: e2 } = await supabase
        .from('student_group_members')
        .select('group_id, student_groups(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (e2) throw e2;

      const memberGroups = (memberOf || [])
        .map((m: any) => m.student_groups)
        .filter(Boolean)
        .filter((g: any) => g.owner_id !== user.id);

      const allGroups = [...(owned || []), ...memberGroups];

      // For each group, fetch members with profiles
      const groupsWithMembers = await Promise.all(allGroups.map(async (g: any) => {
        const { data: members } = await supabase
          .from('student_group_members')
          .select(`
            id, group_id, user_id, status, invited_by,
            profile:profiles!user_id(id, full_name, username, avatar_url, batch, phone)
          `)
          .eq('group_id', g.id)
          .order('created_at', { ascending: true });

        return { ...g, members: members || [] };
      }));

      setMyGroups(groupsWithMembers);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  // ─── Fetch Group Invites (invites for me to join someone's group) ────
  const fetchGroupInvites = useCallback(async () => {
    if (!user) return;
    setLoadingGroupInvites(true);
    try {
      const { data, error } = await supabase
        .from('student_group_members')
        .select(`
          id, group_id, status, created_at,
          group:student_groups(id, name, owner_id, owner:profiles!owner_id(id, full_name, username, avatar_url))
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroupInvites(data || []);
    } catch (err) {
      console.error('Error fetching group invites:', err);
    } finally {
      setLoadingGroupInvites(false);
    }
  }, [user]);

  // ─── Fetch Event Invitations ───────────────────────────────────
  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    setLoadingInvites(true);
    try {
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          id, event_id, registration_id, sender_id, receiver_username, receiver_id, status, created_at,
          event:events(id, title, image, category),
          sender:profiles!sender_id(id, full_name, username, avatar_url, batch)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
      // Count total pending (event invites + group invites)
      setPendingInvitesCount((data || []).length + groupInvites.length);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, [user, groupInvites.length]);

  useEffect(() => {
    fetchMyGroups();
    fetchGroupInvites();
    fetchInvitations();

    if (!user) return;

    const channel = supabase
      .channel('teams-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_groups' }, () => {
        fetchMyGroups();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_group_members' }, () => {
        fetchMyGroups();
        fetchGroupInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ─── Search members to add ─────────────────────────────────────
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, batch')
          .or(`username.ilike.%${memberSearch}%,full_name.ilike.%${memberSearch}%`)
          .not('id', 'eq', user?.id)
          .limit(5);
        
        const alreadyAdded = pendingNewMembers.map(m => m.id);
        setMemberSearchResults((data || []).filter((u: any) => u.username && !alreadyAdded.includes(u.id)));
      } catch {}
      setSearchingMembers(false);
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, pendingNewMembers]);

  // ─── Create Group ──────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { toast.error('Enter a group name'); return; }
    const ownedCount = myGroups.filter(g => g.owner_id === user.id).length;
    if (ownedCount >= 10) { toast.error('Max 10 groups allowed per student!'); return; }
    setCreatingGroup(true);

    try {
      // Create group
      const { data: group, error: gErr } = await supabase
        .from('student_groups')
        .insert({ name: newGroupName.trim(), owner_id: user.id })
        .select()
        .single();

      if (gErr) throw gErr;

      // Send invites to pending members
      if (pendingNewMembers.length > 0) {
        const invites = pendingNewMembers.map(m => ({
          group_id: group.id,
          user_id: m.id,
          status: 'pending',
          invited_by: user.id,
        }));
        const { error: mErr } = await supabase.from('student_group_members').insert(invites);
        if (mErr) throw mErr;
      }

      toast.success(`Group "${newGroupName.trim()}" created! 🎉`);
      setShowCreateGroup(false);
      setNewGroupName('');
      setPendingNewMembers([]);
      setMemberSearch('');
      await fetchMyGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // ─── Delete Group ──────────────────────────────────────────────
  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    try {
      const { error } = await supabase.from('student_groups').delete().eq('id', groupId);
      if (error) throw error;
      toast.success('Group deleted');
      await fetchMyGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group');
    } finally {
      setDeletingGroupId(null);
    }
  };

  // ─── Accept/Reject Group Invite ────────────────────────────────
  const handleGroupInviteAction = async (memberId: string, action: 'accepted' | 'rejected') => {
    setProcessingId(memberId);
    try {
      const { error } = await supabase
        .from('student_group_members')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) throw error;
      toast.success(action === 'accepted' ? 'Joined group! 🎉' : 'Invite declined');
      await fetchGroupInvites();
      await fetchMyGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update invite');
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Accept/Reject Event Invitation ───────────────────────────
  const handleInviteAction = async (invite: any, action: 'accept' | 'reject') => {
    setProcessingId(invite.id);
    try {
      if (action === 'reject') {
        const { error } = await supabase
          .from('group_invitations')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', invite.id);
        if (error) throw error;
        toast.success('Invitation declined.');
      } else {
        // Generate RICO ID
        let newId = 'RICO1';
        try {
          const { data } = await supabase.from('registrations').select('id').order('created_at', { ascending: false }).limit(1);
          const lastReg = Array.isArray(data) ? data[0] : null;
          if (lastReg?.id) {
            const match = lastReg.id.match(/^RICO(\d+)$/);
            if (match) newId = `RICO${parseInt(match[1], 10) + 1}`;
          }
        } catch { newId = `RICO${Math.floor(100000 + Math.random() * 900000)}`; }

        const { data: senderReg, error: fetchRegErr } = await supabase
          .from('registrations').select('*').eq('id', invite.registration_id).single();
        if (fetchRegErr) throw fetchRegErr;

        const payload = {
          id: newId,
          event_id: invite.event_id,
          event_title: invite.event?.title || senderReg.event_title,
          is_team_registration: true,
          team_name: senderReg.team_name,
          full_name: profile.full_name,
          email: user.email,
          phone: profile.phone,
          college: profile.college,
          participant_type: profile.batch,
          team_members: null,
          total_members: senderReg.total_members,
          registration_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: user.id,
          status: 'approved',
          is_active: senderReg.is_active,
        };

        const { error: regInsertErr } = await supabase.from('registrations').insert(payload);
        if (regInsertErr) throw regInsertErr;

        const { error: updateInviteErr } = await supabase
          .from('group_invitations')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', invite.id);
        if (updateInviteErr) throw updateInviteErr;

        toast.success(`Joined team "${senderReg.team_name}"! 🎉`);
        fetchUserRegistrations();
      }
      await fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update invitation.');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = invitations.length + groupInvites.length;

  // ─── Render ────────────────────────────────────────────────────
  return (
    <motion.div
      key="teams"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">My Groups</h1>
        <p className="text-gray-500 text-sm">Create groups, invite friends, and register for events as a team with 1 click.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-black/30 border border-white/[0.05] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('mygroups')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'mygroups'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <Users size={14} /> My Groups ({myGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
            activeTab === 'invites'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <Bell size={14} /> Invitations
          {totalPending > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-[#0e1117] absolute -top-0.5 -right-0.5 animate-pulse" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── MY GROUPS TAB ─── */}
        {activeTab === 'mygroups' ? (
          <motion.div
            key="mygroups-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Create Group Button */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-600 font-bold">
                {myGroups.filter(g => g.owner_id === user.id).length}/10 groups
              </p>
              <button
                onClick={() => setShowCreateGroup(v => !v)}
                disabled={myGroups.filter(g => g.owner_id === user.id).length >= 10}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20"
              >
                <Plus size={14} /> Create Group
              </button>
            </div>


            {/* Create Group Form */}
            <AnimatePresence>
              {showCreateGroup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="neu-card p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.03] space-y-5">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-400" /> New Group
                    </h3>

                    <input
                      type="text"
                      placeholder="Group name (e.g. Squad Alpha)"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all"
                    />

                    {/* Member search */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Add Members</p>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Search by @username or name..."
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/40 transition-all"
                        />
                        {searchingMembers && (
                          <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                      </div>

                      {/* Search results */}
                      {memberSearchResults.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                          {memberSearchResults.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setPendingNewMembers(prev => [...prev, u]);
                                setMemberSearch('');
                                setMemberSearchResults([]);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left border-b border-white/[0.03] last:border-b-0 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" /> : <User size={13} className="text-gray-400" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-white truncate">{u.full_name}</p>
                                <p className="text-[10px] text-gray-500 truncate">@{u.username} · {u.batch || 'Student'}</p>
                              </div>
                              <UserPlus size={14} className="text-indigo-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Pending members to add */}
                      {pendingNewMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pendingNewMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-300">
                              {m.full_name}
                              <button onClick={() => setPendingNewMembers(prev => prev.filter(p => p.id !== m.id))} className="text-indigo-400/50 hover:text-rose-400 transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateGroup}
                        disabled={creatingGroup}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {creatingGroup ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                        Create & Invite
                      </button>
                      <button
                        onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setPendingNewMembers([]); }}
                        className="px-5 py-3 bg-white/[0.03] hover:bg-white/[0.06] text-gray-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Groups List */}
            {loadingGroups ? (
              <div className="grid grid-cols-1 gap-4">
                {[0,1].map(i => <div key={i} className="h-40 rounded-3xl bg-white/5 animate-pulse" />)}
              </div>
            ) : myGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {myGroups.map(group => {
                  const isOwner = group.owner_id === user.id;
                  const acceptedMembers = group.members.filter(m => m.status === 'accepted');
                  const pendingMembers = group.members.filter(m => m.status === 'pending');
                  const totalCount = group.members.length + 1; // +1 for owner

                  return (
                    <div key={group.id} className="neu-card rounded-3xl p-6 space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isOwner && <Crown size={12} className="text-yellow-400" />}
                            <h3 className="text-base font-black text-white">{group.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500">
                            {totalCount} member{totalCount !== 1 ? 's' : ''} · {acceptedMembers.length} accepted{pendingMembers.length > 0 ? ` · ${pendingMembers.length} pending` : ''}
                          </p>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            disabled={deletingGroupId === group.id}
                            className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-rose-500/40 hover:text-rose-400 border border-rose-500/10 hover:border-rose-500/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Members */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {/* Owner (you if owner) */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.03]">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                            {isOwner ? (
                              profile?.avatar_url ? <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" /> : <Crown size={12} className="text-yellow-400" />
                            ) : <Crown size={12} className="text-yellow-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{isOwner ? 'You' : 'Group Head'}</p>
                            <p className="text-[9px] text-yellow-400/60 font-bold uppercase tracking-wider">Head</p>
                          </div>
                          <Check size={12} className="text-green-400 shrink-0 ml-auto" />
                        </div>

                        {/* Members */}
                        {group.members.map(m => (
                          <button
                            key={m.id}
                            onClick={() => m.profile ? setSelectedProfile(m.profile) : null}
                            disabled={!m.profile}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                              {m.profile?.avatar_url ? (
                                <img src={m.profile.avatar_url} alt={m.profile.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={13} className="text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-white truncate group-hover:text-indigo-300 transition-colors">{m.profile?.full_name || '...'}</p>
                              <p className="text-[9px] text-gray-500 truncate">@{m.profile?.username || '...'}</p>
                            </div>
                            {m.status === 'accepted' ? (
                              <Check size={12} className="text-green-400 shrink-0" />
                            ) : m.status === 'rejected' ? (
                              <X size={12} className="text-rose-400 shrink-0" />
                            ) : (
                              <Clock size={12} className="text-yellow-400 shrink-0 animate-pulse" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Warning if pending members */}
                      {pendingMembers.length > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/[0.05] border border-yellow-500/10">
                          <AlertCircle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-yellow-400/80 font-medium leading-relaxed">
                            {pendingMembers.length} member{pendingMembers.length > 1 ? 's' : ''} haven't accepted yet. 
                            Group events may need all members to accept before registering.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="neu-card p-16 rounded-3xl flex flex-col items-center text-center">
                <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Groups Yet</h3>
                <p className="text-gray-600 max-w-sm mb-6 text-sm leading-relaxed">
                  Create a group with your friends. When registering for team events, all your group details will auto-fill instantly.
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  <Plus size={14} /> Create Your First Group
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* ─── INVITATIONS TAB ─── */
          <motion.div
            key="invites-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Group Invitations */}
            {groupInvites.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Group Invitations</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupInvites.map(invite => {
                    const isProcessing = processingId === invite.id;
                    const owner = invite.group?.owner;
                    return (
                      <div key={invite.id} className="neu-card p-5 rounded-2xl flex flex-col justify-between border border-white/[0.04]">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {owner?.avatar_url ? <img src={owner.avatar_url} alt={owner.full_name} className="w-full h-full object-cover" /> : <User size={16} className="text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white">{owner?.full_name || 'A student'}</p>
                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">invited you to join their group:</p>
                            <h4 className="text-sm font-black text-indigo-400 truncate mt-2 flex items-center gap-2">
                              <Users size={12} /> {invite.group?.name || 'Group'}
                            </h4>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-5 pt-4 border-t border-white/[0.03]">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleGroupInviteAction(invite.id, 'accepted')}
                            className="flex-1 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleGroupInviteAction(invite.id, 'rejected')}
                            className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Event Invitations */}
            {loadingGroupInvites || loadingInvites ? (
              <div className="flex items-center justify-center py-16">
                <Clock className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Event Invitations</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invitations.map(invite => {
                    const eventTitle = invite.event?.title || 'Untitled Event';
                    const isProcessing = processingId === invite.id;
                    return (
                      <div key={invite.id} className="neu-card p-5 rounded-2xl flex flex-col justify-between border border-white/[0.04]">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {invite.sender?.avatar_url ? <img src={invite.sender.avatar_url} alt={invite.sender.full_name} className="w-full h-full object-cover" /> : <User size={16} className="text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white">{invite.sender?.full_name || 'A student'}</p>
                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">invited you to join their event team:</p>
                            <h4 className="text-sm font-black text-indigo-400 truncate mt-2">{eventTitle}</h4>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-5 pt-4 border-t border-white/[0.03]">
                          <button disabled={isProcessing} onClick={() => handleInviteAction(invite, 'accept')} className="flex-1 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <Check size={14} /> Accept
                          </button>
                          <button disabled={isProcessing} onClick={() => handleInviteAction(invite, 'reject')} className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <X size={14} /> Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : groupInvites.length === 0 ? (
              <div className="neu-card p-16 rounded-3xl flex flex-col items-center text-center border border-white/[0.04]">
                <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
                  <Bell className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Pending Invites</h3>
                <p className="text-gray-600 max-w-sm text-sm leading-relaxed">
                  You don't have any pending invitations. Teammates can invite you using your handle @{profile?.username || 'username'}.
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedProfile && (
        <ProfileModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)} 
          onLike={() => {}}
          isLiked={false}
        />
      )}
    </motion.div>
  );
};

export default Teams;
