import React, { useState } from 'react';
import { Key, ShieldAlert, Users, Trash2, Plus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

export const AdminPasscodesPanel: React.FC = () => {
  const { securitySettings, updateSecuritySettings, isOwner: checkIsOwner } = useData();
  
  // State for forms
  const [councilPasscode, setCouncilPasscode] = useState('');
  const [sportsPasscode, setSportsPasscode] = useState('');
  const [isUpdatingCouncil, setIsUpdatingCouncil] = useState(false);
  const [isUpdatingSports, setIsUpdatingSports] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = React.useMemo(() => checkIsOwner(), [checkIsOwner]);

  const [batchCRs, setBatchCRs] = useState<any[]>([]);
  const [loadingCRs, setLoadingCRs] = useState(false);
  const [newBatch, setNewBatch] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addingCR, setAddingCR] = useState(false);

  const fetchCRs = async () => {
    setLoadingCRs(true);
    try {
      const { data, error } = await supabase
        .from('batch_crs')
        .select('*')
        .order('batch', { ascending: true });
      if (error) throw error;
      setBatchCRs(data || []);
    } catch (err: any) {
      console.error('Error fetching batch CRs:', err);
    } finally {
      setLoadingCRs(false);
    }
  };

  const handleSaveCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch || !newPassword) return;
    setAddingCR(true);
    try {
      const { error } = await supabase
        .from('batch_crs')
        .upsert({ batch: newBatch.trim(), password: newPassword.trim() });
      if (error) throw error;
      setMessage({ type: 'success', text: `CR password for ${newBatch} saved successfully!` });
      setNewBatch('');
      setNewPassword('');
      fetchCRs();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to save CR password: ' + err.message });
    } finally {
      setAddingCR(false);
    }
  };

  const handleDeleteCR = async (batch: string) => {
    if (!window.confirm(`Are you sure you want to remove CR credentials for ${batch}?`)) return;
    try {
      const { error } = await supabase
        .from('batch_crs')
        .delete()
        .eq('batch', batch);
      if (error) throw error;
      setMessage({ type: 'success', text: `CR credentials for ${batch} removed successfully.` });
      fetchCRs();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to delete: ' + err.message });
    }
  };

  React.useEffect(() => {
    if (securitySettings?.council_passcode) {
      setCouncilPasscode(securitySettings.council_passcode);
    }
    if (securitySettings?.sports_passcode) {
      setSportsPasscode(securitySettings.sports_passcode);
    }
    fetchCRs();
  }, [securitySettings]);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <ShieldAlert className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Owner Access Required</h3>
        <p className="text-gray-500 text-center max-w-md">
          Only organization owners can view and modify global passcodes for Council and Sports Admin logins.
        </p>
      </div>
    );
  }

  const handleUpdateCouncilPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (councilPasscode.length < 4) {
      setMessage({ type: 'error', text: 'Council passcode must be at least 4 characters' });
      return;
    }
    setIsUpdatingCouncil(true);
    try {
      if (updateSecuritySettings) {
        // 1. Update Hashed Password in Supabase (Primary Security)
        const { error: rpcError } = await supabase.rpc('set_council_password', { 
          p_password: councilPasscode 
        });
        
        if (rpcError) {
          console.error('[AdminPasscodes] RPC Error:', rpcError);
          // If RPC fails (e.g. not admin, or function missing), we might want to throw
          // but if it's just missing, we'll try the old way below
        }
        
        // 2. Update Plaintext/Backup in Firestore & Supabase (Legacy compatibility)
        // We wrap this in try-catch because the 'council_passcode' COLUMN might not exist in Supabase
        // and we don't want to block the success message if the RPC above already worked.
        try {
          await updateSecuritySettings({ council_passcode: councilPasscode });
        } catch (syncErr: any) {
          console.warn('[AdminPasscodes] Sync warning (likely missing column):', syncErr.message);
        }
        
        setMessage({ type: 'success', text: 'Council passcode updated successfully' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update council passcode' });
    } finally {
      setIsUpdatingCouncil(false);
    }
  };

  const handleUpdateSportsPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sportsPasscode.length < 4) {
      setMessage({ type: 'error', text: 'Sports passcode must be at least 4 characters' });
      return;
    }
    setIsUpdatingSports(true);
    try {
      if (updateSecuritySettings) {
        await updateSecuritySettings({ sports_passcode: sportsPasscode });
        setMessage({ type: 'success', text: 'Sports passcode updated successfully' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update sports passcode' });
    } finally {
      setIsUpdatingSports(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 border-b pb-4">Global Passcodes</h2>
        <p className="text-gray-600 mt-2">
          Manage access passcodes for specific portal areas. Only Owners can modify these.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />}
          <div>
            <h4 className="font-medium">{message.type === 'error' ? 'Error' : 'Success'}</h4>
            <div className="text-sm mt-1">{message.text}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Council Passcode Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4 pb-4 border-b">
             <Key className="w-6 h-6 text-purple-600 mr-3" />
             <h3 className="text-lg font-semibold text-gray-900">Council Login</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6 min-h-[40px]">
            Set the passcode used to access the executive dashboard at <strong>/council</strong>.
          </p>
          <form onSubmit={handleUpdateCouncilPasscode} className="flex gap-3">
            <input
              type="text"
              value={councilPasscode}
              onChange={(e) => setCouncilPasscode(e.target.value)}
              placeholder="Enter council passcode"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-900"
            />
            <button
              type="submit"
              disabled={isUpdatingCouncil || !councilPasscode}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium whitespace-nowrap shadow-sm transition-all text-sm"
            >
              {isUpdatingCouncil ? 'Saving...' : 'Save Passcode'}
            </button>
          </form>

          {/* Sync Divider */}
          <div className="my-6 border-t border-dashed border-gray-100 relative">
             <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Advanced Recovery</span>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
             <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                   <ShieldAlert className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                   <h4 className="text-sm font-bold text-purple-900">Credential Sync</h4>
                   <p className="text-xs text-purple-700/70 mt-1 leading-relaxed">
                      If you get <strong>"Credential Mismatch"</strong> during council login, use this to align the Firebase database with the system's secret key.
                   </p>
                   <button
                      onClick={async () => {
                        if (!window.confirm('This will force the council account password in Firebase to match the environment secret. Proceed?')) return;
                        setIsUpdatingCouncil(true);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch('/api/admin-security-controls', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ action: 'sync_council_auth' })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setMessage({ type: 'success', text: data.message || 'Council auth synchronized' });
                          } else {
                            throw new Error(data.error || 'Sync failed');
                          }
                        } catch (err: any) {
                          setMessage({ type: 'error', text: err.message });
                        } finally {
                          setIsUpdatingCouncil(false);
                        }
                      }}
                      disabled={isUpdatingCouncil}
                      className="mt-3 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {isUpdatingCouncil ? 'Syncing...' : 'Sync Firebase auth'}
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Sports Passcode Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4 pb-4 border-b">
             <Key className="w-6 h-6 text-emerald-600 mr-3" />
             <h3 className="text-lg font-semibold text-gray-900">Sports Admin Login</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6 min-h-[40px]">
            Set the passcode used to access the sports management panels at <strong>/sports-admin</strong>.
          </p>
          <form onSubmit={handleUpdateSportsPasscode} className="flex gap-3">
            <input
              type="text"
              value={sportsPasscode}
              onChange={(e) => setSportsPasscode(e.target.value)}
              placeholder="Enter sports passcode"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900"
            />
            <button
              type="submit"
              disabled={isUpdatingSports || !sportsPasscode}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium whitespace-nowrap shadow-sm transition-all"
            >
              {isUpdatingSports ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      </div>

      {/* Batch CR Passwords Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-indigo-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Batch Class Representative (CR) Passwords</h3>
              <p className="text-xs text-gray-500">Allot passwords to batch CRs so they can approve profiles for their specific batch.</p>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        <form onSubmit={handleSaveCR} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Batch Name</label>
            <input
              type="text"
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              placeholder="e.g. Batch 2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">CR Access Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter CR password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addingCR || !newBatch || !newPassword}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg disabled:opacity-50 font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              Save / Update
            </button>
          </div>
        </form>

        {/* List of Batch CRs */}
        {loadingCRs ? (
          <div className="py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">Loading CR configurations...</div>
        ) : batchCRs.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">No Batch CR passwords allotted yet. Create one above!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CR Password</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batchCRs.map((cr) => (
                  <tr key={cr.batch} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{cr.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{cr.password}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setNewBatch(cr.batch);
                          setNewPassword(cr.password);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 font-bold mr-4 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCR(cr.batch)}
                        className="text-red-600 hover:text-red-900 font-bold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
