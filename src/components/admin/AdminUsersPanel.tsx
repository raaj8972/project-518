import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import {
  Shield, UserPlus, Trash2, Search, Lock, Edit, X,
  Globe, RefreshCcw, ChevronDown,
  Calendar, Image, Star, ClipboardList, GraduationCap, Users, Key,
  Crown
} from 'lucide-react';
import { AdminService } from '../../lib/adminService';
import { isMasterOwner } from '../../constants/owners';
import '../../styles/AdminAccounts.css';
import { AdminInviteModal } from './AdminInviteModal';
import { ResetPasswordEmailDialog } from './ResetPasswordEmailDialog';
import { AdminPageSelector, pagesForPermissions } from './AdminPageSelector';

const ALL_PERMISSIONS: [string, string, React.ComponentType<{ className?: string }>] [] = [
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
  return <div className={`account-avatar${isOwner ? ' is-owner' : ''}`} aria-hidden="true">{name[0]?.toUpperCase() || 'A'}</div>;

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
  return <button type="button" disabled={disabled} aria-pressed={active} onClick={onClick} className={`account-permission${active ? ' is-enabled' : ''}`}><Icon className="account-permission-icon" />{label}<span>{active ? 'On' : 'Off'}</span></button>;

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
  onPageAccessChange: (uid: string, pages: string[]) => Promise<void>;
}
function AdminCard({
  u, currentUser, canAssignTabs, isOwner, busy,
  onRemove, onEditEmail, onResetPassword, onRoleChange, onPageAccessChange
}: AdminCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCellOwner = isMasterOwner(u.email) || u.role === 'owner' || u.is_primary;
  const isMe = currentUser?.email === u.email || currentUser?.id === u.user_id;
  const displayName = (u as any).display_name || u.email.split('@')[0];

  const [pages,setPages] = useState<string[]>(() => pagesForPermissions(u.permissions));
  const permissionCount = pagesForPermissions(u.permissions).length;
  return <article className={`account-row${isMe ? ' is-current' : ''}`} aria-label={`${displayName} account`}>
    <div className="account-row-main">
      <div className="account-identity"><Avatar name={displayName} isOwner={isCellOwner} /><div><div className="account-name"><strong>{displayName}</strong>{isMe && <span>You</span>}</div><p title={u.email}>{u.email}</p></div></div>
      <div className="account-role">{isOwner && !isMe && !isMasterOwner(u.email) ? <select aria-label={`Role for ${u.email}`} value={isCellOwner ? 'owner' : 'admin'} disabled={busy} onChange={e => onRoleChange(u.user_id, e.target.value as 'owner' | 'admin')}><option value="admin">Admin</option><option value="owner">Owner</option></select> : <span className="account-role-label">{isCellOwner && <Crown size={12} />}{isCellOwner ? 'Owner' : 'Admin'}</span>}</div>
      <div className="account-access"><span>{isCellOwner ? 'Full access' : `${permissionCount} allowed pages`}</span><button className="account-access-button" type="button" aria-expanded={expanded} aria-controls={`account-details-${u.user_id}`} onClick={() => { if(!expanded)setPages(pagesForPermissions(u.permissions)); setExpanded(value => !value); }}>{expanded ? 'Close details' : isCellOwner ? 'View access details' : canAssignTabs ? 'Edit permissions' : 'View permissions'}<ChevronDown size={13} className={expanded ? 'is-expanded' : ''} /></button></div>
      <div className="account-actions">{isOwner && !isMe && <button type="button" disabled={busy} onClick={() => onResetPassword(u.user_id, u.email)} aria-label={`Reset password for ${u.email}`}><RefreshCcw size={13} />Reset password</button>}{isOwner && <button type="button" disabled={busy} onClick={() => onEditEmail(u.user_id, u.email)} aria-label={`Edit email for ${u.email}`}><Edit size={13} /><span>Edit email</span></button>}{isOwner && !isCellOwner && !isMasterOwner(u.email) && !isMe && <button type="button" disabled={busy} className="account-remove" onClick={() => onRemove(u.user_id)} aria-label={`Remove ${u.email}`}><Trash2 size={13} /><span>Remove</span></button>}</div>
    </div>
    {expanded && <div id={`account-details-${u.user_id}`} className="account-expanded"><div className="account-detail-heading"><strong>{isCellOwner ? 'Owner access' : 'Section permissions'}</strong><span>Account ID: <code>{u.user_id}</code></span></div>{isCellOwner ? <p>Owner accounts have full access to all management sections. Individual permissions apply to Admin accounts.</p> : <><AdminPageSelector pages={pages} onChange={setPages} disabled={!canAssignTabs||busy}/>{canAssignTabs ? <button type="button" className="account-primary account-save-pages" disabled={busy} onClick={() => void onPageAccessChange(u.user_id,pages)}>{busy?'Saving…':'Save page access'}</button> : <p>Only the owner can change page access.</p>}</>}</div>}
  </article>;
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
  return <div className="account-google-row"><div className="account-google-main"><Avatar name={name} isOwner={a.role === 'owner'} /><div className="account-google-identity"><strong>{name}</strong><small>{a.email}</small></div><span className="account-role-label">{a.role === 'owner' ? 'Owner' : 'Admin'}</span>{a.role !== 'owner' && <button type="button" className="account-secondary" aria-expanded={expanded} aria-label={`Manage Google permissions for ${a.email}`} onClick={() => setExpanded(value => !value)}>Permissions<ChevronDown size={13} /></button>}<button type="button" className="account-google-remove" disabled={busy} onClick={() => onRemove(a.email)} aria-label={`Remove Google access for ${a.email}`}><Trash2 size={14} /></button></div>{a.role !== 'owner' && expanded && <div className="account-permissions">{ALL_PERMISSIONS.map(([key,label,Icon]) => <PermChip key={key} label={label} Icon={Icon} active={!!a.permissions?.[key]} disabled={!canAssignTabs || busy} onClick={() => onPermChange(a.email,{[key]:!a.permissions?.[key]})} />)}</div>}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, removeAdminUser, updateAdminEmail, updateAdminRole, createAdminAccount } = useData();
  const { user, getValidToken } = useAuth();
  const tokenRef = useRef(getValidToken); tokenRef.current=getValidToken;
  const { push: toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [resetEmail,setResetEmail] = useState<string|null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin'>('all');

  // Whitelist
  const [allowedAdmins, setAllowedAdmins] = useState<{ email: string; role: string; display_name?: string; permissions?: any }[]>([]);
  const [newGmail, setNewGmail] = useState('');
  const [newGmailRole, setNewGmailRole] = useState<'owner' | 'admin'>('admin');
  const [whitelistBusy, setWhitelistBusy] = useState(false);
  const [invitations,setInvitations] = useState<any[]>([]);
  const [invitationError,setInvitationError] = useState('');
  const [invitationBusy,setInvitationBusy] = useState(false);
  const reloadInvitations = useCallback(async () => {
    try { const token=await tokenRef.current?.(); if(!token)return; const result=await AdminService.manageInvitations('list',{},token);setInvitations(result.invitations||[]);setInvitationError(''); }
    catch { setInvitationError('Pending invitations could not load.'); }
  },[]);

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  const isMasterBypass = user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass' || isMasterOwner(user?.email);
  const role = currentUserAdmin?.role || user?.user_metadata?.role;
  const isOwner = role === 'owner' || currentUserAdmin?.is_primary || isMasterBypass;
  const canAssignTabs = isOwner;

  const reloadWhitelist = useCallback(async () => {
    try { setAllowedAdmins(await AdminService.getAllowedAdmins()); } catch {}
  }, []);

  useEffect(() => { refreshAdminUsers?.(); }, [refreshAdminUsers]);
  useEffect(() => { reloadWhitelist(); }, [reloadWhitelist]);
  useEffect(() => { if(isOwner) void reloadInvitations(); },[isOwner,user?.id,reloadInvitations]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (adminUsers || []).filter(u => {
      const owner = isMasterOwner(u.email) || u.role === 'owner' || u.is_primary;
      return (roleFilter === 'all' || (roleFilter === 'owner' ? owner : !owner)) && (!term || `${(u as any).display_name || ''} ${u.email} ${u.user_id}`.toLowerCase().includes(term));
    });
  }, [adminUsers, q, roleFilter]);

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
  const onResetPassword = (_uid:string,email:string) => setResetEmail(email);
  const onRoleChange = async (uid: string, nextRole: 'owner' | 'admin') => {
    if (!updateAdminRole) return;
    setBusy(true);
    try { await updateAdminRole(uid, nextRole); toast({ message: `Role → ${nextRole.toUpperCase()}`, type: 'success' }); }
    catch (e: any) { toast({ message: e?.message || 'Role change failed', type: 'error' }); }
    finally { setBusy(false); }
  };
  const onPageAccessChange = async (uid:string,pages:string[]) => {
    setBusy(true);
    try {const token=await getValidToken?.();if(!token)throw new Error('Sign in again to update access.');await AdminService.manageInvitations('permissions',{userId:uid,allowedPages:pages},token);await refreshAdminUsers?.();toast({message:'Page access saved',type:'success'});}
    catch(error:any){toast({message:error?.message||'Could not save page access',type:'error'});}
    finally{setBusy(false);}
  };
  const onWhitelistPermChange = async (email: string, perms: any) => {
    if (!canAssignTabs) return;
    setWhitelistBusy(true);
    try { await AdminService.updateAllowedAdminPermissions(email, perms as any); await reloadWhitelist(); toast({ message: 'Permission updated', type: 'success' }); }
    catch (e: any) { toast({ message: e?.message || 'Update failed', type: 'error' }); }
    finally { setWhitelistBusy(false); }
  };

    const ownerCount = (adminUsers || []).filter(account => isMasterOwner(account.email) || account.role === 'owner' || account.is_primary).length;
  return (
    <div className="admin-accounts">
      <div className="accounts-page-intro"><div><p>Manage your team’s accounts, roles and section permissions.</p><small>Owners have full access. Admins only see the sections assigned to them.</small></div><div className="accounts-page-actions">{isOwner && onManage2FA && <button type="button" className="account-secondary" onClick={onManage2FA}><Lock size={14} />Team 2FA & sessions</button>}{isOwner && <button type="button" className="account-primary" onClick={() => setShowAddModal(true)}><UserPlus size={15} />Add admin</button>}</div></div>
      <section className="accounts-list-panel" aria-labelledby="accounts-list-heading">
        <div className="accounts-list-heading"><h2 id="accounts-list-heading">Team accounts <span>{adminUsers?.length || 0}</span></h2><p>{ownerCount} {ownerCount === 1 ? 'owner' : 'owners'}<span />{(adminUsers?.length || 0) - ownerCount} admins</p></div>
        <div className="accounts-toolbar"><div className="accounts-search"><Search size={16} /><input aria-label="Search accounts" placeholder="Search by name, email or account ID" value={q} onChange={event => setQ(event.target.value)} />{q && <button type="button" aria-label="Clear account search" onClick={() => setQ('')}><X size={14} /></button>}</div><label className="accounts-role-filter"><span>Role</span><select value={roleFilter} onChange={event => setRoleFilter(event.target.value as typeof roleFilter)}><option value="all">All roles</option><option value="owner">Owners</option><option value="admin">Admins</option></select></label></div>
        <div className="accounts-column-headings" aria-hidden="true"><span>Account</span><span>Role</span><span>Access</span><span>Actions</span></div>
        <div className="accounts-list">{filtered.length ? filtered.map(u => <AdminCard key={u.user_id} u={u} currentUser={user} canAssignTabs={canAssignTabs} isOwner={isOwner} busy={busy} onRemove={onRemove} onEditEmail={onEditEmail} onResetPassword={onResetPassword} onRoleChange={onRoleChange} onPageAccessChange={onPageAccessChange} />) : <div className="accounts-empty"><Search size={23} /><h3>No accounts found</h3><p>Try a different name, email or role.</p><button type="button" className="account-secondary" onClick={() => {setQ('');setRoleFilter('all');}}>Clear filters</button></div>}</div>
        <div className="accounts-list-footer">Showing {filtered.length} of {adminUsers?.length || 0} accounts<Shield size={12} /><span>Role-based access</span></div>
      </section>

      {isOwner && <section className="accounts-pending" aria-labelledby="pending-invitations-title"><div className="accounts-list-heading"><h2 id="pending-invitations-title">Pending invitations <span>{invitations.length}</span></h2><small>No account access until the invitation is accepted</small></div>{invitationError&&<div className="accounts-invitation-error" role="alert">{invitationError}<button className="account-secondary" onClick={()=>void reloadInvitations()}>Retry</button></div>}{invitations.length?invitations.map(invite=><div className="account-invitation-row" key={invite.id}><div><strong>{invite.display_name}</strong><small>{invite.email}</small></div><span>{invite.role==='owner'?'Owner · full access':`${invite.allowed_pages.length} allowed pages`}<small>{invite.delivery_status==='failed'?'Email delivery failed':new Date(invite.expires_at).getTime()<Date.now()?'Invitation expired':'Awaiting password setup'}</small></span><div><button type="button" className="account-secondary" disabled={invitationBusy} onClick={async()=>{setInvitationBusy(true);try{const token=await getValidToken?.();if(!token)throw new Error('Sign in again');await AdminService.manageInvitations('resend',{id:invite.id},token);toast({message:'Invitation email sent',type:'success'});}catch(error:any){toast({message:error?.message||'Unable to resend',type:'error'});}finally{await reloadInvitations();setInvitationBusy(false);}}}>Resend email</button><button type="button" className="account-secondary" disabled={invitationBusy} onClick={async()=>{if(!confirm(`Cancel the invitation for ${invite.email}?`))return;setInvitationBusy(true);try{const token=await getValidToken?.();if(!token)throw new Error('Sign in again');await AdminService.manageInvitations('cancel',{id:invite.id},token);await reloadInvitations();}catch(error:any){toast({message:error?.message||'Unable to cancel',type:'error'});}finally{setInvitationBusy(false);}}}>Cancel invite</button></div></div>):!invitationError&&<p className="accounts-no-invitations">No pending invitations. Add an admin to send an invitation email.</p>}</section>}

      {isOwner && <details className="accounts-google-section"><summary><span className="accounts-google-icon"><Globe size={19} /></span><span><strong>Google sign-in access</strong><small>{allowedAdmins.length} permitted {allowedAdmins.length === 1 ? 'account' : 'accounts'} · Manage who can sign in with Google</small></span><ChevronDown size={16} /></summary><div className="accounts-google-content"><p>These email addresses can sign in to the management suite using Google.</p><form className="accounts-google-form" onSubmit={async event => {event.preventDefault(); if (whitelistBusy) return; setWhitelistBusy(true); try {await AdminService.addAllowedAdmin(newGmail,newGmailRole);await reloadWhitelist();setNewGmail('');toast({message:'Google sign-in access added',type:'success'});} catch(error: any) {toast({message:error?.message || 'Failed to add account',type:'error'});} finally {setWhitelistBusy(false);}}}><label>Email address<input type="email" required value={newGmail} onChange={event => setNewGmail(event.target.value)} placeholder="name@gmail.com" disabled={whitelistBusy} /></label><label>Role<select value={newGmailRole} onChange={event => setNewGmailRole(event.target.value as 'owner' | 'admin')} disabled={whitelistBusy}><option value="admin">Admin</option><option value="owner">Owner</option></select></label><button type="submit" className="account-primary" disabled={whitelistBusy || !newGmail.includes('@')}>{whitelistBusy ? 'Adding…' : 'Allow access'}</button></form><div className="accounts-google-list">{allowedAdmins.length ? allowedAdmins.map(a => <WhitelistCard key={a.email} a={a} canAssignTabs={canAssignTabs} busy={whitelistBusy} onRemove={async email => {if (!confirm(`Remove ${email} from Google sign-in access?`)) return;setWhitelistBusy(true);try {await AdminService.removeAllowedAdmin(email);await reloadWhitelist();toast({message:'Google sign-in access removed',type:'success'});} catch(error: any) {toast({message:error?.message || 'Failed to remove access',type:'error'});} finally {setWhitelistBusy(false);}}} onPermChange={onWhitelistPermChange} />) : <p>No Google sign-in accounts added yet.</p>}</div></div></details>}

      {resetEmail && <ResetPasswordEmailDialog email={resetEmail} onClose={()=>setResetEmail(null)} />}
      {showAddModal && <AdminInviteModal onClose={() => setShowAddModal(false)} onInvite={async(email,pages,role,name)=>{if(!createAdminAccount)throw new Error('Invitation service is unavailable');const result=await createAdminAccount(email,pages,role,name);await reloadInvitations();toast({message:result.message,type:result.delivery==='sent'?'success':'warning'});}} />}

    </div>
  );
};
