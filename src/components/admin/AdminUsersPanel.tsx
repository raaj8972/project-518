import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { Shield, UserPlus, Trash2, CheckCircle2, Search, Lock, Edit, X, Mail, UserCheck, AlertCircle, Loader2, Globe, RefreshCcw } from 'lucide-react';
import { AdminService } from '../../lib/adminService';
import { isMasterOwner } from '../../constants/owners';

interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, removeAdminUser, updateAdminEmail, setAdminPermission, updateAdminRole, createAdminAccount } = useData();
  const { user, getValidToken } = useAuth();
  const { push: toast } = useToast();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState('');

  // Gmail Whitelist
  const [allowedAdmins, setAllowedAdmins] = useState<{ email: string; role: string; display_name?: string }[]>([]);
  const [newGmail, setNewGmail] = useState('');
  const [newGmailRole, setNewGmailRole] = useState<'owner' | 'admin'>('admin');
  const [whitelistBusy, setWhitelistBusy] = useState(false);

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  const isMasterBypass = user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass' || isMasterOwner(user?.email);
  const role = currentUserAdmin?.role || user?.user_metadata?.role;
  const isOwner = role === 'owner' || currentUserAdmin?.is_primary || isMasterBypass;

  useEffect(() => { refreshAdminUsers && refreshAdminUsers(); }, [refreshAdminUsers]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const list = await AdminService.getAllowedAdmins();
        setAllowedAdmins(list);
      } catch (e) {
        console.error('Failed to load allowed admins:', e);
      }
    };
    loadData();
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
    if (!confirm('Are you sure you want to permanently delete this admin?')) return;
    setBusy(true);
    try { 
      await removeAdminUser(uid); 
      toast({ message: 'Admin deleted successfully', type: 'success' });
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

  const onResetPassword = async (uid: string, email: string) => {
    const newPassword = prompt(`Enter new password for ${email}:`);
    if (!newPassword || newPassword.length < 6) {
      if (newPassword) toast({ message: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setBusy(true);
    console.log('[AdminUsersPanel] Resetting password for:', uid);
    try {
      const token = await getValidToken?.() || '';
      await AdminService.updatePassword(uid, newPassword, token);
      toast({ message: 'Password updated successfully', type: 'success' });
    } catch (e: any) {
      console.error('[AdminUsersPanel] Reset failed:', e);
      toast({ message: e?.message || 'Failed to update password. Ensure you have the required access level.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const copyHelp = async () => {
    const txt = 'To help verify your identity, your current login session email is: ' + user?.email;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="superia-glass-card rounded-[2.5rem] p-8 sm:p-10 border-white/10 shadow-2xl relative overflow-hidden group">
      {/* Header section */}
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
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Security Clearance: {isOwner ? 'OWNER' : 'ADMIN'}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
            <UserPlus className="w-5 h-5 relative z-10"/> <span className="relative z-10">Add New Admin</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Shield size={10} className="text-yellow-500" />
          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">ROLE: OWNER</span>
          <span className="text-[10px] text-gray-400 font-bold">Unrestricted clearance. Can edit any password.</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <UserCheck size={10} className="text-indigo-500" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">ROLE: ADMIN</span>
          <span className="text-[10px] text-gray-400 font-bold">Modular permissions. Can only edit own password.</span>
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
            <Lock className="w-4 h-4" /> Launch 2FA Manager
          </button>
        </div>
      )}

      {/* Gmail Whitelist Management (Owner Only) */}
      {isOwner && (
        <div className="mb-10 p-6 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-[1.5rem] shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Google Sign-In Whitelist</h4>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5">Only these Gmail accounts can access the admin panel via Google Sign-In.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="email"
              value={newGmail}
              onChange={(e) => setNewGmail(e.target.value)}
              placeholder="user@gmail.com"
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
            <select
              value={newGmailRole}
              onChange={(e) => setNewGmailRole(e.target.value as 'owner' | 'admin')}
              className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="admin" className="bg-[#0a0a15]">Admin</option>
              <option value="owner" className="bg-[#0a0a15]">Owner</option>
            </select>
            <button
              disabled={whitelistBusy || !newGmail.includes('@')}
              onClick={async () => {
                setWhitelistBusy(true);
                try {
                  await AdminService.addAllowedAdmin(newGmail, newGmailRole);
                  const list = await AdminService.getAllowedAdmins();
                  setAllowedAdmins(list);
                  setNewGmail('');
                  toast({ message: `${newGmail} added via whitelist`, type: 'success' });
                } catch (e: any) {
                  toast({ message: e?.message || 'Failed to add', type: 'error' });
                } finally {
                  setWhitelistBusy(false);
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {whitelistBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
            </button>
          </div>

          <div className="space-y-2">
            {allowedAdmins.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No Gmail accounts whitelisted yet.</p>
            ) : (
              allowedAdmins.map((a) => (
                <div key={a.email} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-black">
                      {(a.display_name || a.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">{a.display_name || a.email.split('@')[0]}</p>
                      <p className="text-[10px] text-gray-500">{a.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      a.role === 'owner' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>{a.role}</span>
                  </div>
                  <button
                    disabled={whitelistBusy}
                    onClick={async () => {
                      if (!confirm(`Remove ${a.email} from the whitelist?`)) return;
                      setWhitelistBusy(true);
                      try {
                        await AdminService.removeAllowedAdmin(a.email);
                        const list = await AdminService.getAllowedAdmins();
                        setAllowedAdmins(list);
                        toast({ message: `${a.email} removed from whitelist`, type: 'success' });
                      } catch (e: any) {
                        toast({ message: e?.message || 'Failed to remove', type: 'error' });
                      } finally {
                        setWhitelistBusy(false);
                      }
                    }}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Admin Data Grid */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 group w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-12 pr-4 py-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
            placeholder="Search admins by email or ID..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <button onClick={copyHelp} className="w-full md:w-auto inline-flex items-center justify-center gap-3 border border-white/10 bg-white/5 rounded-[1.5rem] px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap group">
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce"/> : <Shield className="w-4 h-4 group-hover:scale-110 transition-transform"/>}
          <span>{copied ? 'Copied Help Info' : 'Auth Guide'}</span>
        </button>
      </div>

      {showAddModal && (
        <AddAdminModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          createAdminAccount={createAdminAccount}
          refreshAdminUsers={refreshAdminUsers}
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
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {(filtered || []).map((u) => {
              const isCellOwner = isMasterOwner(u.email) || u.role === 'owner' || u.is_primary;
              const isCurrentUser = user?.email === u.email || user?.id === u.user_id;
              
              return (
                <tr key={u.user_id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-indigo-400 opacity-60" />
                        <span className="text-white font-black">{(u as any).display_name || u.email.split('@')[0]}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono mt-1 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{u.email}</span>
                      <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">ID: {u.user_id}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top">
                    {isOwner && u.user_id !== user?.id && !isMasterOwner(u.email) ? (
                      <select
                        value={isCellOwner ? 'owner' : 'admin'}
                        onChange={async (e) => {
                          const nextRole = e.target.value as 'owner' | 'admin';
                          if (!updateAdminRole) return;
                          setBusy(true);
                          try {
                            await updateAdminRole(u.user_id, nextRole);
                            toast({ message: `Role changed to ${nextRole.toUpperCase()}`, type: 'success' });
                          } catch (err: any) {
                            toast({ message: err.message || 'Role change failed', type: 'error' });
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="bg-white/5 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-white/10"
                      >
                        <option value="admin" className="bg-slate-900 text-white">Admin</option>
                        <option value="owner" className="bg-slate-900 text-yellow-500">Owner</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${
                        isCellOwner 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shadow-yellow-500/5' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-indigo-500/5'
                      }`}>
                        {isCellOwner ? <Shield size={10} fill="currentColor" /> : <UserCheck size={10} fill="currentColor" />} 
                        {isCellOwner ? 'Owner' : 'Admin'}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 max-w-md">
                    {isCellOwner ? (
                      <span className="text-[10px] text-gray-500 italic opacity-60 font-bold">Unrestricted Access</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['can_events', 'Events'],
                          ['can_schedule', 'Schedule'],
                          ['can_gallery', 'Gallery'],
                          ['can_sponsors', 'Sponsors'],
                          ['can_registrations', 'Registrations'],
                          ['can_faculty', 'Faculty'],
                          ['can_chief_guests', 'Chief Guests'],
                          ['can_security_passes', 'Security'],
                        ].map(([key, label]) => (
                          <button
                            key={String(key)}
                            disabled={!isOwner}
                            onClick={async () => {
                              if (!setAdminPermission || !isOwner) return;
                              const perms = u.permissions as any;
                              const next = !(perms?.[key]);
                              try {
                                await setAdminPermission(u.user_id, { [key]: next } as any);
                                toast({ message: `Access ${next ? 'granted' : 'revoked'} for ${label}`, type: 'success' });
                              } catch (e: any) {
                                toast({ message: e?.message || 'Update failed', type: 'error' });
                              }
                            }}
                            className={`
                              inline-flex items-center gap-2 text-[9px] uppercase font-black tracking-widest rounded-lg px-2.5 py-1.5 transition-all
                              ${(u.permissions as any)?.[key] 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-white/5 text-gray-600 border border-transparent'
                              }
                              ${isOwner ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default opacity-80'}
                            `}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${(u.permissions as any)?.[key] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-700'}`} />
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right align-top">
                    <div className="flex flex-col gap-3 items-end">
                      {(isOwner || isCurrentUser) && (
                        <button 
                          disabled={busy} 
                          onClick={() => onResetPassword(u.user_id, u.email)} 
                          className={`text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 group/pass ${busy ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-emerald-400/80 hover:text-emerald-400'}`}
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} className="group-hover/pass:rotate-180 transition-transform duration-500"/>}
                          {busy ? 'Processing...' : 'Reset Password'}
                        </button>
                      )}
                      
                      {isOwner && (
                        <button disabled={busy} onClick={() => onEditEmail(u.user_id, u.email)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 hover:text-indigo-400 transition-colors flex items-center gap-2 group/edit">
                          <Edit size={12} className="group-hover/edit:scale-110 transition-transform"/> Edit Email
                        </button>
                      )}

                      {isOwner && !isMasterOwner(u.email) && !isCurrentUser && (
                        <button disabled={busy} onClick={() => onRemove(u.user_id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500/80 hover:text-rose-500 transition-colors flex items-center gap-2 group/rem">
                          <Trash2 size={12} className="group-hover/rem:scale-110 transition-transform"/> Delete Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered?.length && (
              <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-600 font-black uppercase tracking-[0.2em] italic text-[10px]">No matches detected.</td></tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// ── Add Admin Modal (Simplified Redesign) ── 

interface AddAdminModalProps { 
  isOpen: boolean; 
  onClose: () => void;
  createAdminAccount: any;
  refreshAdminUsers: any;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({ isOpen, onClose, createAdminAccount, refreshAdminUsers }) => {
  const { push: toast } = useToast();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'admin'>('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return setError('All fields are required');
    
    setBusy(true);
    setError(null);
    try {
      if (!createAdminAccount) throw new Error('Account creation not available from Context.');
      
      // We pass an empty permissions object `{}`, they can be toggled in the UI later. 
      await createAdminAccount(email.trim(), password, role, displayName.trim());
      await refreshAdminUsers?.();
      
      toast({ message: `Admin Account ${email} has been correctly created!`, type: 'success' });
      onClose();
    } catch (err: any) {
      console.error('[AddAdminModal] Process failed:', err);
      setError(err?.message || 'Creation sequence interrupted');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-xl superia-glass-card rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-300 border-white/10">
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <UserPlus className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Add New Admin</h3>
              <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase mt-1">Create a fresh admin identity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all group">
            <X className="text-gray-500 group-hover:text-white transition-all" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Display Name</label>
            <div className="relative group">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                required
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Raja"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-12 pr-4 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Login Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="raja@rico.fun"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-12 pr-4 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-12 pr-4 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-4 transition-all"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Initial Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'owner' | 'admin')}
                className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-4 py-4 text-white font-black uppercase text-xs focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
              >
                <option value="admin" className="bg-[#0a0a15] text-indigo-400">ADMIN</option>
                <option value="owner" className="bg-[#0a0a15] text-yellow-500">OWNER</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold animate-shake">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] py-4 bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={20} /> : <><Shield size={18} /> Create Admin</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
};
