import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Shield, UserPlus, Trash2, Copy, CheckCircle2, Search, ToggleLeft, ToggleRight, Lock, Edit } from 'lucide-react';

interface AdminUsersPanelProps {
  onManage2FA?: () => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onManage2FA }) => {
  const { adminUsers, refreshAdminUsers, addAdminUser, addAdminByEmail, removeAdminUser, createAdminAccount, listAdminPermissions, setAdminPermission, updateAdminEmail } = useData();
  const { user } = useAuth();
  const [userId, setUserId] = useState(''); // legacy/manual path
  const [email, setEmail] = useState(''); // preferred path
  const [password, setPassword] = useState(''); // owner-only create path
  const [busy, setBusy] = useState(false);
  // Owner presence is inferred per-row to disable removal; no separate flag needed
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
  }>>({});

  const currentUserAdmin = useMemo(() => adminUsers?.find(u => u.user_id === user?.id), [adminUsers, user]);
  const isOwner = currentUserAdmin?.role === 'owner' || currentUserAdmin?.is_primary;

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
          };
        }
        setPerm(map);
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

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      if (createAdminAccount && password) {
        await createAdminAccount(email.trim(), password);
      } else if (addAdminByEmail) {
        await addAdminByEmail(email.trim());
      } else if (addAdminUser && userId) {
        await addAdminUser(userId.trim(), email.trim());
      }
      setUserId('');
      setEmail('');
      setPassword('');
    } catch (e: any) {
      alert(e?.message || 'Failed to add admin');
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600"/> Admin Users</h3>
      <p className="text-sm text-gray-600 mb-4">
        Admin roles:
        <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">owner</span>
        can add/remove admins and cannot be removed; <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">admin</span>
        can manage site settings and content. The first admin becomes the owner automatically.
      </p>

      {isOwner && onManage2FA && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-indigo-900">Security Settings</h4>
            <p className="text-xs text-indigo-700 mt-1">Manage 2FA requirements and force logout for other admins.</p>
          </div>
          <button
            onClick={onManage2FA}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Lock className="w-4 h-4" />
            Manage 2FA for others
          </button>
        </div>
      )}

      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 text-sm text-gray-900"
          placeholder="Auth User ID (UUID) — optional"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 text-sm text-gray-900"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 text-sm text-gray-900"
          placeholder="Password (owner only create)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !email}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white rounded px-3 py-2 text-sm disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4"/> {password ? 'Create Admin Account' : 'Add Admin'}
        </button>
      </form>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
          <input className="w-full border rounded pl-8 pr-3 py-2 text-sm" placeholder="Search by email or user id" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={copyHelp} className="inline-flex items-center gap-2 border rounded px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
          {copied ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
          Help: where to find User ID (only needed if email path unavailable)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">Permissions</th>
              <th className="px-2 py-2">User ID</th>
              <th className="px-2 py-2">Added</th>
              <th className="px-2 py-2 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((u) => (
              <tr key={u.user_id} className="border-t hover:bg-gray-50">
                <td className="px-2 py-2 text-gray-900">{u.email}</td>
                <td className="px-2 py-2">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">owner</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">admin</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-xs text-gray-500">Owner has full access (not configurable)</span>
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
                      ] as Array<[keyof typeof perm[string], string]>).map(([key, label]) => (
                        <button
                          key={String(key)}
                          title={`Toggle ${label} access`}
                          onClick={async () => {
                            if (!setAdminPermission) return;
                            const next = !perm[u.user_id]?.[key];
                            console.log(`[Toggle] Clicking ${label} for ${u.email}. Next: ${next}`);
                            
                            // Optimistic update - update UI immediately
                            setPerm(p => ({ ...p, [u.user_id]: { ...p[u.user_id], [key]: next } }));
                            
                            try {
                              // Sync with database in background
                              console.log(`[Toggle] Syncing to DB...`);
                              await setAdminPermission(u.user_id, { [key]: next } as any);
                              console.log(`[Toggle] DB Sync success`);
                            } catch (e: any) {
                              console.error(`[Toggle] DB Sync failed:`, e);
                              // Rollback on error
                              setPerm(p => ({ ...p, [u.user_id]: { ...p[u.user_id], [key]: !next } }));
                              alert(e?.message || 'Failed to update permission');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-gray-50 transition-all text-gray-700"
                        >
                          {(perm[u.user_id]?.[key] ? <ToggleRight className="w-4 h-4 text-green-600"/> : <ToggleLeft className="w-4 h-4 text-gray-400"/>)}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 font-mono text-[11px] text-gray-700 break-all">{u.user_id}</td>
                <td className="px-2 py-2 text-gray-900">{new Date(u.created_at).toLocaleString()}</td>
                <td className="px-2 py-2">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-gray-400 text-xs">Cannot remove owner</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button disabled={busy} onClick={() => onEditEmail(u.user_id, u.email)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                        <Edit className="w-4 h-4"/> Edit Email
                      </button>
                      <button disabled={busy} onClick={() => onRemove(u.user_id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4"/> Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!filtered?.length && (
              <tr><td colSpan={5} className="px-2 py-6 text-center text-gray-500">No admins found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
