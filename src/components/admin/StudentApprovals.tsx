import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  UserCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  ChevronRight,
  Phone,
  GraduationCap,
  Pencil,
  Check,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';

const EditableBatch = ({ 
  profile, 
  options, 
  onSave 
}: { 
  profile: any; 
  options: string[]; 
  onSave: (email: string, newBatch: string) => Promise<void> 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(profile.batch || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tempValue.trim() === (profile.batch || '').trim()) {
      setIsEditing(false);
      return;
    }
    if (!profile.email) {
      toast.error('Email not found for profile');
      return;
    }
    setSaving(true);
    try {
      await onSave(profile.email, tempValue);
      profile.batch = tempValue; // Optimistic local update
      setIsEditing(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <select
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
        >
          {options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
        </select>
        <button onClick={handleSave} disabled={saving} className="text-emerald-400 hover:text-emerald-300 p-0.5" title="Save">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button onClick={() => { setIsEditing(false); setTempValue(profile.batch || ''); }} className="text-rose-400 hover:text-rose-300 p-0.5" title="Cancel">
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group/batch cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
      <span className="text-[10px] font-bold text-indigo-300 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{profile.batch || 'No Batch'}</span>
      <button className="opacity-0 group-hover/batch:opacity-100 text-gray-500 hover:text-indigo-400 transition-opacity p-0.5 bg-white/5 rounded">
        <Pencil size={10} />
      </button>
    </div>
  );
};

export const StudentApprovals: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('pending'); // Added filter state
  const [selectedBatch, setSelectedBatch] = useState('all'); // Added selectedBatch state
  const { siteSettings } = useData();
  const { updateBatchGlobally } = useRegistrationMutations();
  
  const batchOptions = useMemo(() => {
    const fromSettings = (siteSettings as any)?.registration_participant_types || [];
    const fromProfiles = Array.from(new Set(profiles.map(p => p.batch).filter(Boolean)));
    // Type assertion to string to avoid 'any' error in map later
    return Array.from(new Set([...fromSettings, ...fromProfiles])).sort() as string[];
  }, [siteSettings, profiles]);

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }
      // Note: 'rejected' status might need a separate column if we want strict rejection tracking, 
      // but for now is_approved false covers both pending and rejected (status quo).

      const { data, error } = await query;
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      toast.error('Failed to fetch profiles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(currentStatus ? 'Approval revoked' : 'Profile approved');
      fetchProfiles();
    } catch (err: any) {
      toast.error('Operation failed: ' + err.message);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.phone?.includes(searchQuery);
    const matchesBatch = selectedBatch === 'all' || p.batch === selectedBatch;
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-indigo-400" />
            Student Verifications
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-1">Manage portal access for registered students</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/5 rounded-xl p-1 flex border border-white/5">
            {['pending', 'approved', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/30 transition-all placeholder:text-gray-600"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-64">
          <div className="relative w-full">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/30 transition-all"
            >
              <option value="all">All Batches</option>
              {batchOptions.map(opt => (
                <option key={opt} value={opt} className="bg-gray-900">{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Profile List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-50">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Scanning Profiles...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-20 text-center superia-glass-card rounded-[2rem] border-white/5">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-gray-700" />
              </div>
              <p className="text-gray-500 font-black text-xs uppercase tracking-widest">No profiles matched your filter</p>
            </div>
          ) : (
            filteredProfiles.map((profile, idx) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="superia-glass-card p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative"
              >
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${profile.is_approved ? 'bg-emerald-500' : 'bg-amber-500'} opacity-30 group-hover:opacity-100 transition-opacity`} />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl transition-transform group-hover:scale-110 ${profile.is_approved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {profile.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                        {profile.full_name}
                        {profile.is_approved && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold"><Phone size={12} className="text-indigo-400/50" /> {profile.phone}</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold"><GraduationCap size={12} className="text-indigo-400/50" /> {profile.college}</span>
                          <EditableBatch profile={profile} options={batchOptions} onSave={updateBatchGlobally} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right mr-4 hidden sm:block">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Joined</p>
                      <p className="text-xs text-white/50">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <button
                      onClick={() => handleToggleApproval(profile.id, profile.is_approved)}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                        profile.is_approved 
                          ? 'bg-white/5 text-rose-400 border border-rose-500/10 hover:bg-rose-500/10' 
                          : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {profile.is_approved ? (
                        <>Revoke Access</>
                      ) : (
                        <>Approve Access <ChevronRight size={12} /></>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
