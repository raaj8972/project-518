import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Users, Mail, Phone, BookOpen, ChevronRight, Check, Loader2, AlertCircle, Building2, Sparkles, PartyPopper, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { dualRead } from '../lib/dualDb';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import 'canvas-confetti'; 

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  previewOverrides?: any;
}

// ─── Styling tokens ─────────────────────────────
const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-[15px] text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 focus:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-300';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2 ml-1';
const iconCls = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors duration-300';

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, eventId, eventTitle, previewOverrides }) => {
  const { events, siteSettings, addRegistration } = useData() as any;
  const { user, profile, isAuthenticated, isProfileComplete, isApproved } = useStudentAuth();
  
  const [mode, setMode, clearMode] = useLocalStorage<'individual' | 'team'>(`registration_draft_mode_${eventId}`, 'individual');
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string>('');

  const [formData, setFormData, clearFormData] = useLocalStorage(`registration_draft_event_${eventId}`, {
    name: '',
    email: '',
    phone: '',
    institution: '',
    participant_type: '',
    team_name: '',
    team_members: [] as { id: string; name: string; username: string; batch?: string; avatar_url?: string; status: string }[]
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  // My Groups for 1-click registration
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [oneClickLoading, setOneClickLoading] = useState(false);

  const event = previewOverrides?.events?.find((e: any) => e.id === eventId) || events.find((e: any) => e.id === eventId);
  const settings = previewOverrides?.siteSettings || siteSettings;

  const isTeamAllowed = event?.registration_default_mode === 'team' || !event?.registration_mode_locked;
  const minTeamSize = event?.team_min_members || 2;
  const maxTeamSize = event?.team_max_members || 5;
  const rawParticipantTypes = event?.registration_participant_types?.length > 0 
    ? event.registration_participant_types 
    : settings?.registration_participant_types || ['Student', 'Faculty', 'Guest'];
  const participantTypes = rawParticipantTypes.filter((t: string) => t && !t.toLowerCase().includes('select') && !t.trim().startsWith('.'));
  
  const showInstitution = settings?.registration_institution_visible !== false;
  const isInstitutionOptional = settings?.registration_institution_optional === true;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep('form');
      setLoading(false);
      setError(null);
      if (event?.registration_default_mode) {
           setMode(event.registration_default_mode === 'team' ? 'team' : 'individual');
      }
      // Fetch student's groups for 1-click registration
      if (user && isAuthenticated) fetchMyGroups();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, user, isAuthenticated]); 

  useEffect(() => {
    if (isOpen && user) {
      setFormData(prev => ({
        ...prev,
        // Only set if field is empty, to preserve draft but allow profile data to fill once
        name: prev.name || profile?.full_name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || profile?.phone || '',
        institution: prev.institution || profile?.college || '', 
        participant_type: prev.participant_type || profile?.batch || '',
      }));
    }
  }, [isOpen, user, profile]); 

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 60000); 
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, batch')
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .not('id', 'eq', user?.id)
          .limit(5);

        if (!error && data) {
          const addedIds = formData.team_members.map((m: any) => m.id);
          setSearchResults(data.filter((u: any) => u.username && !addedIds.includes(u.id)));
        }
      } catch (err) {
        console.error('Error searching members:', err);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, formData.team_members, user?.id]);

  // Fetch my groups
  const fetchMyGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      // Groups I own
      const { data: owned } = await supabase
        .from('student_groups')
        .select('id, name, owner_id')
        .eq('owner_id', user.id);

      // Groups I'm an accepted member of
      const { data: memberOf } = await supabase
        .from('student_group_members')
        .select('student_groups(id, name, owner_id)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const memberGroups = (memberOf || []).map((m: any) => m.student_groups).filter(Boolean);
      const allGroupIds = [...(owned || []), ...memberGroups].map((g: any) => g.id);

      if (allGroupIds.length === 0) { setMyGroups([]); setLoadingGroups(false); return; }

      // Fetch members with profiles for each group
      const groups = await Promise.all([...(owned || []), ...memberGroups.filter((g: any) => !(owned || []).find((o: any) => o.id === g.id))].map(async (g: any) => {
        const { data: members } = await supabase
          .from('student_group_members')
          .select('id, user_id, status, profile:profiles!user_id(id, full_name, username, avatar_url, batch, phone, college)')
          .eq('group_id', g.id);
        return { ...g, members: members || [] };
      }));

      setMyGroups(groups);
    } catch (err) {
      console.error('fetchMyGroups error:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 1-click individual registration (no form needed)
  const handleOneClickIndividual = async () => {
    if (!user || !profile || !isProfileComplete) return;
    setOneClickLoading(true);
    setError(null);
    try {
      let newId = 'RICO1';
      try {
        const { data } = await supabase.from('registrations').select('id').order('created_at', { ascending: false }).limit(1);
        const lastReg = Array.isArray(data) ? data[0] : null;
        if (lastReg?.id) {
          const match = lastReg.id.match(/^RICO(\d+)$/);
          if (match) newId = `RICO${parseInt(match[1], 10) + 1}`;
        }
      } catch { newId = `RICO${Math.floor(100000 + Math.random() * 900000)}`; }

      const payload: any = {
        id: newId,
        event_id: eventId.toString(),
        event_title: eventTitle,
        full_name: profile.full_name,
        email: user.email,
        phone: profile.phone || '',
        college: profile.college || '',
        participant_type: profile.batch || '',
        is_team_registration: false,
        team_name: null,
        team_members: null,
        total_members: 1,
        registration_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        status: 'approved',
        is_active: false,
      };

      if (previewOverrides?.addRegistration) {
        await previewOverrides.addRegistration(payload);
      } else {
        await addRegistration(payload);
      }

      setStep('success');
      setSuccessId(newId);
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#6366f1', '#ec4899', '#ffffff'] });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        setError('You have already registered for this event!');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setOneClickLoading(false);
    }
  };

  // 1-click group registration using a saved group
  const handleOneClickGroup = async (group: any) => {
    if (!user || !profile) return;
    const acceptedMembers = (group.members || []).filter((m: any) => m.status === 'accepted');
    const totalCount = acceptedMembers.length + 1; // +1 for owner/self

    if (totalCount < minTeamSize) {
      setError(`Need at least ${minTeamSize} accepted members. Currently ${totalCount}.`);
      return;
    }

    setOneClickLoading(true);
    setError(null);
    try {
      // Register each accepted member + self
      const allMembers = [
        { user_id: user.id, full_name: profile.full_name, email: user.email, phone: profile.phone, college: profile.college, batch: profile.batch },
        ...acceptedMembers.map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profile?.full_name || '',
          email: '',
          phone: m.profile?.phone || '',
          college: m.profile?.college || '',
          batch: m.profile?.batch || '',
        }))
      ];

      for (let i = 0; i < allMembers.length; i++) {
        const member = allMembers[i];
        let newId = 'RICO1';
        try {
          const { data } = await supabase.from('registrations').select('id').order('created_at', { ascending: false }).limit(1);
          const lastReg = Array.isArray(data) ? data[0] : null;
          if (lastReg?.id) {
            const match = lastReg.id.match(/^RICO(\d+)$/);
            if (match) newId = `RICO${parseInt(match[1], 10) + 1}`;
          }
        } catch { newId = `RICO${Math.floor(100000 + Math.random() * 900000)}`; }

        const payload: any = {
          id: newId,
          event_id: eventId.toString(),
          event_title: eventTitle,
          full_name: member.full_name,
          email: member.email,
          phone: member.phone || '',
          college: member.college || '',
          participant_type: member.batch || '',
          is_team_registration: true,
          team_name: group.name,
          team_members: null,
          total_members: allMembers.length,
          registration_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: member.user_id,
          status: 'approved',
          is_active: false,
        };

        if (i === 0 && previewOverrides?.addRegistration) {
          await previewOverrides.addRegistration(payload);
        } else {
          await supabase.from('registrations').insert(payload);
        }
      }

      setStep('success');
      setSuccessId(group.name);
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#6366f1', '#ec4899', '#ffffff'] });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        setError('One or more members already registered for this event!');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setOneClickLoading(false);
    }
  };

  const addInvitedMember = (userProfile: any) => {
    if (formData.team_members.length >= maxTeamSize - 1) {
      setError(`Max team size is ${maxTeamSize}.`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      team_members: [...prev.team_members, {
        id: userProfile.id,
        name: userProfile.full_name,
        username: userProfile.username,
        batch: userProfile.batch,
        avatar_url: userProfile.avatar_url,
        status: 'pending'
      }]
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) return setError('Name is required.');
    if (!formData.email.trim()) return setError('Email is required.');
    if (!formData.phone.trim() || formData.phone.length < 10) return setError('Valid phone number is required.');
    if (showInstitution && !isInstitutionOptional && !formData.institution.trim()) return setError('Institution/College is required.');
    if (!formData.participant_type) return setError('Please select your batch (e.g. Year).');

    if (mode === 'team') {
      if (!formData.team_name.trim()) return setError('Team Name is required.');
      const currentSize = 1 + formData.team_members.filter(m => m.name && m.name.trim()).length;
      if (currentSize < minTeamSize) return setError(`Team must have at least ${minTeamSize} members.`);
      if (formData.team_members.some(m => !m.name || !m.name.trim())) return setError('All team member names are required.');
    }

      setLoading(true);
      
      let newId = 'RICO1';
      try {
        const { data } = await dualRead({
          table: 'registrations',
          order: ['created_at', { ascending: false }],
          limit: 1
        });
        
        const lastReg = Array.isArray(data) ? data[0] : null;

        if (lastReg && lastReg.id) {
           const match = lastReg.id.match(/^RICO(\d+)$/);
           if (match) {
             const num = parseInt(match[1], 10);
             if (!isNaN(num)) {
               newId = `RICO${num + 1}`;
             }
           }
        }
      } catch (err) {
        console.warn('Failed to generate sequential ID, falling back to random', err);
        newId = `RICO${Math.floor(100000 + Math.random() * 900000)}`;
      }

      try {
      const payload: any = {
        event_id: eventId,
        event_title: eventTitle,
        is_team_registration: mode === 'team',
        team_name: mode === 'team' ? formData.team_name : null,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        college: formData.institution,
        participant_type: formData.participant_type,
        team_members: mode === 'team' ? formData.team_members : null,
        total_members: mode === 'team' ? (formData.team_members.length + 1) : 1,
        registration_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_id: user?.id,
        status: 'approved',
        is_active: false,
        id: newId,
      };

      if (previewOverrides?.addRegistration) {
        await previewOverrides.addRegistration(payload);
      } else {
        await addRegistration(payload);
        
        // Create invitations for invited teammates
        if (mode === 'team' && formData.team_members.length > 0) {
          const invites = formData.team_members.map(m => ({
            event_id: eventId.toString(),
            registration_id: newId,
            sender_id: user?.id,
            receiver_username: m.username,
            receiver_id: m.id,
            status: 'pending'
          }));
          const { error: inviteErr } = await supabase.from('group_invitations').insert(invites);
          if (inviteErr) console.error('[RegistrationModal] Failed to insert group invitations:', inviteErr);
        }
      }
      
      setStep('success');
      setSuccessId(newId);

      // Successfully registered — clean up local storage
      clearFormData();
      clearMode();

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#6366f1', '#ec4899', '#ffffff'] 
      });

    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      if (msg.includes('duplicate key value') || msg.includes('unique constraint')) {
        let existingId = null;
        try {
          const { data } = await dualRead({
            table: 'registrations',
            eq: ['email', formData.email],
            maybeSingle: false
          });
          const existingReg = (data || []).find((r: any) => r.event_id === eventId);
          if (existingReg) existingId = existingReg.id;
        } catch (e) { /* ignore */ }

        if (existingId) {
           setError(`You have already registered for this event! (ID: ${existingId}) Check your email for details.`);
        } else {
           setError(`You have already registered for this event! Check your email for details.`);
        }
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        data-lenis-prevent
        className="relative w-full max-w-2xl bg-[#0a0a12]/95 backdrop-blur-3xl border border-white/[0.06] rounded-[28px] shadow-[0_32px_100px_-20px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-6 duration-500"
      >
        
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        
        {/* Ambient glow orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 text-white/20 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/10 rounded-xl transition-all duration-300 z-10"
        >
          <X size={16} />
        </button>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-full p-10 text-center animate-in fade-in duration-500">
             <div className="relative mb-8">
               <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-500/20 animate-pulse" />
               <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25">
                 <AlertCircle size={40} className="text-white" />
               </div>
             </div>
             
             <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Access Restricted</h2>
             
             <p className="text-white/40 max-w-sm mb-8 leading-relaxed text-sm font-medium">
               You must be logged in as a student to register for this event.
             </p>
             <a 
               href="/student/login"
               className="w-full max-w-xs py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.15em] hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2"
             >
               Login Now <ChevronRight size={16} />
             </a>
          </div>
        ) : step === 'form' ? (
           <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="p-7 pb-4 shrink-0">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                       <Sparkles size={12} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">Event Registration</span>
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-tight pr-10 leading-tight">{eventTitle}</h2>
                 <p className="text-white/30 text-sm mt-1.5 font-medium">Complete the form below to secure your spot.</p>
              </div>

              {/* Scrollable form body */}
              <div 
                 data-lenis-prevent
                 className="flex-1 overflow-y-auto px-7 pb-32 custom-scrollbar space-y-6"
              >
                  {/* ─── 1-Click Quick Register (Individual) ─── */}
                  {mode === 'individual' && isProfileComplete && (
                    <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/[0.03] space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Sparkles size={11} className="text-green-400" />
                        </div>
                        <p className="text-xs font-black text-green-400 uppercase tracking-wider">1-Click Register</p>
                      </div>
                      <p className="text-xs text-white/50">Your profile details are ready. Register instantly without filling the form.</p>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
                          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-indigo-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{profile?.full_name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user?.email} · {profile?.batch}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOneClickIndividual}
                        disabled={oneClickLoading}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {oneClickLoading ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Register Instantly</>}
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/5" />
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest shrink-0">or fill form manually</p>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    </div>
                  )}

                  {/* ─── Use My Group (Team) ─── */}
                  {mode === 'team' && myGroups.length > 0 && (
                    <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <Users size={11} className="text-indigo-400" />
                        </div>
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">Use My Group</p>
                        <span className="text-[9px] text-gray-600 font-bold ml-auto">min {minTeamSize} members needed</span>
                      </div>
                      <div className="space-y-2">
                        {loadingGroups ? (
                          <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
                        ) : (
                          myGroups.map((group: any) => {
                            const accepted = (group.members || []).filter((m: any) => m.status === 'accepted');
                            const pending = (group.members || []).filter((m: any) => m.status === 'pending');
                            const total = accepted.length + 1;
                            const canRegister = total >= minTeamSize;
                            return (
                              <div key={group.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${canRegister ? 'border-indigo-500/20 bg-white/[0.02] hover:bg-indigo-500/[0.05] cursor-pointer' : 'border-white/[0.04] bg-white/[0.01] opacity-60'}`}
                                onClick={() => canRegister && !oneClickLoading && handleOneClickGroup(group)}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white truncate">{group.name}</p>
                                  <p className="text-[9px] text-gray-500 mt-0.5">
                                    {total} accepted{pending.length > 0 ? ` · ${pending.length} pending` : ''}
                                    {!canRegister && <span className="text-yellow-500 ml-1">· need {minTeamSize - total} more</span>}
                                  </p>
                                </div>
                                <div className="flex -space-x-1.5 shrink-0">
                                  {accepted.slice(0, 3).map((m: any) => (
                                    <div key={m.id} className="w-6 h-6 rounded-full bg-white/10 border border-white/20 overflow-hidden">
                                      {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={10} className="text-gray-500 m-1" />}
                                    </div>
                                  ))}
                                </div>
                                {canRegister && (
                                  <ChevronRight size={14} className="text-indigo-400 shrink-0" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/5" />
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest shrink-0">or build team manually</p>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    </div>
                  )}
                 
                 {/* Mode toggle */}
                 {isTeamAllowed && (
                   <div className="flex p-1.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] relative">
                      <div 
                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-indigo-500/15 to-purple-500/15 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-500 ease-out"
                        style={{ left: mode === 'team' ? 'calc(50% + 3px)' : '6px' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setMode('individual')}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-black uppercase tracking-wider relative z-10 transition-all duration-300 ${mode === 'individual' ? 'text-white' : 'text-white/25 hover:text-white/40'}`}
                      >
                         <User size={15} /> Individual
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMode('team')}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-black uppercase tracking-wider relative z-10 transition-all duration-300 ${mode === 'team' ? 'text-white' : 'text-white/25 hover:text-white/40'}`}
                      >
                         <Users size={15} /> Team
                      </button>
                   </div>
                 )}

                 {/* Form Fields */}
                 <div className="space-y-5">
                    {/* Name */}
                    <div className="group">
                       <label className={labelCls}>Full Name <span className="text-rose-400">*</span></label>
                       <div className="relative">
                          <User className={iconCls} size={16} />
                          <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                            placeholder="Enter your full name"
                            className={inputCls}
                          />
                       </div>
                    </div>

                    {/* Email + Phone row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="group">
                          <label className={labelCls}>Email <span className="text-rose-400">*</span></label>
                          <div className="relative">
                              <Mail className={iconCls} size={16} />
                              <input 
                                type="email" 
                                value={formData.email}
                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                placeholder="you@example.com"
                                className={inputCls}
                              />
                          </div>
                       </div>
                       <div className="group">
                          <label className={labelCls}>Phone <span className="text-rose-400">*</span></label>
                          <div className="relative">
                              <Phone className={iconCls} size={16} />
                              <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setFormData(p => ({...p, phone: val}));
                                }}
                                placeholder="9876543210"
                                className={inputCls}
                              />
                          </div>
                       </div>
                    </div>

                    {/* Institution */}
                    {showInstitution && (
                      <div className="group">
                         <label className={labelCls}>
                           Institution / College
                           {!isInstitutionOptional && <span className="text-rose-400 ml-1">*</span>}
                           {isInstitutionOptional && <span className="ml-2 text-white/15 font-medium normal-case tracking-normal">(Optional)</span>}
                         </label>
                         <div className="relative">
                            <Building2 className={iconCls} size={16} />
                            <input 
                              type="text" 
                              value={formData.institution}
                              onChange={e => setFormData(p => ({...p, institution: e.target.value}))}
                              placeholder="Your university or college"
                              className={inputCls}
                            />
                         </div>
                      </div>
                    )}

                    {/* Batch Selection */}
                    <div className="space-y-4">
                       <label className={labelCls}>Batch <span className="text-rose-400">*</span></label>
                       <div className="relative">
                          <BookOpen className={iconCls} size={16} />
                          <select 
                            value={formData.participant_type}
                            onChange={e => setFormData(p => ({...p, participant_type: e.target.value}))}
                            className={`${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`}
                          >
                             <option value="">Select option...</option>
                             {participantTypes.map((t: string) => (
                               <option key={t} value={t}>{t}</option>
                             ))}
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/15 rotate-90 pointer-events-none" size={14} />
                       </div>
                    </div>
                 </div>

                 {/* Team Section */}
                 {mode === 'team' && (
                    <div className="space-y-5 pt-5 border-t border-white/[0.04] animate-in slide-in-from-top-4 duration-500">
                       <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                             <Users className="text-purple-400" size={13} />
                          </div>
                          <h3 className="text-sm font-black text-white tracking-tight">Team Details</h3>
                       </div>
                       
                       <div className="group">
                          <label className={labelCls}>Team Name <span className="text-rose-400">*</span></label>
                          <input 
                            type="text" 
                            value={formData.team_name}
                            onChange={e => setFormData(p => ({...p, team_name: e.target.value}))}
                            placeholder="Enter your team name"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 px-4 text-[15px] text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300"
                          />
                       </div>

                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <label className={labelCls + ' mb-0'}>Teammates Invited <span className="text-rose-400">*</span></label>
                             <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider bg-white/[0.03] px-2.5 py-1 rounded-lg">
                               {formData.team_members.length + 1} / {maxTeamSize}
                             </span>
                          </div>
                          
                          {/* Invited members list */}
                          {formData.team_members.map((member, idx) => (
                             <div key={member.id || idx} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] animate-in fade-in slide-in-from-left-3 duration-300">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                   {member.avatar_url ? (
                                      <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                   ) : (
                                      <User size={14} className="text-gray-400" />
                                   )}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-xs font-black text-white truncate leading-none">{member.name}</p>
                                   <p className="text-[10px] text-indigo-400 font-bold truncate mt-0.5">@{member.username}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/25 px-2 py-0.5 rounded-lg shrink-0">
                                      Pending
                                   </span>
                                   <button 
                                     type="button"
                                     onClick={() => removeTeamMember(idx)}
                                     className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.05] bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/20 text-white/20 hover:text-rose-400 transition-all duration-300"
                                   >
                                     <X size={13} />
                                   </button>
                                </div>
                             </div>
                          ))}

                          {/* Member search bar */}
                          {formData.team_members.length < maxTeamSize - 1 ? (
                             <div className="relative z-30">
                                <div className="relative">
                                   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                   <input 
                                      type="text"
                                      value={searchQuery}
                                      onChange={e => setSearchQuery(e.target.value)}
                                      placeholder="Search teammate by @username or name..."
                                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-4 text-xs text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300"
                                   />
                                   {searchingMembers && (
                                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                         <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                      </div>
                                   )}
                                </div>

                                {/* Search results dropdown */}
                                {searchResults.length > 0 && (
                                   <div className="absolute left-0 right-0 mt-2 bg-[#121620] border border-white/10 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                      {searchResults.map((u) => (
                                         <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => addInvitedMember(u)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left transition-colors border-b border-white/[0.03] last:border-b-0"
                                         >
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                               {u.avatar_url ? (
                                                  <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                                               ) : (
                                                  <User size={13} className="text-gray-400" />
                                               )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                               <p className="text-xs font-black text-white truncate leading-none">{u.full_name}</p>
                                               <p className="text-[10px] text-gray-500 font-bold truncate mt-0.5">@{u.username} • {u.batch || 'Student'}</p>
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                                               Add
                                            </div>
                                         </button>
                                      ))}
                                   </div>
                                )}

                                {searchQuery.trim() && searchResults.length === 0 && !searchingMembers && (
                                   <div className="absolute left-0 right-0 mt-2 bg-[#121620] border border-white/10 rounded-2xl p-4 text-center text-xs text-gray-500 font-medium">
                                      No student found with username or name "{searchQuery}"
                                   </div>
                                )}
                             </div>
                          ) : (
                             <p className="text-[10px] text-green-400 font-black uppercase tracking-widest text-center mt-2 bg-green-500/5 border border-green-500/10 p-2.5 rounded-xl">
                                Maximum team size reached
                             </p>
                          )}
                       </div>
                    </div>
                 )}

                 {/* Error Alert */}
                 {error && (
                    <div className="bg-rose-500/10 border border-rose-500/15 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                       <div className="text-sm text-rose-200/80 font-medium leading-relaxed">{error}</div>
                    </div>
                 )}
              </div>
              
              {/* Submit footer */}
              <div className="p-7 pt-5 border-t border-white/[0.04] bg-black/20 backdrop-blur-md shrink-0">
                 <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-purple-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] shadow-[0_8px_32px_-4px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_40px_-4px_rgba(99,102,241,0.55)] transform active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                 >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <div className="flex items-center gap-2.5">Confirm Registration <ChevronRight size={16} /></div>}
                 </button>
              </div>
           </div>
        ) : (
           /* ═══ Success Screen ═══ */
           <div className="flex flex-col items-center justify-center h-full p-10 text-center animate-in zoom-in-50 duration-700">
              {/* Animated success ring */}
              <div className="relative mb-8">
                 <div className="absolute inset-0 w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                 <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                    <Check size={48} className="text-white" strokeWidth={3.5} />
                 </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                 <PartyPopper size={18} className="text-yellow-400" />
                 <span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em]">Registration Complete</span>
                 <PartyPopper size={18} className="text-yellow-400 scale-x-[-1]" />
              </div>

              <h2 className="text-3xl font-black text-white mb-3 tracking-tight">You're In!</h2>
              
              <p className="text-white/30 max-w-sm mb-8 leading-relaxed text-sm font-medium">
                 Your registration for <span className="text-indigo-400 font-bold">{eventTitle}</span> was successful!
              </p>

              {/* Registration ID badge */}
              <div className="mb-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-4 inline-flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em]">Registration ID</span>
                 <span className="font-mono font-black text-2xl text-indigo-400 tracking-wider">{successId}</span>
              </div>

              <p className="text-white/20 text-xs mb-8 max-w-xs font-medium leading-relaxed">
                 We've sent the ticket and further details to your email address.
              </p>
              
              <div className="space-y-3 w-full max-w-xs">
                 <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all duration-300"
                 >
                    Close
                 </button>
                 <p className="text-[10px] text-white/15 font-bold animate-pulse">Auto-closing in 1 minute…</p>
              </div>
           </div>
        )}
      </div>
    </div>,
    document.body
  );
};
