import React, { useState, useEffect, useMemo } from 'react';
import { 
  QrCode, 
  Search, 
  Filter, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Users,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Clock,
  Settings,
  MapPin,
  Calendar,
  Save,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { passService } from '../../services/passService';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';

export const StudentPassManagement: React.FC = () => {
  const { siteSettings, securitySettings, updateSecuritySettings } = useData();
  const { push: toast } = useToast();
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [processingState, setProcessingState] = useState({ active: false, title: '', progress: 0, item: '' });
  const [showConfig, setShowConfig] = useState(false);
  
  // Local config state
  const [venue, setVenue] = useState(securitySettings?.venue || 'Main Arena');
  const [eventDates, setEventDates] = useState<string[]>(
    securitySettings?.event_dates || ['2024-03-20', '2024-03-21', '2024-03-22']
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (securitySettings) {
      setVenue(securitySettings.venue || 'Main Arena');
      if (securitySettings.event_dates) {
        setEventDates(securitySettings.event_dates);
      }
    }
  }, [securitySettings]);

  const batchOptions = (siteSettings as any)?.registration_participant_types || [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (regardless of approval)
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .order('is_approved', { ascending: false })
        .order('full_name', { ascending: true });

      if (profileErr) throw profileErr;

      // Fetch all entry passes
      const { data: passData, error: passErr } = await supabase
        .from('entry_passes')
        .select('user_id, day_number, valid_date, venue');

      if (passErr) throw passErr;

      setProfiles(profileData || []);
      setPasses(passData || []);
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('column') && errMsg.includes('does not exist')) {
        toast({ 
          message: 'Database schema mismatch. Please ensure all migrations (v4) are applied in Supabase.', 
          type: 'error' 
        });
      } else {
        toast({ message: 'Failed to fetch data: ' + err.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIndividual = async (profile: any) => {
    try {
      setProcessingState({ 
        active: true, 
        title: `Generating for ${profile.full_name}...`, 
        progress: 0, 
        item: 'Starting...' 
      });
      
      await passService.generatePassForUser(profile.id, profile);
      
      toast({ message: `Pass generated for ${profile.full_name}`, type: 'success' });
      fetchData();
    } catch (e: any) {
      toast({ message: e.message || 'Generation failed', type: 'error' });
    } finally {
      setProcessingState({ active: false, title: '', progress: 0, item: '' });
    }
  };

  const handleRevokePass = async (profile: any, dayNumber: number) => {
    if (!confirm(`Revoke Day ${dayNumber} pass for ${profile.full_name}?`)) return;
    
    try {
      setLoading(true);
      await passService.revokePass(profile.id, dayNumber);
      toast({ message: `Day ${dayNumber} pass revoked for ${profile.full_name}`, type: 'success' });
      fetchData();
    } catch (e: any) {
      toast({ message: e.message || 'Revocation failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePasses = async () => {
    const batchLabel = selectedBatch === 'all' ? 'ALL' : selectedBatch;
    if (!confirm(`Generate 3-day entry passes for ${batchLabel} approved students?`)) return;

    try {
      setProcessingState({ active: true, title: 'Generating Passes...', progress: 0, item: '' });
      
      const result = await passService.generatePassesForAllUsers(selectedBatch, (progress) => {
        setProcessingState(prev => ({ 
          ...prev, 
          progress: progress.percentage,
          item: progress.message
        }));
      });

      toast({ message: `Successfully generated passes for ${result.count} users.`, type: 'success' });
      fetchData(); // Refresh counts
    } catch (e: any) {
      console.error(e);
      toast({ message: e.message || 'Failed to generate passes.', type: 'error' });
    } finally {
      setProcessingState({ active: false, title: '', progress: 0, item: '' });
    }
  };

  const handleRevokeBatchPasses = async () => {
    if (selectedBatch === 'all') {
      toast({ message: 'Please select a specific batch to revoke passes.', type: 'error' });
      return;
    }
    
    if (!confirm(`REVOKE ALL entry passes for ${selectedBatch} students? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      const result = await passService.revokePassesByBatch(selectedBatch);
      toast({ message: `Successfully revoked passes for ${result.count} users in ${selectedBatch}.`, type: 'success' });
      fetchData();
    } catch (e: any) {
      toast({ message: e.message || 'Failed to revoke passes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateSecuritySettings({
        venue,
        event_dates: eventDates
      });
      toast({ message: 'Pass configuration updated', type: 'success' });
      setShowConfig(false);
    } catch (err: any) {
      toast({ message: 'Failed to update config: ' + err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (index: number, val: string) => {
    const newDates = [...eventDates];
    newDates[index] = val;
    setEventDates(newDates);
  };

  const stats = useMemo(() => {
    const filteredProfiles = selectedBatch === 'all' 
      ? profiles 
      : profiles.filter(p => p.batch === selectedBatch);
    
    const total = filteredProfiles.length;
    const approved = filteredProfiles.filter(p => p.is_approved).length;
    const withPasses = filteredProfiles.filter(p => 
      passes.some(pass => pass.user_id === p.id)
    ).length;

    return { total, approved, withPasses, pending: approved - withPasses };
  }, [profiles, passes, selectedBatch]);

  const filteredList = useMemo(() => {
    return profiles.filter(p => {
      const matchesBatch = selectedBatch === 'all' || p.batch === selectedBatch;
      const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.phone?.includes(searchQuery);
      return matchesBatch && matchesSearch;
    });
  }, [profiles, selectedBatch, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Processing Overlay */}
      <AnimatePresence>
        {processingState.active && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed top-24 right-6 z-[100] w-96 max-w-[90vw]"
          >
            <div className="rico-glass-card p-6 rounded-2xl shadow-2xl border-white/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Loader2 className="animate-spin text-blue-400" size={18} />
                      {processingState.title}
                    </h3>
                    <span className="text-blue-400 font-black bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">{Math.round(processingState.progress)}%</span>
                  </div>
                  {processingState.item && <p className="text-gray-500 mb-4 text-[10px] font-bold truncate italic uppercase tracking-tighter">{processingState.item}</p>}
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${processingState.progress}%` }} />
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-4">
            <div className="p-3 bg-blue-500/15 rounded-2xl border border-blue-500/20 shadow-lg">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            Student Pass Management
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-2 ml-1">
            Centralized hub for generating and managing entry credentials
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-3 rounded-xl border transition-all ${showConfig ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            title="Pass Configuration"
          >
            <Settings className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleGeneratePasses}
            disabled={loading || processingState.active || stats.pending === 0}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
          >
            <QrCode size={18} />
            Generate {selectedBatch === 'all' ? 'All' : selectedBatch} Passes
          </button>
          
          {selectedBatch !== 'all' && stats.withPasses > 0 && (
            <button 
              onClick={handleRevokeBatchPasses}
              disabled={loading || processingState.active}
              className="flex items-center gap-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              title="Revoke All Passes for this Batch"
            >
              <Trash2 size={18} />
              Revoke {selectedBatch}
            </button>
          )}
        </div>
      </div>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rico-glass-card p-8 rounded-[2.5rem] border border-blue-500/10 mb-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
                      <Settings className="text-blue-400" size={20} />
                      Pass System Configuration
                    </h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Set global validity dates and venue for generated credentials</p>
                  </div>
                  <button 
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Save Protocol
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Venue */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <MapPin size={12} className="text-blue-500" />
                      Event Venue Name
                    </label>
                    <input 
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. SRM IST Main Ground"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-700"
                    />
                  </div>

                  {/* Dates */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Calendar size={12} className="text-blue-500" />
                      Validity Dates (3-Day Sequence)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-2">
                           <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter ml-1">Day {idx + 1}</span>
                           <input 
                            type="date"
                            value={eventDates[idx] || ''}
                            onChange={(e) => handleDateChange(idx, e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[11px] text-white focus:outline-none focus:border-blue-500/50 transition-all font-black"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rico-glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">{stats.total}</span>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Signed Up Students</p>
          </div>
        </div>

        <div className="rico-glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">{stats.approved}</span>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Approved Profiles</p>
          </div>
        </div>

        <div className="rico-glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">{stats.withPasses}</span>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Passes Generated</p>
          </div>
        </div>

        <div className="rico-glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter">{stats.pending}</span>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Awaiting Credentials</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by student name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-all"
            >
              <option value="all">All Batches</option>
              {batchOptions.map((opt: string) => (
                <option key={opt} value={opt} className="bg-gray-900">{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="rico-glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Student Identity</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Approval</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Valid Date / Venue</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Pass Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Synchronizing Encrypted Data...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-gray-700" />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest">No matching students detected</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((profile) => {
                  const hasPass = passes.some(p => p.user_id === profile.id);
                  return (
                    <tr key={profile.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center font-black text-blue-400 shadow-inner border border-blue-500/10">
                            {profile.full_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="text-white font-black tracking-tight">{profile.full_name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{profile.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs text-white/70 font-bold">{profile.batch}</span>
                      </td>
                      <td className="px-8 py-6">
                        {profile.is_approved ? (
                          <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-wider">
                            <CheckCircle2 size={14} />
                            Approved
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500 font-black text-[10px] uppercase tracking-wider">
                            <Clock size={14} />
                            Pending
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {hasPass ? (
                          <div className="space-y-1">
                            {passes.filter(p => p.user_id === profile.id).map((p, i) => (
                              <div key={i} className="flex items-center justify-between group/pass p-1.5 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-white font-bold">Day {p.day_number}: {p.valid_date || 'N/A'}</span>
                                  <span className="text-[9px] text-gray-500 uppercase tracking-tighter">{p.venue || 'Main Arena'}</span>
                                </div>
                                <button 
                                  onClick={() => handleRevokePass(profile, p.day_number)}
                                  className="opacity-0 group-hover/pass:opacity-100 p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                  title="Revoke This Pass"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">No Data</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {hasPass ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                            <CheckCircle2 size={14} />
                            Active Credentials
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-wider">
                            <AlertTriangle size={14} />
                            Pass Pending
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!hasPass && (
                            <button 
                              onClick={() => handleGenerateIndividual(profile)}
                              className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Generate
                            </button>
                          )}
                          <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:text-blue-400 text-gray-500 group-hover:translate-x-1">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
