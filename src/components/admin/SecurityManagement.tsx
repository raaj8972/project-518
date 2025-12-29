import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, Plus, UserPlus, Eye, Calendar, Trash, RefreshCw } from 'lucide-react';
import { QRCodeGenerator } from './QRCodeGenerator';
import { useData } from '../../context/DataContext';

interface SecurityUser {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface PassRegistration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  pass_id: string | null;
  rejection_reason: string | null;
}

interface VipPass {
  id: string;
  pass_id: string;
  participant_name: string | null;
  pass_type: string;
  created_at: string;
  notes: string | null;
  pass_token: string;
  is_used: boolean;
  is_active: boolean;
}

export const SecurityManagement: React.FC = () => {
  const { securitySettings, updateSecuritySettings } = useData();
  const [activeTab, setActiveTab] = useState<'users' | 'passes' | 'vip' | 'settings'>('users');
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [passRegistrations, setPassRegistrations] = useState<PassRegistration[]>([]);
  const [vipPasses, setVipPasses] = useState<VipPass[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateVIP, setShowCreateVIP] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [passUsage, setPassUsage] = useState<Record<string, number[]>>({}); // PassID -> [Day1, Day2]

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
  });

  const [newVIP, setNewVIP] = useState({
    name: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const fetchPassUsage = async () => {
    if (vipPasses.length === 0) return;
    const ids = vipPasses.map(p => p.id);
    const { data } = await supabase.from('pass_scans')
       .select('pass_id, scanned_at')
       .in('pass_id', ids)
       .eq('scan_result', 'valid');
    
    if (data) {
       const usage: Record<string, number[]> = {};
       data.forEach(scan => {
          const date = scan.scanned_at.split('T')[0];
          const dayIdx = (securitySettings?.event_dates || []).indexOf(date);
          if (dayIdx !== -1) {
             if (!usage[scan.pass_id]) usage[scan.pass_id] = [];
             if (!usage[scan.pass_id].includes(dayIdx + 1)) {
                usage[scan.pass_id].push(dayIdx + 1);
             }
          }
       });
       setPassUsage(usage);
    }
  };

  useEffect(() => {
    if (activeTab === 'vip') {
      fetchPassUsage();
    }
  }, [vipPasses, activeTab, securitySettings]);

  const handleResetPass = async (passId: string) => {
    if (!window.confirm('Reset this pass? This will clear all entry history and allow it to be used again as new.')) return;
    try {
      const { error } = await supabase.rpc('reset_pass_usage', { p_pass_id: passId });
      if (error) throw error;
      toast.success('Pass usage reset');
      loadData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset pass');
    }
  };

  const handleResetDay = async (passId: string, dateStr: string, dayNum: number) => {
    if (!window.confirm(`Remove entry record for Day ${dayNum} (${dateStr})?`)) return;
    try {
      const { error } = await supabase.rpc('delete_pass_scan_for_date', { 
        p_pass_id: passId, 
        p_date: dateStr 
      });
      if (error) throw error;
      toast.success(`Day ${dayNum} entry removed`);
      fetchPassUsage(); // Reload just usage
    } catch (err) {
      console.error(err);
      toast.error('Failed to update scan');
    }
  };

  const updateEntryPassButtonSetting = async (enabled: boolean) => {
    try {
      setLoading(true);
      await updateSecuritySettings({ entry_pass_button_enabled: enabled });
      toast.success(`Entry pass button ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };
  const loadData = async () => {
    if (activeTab === 'users') {
      const { data: users } = await supabase.from('security_users').select('*').order('created_at', { ascending: false });
      if (users) setSecurityUsers(users);
    } else if (activeTab === 'passes') {
      const { data: passes } = await supabase.from('pass_registrations').select('*').order('created_at', { ascending: false });
      if (passes) setPassRegistrations(passes);
    } else if (activeTab === 'vip') {
      const { data: vip } = await supabase
        .from('entry_passes')
        .select('*')
        .eq('pass_type', 'vip')
        .order('created_at', { ascending: false });
      if (vip) setVipPasses(vip);
    } 
    // Settings are loaded by global context
  };

  const handleCreateSecurityUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc('create_security_user', {
        p_username: newUser.username,
        p_password: newUser.password,
        p_full_name: newUser.full_name,
      });

      if (error) throw error;

      toast.success('Security user created successfully');
      setNewUser({ username: '', password: '', full_name: '' });
      setShowCreateUser(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePass = async (passRegId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.rpc('approve_pass_registration', {
        p_pass_reg_id: passRegId,
      });

      if (error) throw error;

      toast.success('Pass approved and generated');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve pass');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPass = async (passRegId: string) => {
    const reason = prompt('Rejection reason (optional):');
    
    try {
      const { error } = await supabase
        .from('pass_registrations')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', passRegId);

      if (error) throw error;

      toast.success('Pass registration rejected');
      loadData();
    } catch (error: any) {
      toast.error('Failed to reject pass');
    }
  };

  const handleCreateVIP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc('create_vip_pass', {
        p_name: newVIP.name || null,
        p_notes: newVIP.notes || null,
      });

      if (error) throw error;

      toast.success('VIP pass created successfully');
      setNewVIP({ name: '', notes: '' });
      setShowCreateVIP(false);
      loadData(); // Refresh the VIP passes list
    } catch (error: any) {
      toast.error(error.message || 'Failed to create VIP pass');
    } finally {
      setLoading(false);
    }
  };

  const viewPassQR = async (passRegId: string) => {
    const { data } = await supabase
      .from('entry_passes')
      .select('*')
      .eq('pass_registration_id', passRegId)
      .single();

    if (data) {
      setSelectedPass(data);
    } else {
      toast.error('Pass not generated yet');
    }
  };

  return (
    <div className="space-y-6 bg-gray-900 text-white p-6 rounded-xl shadow-2xl border border-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-500" />
          Security Management
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'users'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Security Users
        </button>
        <button
          onClick={() => setActiveTab('passes')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'passes'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pass Registrations
        </button>
        <button
          onClick={() => setActiveTab('vip')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'vip'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          VIP Passes
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          >
          Settings
          </button>
      </div>

      {/* Security Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Security User
          </button>

          {showCreateUser && (
            <form onSubmit={handleCreateSecurityUser} className="bg-gray-800/50 p-6 rounded-lg space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {securityUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No security users created yet</p>
          ) : (
            <div className="space-y-2">
              {securityUsers.map((user) => (
              <div key={user.id} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700/50">
                <div>
                  <p className="text-white font-semibold text-lg">{user.full_name}</p>
                  <p className="text-cyan-400 text-sm">@{user.username}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  user.is_active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pass Registrations Tab */}
      {activeTab === 'passes' && (
        <div className="space-y-4">
          {passRegistrations.filter(p => p.status === 'pending').length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold">
                {passRegistrations.filter(p => p.status === 'pending').length} pending approvals
              </p>
            </div>
          )}

          {passRegistrations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No pass registrations yet</p>
          ) : (
            <div className="space-y-2">
              {passRegistrations.map((reg) => (
              <div key={reg.id} className="bg-gray-800/30 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">{reg.full_name}</p>
                    <p className="text-gray-400 text-sm">{reg.email} • {reg.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(reg.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    reg.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : reg.status === 'rejected'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {reg.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  {reg.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprovePass(reg.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectPass(reg.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {reg.status === 'approved' && (
                    <button
                      onClick={() => viewPassQR(reg.id)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View QR
                  </button>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIP Passes Tab */}
      {activeTab === 'vip' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateVIP(!showCreateVIP)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create VIP Pass
          </button>

          {showCreateVIP && (
            <form onSubmit={handleCreateVIP} className="bg-gray-800/50 p-6 rounded-lg space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">VIP Name (Optional)</label>
                <input
                  type="text"
                  value={newVIP.name}
                  onChange={(e) => setNewVIP({ ...newVIP, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Leave blank for unnamed VIP pass"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={newVIP.notes}
                  onChange={(e) => setNewVIP({ ...newVIP, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={3}
                  placeholder="Internal notes about this VIP pass"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create VIP Pass'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateVIP(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {vipPasses.length === 0 ? (
              <p className="text-gray-400 text-sm">No VIP passes created yet</p>
            ) : (
              vipPasses.map((pass) => (
                <div key={pass.id} className="bg-gray-800/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-bold text-lg">
                          {pass.participant_name || <span className="text-gray-500 italic">Unnamed VIP</span>}
                        </p>
                      {pass.notes && (
                        <p className="text-gray-400 text-sm">{pass.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(pass.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Token: {pass.pass_token}
                      </p>
                      
                      {/* Day Usage Badges */}
                      {(securitySettings?.event_dates || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(securitySettings?.event_dates || []).map((date, idx) => {
                              const dayNum = idx + 1;
                              const isUsed = passUsage[pass.id]?.includes(dayNum);
                              return (
                                <button key={idx} 
                                   disabled={!isUsed}
                                   onClick={() => isUsed && date && handleResetDay(pass.id, date, dayNum)}
                                   className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 transition-colors ${
                                    isUsed 
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 cursor-pointer' 
                                    : 'bg-gray-700 text-gray-500 border-gray-600 cursor-default'
                                }`}
                                title={isUsed ? "Click to remove this day's entry" : "Not visited"}
                                >
                                  Day {dayNum} {isUsed ? '✓' : ''}
                                </button>
                              );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        pass.is_used
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {pass.is_used ? 'USED' : 'VALID'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setSelectedPass(pass)}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View QR
                    </button>
                    <button
                      onClick={() => handleResetPass(pass.id)}
                      className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm"
                      title="Clear scan history"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-500" />
              Entry Pass Registration Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">Show Registration Button on Homepage</h4>
                  <p className="text-gray-400 text-sm">
                    Control whether the "Register for Entry Pass" button appears on the homepage hero section
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={securitySettings?.entry_pass_button_enabled ?? true}
                    onChange={(e) => updateEntryPassButtonSetting(e.target.checked)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Tip:</strong> Disable this toggle when you want to temporarily stop accepting new entry pass registrations, such as when the event is at capacity or registration has closed.
                </p>
              </div>

              {/* Event Dates Configuration */}
              <div className="pt-6 border-t border-gray-700 mt-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Event Schedule (Multi-day Access)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Define the dates of the event. Passes will be valid for <strong>one entry per day</strong> on each of these dates.
                </p>
                <div className="space-y-3">
                  {(securitySettings?.event_dates || []).map((date, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-gray-400 w-16 text-sm font-medium">Day {idx + 1}:</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const newDates = [...(securitySettings?.event_dates || [])];
                          newDates[idx] = e.target.value;
                          updateSecuritySettings({ event_dates: newDates });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => {
                          const newDates = (securitySettings?.event_dates || []).filter((_, i) => i !== idx);
                          updateSecuritySettings({ event_dates: newDates });
                        }}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Remove Day"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      // Default next day to today or last day + 1
                      const today = new Date().toISOString().split('T')[0];
                      const newDates = [...(securitySettings?.event_dates || []), today];
                      updateSecuritySettings({ event_dates: newDates });
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-2 mt-2 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event Day
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* QR Modal */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Entry Pass QR Code</h3>
            <QRCodeGenerator
              passToken={selectedPass.pass_token}
              participantName={selectedPass.participant_name}
              passType={selectedPass.pass_type}
              size={256}
            />
            <button
              onClick={() => setSelectedPass(null)}
              className="w-full mt-6 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
