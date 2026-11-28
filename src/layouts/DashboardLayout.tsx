import { studentProfileProblem, studentReturnPath } from '../utils/studentProfile';
import {claimCollegeIdentity} from '../services/studentTeams';
import { useStudentEventTools } from '../context/StudentEventToolsContext';
import { SITE_FEATURES } from '../constants/siteFeatures';
import {registrationBatches} from '../utils/registrationBatches';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useXPEngine } from '../hooks/useXPEngine';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { User, Clock, LogOut } from 'lucide-react';
import { useCoreData } from '../context/CoreDataContext';
import { toast } from 'react-hot-toast';
import { BRAND_NAME } from '../constants/brand';
import '../styles/StudentFestival.css';
import WalletPassModal from '../components/dashboard/WalletPassModal';
import StudentDashboardShell from '../components/dashboard/StudentDashboardShell';
import { IQMGStatusPopup } from '../components/dashboard/IQMGStatusPopup';
import '@fontsource-variable/geist';
import '../styles/StudentDashboard.css';
import { CartDrawer } from '../components/CartDrawer';


const DashboardLayout: React.FC = () => {
  const { user, profile, loading, signOut, isApproved, updateProfile, isProfileComplete, refreshProfile } = useStudentAuth();
  const studentTools = useStudentEventTools();
  const { siteSettings } = useCoreData();
  const navigate = useNavigate();
  const location = useLocation();
  const setupHelp = location.pathname === '/dashboard/messages';
  const { awardXP } = useXPEngine();
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [sportsRegistrations, setSportsRegistrations] = useState<any[]>([]);
  const [entryPasses, setEntryPasses] = useState<any[]>([]);
  const [xpData, setXpData] = useState<{ total_xp: number; tier: string; verified_events?: number; festival_year?: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataFor, setDataFor] = useState<string>();
  const dashboardRequest = useRef(0);
  const currentStudent = useRef(user?.id);
  currentStudent.current = user?.id;
  const [dataError, setDataError] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);


  // Profile completion form state
  const [compFullName, setCompFullName] = useState(profile?.full_name || '');
  const [compIQMG,setCompIQMG] = useState(profile?.iqmg_number || '');
  const [profileCompletionError,setProfileCompletionError] = useState('');
  const [compPhone, setCompPhone] = useState(profile?.phone || '');
  const [compCollege, setCompCollege] = useState(profile?.college || '');
  const [compBatch, setCompBatch] = useState(profile?.batch || '');

  useEffect(() => {
    dashboardRequest.current += 1;
    setDataFor(undefined);
    setRegistrations([]); setSportsRegistrations([]); setEntryPasses([]); setXpData(null);
    setSelectedPass(null); setPendingInvitesCount(0); setDataError(null); setDataLoading(true);
    setCompIQMG(''); setProfileCompletionError('');
    return () => { dashboardRequest.current += 1; };
  }, [user?.id]);

  const batchOptions = useMemo(() => registrationBatches(siteSettings), [siteSettings]);

  const showCollege = false;

  useEffect(() => {
    if (profile) {
      setCompFullName(profile.full_name || '');
      setCompPhone(profile.phone || '');
      setCompIQMG(previous => profile.iqmg_number || (profile.iqmg_status === 'correction_required' ? '' : previous));
      setCompCollege(profile.college || '');
      setCompBatch(profile.batch || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate('/student/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    const returnTo = new URLSearchParams(location.search).get('returnTo');
    if (returnTo && user && isApproved && isProfileComplete) navigate(studentReturnPath(returnTo), { replace: true });
  }, [user, isApproved, isProfileComplete, location.search, navigate]);

  useEffect(() => {
    if (user && isApproved && isProfileComplete) {
      fetchUserRegistrations();
      awardXP('daily_checkin', 5);
    }
  }, [user, isApproved, isProfileComplete]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user-updates-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profile_likes', filter: `profile_id=eq.${user.id}` }, async (payload) => {
        const { data: lp } = await supabase.from('public_profiles').select('full_name').eq('id', payload.new.liker_id).single();
        if (lp) {
          toast.success(`${lp.full_name} liked your profile!`, { duration: 4000 });
          fetchUserRegistrations();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => {
        const updated = payload.new;
        setRegistrations(previous => previous.map(reg => String(reg.event_id) === String(updated.id)
          ? { ...reg, event: { ...reg.event, title: updated.title, date: updated.date, time: updated.time, venue: updated.venue, image: updated.image } }
          : reg));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `user_id=eq.${user.id}` }, () => {
        fetchUserRegistrations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_xp', filter: `id=eq.${user.id}` }, () => { fetchUserRegistrations(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_passes', filter: `user_id=eq.${user.id}` }, () => {
        fetchUserRegistrations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annual_sports_registrations', filter: `user_id=eq.${user.id}` }, () => {
        fetchUserRegistrations();
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch initial count of pending invitations
    const fetchInvitesCount = async () => {
      const {data,error}=await supabase.rpc('student_team_pending_count');
      if(!error&&typeof data==='number'&&currentStudent.current===user.id)setPendingInvitesCount(data);
    };
    
    fetchInvitesCount();

    // RLS restricts this stream to received invitations and captain-owned join requests.
    const channel = supabase
      .channel('student-invites-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'student_team_requests'
      }, () => {
        fetchInvitesCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserRegistrations = async () => {
    if (!user || currentStudent.current !== user.id) return;
    const studentId = user.id;
    const request = ++dashboardRequest.current;
    setDataLoading(true);
    setDataError(null);
    try {
      const [{ data: regData, error: regErr }, { data: sportsData, error: sportsErr }, { data: passesData, error: passesErr }, xpResult] = await Promise.all([
        supabase.from('registrations').select('*, event:events(id, title, image, category, date, time, venue, description, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name), teams(name, code)').eq('user_id', user.id),
        SITE_FEATURES.sports ? supabase.from('annual_sports_registrations').select('*, event:annual_sports_events(name, category, image_url), teams(name, code)').eq('user_id', user.id) : Promise.resolve({ data: [], error: null }),
        supabase.from('entry_passes').select('*').eq('user_id', user.id).eq('is_active', true).order('day_number', { ascending: true }),
        supabase.rpc('refresh_student_rewards')
      ]);
      if (request !== dashboardRequest.current || currentStudent.current !== studentId) return;
      setDataFor(studentId);
      if (regErr) console.error('[DashboardLayout] registrations error:', regErr.message);
      if (sportsErr) console.error('[DashboardLayout] sports error:', sportsErr.message);
      if (passesErr) console.error('[DashboardLayout] passes error:', passesErr.message);
      if (regErr || sportsErr || passesErr || xpResult.error) setDataError('Some festival details could not load. Please try again.');
      if (!regErr) setRegistrations((regData || []).filter(reg => !reg.deleted_at));
      if (!sportsErr) setSportsRegistrations(sportsData || []);
      if (!passesErr) setEntryPasses(passesData || []);
      if (!xpResult.error && xpResult.data) setXpData(xpResult.data as { total_xp: number; tier: string; verified_events: number; festival_year: number });

    } catch (err) {
      if (request === dashboardRequest.current && currentStudent.current === studentId) { console.error('Error fetching dashboard data:', err); setDataError('Your dashboard could not refresh. Please try again.'); }
    } finally { if (request === dashboardRequest.current && currentStudent.current === studentId) setDataLoading(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = studentProfileProblem({ full_name: compFullName.trim(), phone: compPhone.trim(), batch: compBatch, iqmg_number: compIQMG });
    if (problem) { setProfileCompletionError(problem); return; }
    setSavingProfile(true);setProfileCompletionError('');
    try {
      const { error } = await updateProfile({ full_name: compFullName.trim(), phone: compPhone.trim(), college: showCollege ? compCollege : 'N/A', batch: compBatch, participant_type: compBatch });
      if (error) throw error;
      await claimCollegeIdentity(compIQMG);
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) { setProfileCompletionError(err.message || 'Failed to update profile'); toast.error(err.message || 'Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      if (!user) return;
      setUploading(true);
      setImageToCrop(null);
      const finalBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(croppedBlob);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 300; canvas.height = 300;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, 300, 300);
          canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Resize failed')); }, 'image/jpeg', 0.8);
        };
        img.onerror = () => reject(new Error('Image processing failed'));
      });
      const fileExt = 'jpg';
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, finalBlob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw updateError;
      if (profile?.avatar_url && profile.avatar_url.includes('/avatars/')) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]).catch(() => {});
      }
      toast.success('Photo updated!');
    } catch (error: any) { toast.error(error.message || 'Error uploading photo'); }
    finally { setUploading(false); }
  };

  if (loading) {
    return (
      <div className="student-festival min-h-[100dvh] neu-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="neu-card p-8 rounded-3xl flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full" />
          </div>
          <p className="text-gray-500 text-sm tracking-widest uppercase font-bold">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  let content: React.ReactNode;

  // Profile Completion Gate
  if (!isProfileComplete && !setupHelp) {
    content = (
      <div className="student-festival min-h-[100dvh] neu-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-800/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full z-10">
          <div className="neu-card p-10 rounded-3xl">
            <div className="neu-icon-btn w-20 h-20 flex items-center justify-center mx-auto mb-8">
              <User className="w-9 h-9 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Complete Your Profile</h1>
            <p className="text-gray-500 text-center mb-8 text-sm">Welcome! Fill in a few details to unlock {BRAND_NAME}.</p>
            
            <form onSubmit={handleCompleteProfile} className="space-y-5">
              {[
                { label: 'Full Name', value: compFullName, set: setCompFullName, type: 'text', placeholder: 'Your full name' },
                { label: 'College IQMG number', value: compIQMG, set: setCompIQMG, type: 'text', placeholder: 'e.g. IQMG6738' },
                { label: 'Phone Number', value: compPhone, set: setCompPhone, type: 'tel', placeholder: '+91 XXXXXXXXXX' },
              ].map((field) => (
                <div key={field.label}>
                  <label htmlFor={`complete-${field.type}-${field.label.replace(/ /g, '-')}`} className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">{field.label}</label>
                  <div className="neu-inset rounded-xl">
                    <input id={`complete-${field.type}-${field.label.replace(/ /g, '-')}`} type={field.type} disabled={savingProfile || (field.label === 'Full Name' && profile?.iqmg_status === 'verified')} required value={field.value} onChange={(e) => field.set(e.target.value)} className="w-full bg-transparent px-4 py-3 text-white text-sm outline-none placeholder-gray-600" placeholder={field.placeholder} />
                  </div>
                </div>
              ))}
              
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Batch / Year</label>
                <div className="neu-inset rounded-xl">
                  <select required value={compBatch} onChange={(e) => setCompBatch(e.target.value)} className="w-full bg-transparent px-4 py-3 text-white text-sm outline-none appearance-none cursor-pointer">
                    <option value="" disabled className="bg-[#131720]">Select your batch</option>
                    {batchOptions.map((opt: string) => <option key={opt} value={opt} className="bg-[#131720]">{opt}</option>)}
                  </select>
                </div>
              </div>
              
              <p className="text-xs text-gray-400">IQMG numbers are unique. If yours is already in use, admin can correct the claim against the college PDF roster.</p>
              {profile?.iqmg_note && <p className="text-sm text-amber-300">{profile.iqmg_note}</p>}
              <Link to="/dashboard/messages?type=technical" className="text-sm text-green-300 underline">IQMG already in use? Ask Technical Help</Link>
              {profileCompletionError && <p role="alert" className="text-sm text-red-400">{profileCompletionError}</p>}
              <button type="submit" disabled={savingProfile} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-[0_8px_24px_rgba(99,102,241,0.4)] mt-2">
                {savingProfile ? 'Saving...' : 'Complete Profile →'}
              </button>
              <button type="button" onClick={() => signOut()} className="w-full py-3 text-gray-600 hover:text-gray-400 transition-colors text-sm font-medium">
                Sign Out
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  } else if (!isApproved && !setupHelp) {
    // Verification Pending Gate
    content = (
      <div className="student-festival min-h-[100dvh] neu-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full z-10">
          <div className="neu-card p-10 rounded-3xl text-center">
            <div className="neu-icon-btn w-20 h-20 flex items-center justify-center mx-auto mb-8">
              <Clock className="w-9 h-9 text-violet-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Verification in Progress</h1>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">Your profile is waiting for admin approval. You can contact Technical Help while you wait.</p>
            <Link to="/dashboard/messages?type=technical" className="text-sm text-green-300 underline">Contact Technical Help</Link>
            <div className="flex gap-3 justify-center mt-5">
              <button onClick={() => void refreshProfile()} className="px-6 py-3 neu-card rounded-xl text-white text-sm font-bold hover:shadow-lg transition-all">
                Refresh Status
              </button>
              <button onClick={() => signOut()} className="px-6 py-3 text-gray-500 hover:text-gray-300 text-sm flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  } else {
    content = (
      <StudentDashboardShell studentId={isApproved&&isProfileComplete?user.id:undefined} profile={profile} xpData={dataFor===user.id?xpData:null} pendingInvitesCount={pendingInvitesCount} unreadCount={studentTools?.unread || 0} signOut={signOut}>
        {selectedPass && (
          <WalletPassModal
            pass={{ ...selectedPass, event_name: registrations.find(r => r.id === selectedPass.registration_id)?.event?.title || sportsRegistrations.find(r => r.id === selectedPass.registration_id)?.event?.name || 'Festival entry' }}
            onClose={() => setSelectedPass(null)}
          />
        )}
        {dataError && <div className="sd-error" role="alert"><span>{dataError}</span><button onClick={() => void fetchUserRegistrations()}>Try again</button></div>}
        <Outlet context={{
          user, profile, registrations: dataFor===user.id?registrations:[], sportsRegistrations: dataFor===user.id?sportsRegistrations:[], entryPasses: dataFor===user.id?entryPasses:[],
          xpData: dataFor===user.id?xpData:null, dataLoading: dataFor!==user.id||dataLoading, updateProfile, refreshProfile,
          batchOptions, showCollege, handlePhotoUpload, handleCropComplete,
          imageToCrop, setImageToCrop, uploading, fileInputRef, setSelectedPass,
          pendingInvitesCount, setPendingInvitesCount, fetchUserRegistrations
        }} />
        <CartDrawer onRegisterSuccess={fetchUserRegistrations} />
      </StudentDashboardShell>
    );
  }

  return (
    <>
      {content}
      {!setupHelp && <IQMGStatusPopup userId={user.id} profile={profile} onSaved={refreshProfile} />}
    </>
  );
};

export default DashboardLayout;
