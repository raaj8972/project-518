import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle2, XCircle, Search, LogOut, Loader2, 
  UserCheck, AlertCircle, Phone, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';

export const CRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ batch: string; password?: string } | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Authenticate session
  useEffect(() => {
    const stored = sessionStorage.getItem('cr_session');
    if (!stored) {
      navigate('/cr/login');
      return;
    }
    try {
      const data = JSON.parse(stored);
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        sessionStorage.removeItem('cr_session');
        toast.error('Session expired. Please login again.');
        navigate('/cr/login');
        return;
      }
      setSession(data);
    } catch {
      navigate('/cr/login');
    }
  }, [navigate]);

  // Fetch profiles matching CR's batch
  const fetchProfiles = useCallback(async () => {
    if (!session?.batch) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, phone, college, batch, is_approved, avatar_url, created_at')
        .eq('batch', session.batch)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Error fetching student profiles: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.batch) {
      fetchProfiles();
    }
  }, [session, fetchProfiles]);

  // Handle single profile approval / revoke
  const handleToggleApproval = async (profileId: string, currentStatus: boolean) => {
    setApprovingId(profileId);
    try {
      const { error } = await supabase.rpc('approve_student_profile', {
        p_student_id: profileId,
        p_batch: session?.batch || '',
        p_password: session?.password || '',
        p_is_approved: !currentStatus
      });

      if (error) throw error;

      toast.success(currentStatus ? 'Approval revoked' : 'Profile approved successfully! 🎉');
      setProfiles(prev => 
        prev.map(p => p.id === profileId ? { ...p, is_approved: !currentStatus } : p)
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update approval status: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async (filteredPendingIds: string[]) => {
    if (filteredPendingIds.length === 0) return;
    const confirmBulk = window.confirm(`Are you sure you want to approve all ${filteredPendingIds.length} pending profiles?`);
    if (!confirmBulk) return;

    setBulkApproving(true);
    try {
      const promises = filteredPendingIds.map(id => 
        supabase.rpc('approve_student_profile', {
          p_student_id: id,
          p_batch: session?.batch || '',
          p_password: session?.password || '',
          p_is_approved: true
        })
      );
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;

      toast.success(`Successfully approved all ${filteredPendingIds.length} profiles! 🚀`);
      setProfiles(prev => 
        prev.map(p => filteredPendingIds.includes(p.id) ? { ...p, is_approved: true } : p)
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk approval failed: ' + err.message);
    } finally {
      setBulkApproving(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('cr_session');
    toast.success('Signed out successfully.');
    navigate('/cr/login');
  };

  // Filter profiles based on active tab and search query
  const filteredProfiles = useMemo(() => {
    const isApprovedTarget = activeTab === 'approved';
    let list = profiles.filter(p => !!p.is_approved === isApprovedTarget);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(query)) ||
        (p.username && p.username.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query))
      );
    }
    return list;
  }, [profiles, activeTab, searchQuery]);

  const pendingCount = useMemo(() => profiles.filter(p => !p.is_approved).length, [profiles]);
  const approvedCount = useMemo(() => profiles.filter(p => p.is_approved).length, [profiles]);

  return (
    <div className="min-h-screen bg-black text-white relative font-rajdhani flex flex-col">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/10 via-black to-purple-950/10 -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0b0c10]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight uppercase leading-none">{session?.batch || 'Batch'} CR PORTAL</h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Verification Dashboard</p>
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/10 hover:bg-white/5 text-xs text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Statistics and Actions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0b0c10] border border-white/[0.08] p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Students</span>
            <span className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</span>
          </div>
          <div className="bg-[#0b0c10] border border-white/[0.08] p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Approved Students</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</span>
          </div>
        </div>

        {/* Tab Controls and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-[#0b0c10] border border-white/[0.08] p-2 rounded-2xl">
          {/* Tab pils */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={fetchProfiles} 
              disabled={loading}
              className="p-2 border border-white/10 hover:bg-white/5 rounded-xl transition-all cursor-pointer text-gray-400 hover:text-white"
              title="Refresh profiles"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {activeTab === 'pending' && filteredProfiles.length > 0 && (
              <button
                onClick={() => handleBulkApprove(filteredProfiles.map(p => p.id))}
                disabled={bulkApproving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {bulkApproving ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={14} />}
                Approve All Displayed ({filteredProfiles.length})
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab} students by name or phone...`}
            className="block w-full pl-10 pr-4 py-3 bg-[#0b0c10] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 text-sm"
          />
        </div>

        {/* Profiles List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-gray-500 text-xs tracking-widest uppercase font-bold">Loading profiles...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-16 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-gray-600" />
            <p className="text-gray-400 font-bold">No students found matching filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((p, idx) => (
              <div 
                key={p.id}
                className="bg-[#0b0c10] border border-white/[0.08] hover:border-white/[0.12] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Serial */}
                  <span className="text-[10px] text-gray-600 font-bold w-4 shrink-0">#{idx + 1}</span>
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-black flex-shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      p.full_name?.charAt(0) || 'S'
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-white text-sm truncate flex items-center gap-1.5">
                      {p.full_name}
                      {p.is_approved && (
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      )}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold truncate mt-0.5">@{p.username || 'username'}</p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-gray-400 font-medium mt-1">
                      <span className="flex items-center gap-1">📞 {p.phone || 'No phone'}</span>
                      <span className="text-gray-600">•</span>
                      <span>🏫 {p.college || 'No institution'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                  {p.is_approved ? (
                    <button
                      onClick={() => handleToggleApproval(p.id, p.is_approved)}
                      disabled={approvingId === p.id}
                      className="w-full sm:w-auto px-4 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Revoke Approval
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleApproval(p.id, p.is_approved)}
                      disabled={approvingId === p.id}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15 disabled:opacity-50"
                    >
                      {approvingId === p.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Approve Profile ✓'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/[0.08] text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-12 bg-[#0b0c10]/40">
        {BRAND_NAME} {BRAND_YEAR} • CR PORTAL
      </footer>
    </div>
  );
};
