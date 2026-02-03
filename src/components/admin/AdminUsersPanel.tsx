import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Shield, UserPlus, Trash2, Copy, CheckCircle2, Search, Lock, Edit, X, Mail, Key, UserCheck, Settings, AlertCircle, Check, Loader2 } from 'lucide-react';

interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, removeAdminUser, updateAdminEmail, listAdminPermissions, setAdminPermission } = useData();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState('');

  const [perm, setPerm] = useState<Record<string, {
    can_events?: boolean;
    can_schedule?: boolean;
    can_gallery?: boolean;
    can_sponsors?: boolean;
    can_registrations?: boolean;
    can_registration_photos?: boolean;
    can_faculty?: boolean;
    can_core_team?: boolean;
    can_guest_artists?: boolean;
    can_chief_guests?: boolean;
    can_homebound?: boolean;
    can_sports?: boolean;
    can_security_passes?: boolean;
  }>>({});
  
  // Track approval requirements
  const [requiresApproval, setRequiresApproval] = useState<Record<string, boolean>>({});

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  /* 
    Updated Owner Check:
    - Checks database role 'owner'
    - Checks 'is_primary' flag
    - CRITICAL: Checks if current user is the Master Bypass Admin (emergency access)
  */
  const isMasterBypass = user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass';
  const isOwner = currentUserAdmin?.role === 'owner' || currentUserAdmin?.is_primary || isMasterBypass;

  useEffect(() => { refreshAdminUsers && refreshAdminUsers(); }, [refreshAdminUsers]);
  
  // Initial load of permissions
  useEffect(() => {
    (async () => {
      try {
        if (!listAdminPermissions) return;
        const rows = await listAdminPermissions();
        const map: Record<string, any> = {};
        for (const r of rows as any[]) {
          map[r.user_id] = {
            can_events: !!r.can_events,
            can_schedule: !!r.can_schedule,
            can_gallery: !!r.can_gallery,
            can_sponsors: !!r.can_sponsors,
            can_registrations: !!r.can_registrations,
            can_registration_photos: !!r.can_registration_photos,
            can_faculty: !!r.can_faculty,
            can_core_team: !!r.can_core_team,
            can_guest_artists: !!r.can_guest_artists,
            can_chief_guests: !!r.can_chief_guests,
            can_homebound: !!r.can_homebound,
            can_sports: !!(r as any).can_sports,
            can_security_passes: !!(r as any).can_security_passes,
          };
        }
        setPerm(map);
        
        // Also load requires_approval settings
        const { data: admins } = await supabase
          .from('admin_users')
          .select('user_id, requires_approval');
        
        const approvalMap: Record<string, boolean> = {};
        admins?.forEach(a => {
          approvalMap[a.user_id] = !!a.requires_approval;
        });
        setRequiresApproval(approvalMap);
      } catch {}
    })();
  }, [listAdminPermissions]);

  // Realtime sync for permission changes - update local state when other admins change
  useEffect(() => {
    const channel = supabase
      .channel('admin-users-panel-permissions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_permissions'
      }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row?.user_id) return;
        
        console.log(`[Realtime] Permission update for ${row.user_id}:`, payload.eventType, row);

        if (payload.eventType === 'DELETE') {
          setPerm(p => {
            const next = { ...p };
            delete next[row.user_id];
            return next;
          });
        } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setPerm(p => ({
            ...p,
            [row.user_id]: {
              can_events: !!row.can_events,
              can_schedule: !!row.can_schedule,
              can_gallery: !!row.can_gallery,
              can_sponsors: !!row.can_sponsors,
              can_registrations: !!row.can_registrations,
              can_registration_photos: !!row.can_registration_photos,
              can_faculty: !!row.can_faculty,
              can_core_team: !!row.can_core_team,
              can_guest_artists: !!row.can_guest_artists,
              can_chief_guests: !!row.can_chief_guests,
              can_homebound: !!row.can_homebound,
              can_sports: !!row.can_sports,
              can_security_passes: !!row.can_security_passes,
            }
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return adminUsers || [];
    return (adminUsers || []).filter(u =>
      u.email.toLowerCase().includes(term) || u.user_id.toLowerCase().includes(term)
    );
  }, [adminUsers, q]);

  const onRemove = async (uid: string) => {
    if (!removeAdminUser) return;
    if ((adminUsers?.length || 0) <= 1) {
      alert('Cannot remove the last remaining admin. Add another admin first.');
      return;
    }
    if (!confirm('Remove this admin?')) return;
    setBusy(true);
    try { await removeAdminUser(uid); } catch (e: any) { alert(e?.message || 'Failed to remove admin'); } finally { setBusy(false); }
  };

  const onEditEmail = async (uid: string, currentEmail: string) => {
    if (!updateAdminEmail) return;
    const newEmail = prompt('Enter new email address:', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    setBusy(true);
    try {
      await updateAdminEmail(uid, newEmail.trim());
    } catch (e: any) {
      alert(e?.message || 'Failed to update email');
    } finally {
      setBusy(false);
    }
  };

  const copyHelp = async () => {
    const txt = 'Find your User ID in Supabase → Auth → Users → copy id. Use your account email.';
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  
  // Toggle approval requirement for an admin
  const toggleApprovalRequirement = async (uid: string) => {
    const current = requiresApproval[uid] || false;
    const next = !current;
    
    // Optimistic UI update
    setRequiresApproval(prev => ({ ...prev, [uid]: next }));
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ 
          requires_approval: next,
          approval_enabled_by: next ? user?.id : null,
          approval_enabled_at: next ? new Date().toISOString() : null
        })
        .eq('user_id', uid);
      
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to toggle approval requirement:', e);
      // Rollback on error
      setRequiresApproval(prev => ({ ...prev, [uid]: current }));
      alert(e?.message || 'Failed to update approval setting');
    }
  };

  return (
    <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Admin Users</h3>
            <p className="text-gray-400 text-sm">Manage access rights and roles</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-5 py-3 text-sm font-bold shadow-xl shadow-indigo-600/20 transition-all transform active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5"/> Add New Admin
        </button>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 mb-8 text-sm text-blue-200/80">
        <strong className="text-blue-400">Roles:</strong>
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider">owner</span>
        <span className="mx-1 opacity-60">Full control (cannot be removed)</span>
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">admin</span>
        <span className="mx-1 opacity-60">Configurable access</span>
      </div>

      {isOwner && onManage2FA && (
        <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between group">
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Security Settings</h4>
            <p className="text-xs text-gray-400 mt-1">Manage 2FA requirements and force logout for other admins.</p>
          </div>
          <button
            onClick={onManage2FA}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/10"
          >
            <Lock className="w-3.5 h-3.5" />
            Manage 2FA
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            className="w-full bg-[#0f0f13] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" 
            placeholder="Search by email or user id..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <button onClick={copyHelp} className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap">
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>}
          <span className="hidden sm:inline">Help: Find User ID</span>
          <span className="sm:hidden">Help</span>
        </button>
      </div>

      {showAddModal && (
        <AddAdminModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          isOwner={!!isOwner}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-medium">
              <th className="px-4 py-4">User Details</th>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Access Control</th>
              {isOwner && <th className="px-4 py-4 text-center">Safety</th>}
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(filtered || []).map((u) => (
              <tr key={u.user_id} className="hover:bg-white/5 transition-colors group">
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{u.email}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">ID: {u.user_id}</span>
                    <span className="text-[10px] text-gray-600">Added: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider shadow-sm shadow-yellow-500/10">owner</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider shadow-sm shadow-indigo-500/10">admin</span>
                  )}
                </td>
                <td className="px-4 py-4 max-w-md">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-xs text-gray-500 italic">Full system access granted</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {([
                        ['can_events', 'Events'],
                        ['can_schedule', 'Schedule'],
                        ['can_gallery', 'Gallery'],
                        ['can_sponsors', 'Sponsors'],
                        ['can_registrations', 'Registrations'],
                        ['can_registration_photos', 'Reg. Photos'],
                        ['can_faculty', 'Faculty'],
                        ['can_core_team', 'Core Team'],
                        ['can_guest_artists', 'Guest Artists'],
                        ['can_chief_guests', 'Chief Guests'],
                        ['can_homebound', 'Homebound'],
                        ['can_sports', 'Sports Team'],
                        ['can_security_passes', 'Entry Pass Security'],
                      ] as Array<[keyof typeof perm[string], string]>).map(([key, label]) => (
                        <button
                          key={String(key)}
                          onClick={async () => {
                            if (!setAdminPermission) return;
                            const next = !perm[u.user_id]?.[key];
                            setPerm(p => ({ ...p, [u.user_id]: { ...p[u.user_id], [key]: next } }));
                            try {
                              await setAdminPermission(u.user_id, { [key]: next } as any);
                            } catch (e: any) {
                              setPerm(p => ({ ...p, [u.user_id]: { ...p[u.user_id], [key]: !next } }));
                              alert(e?.message || 'Failed to update permission');
                            }
                          }}
                          className={`
                            inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wide rounded-md px-2 py-1.5 transition-all
                            ${perm[u.user_id]?.[key] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-white/5 text-gray-500 border border-transparent hover:border-white/10 hover:text-gray-300'
                            }
                          `}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${perm[u.user_id]?.[key] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-600'}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                {isOwner && (
                  <td className="px-4 py-4 text-center align-top">
                    {u.role === 'owner' || u.is_primary ? (
                      <span className="text-gray-600 text-xs">-</span>
                    ) : (
                      <button
                        onClick={() => toggleApprovalRequirement(u.user_id)}
                        className={`inline-flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 transition-all ${
                          requiresApproval[u.user_id]
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                        }`}
                        title={requiresApproval[u.user_id] ? 'Changes require owner approval' : 'Changes go live immediately'}
                      >
                        {requiresApproval[u.user_id] ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 rounded-full border border-gray-500" />
                            <span>Open</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                )}
                <td className="px-4 py-4 text-right align-top">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">Protected</span>
                  ) : (
                    <div className="flex flex-col gap-2 items-end">
                      <button disabled={busy} onClick={() => onEditEmail(u.user_id, u.email)} className="text-xs text-blue-400 hover:text-white transition-colors flex items-center gap-1">
                        <Edit className="w-3 h-3"/> Edit Email
                      </button>
                      <button disabled={busy} onClick={() => onRemove(u.user_id)} className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3"/> Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!filtered?.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No admins found matching your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({ isOpen, onClose, isOwner }) => {
  const { addAdminByEmail, addAdminUser, createAdminAccount, setAdminPermission, refreshAdminUsers } = useData();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [permissions, setPermissions] = useState({
    can_events: false,
    can_schedule: false,
    can_gallery: false,
    can_sponsors: false,
    can_registrations: false,
    can_registration_photos: false,
    can_faculty: false,
    can_core_team: false,
    can_guest_artists: false,
    can_chief_guests: false,
    can_homebound: false,
    can_sports: false,
    can_security_passes: false,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Email is required');
    if (mode === 'new' && !password) return setError('Password is required');
    
    setBusy(true);
    setError(null);
    try {
      let resultUserId = userId;
      
      if (mode === 'new') {
        if (!createAdminAccount) throw new Error('Account creation not available');
        const res = await createAdminAccount(email.trim(), password);
        if (res && res.user_id) {
          resultUserId = res.user_id;
        } else {
          throw new Error('Response from server was invalid');
        }
      } else {
        if (userId) {
          if (!addAdminUser) throw new Error('Add user not available');
          await addAdminUser(userId.trim(), email.trim());
          resultUserId = userId.trim();
        } else {
          if (!addAdminByEmail) throw new Error('Add by email not available');
          // addAdminByEmail usually triggers a background process or returns nothing
          // We might not get the UID back immediately if it's an RPC
          await addAdminByEmail(email.trim());
          // Since we might not have the UID yet, we'll wait for refresh and then try to find it
          // OR, if it's an existing user we just added, we can't set perms without the ID.
          // For now, let's assume if it's an existing user, they might just want to add them first.
        }
      }

      // If we have a result UID, set the permissions
      if (resultUserId && setAdminPermission) {
        await setAdminPermission(resultUserId, permissions);
      }

      await refreshAdminUsers?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#1c1c2b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Add New Admin</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-black/40 rounded-xl mb-8 border border-white/5 uppercase text-[10px] font-bold tracking-widest">
            <button
              type="button"
              onClick={() => { setMode('existing'); setError(null); }}
              className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'existing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <UserCheck size={14} /> Add Existing User
            </button>
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => { if(isOwner) { setMode('new'); setError(null); } }}
              className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'new' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'} ${!isOwner ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Key size={14} /> Create New Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-gray-500" size={16} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rico.com"
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {mode === 'new' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Initial Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">User ID (Optional)</label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-3.5 text-gray-500" size={16} />
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Supabase Auth UUID"
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Initial Permissions</label>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(permissions) as Array<keyof typeof permissions>).map((key) => {
                    const label = key.replace('can_', '').replace('_', ' ');
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          permissions[key] 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                            : 'bg-white/5 border-transparent text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wide">{label}</span>
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                          permissions[key] ? 'border-indigo-400 bg-indigo-500' : 'border-gray-700 bg-black/20'
                        }`}>
                          {permissions[key] && <Check size={10} className="text-white" strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : mode === 'new' ? 'Create Account' : 'Add Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
};
