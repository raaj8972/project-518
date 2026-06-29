import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useXPEngine } from '../hooks/useXPEngine';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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
  QrCode,
  Sparkles,
  Zap,
  Crown,
  Star,
  ChevronRight,
  Home,
  Users,
  AtSign,
  Menu,
  X
} from 'lucide-react';
import { useCoreData } from '../context/CoreDataContext';
import { toast } from 'react-hot-toast';
import { BRAND_NAME } from '../constants/brand';
import WalletPassModal from '../components/dashboard/WalletPassModal';
import XPRing from '../components/dashboard/XPRing';
import AnnouncementsTicker from '../components/dashboard/AnnouncementsTicker';
import { CartButton, CartDrawer } from '../components/CartDrawer';


// ─── Navigation Menu (Properly Ordered) ─────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'MAIN MENU',
    items: [
      { id: 'overview',      label: 'My Dashboard',      icon: LayoutDashboard, path: '/dashboard' },
      { id: 'passes',        label: 'Entry Pass',        icon: QrCode,          path: '/dashboard/passes' },
      { id: 'events',        label: 'Events',            icon: Calendar,        path: '/dashboard/events' },
      { id: 'active-events', label: 'Active Events',      icon: Star,            path: '/dashboard/active-events' },
      { id: 'teams',         label: 'My Teams',           icon: Users,           path: '/dashboard/teams' },
      { id: 'sports',        label: 'Sports Events',     icon: Trophy,          path: '/dashboard/sports' },
    ],
  },
  {
    label: 'SOCIAL CONNECT',
    items: [
      { id: 'vibes',         label: 'Student Stories',   icon: Sparkles,        path: '/dashboard/vibes' },
      { id: 'community',     label: 'RICO Community',    icon: Crown,           path: '/dashboard/community' },
    ],
  },
  {
    label: 'NOTICES & CHATS',
    items: [
      { id: 'announcements', label: 'Notice Board',      icon: Bell,            path: '/dashboard/announcements' },
      { id: 'messages',      label: 'Support Chat',      icon: MessageSquare,   path: '/dashboard/messages' },
    ],
  },
  {
    label: 'ACCOUNT SETTINGS',
    items: [
      { id: 'settings',      label: 'My Profile',        icon: User,            path: '/dashboard/settings' },
    ],
  },
];

// Flat list for mobile bottom bar (top 5 only)
const MOBILE_NAV = [
  { id: 'overview',      label: 'Dashboard',   icon: Home,            path: '/dashboard' },
  { id: 'events',        label: 'Events',      icon: Calendar,        path: '/dashboard/events' },
  { id: 'active-events', label: 'Active',      icon: Star,            path: '/dashboard/active-events' },
  { id: 'passes',        label: 'Passes',      icon: QrCode,          path: '/dashboard/passes' },
  { id: 'more',          label: 'Menu',        icon: Menu,            path: '' },
];

const TIER_COLORS: Record<string, string> = {
  Rookie:   '#6366f1',
  Rising:   '#22d3ee',
  Star:     '#f59e0b',
  Legend:   '#a855f7',
  Elite:    '#ec4899',
};

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
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [rankInfo, setRankInfo] = useState<{ rank: number; auraGradient: string; auraColor: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const hour = new Date().getHours();
  const isNightMode = hour >= 18 || hour < 6;
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

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
  
  const showCollege = false;

  useEffect(() => {
    if (profile) {
      setCompFullName(profile.full_name || '');
      setCompPhone(profile.phone || '');
      setCompCollege(profile.college || '');
      setCompBatch(profile.batch || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate('/student/login');
  }, [user, loading, navigate]);

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
        const { data: lp } = await supabase.from('profiles').select('full_name').eq('id', payload.new.liker_id).single();
        if (lp) {
          toast.success(`${lp.full_name} liked your profile! ❤️`, { duration: 4000, icon: '🔥', style: { background: '#131720', color: '#fff', border: '1px solid rgba(99,102,241,0.3)' } });
          fetchUserRegistrations();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `user_id=eq.${user.id}` }, () => {
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
      const { count, error } = await supabase
        .from('group_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (!error && count !== null) {
        setPendingInvitesCount(count);
      }
    };
    
    fetchInvitesCount();

    // Subscribe to realtime updates on group_invitations
    const channel = supabase
      .channel('student-invites-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'group_invitations'
      }, () => {
        fetchInvitesCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserRegistrations = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [{ data: regData, error: regErr }, { data: sportsData, error: sportsErr }, { data: passesData, error: passesErr }, xpResult] = await Promise.all([
        supabase.from('registrations').select('*, event:events(id, title, image, category, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name), teams(name, code)').eq('user_id', user.id),
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
      if (!xpResult.error && xpResult.data) setXpData({ total_xp: (xpResult.data as any).xp_total, tier: (xpResult.data as any).tier });

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, username, likes_count, student_xp(xp_total)')
        .eq('is_approved', true);

      const [regsResponse, roundsResponse, eventRoundsResponse] = await Promise.all([
        supabase.from('registrations').select('id, user_id, status, is_active, event_id, event:events(id, title)'),
        supabase.from('registration_rounds').select('id, registration_id, status, round_id, prize_rank'),
        supabase.from('event_rounds').select('id, name')
      ]);

      const regsList = regsResponse.data || [];
      const roundsList = roundsResponse.data || [];
      const eventRounds = eventRoundsResponse.data || [];

      // Map round id to name
      const roundNameMap: Record<string, string> = {};
      eventRounds.forEach(er => {
        roundNameMap[er.id] = er.name;
      });

      // Count approved registrations per event to dynamically decide the top 2 Major Events
      const eventCounts: Record<string, number> = {};
      regsList.forEach(r => {
        if (r.status === 'approved' && r.event_id) {
          eventCounts[r.event_id] = (eventCounts[r.event_id] || 0) + 1;
        }
      });

      // Sort and get top 2 event IDs
      const computedMajorEventIds = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(entry => entry[0]);

      // Map rounds by registration_id (O(N))
      const roundsByRegMap: Record<string, any[]> = {};
      roundsList.forEach(rd => {
        if (!roundsByRegMap[rd.registration_id]) {
          roundsByRegMap[rd.registration_id] = [];
        }
        roundsByRegMap[rd.registration_id].push(rd);
      });

      // Map registrations by user_id (O(N))
      const userRegsMap: Record<string, any[]> = {};
      regsList.forEach(r => {
        if (!userRegsMap[r.user_id]) {
          userRegsMap[r.user_id] = [];
        }
        const rRounds = roundsByRegMap[r.id] || [];
        userRegsMap[r.user_id].push({
          ...r,
          registration_rounds: rRounds
        });
      });

      if (allProfiles) {
        const sorted = allProfiles.map((p: any) => {
          const likes = p.likes_count || 0;
          
          const pRegs = userRegsMap[p.id] || [];
          
          let score = likes * 10;
          
          pRegs.forEach((r: any) => {
            const isMajor = computedMajorEventIds.includes(r.event_id || '');
            
            if (r.status === 'approved') {
              score += isMajor ? 30 : 15;
            }
            
            const rr = r.registration_rounds || [];
            rr.forEach((roundObj: any) => {
              if (roundObj.status === 'qualified') {
                // Base round qualified points
                score += isMajor ? 40 : 20;
                
                // Final round bonus
                const roundName = roundNameMap[roundObj.round_id] || '';
                const isFinalRound = roundName.toLowerCase().includes('final');
                if (isFinalRound) {
                  score += isMajor ? 60 : 30;
                }
                
                // Winner position points
                if (roundObj.prize_rank === '1st') {
                  score += isMajor ? 100 : 50;
                } else if (roundObj.prize_rank === '2nd') {
                  score += isMajor ? 60 : 30;
                } else if (roundObj.prize_rank === '3rd') {
                  score += isMajor ? 40 : 20;
                }
              }
            });
          });

          return {
            id: p.id,
            hype_score: score
          };
        }).sort((a, b) => b.hype_score - a.hype_score);

        const myRank = sorted.findIndex(p => p.id === user.id) + 1;
        if (myRank > 0 && myRank <= 5) {
          const auraGradients = [
            'from-indigo-500 via-purple-500 to-pink-500',
            'from-cyan-400 via-blue-500 to-purple-600',
            'from-emerald-400 via-teal-500 to-cyan-600',
            'from-amber-400 via-orange-500 to-rose-500',
            'from-fuchsia-500 via-pink-500 to-rose-500'
          ];
          const auraColors = [
            'rgba(168,85,247,0.3)',
            'rgba(6,182,212,0.3)',
            'rgba(16,185,129,0.3)',
            'rgba(245,158,11,0.3)',
            'rgba(236,72,153,0.3)'
          ];
          setRankInfo({ rank: myRank, auraGradient: auraGradients[myRank - 1], auraColor: auraColors[myRank - 1] });
        } else setRankInfo(null);
      }
    } catch (err) { console.error('Error fetching dashboard data:', err); }
    finally { setDataLoading(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({ full_name: compFullName, phone: compPhone, college: showCollege ? compCollege : 'N/A', batch: compBatch, participant_type: compBatch });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err: any) { toast.error(err.message || 'Failed to update profile'); }
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
      <div className="min-h-screen neu-bg flex items-center justify-center">
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

  // Profile Completion Gate
  if (!isProfileComplete) {
    return (
      <div className="min-h-screen neu-bg flex items-center justify-center px-4 relative overflow-hidden">
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
                { label: 'Phone Number', value: compPhone, set: setCompPhone, type: 'tel', placeholder: '+91 XXXXXXXXXX' },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">{field.label}</label>
                  <div className="neu-inset rounded-xl">
                    <input type={field.type} required value={field.value} onChange={(e) => field.set(e.target.value)} className="w-full bg-transparent px-4 py-3 text-white text-sm outline-none placeholder-gray-600" placeholder={field.placeholder} />
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
  }

  // Verification Pending Gate
  if (!isApproved) {
    return (
      <div className="min-h-screen neu-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full z-10">
          <div className="neu-card p-10 rounded-3xl text-center">
            <div className="neu-icon-btn w-20 h-20 flex items-center justify-center mx-auto mb-8">
              <Clock className="w-9 h-9 text-violet-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3 tracking-tight">Verification in Progress</h1>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">Our admins are verifying your profile. This usually takes a few minutes. Stay tuned!</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()} className="px-6 py-3 neu-card rounded-xl text-white text-sm font-bold hover:shadow-lg transition-all">
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
  }

  const tierColor = TIER_COLORS[xpData?.tier || 'Rookie'] || '#6366f1';
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen neu-bg flex flex-col pt-6 lg:pt-8 pb-28 lg:pb-10 px-3 sm:px-5 lg:px-8 relative overflow-x-hidden">
      


      {/* Ambient background glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }} />
        {rankInfo && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" style={{ background: `radial-gradient(circle, ${rankInfo.auraColor} 0%, transparent 70%)` }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        )}
      </div>

      {/* Pass Modal */}
      {selectedPass && (
        <WalletPassModal
          pass={{ ...selectedPass, event_name: registrations.find(r => r.id === selectedPass.registration_id)?.event_title || sportsRegistrations.find(r => r.id === selectedPass.registration_id)?.name || 'Event Entry' }}
          onClose={() => setSelectedPass(null)}
        />
      )}

      <div className="max-w-7xl mx-auto w-full space-y-6 relative z-10">
        
        {/* Header Greeting Banner — Premium Sci-fi / Cyber Styling */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8 border border-white/[0.08]"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 18, 24, 0.85) 0%, rgba(9, 10, 13, 0.95) 100%)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Subtle Cyber Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-35" />
          
          {/* Neon Spotlight Effects */}
          <div className="absolute -bottom-24 -right-24 w-52 h-52 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
            <div className="flex flex-row items-center gap-4 sm:gap-6 min-w-0 text-left w-full md:w-auto">
              <XPRing 
                profile={profile as any} 
                registrationsCount={registrations.length} 
                sportsCount={sportsRegistrations.length} 
                realXP={xpData?.total_xp} 
                realTier={xpData?.tier} 
                rank={rankInfo?.rank} 
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" /> <span>{isNightMode ? '🌙 Night Mode' : 'Verified'}</span>
                  </div>
                </div>
                <h1 className="text-lg sm:text-2xl md:text-4xl font-black text-white truncate tracking-tight">
                  {greeting}, <span className={`text-transparent bg-clip-text bg-gradient-to-r ${rankInfo ? rankInfo.auraGradient : 'from-indigo-400 via-white to-cyan-400'}`}>{firstName}!</span>
                </h1>
                {profile?.username ? (
                  <p className="text-xs text-indigo-400 font-bold mt-0.5 tracking-wider">@{profile.username}</p>
                ) : (
                  <button 
                    onClick={() => navigate('/dashboard/settings')} 
                    className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest animate-pulse hover:bg-rose-500/20 transition-all"
                  >
                    ⚠️ Set @username
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 w-full md:w-auto mt-1 md:mt-0">
              {/* Event Cart Button */}
              <CartButton />

              {/* Notification Bell for Team Invites */}
              <button 
                onClick={() => navigate('/dashboard/teams')}
                className="relative w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all flex items-center justify-center group shrink-0"
                title="View Team Invitations"
              >
                <Bell className="w-4 h-4 group-hover:animate-bounce" />
                {pendingInvitesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 border border-[#0e1117] text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                    {pendingInvitesCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => signOut()} 
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white border border-white/5 transition-all text-[11px] flex items-center gap-1.5 shrink-0 font-bold"
              >
                <LogOut className="w-3.5 h-3.5" /> <span>Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Announcements */}
        <AnnouncementsTicker />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Desktop Sidebar — sticky at top-6/8 below viewport edge */}
          <aside className="hidden lg:flex flex-col lg:col-span-3 sticky top-6 lg:top-8 h-[calc(100vh-4rem)] space-y-4">
            <div className="neu-card p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 neu-icon-btn flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-400 font-black text-sm">{firstName[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-black truncate tracking-tight">{profile?.full_name || 'Student'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: tierColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tierColor }}>{xpData?.tier || 'Rookie'}</span>
                  {rankInfo && <span className="text-[10px] text-gray-600 ml-1">#{rankInfo.rank}</span>}
                </div>
              </div>
            </div>

            <nav className="flex-1 min-h-0 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="neu-section-label mb-2 px-2">{section.label}</p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        className={({ isActive }) =>
                          `w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 ${
                            isActive ? 'neu-nav-item-active' : 'neu-nav-item hover:opacity-90'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-indigo-500/20' : 'bg-transparent'}`}>
                              <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                            </div>
                            <span className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>{item.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9 min-w-0">
            <AnimatePresence mode="wait">
              <Outlet context={{ 
                user, profile, registrations, sportsRegistrations, entryPasses, 
                xpData, dataLoading, rankInfo, isNightMode, updateProfile, 
                batchOptions, showCollege, handlePhotoUpload, handleCropComplete, 
                imageToCrop, setImageToCrop, uploading, fileInputRef, setSelectedPass,
                tierColor, firstName, pendingInvitesCount, setPendingInvitesCount, fetchUserRegistrations
              }} />
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden z-40 neu-bottom-bar">
        {MOBILE_NAV.map((item) => {
          if (item.id === 'more') {
            return (
              <button
                key={item.id}
                onClick={() => setShowMobileMenu(true)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  showMobileMenu ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showMobileMenu ? 'bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : ''}`}>
                  <item.icon className={`w-4 h-4 transition-colors ${showMobileMenu ? 'text-indigo-400' : 'text-gray-600'}`} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${showMobileMenu ? 'text-indigo-400' : 'text-gray-700'}`}>{item.label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : ''}`}>
                    <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-700'}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile Drawer Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 z-[49] bg-black/85 backdrop-blur-md lg:hidden"
            />
            {/* Slide-up Menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 z-[50] max-h-[85vh] bg-[#0c0d10] border-t border-white/[0.08] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden lg:hidden"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4 flex-shrink-0" />
              
              {/* Header */}
              <div className="px-6 pb-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Navigation Menu</h3>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Access all features</p>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Scrollable list of all NAV_SECTIONS */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-24 custom-scrollbar">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.label} className="space-y-2">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{section.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.id}
                          to={item.path}
                          end={item.path === '/dashboard'}
                          onClick={() => setShowMobileMenu(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${
                              isActive
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-white font-black'
                                : 'bg-white/[0.02] border-white/[0.04] text-gray-400 hover:bg-white/[0.04] hover:text-white'
                            }`
                          }
                        >
                          <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="text-xs font-bold truncate">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Drawer Overlay */}
      <CartDrawer onRegisterSuccess={fetchUserRegistrations} />
    </div>
  );
};


export default DashboardLayout;
