import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useXPEngine } from '../hooks/useXPEngine';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  Trophy, 
  Clock, 
  MessageSquare,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Bell,
  Menu,
  QrCode,
  Sparkles,
  Zap,
  Crown,
} from 'lucide-react';
import { useCoreData } from '../context/CoreDataContext';
import { toast } from 'react-hot-toast';
import { BRAND_NAME } from '../constants/brand';
import WalletPassModal from '../components/dashboard/WalletPassModal';
import XPRing from '../components/dashboard/XPRing';
import AnnouncementsTicker from '../components/dashboard/AnnouncementsTicker';
import NextUpTimeline from '../components/dashboard/NextUpTimeline';

const DashboardLayout: React.FC = () => {
  const { user, profile, loading, signOut, isApproved, updateProfile, isProfileComplete } = useStudentAuth();
  const { siteSettings } = useCoreData();
  const navigate = useNavigate();
  const { awardXP } = useXPEngine();
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [sportsRegistrations, setSportsRegistrations] = useState<any[]>([]);
  const [entryPasses, setEntryPasses] = useState<any[]>([]);
  const [xpData, setXpData] = useState<{ total_xp: number; tier: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [rankInfo, setRankInfo] = useState<{ rank: number; auraGradient: string; auraColor: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Day/Night Theme
  const hour = new Date().getHours();
  const isNightMode = hour >= 18 || hour < 6;

  // Profile completion form state
  const [compFullName, setCompFullName] = useState(profile?.full_name || '');
  const [compPhone, setCompPhone] = useState(profile?.phone || '');
  const [compCollege, setCompCollege] = useState(profile?.college || '');
  const [compBatch, setCompBatch] = useState(profile?.batch || '');

  const rawPt = (siteSettings as any)?.registration_participant_types;
  const rawBo = (siteSettings as any)?.batch_options;

  const batchOptions = useMemo(() => {
    const pt = Array.isArray(rawPt) ? rawPt.filter(Boolean) : [];
    const bo = Array.isArray(rawBo) ? rawBo.filter(Boolean) : [];
    
    if (pt.length > 0) return pt;
    if (bo.length > 0) return bo;
    return ['Batch 2024', 'Batch 2025', 'Batch 2026', 'Batch 2027'];
  }, [rawPt, rawBo]);
  
  const showCollege = siteSettings?.registration_institution_visible ?? false;

  useEffect(() => {
    if (profile) {
      setCompFullName(profile.full_name || '');
      setCompPhone(profile.phone || '');
      setCompCollege(profile.college || '');
      setCompBatch(profile.batch || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/student/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && isApproved && isProfileComplete) {
      fetchUserRegistrations();
      awardXP('daily_checkin', 5);
    }
  }, [user, isApproved, isProfileComplete]);

  // Listen for likes received by the current user
  useEffect(() => {
    if (!user) return;
    const likesChannel = supabase
      .channel(`user-likes-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'profile_likes',
        filter: `profile_id=eq.${user.id}`
      }, async (payload) => {
        const { data: likerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payload.new.liker_id)
          .single();

        if (likerProfile) {
          toast.success(`${likerProfile.full_name} liked your profile! ❤️`, {
            duration: 4000,
            icon: '🔥',
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(239, 68, 68, 0.2)' }
          });
          fetchUserRegistrations();
        }
      })
      .subscribe();

    return () => { likesChannel.unsubscribe(); };
  }, [user]);

  const fetchUserRegistrations = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [
        { data: regData, error: regErr },
        { data: sportsData, error: sportsErr },
        { data: passesData, error: passesErr },
        xpResult
      ] = await Promise.all([
        supabase.from('registrations').select('*, event:events(title, image_url, category:event_categories(name)), teams(name, code)').eq('user_id', user.id),
        supabase.from('annual_sports_registrations').select('*, event:annual_sports_events(name, category, image_url), teams(name, code)').eq('user_id', user.id),
        supabase.from('entry_passes').select('*').eq('user_id', user.id).eq('is_active', true).order('day_number', { ascending: true }),
        supabase.from('student_xp').select('xp_total, tier').eq('id', user.id).single()
      ]);

      if (regErr) console.error('[DashboardLayout] registrations error:', regErr.message);
      if (sportsErr) console.error('[DashboardLayout] sports error:', sportsErr.message);
      if (passesErr) console.error('[DashboardLayout] passes error:', passesErr.message);

      setRegistrations(regData || []);
      setSportsRegistrations(sportsData || []);
      setEntryPasses(passesData || []);
      if (!xpResult.error && xpResult.data) {
        setXpData({
          total_xp: (xpResult.data as any).xp_total,
          tier: (xpResult.data as any).tier
        });
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, likes_count, student_xp(xp_total)')
        .eq('is_approved', true);

      if (allProfiles) {
        const sorted = allProfiles.map((p: any) => ({
          id: p.id,
          hype_score: ((p.likes_count || 0) * 500) + (p.student_xp?.[0]?.xp_total || 0)
        })).sort((a, b) => b.hype_score - a.hype_score);
        
        const myRank = sorted.findIndex(p => p.id === user.id) + 1;
        if (myRank > 0 && myRank <= 5) {
          const auraGradients = [
            'from-red-600 via-rose-500 to-orange-500', 
            'from-rose-600 via-red-500 to-rose-400',
            'from-red-700 via-rose-600 to-red-500',
            'from-rose-500 via-pink-600 to-red-600',
            'from-red-800 via-red-900 to-rose-900'
          ];
          const auraColors = [
            'rgba(220, 38, 38, 0.25)', 
            'rgba(225, 29, 72, 0.2)',
            'rgba(185, 28, 28, 0.2)',
            'rgba(244, 63, 94, 0.15)',
            'rgba(153, 27, 27, 0.15)'
          ];
          setRankInfo({
            rank: myRank,
            auraGradient: auraGradients[myRank - 1],
            auraColor: auraColors[myRank - 1]
          });
        } else { setRankInfo(null); }
      }
    } catch (err) { console.error('Error fetching dashboard data:', err); }
    finally { setDataLoading(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({
        full_name: compFullName,
        phone: compPhone,
        college: showCollege ? compCollege : 'N/A',
        batch: compBatch,
        participant_type: compBatch
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => { setImageToCrop(reader.result as string); };
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
        if (oldPath) { await supabase.storage.from('avatars').remove([oldPath]).catch(err => console.error('Failed to delete old avatar:', err)); }
      }
      toast.success('Photo updated!');
    } catch (error: any) {
      toast.error(error.message || 'Error uploading photo');
    } finally { setUploading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  // Profile Completion Gate
  if (!isProfileComplete) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-red-800/10 rounded-full blur-[100px]" />
        
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full text-center z-10">
          <div className="rico-glass-card p-12 rounded-3xl border border-white/10 backdrop-blur-2xl bg-white/5">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
              <User className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Complete Your Profile</h1>
            <p className="text-gray-400 text-lg mb-8">Welcome! We need a few more details to get you started with {BRAND_NAME}.</p>
            <form onSubmit={handleCompleteProfile} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Full Name</label>
                <input type="text" required value={compFullName} onChange={(e) => setCompFullName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Phone Number</label>
                <input type="tel" required value={compPhone} onChange={(e) => setCompPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" placeholder="Enter your phone number" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Batch / Year</label>
                <select required value={compBatch} onChange={(e) => setCompBatch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">
                  <option value="" disabled className="bg-[#1a1a1a]">Select your batch</option>
                  {batchOptions.map((opt: string) => (<option key={opt} value={opt} className="bg-[#1a1a1a]">{opt}</option>))}
                </select>
              </div>
              <button type="submit" disabled={savingProfile} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold">{savingProfile ? 'Saving...' : 'Complete Profile'}</button>
              <button type="button" onClick={() => signOut()} className="w-full py-3 text-gray-400">Sign Out</button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not Approved Gate
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 flex items-center justify-center relative overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full text-center z-10">
          <div className="rico-glass-card p-12 rounded-3xl border border-white/10 backdrop-blur-2xl bg-white/5 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8"><Clock className="w-10 h-10 text-red-400" /></div>
            <h1 className="text-3xl font-bold text-white mb-4">Verification in Progress</h1>
            <p className="text-gray-400 text-lg mb-8">Our admins are currently verifying your profile details. Stay tuned!</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/10 text-white rounded-xl transition-all border border-white/5">Check Status</button>
              <button onClick={() => signOut()} className="px-8 py-3 text-gray-400 flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'announcements', label: 'Announcements', icon: Bell, path: '/dashboard/announcements' },
    { id: 'messages', label: 'Coordinator Chat', icon: MessageSquare, path: '/dashboard/messages' },
    { id: 'passes', label: 'My Pass', icon: QrCode, path: '/dashboard/passes' },
    { id: 'events', label: 'My Events', icon: Calendar, path: '/dashboard/events' },
    { id: 'sports', label: 'My Sports', icon: Trophy, path: '/dashboard/sports' },
    { id: 'vibes', label: 'Vibe Feed', icon: Sparkles, path: '/dashboard/vibes' },
    { id: 'socialfeed', label: 'Social Feed', icon: Zap, path: '/dashboard/socialfeed' },
    { id: 'community', label: 'Stars Hub', icon: Crown, path: '/dashboard/community' },
    { id: 'settings', label: 'Profile Settings', icon: User, path: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-28 lg:pb-10 px-3 sm:px-5 lg:px-8 relative overflow-hidden">
      
      {/* Aurora Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#060608]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <motion.div className="absolute rounded-full" style={{ width: 700, height: 700, top: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 70%)' }} animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute rounded-full" style={{ width: rankInfo ? 1200 : 500, height: rankInfo ? 1200 : 500, top: '40%', left: '40%', transform: 'translate(-50%, -50%)', background: rankInfo ? `radial-gradient(circle, ${rankInfo.auraColor} 0%, transparent 70%)` : 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)' }} animate={{ x: [0, 60, -40, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.9, 1] }} transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 7 }} />
      </div>

      {selectedPass && (
        <WalletPassModal
          pass={{ ...selectedPass, event_name: registrations.find(r => r.id === selectedPass.registration_id)?.event_title || sportsRegistrations.find(r => r.id === selectedPass.registration_id)?.name || 'Event Entry' }}
          onClose={() => setSelectedPass(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        
        {/* Header Greeting */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl lg:rounded-3xl p-4 sm:p-6 md:p-10 rico-glass-card border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-white"><Menu className="w-6 h-6" /></button>
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <XPRing profile={profile as any} registrationsCount={registrations.length} sportsCount={sportsRegistrations.length} realXP={xpData?.total_xp} realTier={xpData?.tier} rank={rankInfo?.rank} />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-1.5"><ShieldCheck className="w-3 h-3" /> <span>{isNightMode ? '🌙 Night Mode' : 'Verified'}</span></div>
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white truncate">
                  {hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}, <span className={`text-transparent bg-clip-text bg-gradient-to-r ${rankInfo ? rankInfo.auraGradient : 'from-red-400 via-white to-orange-500'}`}>{profile?.full_name?.split(' ')[0] || 'Student'}!</span>
                </h1>
              </div>
            </div>
            <button onClick={() => signOut()} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5 transition-all text-sm flex items-center gap-2"><LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span></button>
          </div>
        </motion.div>

        <AnnouncementsTicker />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                  isActive ? 'bg-red-600/10 border border-red-500/20 text-red-400 shadow-sm shadow-red-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </NavLink>
            ))}
            <div className="mt-4"><NextUpTimeline onBrowseEvents={() => navigate('/events')} /></div>
          </div>

          {/* Sub-page Content */}
          <div className="lg:col-span-9">
            <Outlet context={{ 
              user, profile, registrations, sportsRegistrations, entryPasses, 
              xpData, dataLoading, rankInfo, isNightMode, updateProfile, 
              batchOptions, showCollege, handlePhotoUpload, handleCropComplete, 
              imageToCrop, setImageToCrop, uploading, fileInputRef, setSelectedPass 
            }} />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} className="w-64 h-full bg-[#0d0d0d] p-6 space-y-2" onClick={e => e.stopPropagation()}>
            {menuItems.map((item) => (
              <NavLink key={item.id} to={item.path} end={item.path === '/dashboard'} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? 'bg-red-600/10 text-red-400' : 'text-gray-400'}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </NavLink>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
