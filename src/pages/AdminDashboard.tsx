import React, { useEffect, useRef, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  Users, 
  Image, 
  LogOut, 
  Menu, 
  X, 
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
  Home,
  Link,
  Activity,
  ArrowRight,
  AlertTriangle,
  Bell,
  Sun,
  Moon,
  Sunrise,
  Sunset
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
import { HealthBadge } from '../components/admin/HealthBadge';
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
import { BRAND_NAME_WITH_YEAR } from '../constants/brand';

type TabType = 'overview' | 'homepage' | 'hero-media' | 'homebound' | 'about' | 'events' | 'schedule' | 'gallery' | 'sponsors' | 'registrations' | 'reg-photos' | 'categories' | 'social' | 'faculty' | 'core-team' | 'sports-team' | 'band' | 'guest-artists' | 'chief-guests' | 'auditions' | 'memberships' | 'form-settings' | 'registration-modal' | 'roadmap' | 'security' | 'biometric-login' | 'site-settings' | 'admin-users' | 'notifications' | 'owner-approvals' | 'coordinator-passwords' | 'security-passes' | 'council-access' | 'audit-logs';

export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, logout, isTOTPEnabled, loading: authLoading, user } = useAuth();
  const {
    events,
    registrations,
    galleryImages,
    sponsors,
    coreCommittees,
    coreTeamMembers,
    bandMembers,
    guestArtists,
    auditions,
    memberships,
    schemaCapabilities: _schemaCapabilities,
    // Diagnostics
    connectionStatus,
    lastError,
    latencyMs,
    supabaseHost,
    resubscribeRealtime,
    pingNow,
    // Permissions
    myPermissions,
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
      'owner-approvals': 'Owner Approvals',
      'coordinator-passwords': 'Coordinator Passwords',
      'security-passes': 'Entry Pass Security',
      'council-access': 'Council Access',
      'audit-logs': 'Audit Logs'
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
    { id: 'form-settings' as TabType, name: 'Form Settings', icon: Settings, group: 'Registrations' },
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

  const WelcomeSplash = () => {
    const greeting = getGreeting();
    const subTitle = isOwner ? 'Principal Organizer' : 'Raja Events Team';
    const hour = currentTime.getHours();
    
    // Choose icon based on time
    const GreetingIcon = (() => {
      if (hour >= 5 && hour < 10) return Sunrise;
      if (hour >= 10 && hour < 16) return Sun;
      if (hour >= 16 && hour < 19) return Sunset;
      return Moon;
    })();

    const themeColor = (() => {
      if (hour >= 5 && hour < 17) return 'from-amber-400 via-orange-500 to-rose-500'; // Day/Sunset
      return 'from-indigo-600 via-purple-700 to-slate-900'; // Night
    })();

    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br ${themeColor} transition-all duration-1000 ${!showSplash ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
        <div className="relative text-center px-4">
          <div className="mb-8 inline-block animate-bounce duration-[2000ms]">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/30">
               <GreetingIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white drop-shadow-md" />
            </div>
          </div>
          
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both">
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-lg">
              {greeting}, <span className="text-white/80">{user?.email?.split('@')[0] || 'Admin'}</span>
            </h2>
            <p className="text-xl sm:text-2xl font-bold text-white/60 tracking-tight">
              Initializing {BRAND_NAME_WITH_YEAR} OS
            </p>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-1000 delay-700 fill-mode-both">
            <div className="flex items-center gap-3 px-6 py-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 text-white/90 text-sm font-black tracking-widest uppercase">
              <Shield className="w-4 h-4 text-green-400" />
              Secure Gateway Active
            </div>
            
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-progress-indefinite rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show Loading or Splash
  if (authLoading || (showSplash && (isAuthenticated || authGrace))) {
    return <WelcomeSplash />;
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


  const stats = [
    {
      name: 'Total Events',
      value: events.length,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Registrations',
      value: registrations.length,
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      name: 'Gallery Images',
      value: galleryImages.length,
      icon: Image,
      color: 'bg-purple-500',
    },
    {
      name: 'Sponsors',
      value: sponsors.length,
      icon: Building,
      color: 'bg-yellow-500',
    },
  ];

  const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
  const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
  const pendingAuditions = auditions.filter(a => a.status === 'pending').length;
  const pendingMemberships = memberships.filter(m => m.status === 'pending').length;

  // loading already handled above

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Real-time Cursors Overlay - Only visible to Owner */}
      {isOwner && <AdminCursorsOverlay admins={otherAdmins} hiddenCursors={hiddenCursors} />}

      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50 w-full">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile menu button - Enhanced */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-3 p-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors active:scale-95"
                aria-label="Toggle menu"
              >
                <Menu className="w-7 h-7" strokeWidth={2.5} />
              </button>
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mr-2 sm:mr-3" />
              <h1 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-1 sm:gap-3">
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline"><HealthBadge /></span>
                <span
                  className={
                    'ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ' +
                    (isOwner
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200')
                  }
                  title={isOwner ? 'You are the Owner' : 'You are an Admin'}
                >
                  {isOwner ? 'Owner' : 'Admin'}
                </span>
              </h1>
              {isTOTPEnabled && (
                <div className="ml-2 sm:ml-4 hidden sm:flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  <Shield size={12} className="mr-1" />
                  2FA Enabled
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="hidden md:flex items-center gap-2 text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={autoLogoutEnabled}
                  onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                />
                Auto-logout on inactivity
              </label>
              <button
                onClick={() => {
                  startTransition(() => {
                    navigate('/');
                  });
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-2 sm:mr-4 border-r border-gray-300 pr-2 sm:pr-4"
                title="Go to Website Home"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Back to Site</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Diagnostics badge - hidden to avoid exposing backend details */}
      {false && isOwner && (
      <div className="sticky top-0 z-[1001] w-full">
        <div className="px-4 sm:px-6 lg:px-8 pt-2">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white/80 backdrop-blur px-3 py-2 text-xs text-gray-700 shadow-sm">
            {/* Hide Supabase host unless explicitly enabled via env for debugging */}
            {((import.meta as any)?.env?.VITE_DEBUG_SHOW_SUPABASE_HOST === '1') && (
              <>
                <span className="font-medium">Supabase:</span>
                <span className="truncate">{supabaseHost || 'unknown-host'}</span>
              </>
            )}
            <span className="ml-2">•</span>
            <span>Status: <span className={connectionStatus === 'ok' ? 'text-green-600' : connectionStatus === 'offline' ? 'text-rose-600' : 'text-amber-600'}>{connectionStatus}</span></span>
            <span className="ml-2">•</span>
            <span>Ping: {typeof latencyMs === 'number' ? `${latencyMs} ms` : '—'}</span>
            {lastError && (
              <span className="ml-2 truncate max-w-[40ch] text-rose-700" title={lastError ?? undefined}>Err: {lastError}</span>
            )}
            <button
              onClick={() => resubscribeRealtime()}
              className="ml-auto rounded bg-gray-900 text-white px-2 py-1 hover:bg-black active:scale-[0.99]"
              title="Force resubscribe to realtime channels"
            >Resubscribe</button>
            <button
              onClick={() => pingNow && pingNow()}
              className="rounded bg-gray-700 text-white px-2 py-1 hover:bg-gray-800 active:scale-[0.99]"
              title="Measure latency and nudge reconnection"
            >Ping now</button>
          </div>
        </div>
      </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-40 lg:z-0
            w-64 flex-shrink-0 bg-white border-r border-gray-200
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="h-full overflow-y-auto p-4">
            {/* Mobile close button - Enhanced */}
            <div className="lg:hidden flex justify-between items-center mb-4 pb-3 border-b">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="space-y-6 pb-6">
              {visibleTabs.length === 0 && !isOwner && (
                <div className="text-sm text-gray-600 p-2 rounded bg-gray-50">
                  No sections assigned yet. Ask the owner to grant you access.
                </div>
              )}
              
              {(() => {
                const groups: Record<string, typeof visibleTabs> = {};
                visibleTabs.forEach(tab => {
                   const g = (tab as any).group || 'Other';
                   if (!groups[g]) groups[g] = [];
                   groups[g].push(tab);
                });

                const groupOrder = ['Dashboard', 'Security & System', 'Content', 'Events & Schedule', 'Registrations', 'People', 'Other'];
                
                return groupOrder.map(groupName => {
                  const tabsInGroup = groups[groupName];
                  if (!tabsInGroup || tabsInGroup.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <h3 className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {groupName}
                      </h3>
                      <ul className="space-y-1">
                        {tabsInGroup.map(tab => {
                           const Icon = tab.icon;
                           return (
                             <li key={tab.id}>
                               <button
                                 onClick={() => {
                                   setActiveTab(tab.id);
                                   setIsSidebarOpen(false);
                                 }}
                                 className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                   activeTab === tab.id
                                     ? 'bg-yellow-50 text-yellow-700 shadow-sm'
                                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 indent-0.5'
                                 }`}
                               >
                                 <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${activeTab === tab.id ? 'text-yellow-600' : 'text-gray-400'}`} />
                                 <span className="flex-1 text-left truncate">{tab.name}</span>
                                 
                                 {tab.id === 'registrations' && pendingRegistrations > 0 && (
                                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {pendingRegistrations}
                                  </span>
                                )}
                                {tab.id === 'auditions' && pendingAuditions > 0 && (
                                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {pendingAuditions}
                                  </span>
                                )}
                                {tab.id === 'memberships' && pendingMemberships > 0 && (
                                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {pendingMemberships}
                                  </span>
                                )}
                                {tab.id === 'security' && isTOTPEnabled && (
                                  <span className="ml-auto">
                                    <Shield className="w-3 h-3 text-green-600" />
                                  </span>
                                )}
                               </button>
                             </li>
                           );
                        })}
                      </ul>
                    </div>
                  );
                });
              })()}

              {/* Coordinator Access Link */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    navigate('/coordinator');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Link className="w-4 h-4 mr-3 text-purple-500" />
                  <span className="flex-1 text-left">Coordinator Access</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
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
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Modern Welcome Header */}
                <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-yellow-400/20 transition-all duration-1000"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                        {getGreeting()}, <span className="text-yellow-400">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}</span>
                      </h2>
                      <p className="text-indigo-200 text-lg font-medium flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'ok' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        <span className="text-white text-sm font-semibold uppercase tracking-wider">System Live</span>
                      </div>
                      {isTOTPEnabled && (
                        <div className="bg-green-500/20 backdrop-blur-md rounded-2xl px-4 py-2 border border-green-500/20 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-semibold uppercase tracking-wider">2FA Secure</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority Actions Hub - Mobile Friendly */}
                {(pendingRegistrations > 0 || pendingAuditions > 0 || pendingMemberships > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 relative z-10">
                        <Bell className="w-6 h-6 text-red-500" />
                        Attention Required
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                        {pendingRegistrations > 0 && (
                          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => setActiveTab('registrations')}>
                            <div className="flex items-center justify-between mb-2">
                              <UserCheck className="w-8 h-8 text-amber-600" />
                              <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingRegistrations}</span>
                            </div>
                            <div className="font-bold text-gray-900">New Registrations</div>
                            <div className="text-xs text-amber-700 mt-1 flex items-center">Review now <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                          </div>
                        )}
                        {pendingAuditions > 0 && (
                          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => setActiveTab('auditions')}>
                            <div className="flex items-center justify-between mb-2">
                              <Users className="w-8 h-8 text-blue-600" />
                              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingAuditions}</span>
                            </div>
                            <div className="font-bold text-gray-900">Audition Forms</div>
                            <div className="text-xs text-blue-700 mt-1 flex items-center">Review now <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                          </div>
                        )}
                        {pendingMemberships > 0 && (
                          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => setActiveTab('memberships')}>
                            <div className="flex items-center justify-between mb-2">
                              <Star className="w-8 h-8 text-purple-600" />
                              <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingMemberships}</span>
                            </div>
                            <div className="font-bold text-gray-900">Membership Requests</div>
                            <div className="text-xs text-purple-700 mt-1 flex items-center">Review now <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" /></div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col justify-center text-center group">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-500">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">Registration Goal</h4>
                      <p className="text-gray-600 text-sm mb-6">You've reached {Math.round((approvedRegistrations / Math.max(1, registrations.length)) * 100)}% of processed applications.</p>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${(approvedRegistrations / Math.max(1, registrations.length)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div 
                        key={stat.name} 
                        className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-100 group relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 w-2 h-full ${stat.color}`}></div>
                        <div className="flex flex-col h-full">
                          <div className={`p-4 rounded-2xl ${stat.color} bg-opacity-10 w-fit mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm shadow-black/5`}>
                            <Icon className={`w-8 h-8 ${stat.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.name}</p>
                            <p className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

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
            {activeTab === 'roadmap' && <RoadmapMilestonesAdmin />}
            {activeTab === 'hero-media' && <HeroMediaManagement />}
  {activeTab === 'about' && <AboutSettings />}
            </React.Suspense>
          </div>
        </div>
      </div>
      
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
    </div>
  );
};