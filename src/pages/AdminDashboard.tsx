import React, { useEffect, useRef, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout, TabType } from '../components/admin/layout/AdminLayout';
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  Users, 
  Image, 
  Clock, 
  Lock, 
  Shield, 
  Palette, 
  History as HistoryIcon,
  Info,
  CheckCircle,
  Fingerprint,
  Share2,
  Star,
  Building,
  UserCheck,
  PartyPopper,

  Activity,
  ArrowRight,
  AlertTriangle,
  Bell,
  Scan,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
// Lazy load admin panels to reduce initial bundle size
const EventsManagement = React.lazy(() => import('../components/admin/EventsManagement').then(m => ({ default: m.EventsManagement })));
const ScheduleManagement = React.lazy(() => import('../components/admin/ScheduleManagement').then(m => ({ default: m.ScheduleManagement })));
const GalleryManagement = React.lazy(() => import('../components/admin/GalleryManagement').then(m => ({ default: m.GalleryManagement })));
const SponsorsManagement = React.lazy(() => import('../components/admin/SponsorsManagement').then(m => ({ default: m.SponsorsManagement })));
const RegistrationManagement = React.lazy(() => import('../components/admin/RegistrationManagement').then(m => ({ default: m.RegistrationManagement })));
const EventCategoriesManagement = React.lazy(() => import('../components/admin/EventCategoriesManagement').then(m => ({ default: m.EventCategoriesManagement })));
const SocialMediaManagement = React.lazy(() => import('../components/admin/SocialMediaManagement').then(m => ({ default: m.SocialMediaManagement })));
const SecuritySettings = React.lazy(() => import('../components/admin/SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const BiometricLogin = React.lazy(() => import('../components/admin/BiometricLogin').then(m => ({ default: m.BiometricLogin })));
const FacultyHeadsManagement = React.lazy(() => import('../components/admin/FacultyHeadsManagement').then(m => ({ default: m.FacultyHeadsManagement })));
const CoreTeamManagement = React.lazy(() => import('../components/admin/CoreTeamManagement').then(m => ({ default: m.CoreTeamManagement })));
const SportsTeamManagement = React.lazy(() => import('../components/admin/SportsTeamManagement').then(m => ({ default: m.SportsTeamManagement })));
const BandManagement = React.lazy(() => import('../components/admin/BandManagement').then(m => ({ default: m.BandManagement })));
const GuestArtistManagement = React.lazy(() => import('../components/admin/GuestArtistManagement').then(m => ({ default: m.GuestArtistManagement })));
const ChiefGuestManagement = React.lazy(() => import('../components/admin/ChiefGuestManagement').then(m => ({ default: m.ChiefGuestManagement })));
const HomepageManagement = React.lazy(() => import('../components/admin/HomepageManagement').then(m => ({ default: m.HomepageManagement })));
const AuditionManagement = React.lazy(() => import('../components/admin/AuditionManagement').then(m => ({ default: m.AuditionManagement })));
const MembershipManagement = React.lazy(() => import('../components/admin/MembershipManagement').then(m => ({ default: m.MembershipManagement })));
const FormSettingsManagement = React.lazy(() => import('../components/admin/FormSettingsManagement').then(m => ({ default: m.FormSettingsManagement })));
const RegistrationModalSettings = React.lazy(() => import('../components/admin/RegistrationModalSettings'));
const HomeBoundSettings = React.lazy(() => import('../components/admin/HomeBoundSettings').then(m => ({ default: m.HomeBoundSettings })));
const RoadmapMilestonesAdmin = React.lazy(() => import('../components/admin/RoadmapMilestonesAdmin').then(m => ({ default: m.RoadmapMilestonesAdmin })));
const HeroMediaManagement = React.lazy(() => import('../components/admin/HeroMediaManagement').then(m => ({ default: m.HeroMediaManagement })));
const AboutSettings = React.lazy(() => import('../components/admin/AboutSettings').then(m => ({ default: m.AboutSettings })));
const NotificationsManagement = React.lazy(() => import('../components/admin/NotificationsManagement').then(m => ({ default: m.NotificationsManagement })));
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRegistrations } from '../hooks/useRegistrations';
import { StatsOverview } from '../components/admin/dashboard/StatsOverview';
import { WelcomeSplash } from '../components/admin/dashboard/WelcomeSplash';
import { AIBrainHUD } from '../components/admin/dashboard/AIBrainHUD';
const StorageOverview = React.lazy(() => import('../components/admin/StorageOverview').then(m => ({ default: m.StorageOverview })));
const RegistrationPhotosPanel = React.lazy(() => import('../components/admin/RegistrationPhotosPanel'));
const SiteSettingsPanel = React.lazy(() => import('../components/admin/SiteSettingsPanel').then(m => ({ default: m.SiteSettingsPanel })));
const AdminUsersPanel = React.lazy(() => import('../components/admin/AdminUsersPanel').then(m => ({ default: m.AdminUsersPanel })));
const ConnectionOverview = React.lazy(() => import('../components/admin/ConnectionOverview').then(m => ({ default: m.ConnectionOverview })));
const AdminPresencePanel = React.lazy(() => import('../components/admin/AdminPresencePanel').then(m => ({ default: m.AdminPresencePanel })));
import { useAdminPresence } from '../hooks/useAdminPresence';
import { AdminMessageToastContainer } from '../components/admin/AdminMessageToast';
import { useAdminMessages } from '../hooks/useAdminMessages';
import { AdminCursorsOverlay } from '../components/admin/AdminCursorsOverlay';
const OwnerApprovalCenter = React.lazy(() => import('../components/admin/OwnerApprovalCenter').then(m => ({ default: m.OwnerApprovalCenter })));
const CoordinatorPasswordManagement = React.lazy(() => import('../components/admin/CoordinatorPasswordManagement').then(m => ({ default: m.CoordinatorPasswordManagement })));
const SecurityManagement = React.lazy(() => import('../components/admin/SecurityManagement').then(m => ({ default: m.SecurityManagement })));
const AuditLogPanel = React.lazy(() => import('../components/admin/AuditLogPanel').then(m => ({ default: m.AuditLogPanel })));
const GalleryFaceIndexer = React.lazy(() => import('../components/admin/GalleryFaceIndexer').then(m => ({ default: m.GalleryFaceIndexer })));



export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, logout, isTOTPEnabled, loading: authLoading, user } = useAuth();
  const {
    events,
    // registrations removed - use hook
    galleryImages,
    sponsors,
    coreCommittees,
    coreTeamMembers,
    bandMembers,
    guestArtists,
    auditions,
    memberships,

    myPermissions,
    connectionStatus,
    adminUsers,
  } = useData();
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('admin_active_tab', 'overview');
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useLocalStorage<boolean>('admin_auto_logout', false);
  const navigate = useNavigate();
  const [authGrace, setAuthGrace] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPresencePanelOpen, setIsPresencePanelOpen] = useLocalStorage<boolean>('admin_presence_panel_open', false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle splash screen timeout
  useEffect(() => {
    if (!authLoading && (isAuthenticated || authGrace)) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500); // Show splash for 2.5 seconds for premium feel
      return () => clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, authGrace]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Admin presence tracking
  const { otherAdmins, updatePresence } = useAdminPresence();
  const [hiddenCursors, setHiddenCursors] = useLocalStorage<string[]>('admin_hidden_cursors', []);

  const toggleCursorVisibility = (userId: string) => {
    setHiddenCursors(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Admin messaging
  const { unreadMessages, sendMessage, markAsRead } = useAdminMessages();

  // Fetch registration stats for badges
  const { stats: registrationStats } = useRegistrations({ 
    page: 1, 
    pageSize: 1, 
    filters: {} // No filters to get global stats
  });

  // ... existing code ...



  // Track page changes for presence
  useEffect(() => {
    const pageNames: Record<TabType, string> = {
      overview: 'Overview',
      homepage: 'Homepage',
      'hero-media': 'Hero Media',
      homebound: 'Home Bound Settings',
      about: 'About',
      events: 'Events Management',
      schedule: 'Schedule',
      gallery: 'Gallery',
      sponsors: 'Sponsors',
      registrations: 'Registrations',
      'reg-photos': 'Registration Photos',
      categories: 'Categories',
      social: 'Social Media',
      faculty: 'Faculty Heads',
      'core-team': 'Core Team',
      'sports-team': 'Sports Team',
      band: 'Home Bound Band',
      'guest-artists': 'Guest Artists',
      'chief-guests': 'Chief Guests',
      auditions: 'Auditions',
      memberships: 'Memberships',
      'form-settings': 'Form Settings',
      'registration-modal': 'Registration Modal',
      roadmap: 'Roadmap',
      security: 'Security',
      'biometric-login': 'Biometric Login',
      'site-settings': 'Site Settings',
      'admin-users': 'Admin Users',
      notifications: 'Notifications',
      'face-indexing': 'Face Indexing',
      'registration-photos': 'Registration Photos',
      sports: 'Sports',
      artist: 'Artist',
      'chief-guest': 'Chief Guest',
      'sponsorship-packages': 'Sponsorship Packages',
      'owner-approvals': 'Owner Approvals',
      'coordinator-passwords': 'Coordinator Passwords',
      'security-passes': 'Security Passes',
      'council-access': 'Council Access',
      'audit-logs': 'Audit Logs',
    };
    updatePresence({ page: pageNames[activeTab] || activeTab });
  }, [activeTab, updatePresence]);
  const isMasterBypassUser = !!user?.user_metadata?.master_bypass || user?.id === 'master-admin-bypass';

  // Determine if current user is the OWNER
  const isOwner = (() => {
    try {
      // Check for master admin bypass
      if (isMasterBypassUser || user?.user_metadata?.is_super_admin) {
        return true;
      }
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a) => a.user_id === uid && (a.role === 'owner' || a.is_primary));
    } catch {
      return false;
    }
  })();

  // Debounce redirect to handle transient auth events on tab focus
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
    if (!authLoading && !isAuthenticated) {
      // Keep UI mounted briefly to avoid flicker while auth stabilizes
      setAuthGrace(true);
      logoutTimer.current = setTimeout(() => {
        // Double-check before redirect in case auth stabilized
        if (!isAuthenticated) navigate('/login');
        setAuthGrace(false);
  }, 1500);
    }
    if (isAuthenticated) {
      setAuthGrace(false);
    }
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [authLoading, isAuthenticated, navigate]);

  // VIP Arrival Real-time Alerts
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('vip_arrivals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pass_scans',
          filter: 'scan_result=eq.valid'
        },
        async (payload) => {
          try {
            // Check if it's a VIP
            const { data: pass } = await supabase
              .from('entry_passes')
              .select('participant_name, pass_type')
              .eq('id', payload.new.pass_id)
              .single();

            if (pass?.pass_type === 'vip') {
              toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-2 border-yellow-500`}>
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center">
                          <PartyPopper className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">
                          VIP ARRIVAL
                        </p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                          {pass.participant_name}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Just scanned at the gate
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ), {
                duration: 10000,
                position: 'top-right'
              });
            }
          } catch (err) {
            console.error('Error fetching VIP info:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    // Clear any pending logout timers to prevent interference
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
    
    // Wait for logout to complete to ensure session is cleared
    await logout();
    
    // Then navigate (wrap in startTransition to prevent React suspension)
    startTransition(() => {
      navigate('/');
    });
  };

  // Optional inactivity/visibility auto-logout with generous thresholds
  useEffect(() => {
    if (!autoLogoutEnabled || !isAuthenticated) return;

    let lastActivity = Date.now();
    const ACTIVITY_TIMEOUT_MS = 1000 * 60 * 60; // 60 minutes inactivity
    const VISIBILITY_TIMEOUT_MS = 1000 * 60 * 120; // 120 minutes tab hidden
    let visibilityHiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;

    const onActivity = () => { lastActivity = Date.now(); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') visibilityHiddenAt = Date.now();
      else visibilityHiddenAt = null;
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    document.addEventListener('visibilitychange', onVisibility);

    const interval = setInterval(async () => {
      const now = Date.now();
      const inactive = now - lastActivity > ACTIVITY_TIMEOUT_MS;
      const hiddenTooLong = visibilityHiddenAt ? (now - visibilityHiddenAt > VISIBILITY_TIMEOUT_MS) : false;
      if ((inactive || hiddenTooLong) && isAuthenticated) {
        try { await logout(); } finally { navigate('/'); }
      }
    }, 30_000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoLogoutEnabled, isAuthenticated, logout, navigate]);

  // Tabs and visibility/permissions (computed early so hooks can follow)
  // Tabs and visibility/permissions (computed early so hooks can follow)
  const tabs = [
    // Dashboard
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3, group: 'Dashboard' },
    ...(isOwner ? [{ id: 'notifications' as TabType, name: 'Notifications', icon: Info, group: 'Dashboard' }] : []),

    // Security & System (High priority for admins)
    { id: 'admin-users' as TabType, name: 'Admin Users', icon: Shield, group: 'Security & System' },
    { id: 'site-settings' as TabType, name: 'Site Settings', icon: Settings, group: 'Security & System' },
    ...(isOwner ? [{ id: 'owner-approvals' as TabType, name: 'Owner Approvals', icon: CheckCircle, group: 'Security & System' }] : []),
    { id: 'security' as TabType, name: 'Security Settings', icon: Shield, group: 'Security & System' },
    { id: 'biometric-login' as TabType, name: 'Biometric Login', icon: Fingerprint, group: 'Security & System' },
    ...(isOwner ? [{ id: 'coordinator-passwords' as TabType, name: 'Coordinator Passwords', icon: Lock, group: 'Security & System' }] : []),
    ...(isOwner ? [{ id: 'security-passes' as TabType, name: 'Entry Pass Security', icon: Shield, group: 'Security & System' }] : []),
    ...(isOwner ? [{ id: 'council-access' as TabType, name: 'Council Access', icon: Lock, group: 'Security & System' }] : []),
    ...(isOwner ? [{ id: 'audit-logs' as TabType, name: 'Audit Logs', icon: HistoryIcon, group: 'Security & System' }] : []),
    ...(isOwner ? [{ id: 'face-indexing' as TabType, name: 'Face Indexer', icon: Scan, group: 'Security & System' }] : []),

    // Content
    { id: 'homepage' as TabType, name: 'Homepage', icon: Settings, group: 'Content' },
    { id: 'about' as TabType, name: 'About', icon: Info, group: 'Content' },
    { id: 'hero-media' as TabType, name: 'Hero Media', icon: Image, group: 'Content' },
    { id: 'gallery' as TabType, name: 'Gallery', icon: Image, group: 'Content' },
    { id: 'social' as TabType, name: 'Social Media', icon: Share2, group: 'Content' },
    { id: 'roadmap' as TabType, name: 'Roadmap', icon: Star, group: 'Content' },

    // Events & Schedule
    { id: 'events' as TabType, name: 'Events', icon: Calendar, group: 'Events & Schedule' },
    { id: 'schedule' as TabType, name: 'Schedule', icon: Clock, group: 'Events & Schedule' },
    { id: 'categories' as TabType, name: 'Categories', icon: Palette, group: 'Events & Schedule' },
    { id: 'sponsors' as TabType, name: 'Sponsors', icon: Building, group: 'Events & Schedule' },
    { id: 'homebound' as TabType, name: 'Home Bound Settings', icon: Settings, group: 'Events & Schedule' },

    // Registrations
    { id: 'registrations' as TabType, name: 'Registrations', icon: UserCheck, group: 'Registrations' },
    { id: 'reg-photos' as TabType, name: 'Registration Photos', icon: Image, group: 'Registrations' },
    { id: 'auditions' as TabType, name: 'Auditions', icon: Users, group: 'Registrations' },
    { id: 'memberships' as TabType, name: 'Memberships', icon: Users, group: 'Registrations' },
    { id: 'registration-modal' as TabType, name: 'Registration Modal', icon: UserCheck, group: 'Registrations' },

    // People
    { id: 'faculty' as TabType, name: 'Faculty Heads', icon: Users, group: 'People' },
    { id: 'core-team' as TabType, name: 'Core Team', icon: Users, group: 'People' },
    { id: 'band' as TabType, name: 'Home Bound Band', icon: Users, group: 'People' },
    { id: 'sports-team' as TabType, name: 'Sports Team', icon: Users, group: 'People' },
    { id: 'guest-artists' as TabType, name: 'Guest Artists', icon: Star, group: 'People' },
    { id: 'chief-guests' as TabType, name: 'Chief Guest', icon: Star, group: 'People' },
  ];

  // Determine if current user is an ADMIN (owner OR admin role)
  const isAdmin = (() => {
    try {
      if (isMasterBypassUser || user?.user_metadata?.is_super_admin) return true;
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch {
      return false;
    }
  })();

  // Filter visible tabs based on permissions (owner sees all)
  const visibleTabs = (() => {
  if (isOwner) return tabs;
    // Non-owners: do NOT show Overview or Security by default
    const allowedIds = new Set<TabType>();
  // Allow the Security tab for non-owner admins so they can manage their own 2FA
  if (isAdmin) {
    allowedIds.add('security');
    allowedIds.add('biometric-login');
  }
    // Notifications manager is generally safe; allow for all admins by default
    allowedIds.add('notifications');
    if (myPermissions?.can_events) allowedIds.add('events');
    if (myPermissions?.can_schedule) {
      allowedIds.add('schedule');
      // Schedule may include hero-media or categories associations, keep minimal here
    }
    if (myPermissions?.can_gallery) allowedIds.add('gallery');
    if (myPermissions?.can_sponsors) {
      allowedIds.add('sponsors');
      // sponsorship settings/packages are separate tabs? kept under SponsorsManagement tab
    }
    if (myPermissions?.can_registrations) allowedIds.add('registrations');
    if (myPermissions?.can_registration_photos) allowedIds.add('reg-photos');
    if (myPermissions?.can_faculty) allowedIds.add('faculty');
    if (myPermissions?.can_core_team) allowedIds.add('core-team');
    if (myPermissions?.can_sports) allowedIds.add('sports-team');
    if (myPermissions?.can_guest_artists) allowedIds.add('guest-artists');
    if (myPermissions?.can_chief_guests) allowedIds.add('chief-guests');
    if (myPermissions?.can_homebound) {
      allowedIds.add('homebound');
      allowedIds.add('band');
    }
    if (myPermissions?.can_security_passes) {
      allowedIds.add('security-passes');
      allowedIds.add('council-access');
    }
    // Only show tabs explicitly allowed (others hidden for non-owners)
    return tabs.filter((t) => allowedIds.has(t.id));
  })();

  // Ensure activeTab is always one of the visible tabs for current user
  useEffect(() => {
    const ids = new Set(visibleTabs.map((t) => t.id));
    // If non-owner has no tabs, leave activeTab as-is; main content will show a guidance panel
    if (!isOwner && visibleTabs.length === 0) return;
    if (!ids.has(activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'overview');
    }
  }, [myPermissions, isOwner, visibleTabs, activeTab, setActiveTab]);



  // Show Loading or Splash
  if (authLoading || (showSplash && (isAuthenticated || authGrace))) {
    return <WelcomeSplash user={user} onComplete={() => setShowSplash(false)} />;
  }

  // If user is not authenticated yet and grace is not active
  if (!isAuthenticated && !authGrace) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center animate-in fade-in duration-1000">
          <div className="w-20 h-20 border-t-4 border-r-4 border-yellow-400 rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-yellow-400/20"></div>
          <p className="text-white/60 font-black tracking-widest uppercase text-xs">Authenticating Access...</p>
        </div>
      </div>
    );
  }




  const pendingRegistrations = registrationStats.pending;
  const approvedRegistrations = registrationStats.approved;
  const pendingAuditions = auditions.filter(a => a.status === 'pending').length;
  const pendingMemberships = memberships.filter(m => m.status === 'pending').length;

  // loading already handled above

  // Badge counts
  const badges = {
    registrations: pendingRegistrations,
    auditions: pendingAuditions,
    memberships: pendingMemberships
  };

  return (
    <AdminLayout
      user={user}
      isOwner={isOwner}
      isAdmin={isAdmin}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      visibleTabs={visibleTabs}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      onLogout={handleLogout}
      onNavigateHome={() => startTransition(() => navigate('/'))}
      badges={badges}
      autoLogoutEnabled={autoLogoutEnabled}
      setAutoLogoutEnabled={setAutoLogoutEnabled}
      isTOTPEnabled={isTOTPEnabled}
    >
      {/* Real-time Cursors Overlay - Only visible to Owner */}
      {isOwner && <AdminCursorsOverlay admins={otherAdmins} hiddenCursors={hiddenCursors} />}

      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
               <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p>Loading panel...</p>
            </div>
          }>
            {!isOwner && visibleTabs.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No admin sections available</h3>
                <p className="text-gray-600">Your account is authenticated but doesn’t have access to any admin sections yet. Please contact the owner to grant permissions.</p>
              </div>
            )}
            {isOwner && activeTab === 'overview' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* SUPERIA V3 Welcome Hero */}
                <div className="superia-glass-card rounded-[3rem] p-8 sm:p-12 relative overflow-hidden group">
                   {/* Decorative background effects */}
                   <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px] group-hover:bg-indigo-500/15 transition-all duration-1000"></div>
                   <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[60px]"></div>
                   
                   <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-transparent rounded-full"></div>
                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
                               {getGreeting()}, <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}</span>
                            </h2>
                         </div>
                         <div className="flex items-center gap-4 pl-4">
                            <div className="flex items-center gap-2">
                               <Clock className="w-5 h-5 text-indigo-400" />
                               <span className="text-white/80 tabular-nums text-lg font-medium">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                            <span className="uppercase tracking-[0.1em] text-xs font-black text-gray-500">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                         <div className="bg-white/[0.03] backdrop-blur-xl rounded-[1.5rem] px-6 py-3 border border-white/10 flex items-center gap-3 shadow-2xl">
                            <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'ok' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-pulse' : 'bg-rose-400'}`}></div>
                            <span className="text-white/80 text-xs font-black uppercase tracking-[0.2em]">Neural Link: Active</span>
                         </div>
                         {isTOTPEnabled && (
                            <div className="bg-indigo-500/10 backdrop-blur-xl rounded-[1.5rem] px-6 py-3 border border-indigo-500/20 flex items-center gap-3 shadow-2xl">
                               <Shield className="w-5 h-5 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                               <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em]">Tier-1 Security</span>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                {/* AI Intelligence HUD */}
                <AIBrainHUD stats={{
                   pendingRegistrations,
                   approvedRegistrations,
                   totalEvents: events.length,
                   systemHealth: connectionStatus === 'ok' ? 'optimal' : 'warning',
                   facesIndexed: galleryImages.filter(img => (img as any).faces_indexed).length,
                   totalFaces: galleryImages.length
                }} />

                {/* Priority Attention Vector */}
                {(pendingRegistrations > 0 || pendingAuditions > 0 || pendingMemberships > 0) && (
                   <div className="superia-glass-card rounded-[2.5rem] p-8 border-rose-500/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full translate-x-1/4 -translate-y-1/4 blur-[50px]"></div>
                      
                      <div className="flex items-center gap-4 mb-8 relative z-10">
                         <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-lg shadow-rose-500/5">
                            <Bell className="w-6 h-6 text-rose-400 animate-bounce" />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">Priority Intercepts</h3>
                            <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black">System requires operator input</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                         {pendingRegistrations > 0 && (
                            <div 
                               className="group/action bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-indigo-500/30 rounded-3xl p-6 transition-all duration-500 cursor-pointer shadow-xl"
                               onClick={() => setActiveTab('registrations')}
                            >
                               <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover/action:scale-110 transition-transform">
                                     <UserCheck size={24} />
                                  </div>
                                  <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-indigo-500/20">{pendingRegistrations}</span>
                               </div>
                               <h4 className="text-white font-black tracking-tight mb-1">Registrations</h4>
                               <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                                  PENDING REVIEW <ArrowRight size={10} className="group-hover/action:translate-x-2 transition-transform" />
                               </p>
                            </div>
                         )}
                         {pendingAuditions > 0 && (
                            <div 
                               className="group/action bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-purple-500/30 rounded-3xl p-6 transition-all duration-500 cursor-pointer shadow-xl"
                               onClick={() => setActiveTab('auditions')}
                            >
                               <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover/action:scale-110 transition-transform">
                                     <Users size={24} />
                                  </div>
                                  <span className="px-3 py-1 bg-purple-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-purple-500/20">{pendingAuditions}</span>
                               </div>
                               <h4 className="text-white font-black tracking-tight mb-1">Auditions</h4>
                               <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                                  PENDING REVIEW <ArrowRight size={10} className="group-hover/action:translate-x-2 transition-transform" />
                               </p>
                            </div>
                         )}
                         {pendingMemberships > 0 && (
                            <div 
                               className="group/action bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 transition-all duration-500 cursor-pointer shadow-xl"
                               onClick={() => setActiveTab('memberships')}
                            >
                               <div className="flex items-center justify-between mb-4">
                                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 group-hover/action:scale-110 transition-transform">
                                     <Star size={24} />
                                  </div>
                                  <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-amber-500/20">{pendingMemberships}</span>
                               </div>
                               <h4 className="text-white font-black tracking-tight mb-1">Memberships</h4>
                               <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                                  PENDING REVIEW <ArrowRight size={10} className="group-hover/action:translate-x-2 transition-transform" />
                               </p>
                            </div>
                         )}
                      </div>
                   </div>
                )}

                {/* SUPERIA Real-time Stats */}
                <StatsOverview stats={{
                  eventsCount: events.length,
                  registrationsCount: registrations.length,
                  galleryCount: galleryImages.length,
                  sponsorsCount: sponsors.length
                }} />

                {/* Main Dashboard Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                          <Activity className="w-6 h-6 text-indigo-600" />
                          Recent Registrations
                        </h3>
                        <button
                          onClick={() => setActiveTab('registrations')}
                          className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold transition-all flex items-center gap-1 group"
                        >
                          View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                      
                      {registrations.length > 0 ? (
                        <div className="space-y-4">
                          {registrations.slice(0, 5).map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white hover:shadow-md rounded-2xl border border-transparent hover:border-gray-100 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-indigo-600 text-lg border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  {registration.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{registration.full_name}</div>
                                  <div className="text-xs text-gray-500 font-medium">{registration.email}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  registration.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  registration.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {registration.status}
                                </span>
                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                  {new Date(registration.registration_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-gray-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No recent activity detected.</p>
                        </div>
                      )}
                    </div>

                    {/* Team Pulse & Applications */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 group">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Users className="w-6 h-6 text-blue-500" />
                          Team Overview
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                            <div className="text-2xl font-black text-blue-600">{coreTeamMembers?.length || 0}</div>
                            <div className="text-gray-600 text-xs font-bold uppercase tracking-wider">Core Team</div>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-2xl group-hover:bg-purple-100 transition-colors">
                            <div className="text-2xl font-black text-purple-600">{coreCommittees?.length || 0}</div>
                            <div className="text-gray-600 text-xs font-bold uppercase tracking-wider">Committees</div>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
                            <div className="text-2xl font-black text-amber-600">{bandMembers?.length || 0}</div>
                            <div className="text-gray-600 text-xs font-bold uppercase tracking-wider">Band</div>
                          </div>
                          <div className="p-4 bg-pink-50 rounded-2xl group-hover:bg-pink-100 transition-colors">
                            <div className="text-2xl font-black text-pink-600">{guestArtists?.length || 0}</div>
                            <div className="text-gray-600 text-xs font-bold uppercase tracking-wider">Guests</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <Star className="w-6 h-6 text-yellow-500" />
                          Applications
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                              <div className="font-bold text-gray-900">{auditions?.length || 0}</div>
                              <div className="text-xs text-gray-500 font-bold uppercase">Band Auditions</div>
                            </div>
                            {pendingAuditions > 0 && (
                              <div className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">{pendingAuditions} Pending</div>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                              <div className="font-bold text-gray-900">{memberships?.length || 0}</div>
                              <div className="text-xs text-gray-500 font-bold uppercase">Memberships</div>
                            </div>
                            {pendingMemberships > 0 && (
                              <div className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">{pendingMemberships} Pending</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Components Dashboard */}
                  <div className="lg:col-span-1 space-y-8">
                    {/* Quick Launchpad */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-6">Quick Navigator</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'events', label: 'Events', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
                          { id: 'gallery', label: 'Gallery', icon: Image, color: 'text-purple-600', bg: 'bg-purple-100' },
                          { id: 'sponsors', label: 'Sponsors', icon: Building, color: 'text-amber-600', bg: 'bg-amber-100' },
                          { id: 'security', label: 'Security', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl hover:scale-105 transition-all duration-300 group shadow-sm border border-transparent hover:border-gray-200"
                          >
                            <item.icon className={`w-8 h-8 ${item.color} mb-3 group-hover:rotate-12 transition-transform`} />
                            <span className="text-sm font-bold text-gray-800 tracking-tight">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Security Card */}
                    {!isTOTPEnabled && (
                      <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <h4 className="text-xl font-black mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6" />
                            Security Warning
                        </h4>
                        <p className="text-white/90 text-sm mb-6 leading-relaxed">Your account access is currently unprotected. Enable Two-Factor Authentication now to secure Raja events data.</p>
                        <button 
                          onClick={() => setActiveTab('security')}
                          className="w-full bg-white text-red-600 font-black py-4 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 group/btn shadow-lg"
                        >
                          Enable 2FA <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Full-Width System Section */}
                <div className="space-y-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">System & Health Pulse</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                      <ConnectionOverview />
                    </div>
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                      <StorageOverview />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(isOwner || myPermissions?.can_sports) && activeTab === 'sports-team' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <SportsTeamManagement />
              </div>
            )}
            {activeTab === 'security-passes' && (
              <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Security Pass Management...</div>}>
                <SecurityManagement />
              </React.Suspense>
            )}
            {activeTab === 'council-access' && (
              <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Council Access...</div>}>
                <SecurityManagement defaultTab="council" />
              </React.Suspense>
            )}
            {activeTab === 'site-settings' && (
              <SiteSettingsPanel />
            )}
            {activeTab === 'admin-users' && (
              <AdminUsersPanel onManage2FA={() => setActiveTab('security')} />
            )}

            {activeTab === 'homepage' && <HomepageManagement />}
            {activeTab === 'notifications' && isOwner && <NotificationsManagement />}
            {activeTab === 'events' && <EventsManagement />}
            {activeTab === 'homebound' && <HomeBoundSettings />}
            {activeTab === 'schedule' && <ScheduleManagement />}
            {activeTab === 'gallery' && <GalleryManagement />}
            {activeTab === 'sponsors' && <SponsorsManagement />}
            {activeTab === 'registrations' && <RegistrationManagement />}
            {activeTab === 'reg-photos' && <RegistrationPhotosPanel />}
            {activeTab === 'registration-modal' && <RegistrationModalSettings />}
            {activeTab === 'categories' && <EventCategoriesManagement />}
            {activeTab === 'social' && <SocialMediaManagement />}
            {activeTab === 'faculty' && <FacultyHeadsManagement />}
            {activeTab === 'core-team' && <CoreTeamManagement />}
            {activeTab === 'band' && <BandManagement />}
            {activeTab === 'guest-artists' && <GuestArtistManagement />}
            {activeTab === 'chief-guests' && <ChiefGuestManagement />}
            {activeTab === 'auditions' && <AuditionManagement />}
            {activeTab === 'memberships' && <MembershipManagement />}
            {activeTab === 'form-settings' && <FormSettingsManagement />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'biometric-login' && <BiometricLogin />}
            {activeTab === 'owner-approvals' && <OwnerApprovalCenter />}
            {activeTab === 'coordinator-passwords' && <CoordinatorPasswordManagement />}
            {activeTab === 'audit-logs' && isOwner && <AuditLogPanel />}
            {activeTab === 'face-indexing' && isOwner && <GalleryFaceIndexer />}
            {activeTab === 'roadmap' && <RoadmapMilestonesAdmin />}
            {activeTab === 'hero-media' && <HeroMediaManagement />}
  {activeTab === 'about' && <AboutSettings />}
            </React.Suspense>
      
      {/* Admin Presence Panel */}
      {isOwner && (
        <AdminPresencePanel 
          admins={otherAdmins}
          isOpen={isPresencePanelOpen}
          onToggle={() => setIsPresencePanelOpen(!isPresencePanelOpen)}
          onNavigate={(page) => {
            setActiveTab(page as TabType);
            navigate('/admin');
          }}
          onSendMessage={sendMessage}
          hiddenCursors={hiddenCursors}
          onToggleCursor={toggleCursorVisibility}
        />
      )}

      {/* Message Toasts for all admins */}
      <AdminMessageToastContainer
        messages={unreadMessages}
        onDismiss={markAsRead}
        getUserEmail={(userId: string) => {
          // Find user email from admin users list
          const admin = adminUsers?.find(a => a.user_id === userId);
          return admin?.email || null;
        }}
      />
    </AdminLayout>
  );
};