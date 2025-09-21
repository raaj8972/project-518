import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Shield, UserPlus, Trash2, Copy, CheckCircle2, Search, ToggleLeft, ToggleRight } from 'lucide-react';

export const AdminUsersPanel: React.FC = () => {
  const { adminUsers, refreshAdminUsers, addAdminUser, addAdminByEmail, removeAdminUser, createAdminAccount, listAdminPermissions, setAdminPermission } = useData();
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
          };
        }
        setPerm(map);
      } catch {}
    })();
  }, [listAdminPermissions]);

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

      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="Auth User ID (UUID) — optional"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 text-sm"
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
                <td className="px-2 py-2">{u.email}</td>
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
                            try {
                              await setAdminPermission(u.user_id, { [key]: next } as any);
                              setPerm(p => ({ ...p, [u.user_id]: { ...p[u.user_id], [key]: next } }));
                            } catch (e: any) {
                              alert(e?.message || 'Failed to update permission');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        >
                          {(perm[u.user_id]?.[key] ? <ToggleRight className="w-4 h-4 text-green-600"/> : <ToggleLeft className="w-4 h-4 text-gray-400"/>)}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 font-mono text-[11px] text-gray-700 break-all">{u.user_id}</td>
                <td className="px-2 py-2">{new Date(u.created_at).toLocaleString()}</td>
                <td className="px-2 py-2">
                  {u.role === 'owner' || u.is_primary ? (
                    <span className="text-gray-400 text-xs">Cannot remove owner</span>
                  ) : (
                    <button disabled={busy} onClick={() => onRemove(u.user_id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4"/> Remove
                    </button>
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
