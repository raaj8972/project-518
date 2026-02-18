import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { supabase } from '../../lib/supabase';
import { Shield, UserPlus, Trash2, Copy, CheckCircle2, Search, Lock, Edit, X, Mail, Key, UserCheck, Settings, AlertCircle, Check, Loader2, Fingerprint } from 'lucide-react';

interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, removeAdminUser, updateAdminEmail, listAdminPermissions, setAdminPermission } = useData();
  const { user } = useAuth();
  const { push: toast } = useToast();
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
  
  const [requiresApproval, setRequiresApproval] = useState<Record<string, boolean>>({});

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  const isMasterBypass = user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass';
  const isOwner = currentUserAdmin?.role === 'owner' || currentUserAdmin?.is_primary || isMasterBypass;

  useEffect(() => { refreshAdminUsers && refreshAdminUsers(); }, [refreshAdminUsers]);
  
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
      toast({ message: 'Cannot remove the last remaining admin.', type: 'error' });
      return;
    }
    if (!confirm('Remove this admin?')) return;
    setBusy(true);
    try { 
      await removeAdminUser(uid); 
      toast({ message: 'Admin removed successfully', type: 'success' });
    } catch (e: any) { 
      toast({ message: e?.message || 'Failed to remove admin', type: 'error' }); 
    } finally { 
      setBusy(false); 
    }
  };

  const onEditEmail = async (uid: string, currentEmail: string) => {
    if (!updateAdminEmail) return;
    const newEmail = prompt('Enter new email address:', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    setBusy(true);
    try {
      await updateAdminEmail(uid, newEmail.trim());
      toast({ message: 'Email updated successfully', type: 'success' });
    } catch (e: any) {
      toast({ message: e?.message || 'Failed to update email', type: 'error' });
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
  
  const toggleApprovalRequirement = async (uid: string) => {
    const current = requiresApproval[uid] || false;
    const next = !current;
    
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
      toast({ message: `Approval requirement ${next ? 'enabled' : 'disabled'}`, type: 'info' });
    } catch (e: any) {
      setRequiresApproval(prev => ({ ...prev, [uid]: current }));
      toast({ message: e?.message || 'Failed to update approval setting', type: 'error' });
    }
  };

  return (
    <div className="superia-glass-card rounded-[2.5rem] p-8 sm:p-10 border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-all duration-500">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Access Control</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Personnel Management System</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Security Clearance: {currentUserAdmin?.role || 'Admin'}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
          <UserPlus className="w-5 h-5 relative z-10"/> <span className="relative z-10">Authorize New Admin</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Shield size={10} className="text-yellow-500" />
          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">ROLE: OWNER</span>
          <span className="text-[10px] text-gray-400 font-bold">Unrestricted clearance</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <UserCheck size={10} className="text-indigo-500" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">ROLE: ADMIN</span>
          <span className="text-[10px] text-gray-400 font-bold">Modular permissions</span>
        </div>
      </div>

      {isOwner && onManage2FA && (
        <div className="mb-10 p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex items-center justify-between group shadow-xl">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest italic group-hover:text-indigo-400 transition-colors">Security Protocol Override</h4>
            <p className="text-xs text-gray-500 mt-1 font-bold">Manage MFA requirements and session force-termination across the network.</p>
          </div>
          <button
            onClick={onManage2FA}
            className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
          >
            <Lock className="w-4 h-4" />
            Launch 2FA Manager
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 group w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
            placeholder="Search by email or user id..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <button onClick={copyHelp} className="w-full md:w-auto inline-flex items-center justify-center gap-3 border border-white/10 bg-white/5 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap group">
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce"/> : <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform"/>}
          <span>{copied ? 'ID Copied' : 'Auth Guide'}</span>
        </button>
      </div>

      {showAddModal && (
        <AddAdminModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          isOwner={!!isOwner}
        />
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.01] backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">
                <th className="px-8 py-6">Identity Profile</th>
                <th className="px-8 py-6">Security Level</th>
                <th className="px-8 py-6">Access Matrix</th>
                {isOwner && <th className="px-8 py-6 text-center">Safety</th>}
                <th className="px-8 py-6 text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {(filtered || []).map((u) => (
              <tr key={u.user_id} className="hover:bg-white/5 transition-colors group">
                <td className="px-8 py-8">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-indigo-400 opacity-60" />
                      <span className="text-white font-black italic">{u.email}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono mt-1 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">UID: {u.user_id}</span>
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Added: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-8 py-8 align-top">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/5">
                      <Shield size={10} fill="currentColor" /> Owner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/5">
                      <UserCheck size={10} fill="currentColor" /> Admin
                    </span>
                  )}
                </td>
                <td className="px-8 py-8 max-w-md">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-xs text-gray-500 italic opacity-60">Master bypass active - unrestricted clearance</span>
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
                        ['can_sports', 'Sports'],
                        ['can_security_passes', 'Security'],
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
                              toast({ message: e?.message || 'Update failed', type: 'error' });
                            }
                          }}
                          className={`
                            inline-flex items-center gap-2 text-[9px] uppercase font-black tracking-widest rounded-lg px-2.5 py-1.5 transition-all
                            ${perm[u.user_id]?.[key] 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95' 
                              : 'bg-white/5 text-gray-600 border border-transparent hover:border-white/10 hover:text-gray-400'
                            }
                          `}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${perm[u.user_id]?.[key] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-700'}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                {isOwner && (
                  <td className="px-8 py-8 text-center align-top">
                    {u.role === 'owner' || u.is_primary ? (
                      <span className="text-gray-600 text-xs">-</span>
                    ) : (
                      <button
                        onClick={() => toggleApprovalRequirement(u.user_id)}
                        className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 transition-all ${
                          requiresApproval[u.user_id]
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5'
                            : 'bg-white/5 border border-white/5 text-gray-600 hover:text-gray-400'
                        }`}
                        title={requiresApproval[u.user_id] ? 'Changes require owner approval' : 'Changes go live immediately'}
                      >
                        {requiresApproval[u.user_id] ? (
                          <>
                            <Lock size={12} className="text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            <span>Locked</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full border-2 border-gray-600" />
                            <span>Open</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                )}
                <td className="px-8 py-8 text-right align-top">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-gray-600 text-[10px] uppercase font-black tracking-widest italic opacity-40">System Protected</span>
                  ) : (
                    <div className="flex flex-col gap-3 items-end">
                      <button disabled={busy} onClick={() => onEditEmail(u.user_id, u.email)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 hover:text-indigo-400 transition-colors flex items-center gap-2 group/edit">
                        <Edit size={12} className="group-hover/edit:scale-110 transition-transform"/> Edit Identity
                      </button>
                      <button disabled={busy} onClick={() => onRemove(u.user_id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 transition-colors flex items-center gap-2 group/rem">
                        <Trash2 size={12} className="group-hover/rem:scale-110 transition-transform"/> Terminate
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!filtered?.length && (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-600 font-black uppercase tracking-[0.2em] italic text-[10px]">No matches detected in identity database</td></tr>
            )}
          </tbody>
          </table>
        </div>
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
  const { push: toast } = useToast();
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
          await addAdminByEmail(email.trim());
        }
      }

      if (resultUserId && setAdminPermission) {
        await setAdminPermission(resultUserId, permissions);
      }

      await refreshAdminUsers?.();
      toast({ message: mode === 'new' ? 'Account created and authorized' : 'Admin access granted', type: 'success' });
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl superia-glass-card rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-500 border-white/10">
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <UserPlus className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Authorization Terminal</h3>
              <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase mt-1">Personnel on-boarding sequence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all group">
            <X className="text-gray-500 group-hover:text-white group-hover:rotate-90 transition-all" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10">
          <div className="flex p-1.5 bg-black/40 rounded-2xl mb-10 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => { setMode('existing'); setError(null); }}
              className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${mode === 'existing' ? 'bg-indigo-600 text-white shadow-2xl' : 'text-gray-500 hover:text-gray-400'}`}
            >
              <UserCheck size={16} /> Link Existing
            </button>
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => { if(isOwner) { setMode('new'); setError(null); } }}
              className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${mode === 'new' ? 'bg-indigo-600 text-white shadow-2xl' : 'text-gray-500 hover:text-gray-400'} ${!isOwner ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Key size={16} /> Create Prime
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Identity Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="personnel@rico.family"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                </div>
              </div>

              {mode === 'new' ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Security Hash (Password)</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Unique Identifier (Optional)</label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Supabase Auth UUID"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-mono text-xs placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold animate-shake">
                  <AlertCircle size={18} /> {error}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Access Matrix Permissions</label>
              <div className="bg-black/40 border border-white/10 rounded-[2rem] p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.keys(permissions) as Array<keyof typeof permissions>).map((key) => {
                    const label = key.replace('can_', '').replace('_', ' ');
                    const active = permissions[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 group/perm ${
                          active 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/5' 
                            : 'bg-white/[0.02] border-transparent text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-black tracking-widest italic">{label}</span>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all duration-500 ${
                          active ? 'border-indigo-400 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rotate-0' : 'border-gray-800 bg-black/40 rotate-45 group-hover/perm:rotate-0'
                        }`}>
                          {active && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-5 bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/5"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] py-5 bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <Shield size={18} fill="currentColor" />
                  {mode === 'new' ? 'Initialize Prime Account' : 'Grant Clearance Access'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
};
