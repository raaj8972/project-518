import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import {
  Shield, UserPlus, Trash2, Search, Lock, Edit, X, Mail, UserCheck,
  AlertCircle, Loader2, Globe, RefreshCcw, ChevronDown, ChevronUp,
  Calendar, Eye, Image, Star, ClipboardList, GraduationCap, Users, Key,
  CheckCircle2, Crown, Zap
} from 'lucide-react';
import { AdminService } from '../../lib/adminService';
import { isMasterOwner } from '../../constants/owners';

const ALL_PERMISSIONS: [string, string, typeof Shield][] = [
  ['can_events',          'Events',          Calendar],
  ['can_schedule',        'Schedule',        Clock2],
  ['can_gallery',         'Gallery',         Image],
  ['can_sponsors',        'Sponsors',        Star],
  ['can_registrations',   'Registrations',   ClipboardList],
  ['can_faculty',         'Faculty',         GraduationCap],
  ['can_chief_guests',    'Chief Guests',    Users],
  ['can_security_passes', 'Security',        Key],
];

// ─── tiny inline clock icon (lucide doesn't export Clock2 in all versions) ───
function Clock2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, isOwner }: { name: string; isOwner: boolean }) {
  const colors = isOwner
    ? 'bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border-amber-500/40 text-amber-300'
    : 'bg-gradient-to-br from-indigo-500/20 to-violet-600/10 border-indigo-500/30 text-indigo-300';
  return (
    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-lg font-black uppercase shrink-0 ${colors}`}>
      {name[0]}
    </div>
  );
}

// ─── Permission Toggle Chip ───────────────────────────────────────────────────
interface PermChipProps {
  label: string;
  Icon: any;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}
function PermChip({ label, Icon, active, disabled, onClick }: PermChipProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200
        ${active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.1)]'
          : 'bg-white/[0.03] text-gray-600 border border-white/5 hover:border-white/15 hover:text-gray-400'
        }
        ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-105 active:scale-95'}
      `}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-gray-700'}`} />
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Admin Card ───────────────────────────────────────────────────────────────
interface AdminCardProps {
  u: any;
  currentUser: any;
  canAssignTabs: boolean;
  isOwner: boolean;
  busy: boolean;
  onRemove: (uid: string) => void;
  onEditEmail: (uid: string, email: string) => void;
  onResetPassword: (uid: string, email: string) => void;
  onRoleChange: (uid: string, role: 'owner' | 'admin') => void;
  onPermChange: (uid: string, perms: any) => void;
}
function AdminCard({
  u, currentUser, canAssignTabs, isOwner, busy,
  onRemove, onEditEmail, onResetPassword, onRoleChange, onPermChange
}: AdminCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCellOwner = isMasterOwner(u.email) || u.role === 'owner' || u.is_primary;
  const isMe = currentUser?.email === u.email || currentUser?.id === u.user_id;
  const displayName = (u as any).display_name || u.email.split('@')[0];

  return (
    <div className={`
      group relative rounded-2xl border transition-all duration-300 overflow-hidden
      ${isMe
        ? 'bg-indigo-500/[0.06] border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)]'
        : 'bg-white/[0.02] border-white/8 hover:border-white/15 hover:bg-white/[0.04]'
      }
    `}>
      {/* glow accent for current user */}
      {isMe && <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />}

      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar name={displayName} isOwner={isCellOwner} />

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white truncate">{displayName}</span>
              {isMe && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider border border-indigo-500/30">
                  You
                </span>
              )}
              {isCellOwner && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Owner
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate font-mono">{u.email}</p>
            <p className="text-[9px] text-gray-700 mt-0.5 font-bold truncate">ID: {u.user_id}</p>
          </div>

          {/* Role selector (owner can change) */}
          {isOwner && !isMe && !isMasterOwner(u.email) ? (
            <select
              value={isCellOwner ? 'owner' : 'admin'}
              onChange={e => onRoleChange(u.user_id, e.target.value as 'owner' | 'admin')}
              className="bg-white/5 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-white/10 shrink-0"
            >
              <option value="admin" className="bg-slate-900">Admin</option>
              <option value="owner" className="bg-slate-900">Owner</option>
            </select>
          ) : null}

          {/* Expand toggle for permissions */}
          {!isCellOwner && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all shrink-0"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
          {(isOwner || isMe) && (
            <button
              disabled={busy}
              onClick={() => onResetPassword(u.user_id, u.email)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
              Reset Password
            </button>
          )}
          {isOwner && (
            <button
              disabled={busy}
              onClick={() => onEditEmail(u.user_id, u.email)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all active:scale-95 disabled:opacity-40"
            >
              <Edit className="w-3 h-3" /> Edit Email
            </button>
          )}
          {isOwner && !isMasterOwner(u.email) && !isMe && (
            <button
              disabled={busy}
              onClick={() => onRemove(u.user_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-40 ml-auto"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Expandable permission matrix */}
      {!isCellOwner && expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 bg-white/[0.01]">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Access Matrix</p>
          <div className="flex flex-wrap gap-2">
            {ALL_PERMISSIONS.map(([key, label, Icon]) => {
              const active = !!(u.permissions as any)?.[key];
              return (
                <PermChip
                  key={key}
                  label={label}
                  Icon={Icon}
                  active={active}
                  disabled={!canAssignTabs}
                  onClick={() => onPermChange(u.user_id, { [key]: !active })}
                />
              );
            })}
          </div>
          {!canAssignTabs && (
            <p className="text-[9px] text-gray-700 mt-3 font-bold">Only owners or whitelisted admins can modify permissions.</p>
          )}
        </div>
      )}
      {isCellOwner && (
        <div className="px-5 pb-4 pt-0">
          <span className="inline-flex items-center gap-1.5 text-[9px] text-amber-400/60 font-bold uppercase tracking-widest">
            <Zap className="w-2.5 h-2.5" /> Unrestricted access to all modules
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Whitelist Card ──────────────────────────────────────────────────────────
interface WhitelistCardProps {
  a: { email: string; role: string; display_name?: string; permissions?: any };
  canAssignTabs: boolean;
  busy: boolean;
  onRemove: (email: string) => void;
  onPermChange: (email: string, perms: any) => void;
}
function WhitelistCard({ a, canAssignTabs, busy, onRemove, onPermChange }: WhitelistCardProps) {
  const [expanded, setExpanded] = useState(false);
  const name = a.display_name || a.email.split('@')[0];
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-black text-emerald-400 uppercase shrink-0">
            {name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white truncate">{name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                a.role === 'owner'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              }`}>{a.role}</span>
            </div>
            <p className="text-[10px] text-gray-500 truncate font-mono">{a.email}</p>
          </div>

          {a.role !== 'owner' && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all shrink-0"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            disabled={busy}
            onClick={() => onRemove(a.email)}
            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {a.role !== 'owner' && expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-white/5 bg-white/[0.01]">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2.5">Pre-assigned Permissions</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_PERMISSIONS.map(([key, label, Icon]) => {
              const active = !!(a.permissions as any)?.[key];
              return (
                <PermChip
                  key={key}
                  label={label}
                  Icon={Icon}
                  active={active}
                  disabled={!canAssignTabs}
                  onClick={() => onPermChange(a.email, { [key]: !active })}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, removeAdminUser, updateAdminEmail, setAdminPermission, updateAdminRole, createAdminAccount } = useData();
  const { user, getValidToken } = useAuth();
  const { push: toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  // Whitelist
  const [allowedAdmins, setAllowedAdmins] = useState<{ email: string; role: string; display_name?: string; permissions?: any }[]>([]);
  const [newGmail, setNewGmail] = useState('');
  const [newGmailRole, setNewGmailRole] = useState<'owner' | 'admin'>('admin');
  const [whitelistBusy, setWhitelistBusy] = useState(false);

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  const isMasterBypass = user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass' || isMasterOwner(user?.email);
  const role = currentUserAdmin?.role || user?.user_metadata?.role;
  const isOwner = role === 'owner' || currentUserAdmin?.is_primary || isMasterBypass;
  const isWhitelistedAdmin = useMemo(() => allowedAdmins.some(a => a.email === user?.email), [allowedAdmins, user]);
  const canAssignTabs = isOwner || isWhitelistedAdmin;

  const reloadWhitelist = useCallback(async () => {
    try { setAllowedAdmins(await AdminService.getAllowedAdmins()); } catch {}
  }, []);

  useEffect(() => { refreshAdminUsers?.(); }, [refreshAdminUsers]);
  useEffect(() => { reloadWhitelist(); }, [reloadWhitelist]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return adminUsers || [];
    return (adminUsers || []).filter(u =>
      u.email.toLowerCase().includes(term) || u.user_id.toLowerCase().includes(term)
    );
  }, [adminUsers, q]);

  const onRemove = async (uid: string) => {
    if (!removeAdminUser) return;
    if ((adminUsers?.length || 0) <= 1) { toast({ message: 'Cannot remove the last admin.', type: 'error' }); return; }
    if (!confirm('Permanently delete this admin?')) return;
    setBusy(true);
    try { await removeAdminUser(uid); toast({ message: 'Admin deleted', type: 'success' }); }
    catch (e: any) { toast({ message: e?.message || 'Failed to remove admin', type: 'error' }); }
    finally { setBusy(false); }
  };

  const onEditEmail = async (uid: string, currentEmail: string) => {
    if (!updateAdminEmail) return;
    const newEmail = prompt('New email address:', currentEmail);
    if (!newEmail || newEmail === currentEmail) return;
    setBusy(true);
    try { await updateAdminEmail(uid, newEmail.trim()); toast({ message: 'Email updated', type: 'success' }); }
    catch (e: any) { toast({ message: e?.message || 'Failed to update email', type: 'error' }); }
    finally { setBusy(false); }
  };

  const onResetPassword = async (uid: string, email: string) => {
    const newPassword = prompt(`New password for ${email}:`);
    if (!newPassword || newPassword.length < 6) { if (newPassword) toast({ message: 'Min 6 characters required', type: 'error' }); return; }
    setBusy(true);
    try {
      const token = await getValidToken?.() || '';
      await AdminService.updatePassword(uid, newPassword, token);
      toast({ message: 'Password updated', type: 'success' });
    }
    catch (e: any) { toast({ message: e?.message || 'Failed to update password', type: 'error' }); }
    finally { setBusy(false); }
  };

  const onRoleChange = async (uid: string, nextRole: 'owner' | 'admin') => {
    if (!updateAdminRole) return;
    setBusy(true);
    try { await updateAdminRole(uid, nextRole); toast({ message: `Role → ${nextRole.toUpperCase()}`, type: 'success' }); }
    catch (e: any) { toast({ message: e?.message || 'Role change failed', type: 'error' }); }
    finally { setBusy(false); }
  };

  const onPermChange = async (uid: string, perms: any) => {
    if (!setAdminPermission || !canAssignTabs) return;
    try {
      await setAdminPermission(uid, perms);
      const label = Object.keys(perms)[0];
      toast({ message: `${label} ${Object.values(perms)[0] ? 'granted' : 'revoked'}`, type: 'success' });
    }
    catch (e: any) { toast({ message: e?.message || 'Update failed', type: 'error' }); }
  };

  const onWhitelistPermChange = async (email: string, perms: any) => {
    if (!canAssignTabs) return;
    setWhitelistBusy(true);
    try {
      await AdminService.updateAllowedAdminPermissions(email, perms as any);
      await reloadWhitelist();
      toast({ message: 'Permission updated', type: 'success' });
    }
    catch (e: any) { toast({ message: e?.message || 'Update failed', type: 'error' }); }
    finally { setWhitelistBusy(false); }
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Access Control</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Personnel Management</span>
              <span className="text-gray-600">·</span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isOwner ? 'text-amber-400' : 'text-gray-500'}`}>
                {isOwner ? '⚡ Owner' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && onManage2FA && (
            <button
              onClick={onManage2FA}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 hover:border-white/20"
            >
              <Lock className="w-4 h-4 text-indigo-400" /> 2FA Manager
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
          )}
        </div>
      </div>

      {/* ── Role legend ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-tight">Owner</span>
          <span className="text-[9px] text-gray-500">— Unrestricted, can edit all passwords</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <UserCheck className="w-3 h-3 text-indigo-400" />
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tight">Admin</span>
          <span className="text-[9px] text-gray-500">— Modular permissions, own password only</span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative group">
        <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
        <input
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          placeholder="Search by email or ID…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* ── Admin Cards Grid ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-600 font-black uppercase tracking-widest text-[10px]">
            No admins found
          </div>
        ) : (
          filtered.map(u => (
            <AdminCard
              key={u.user_id}
              u={u}
              currentUser={user}
              canAssignTabs={canAssignTabs}
              isOwner={isOwner}
              busy={busy}
              onRemove={onRemove}
              onEditEmail={onEditEmail}
              onResetPassword={onResetPassword}
              onRoleChange={onRoleChange}
              onPermChange={onPermChange}
            />
          ))
        )}
      </div>

      {/* ── Google Whitelist (Owner Only) ── */}
      {isOwner && (
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-cyan-500/[0.03] overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Globe className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Google Sign-In Whitelist</h4>
                <p className="text-[10px] text-gray-500 font-bold mt-0.5">Gmail accounts allowed to access admin panel via Google.</p>
              </div>
            </div>

            {/* Add form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newGmail}
                onChange={e => setNewGmail(e.target.value)}
                placeholder="user@gmail.com"
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 transition-all"
              />
              <select
                value={newGmailRole}
                onChange={e => setNewGmailRole(e.target.value as 'owner' | 'admin')}
                className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 cursor-pointer"
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
                    await reloadWhitelist();
                    setNewGmail('');
                    toast({ message: `${newGmail} added to whitelist`, type: 'success' });
                  } catch (e: any) {
                    toast({ message: e?.message || 'Failed to add', type: 'error' });
                  } finally { setWhitelistBusy(false); }
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {whitelistBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>

          {/* Whitelist entries */}
          <div className="p-4 space-y-2">
            {allowedAdmins.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6 font-bold">No Gmail accounts whitelisted yet.</p>
            ) : (
              allowedAdmins.map(a => (
                <WhitelistCard
                  key={a.email}
                  a={a}
                  canAssignTabs={canAssignTabs}
                  busy={whitelistBusy}
                  onRemove={async (email) => {
                    if (!confirm(`Remove ${email} from whitelist?`)) return;
                    setWhitelistBusy(true);
                    try {
                      await AdminService.removeAllowedAdmin(email);
                      await reloadWhitelist();
                      toast({ message: `${email} removed`, type: 'success' });
                    } catch (e: any) {
                      toast({ message: e?.message || 'Failed to remove', type: 'error' });
                    } finally { setWhitelistBusy(false); }
                  }}
                  onPermChange={onWhitelistPermChange}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Add Admin Modal ── */}
      {showAddModal && (
        <AddAdminModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          createAdminAccount={createAdminAccount}
          refreshAdminUsers={refreshAdminUsers}
        />
      )}
    </div>
  );
};


// ── Add Admin Modal ──────────────────────────────────────────────────────────
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
      if (!createAdminAccount) throw new Error('Account creation not available.');
      await createAdminAccount(email.trim(), password, role, displayName.trim());
      await refreshAdminUsers?.();
      toast({ message: `Admin ${email} created!`, type: 'success' });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Creation failed');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0c0c1a] border border-white/10 rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
        {/* accent line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tighter uppercase italic">New Admin</h3>
              <p className="text-[9px] font-black text-gray-500 tracking-widest uppercase mt-0.5">Create admin identity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all group">
            <X className="text-gray-500 group-hover:text-white transition-all" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Display Name</label>
            <div className="relative group">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
              <input
                required type="text" value={displayName}
                onChange={e => setDisplayName(e.target.value)} placeholder="Raja"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Login Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
              <input
                required type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="raja@rico.fun"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {/* Password + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input
                  required type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white font-bold placeholder-gray-700 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Role</label>
              <select
                value={role} onChange={e => setRole(e.target.value as 'owner' | 'admin')}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-black uppercase focus:outline-none focus:border-indigo-500/40 transition-all cursor-pointer"
              >
                <option value="admin" className="bg-[#0a0a15]">Admin</option>
                <option value="owner" className="bg-[#0a0a15]">Owner</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={busy}
              className="flex-[2] py-3.5 bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <><Shield size={16} /> Create Admin</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
};
