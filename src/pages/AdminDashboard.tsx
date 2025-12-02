import React, { useEffect, useRef, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Image, 
  Users, 
  Settings, 
  LogOut, 
  BarChart3, 
  Clock,
  UserCheck,
  Building,
  Palette,
  Share2,
  Shield,
  Star,
  Info,
  Menu,
  X,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EventsManagement } from '../components/admin/EventsManagement';
import { ScheduleManagement } from '../components/admin/ScheduleManagement';
import { GalleryManagement } from '../components/admin/GalleryManagement';
import { SponsorsManagement } from '../components/admin/SponsorsManagement';
import { RegistrationManagement } from '../components/admin/RegistrationManagement';
import { EventCategoriesManagement } from '../components/admin/EventCategoriesManagement';
import { SocialMediaManagement } from '../components/admin/SocialMediaManagement';
import { SecuritySettings } from '../components/admin/SecuritySettings';
import { BiometricLogin } from '../components/admin/BiometricLogin';
import { FacultyHeadsManagement } from '../components/admin/FacultyHeadsManagement';
import { CoreTeamManagement } from '../components/admin/CoreTeamManagement';
import { SportsTeamManagement } from '../components/admin/SportsTeamManagement';
import { BandManagement } from '../components/admin/BandManagement';
import { GuestArtistManagement } from '../components/admin/GuestArtistManagement';
import { ChiefGuestManagement } from '../components/admin/ChiefGuestManagement';
import { HomepageManagement } from '../components/admin/HomepageManagement';
import { AuditionManagement } from '../components/admin/AuditionManagement';
import { MembershipManagement } from '../components/admin/MembershipManagement';
import { FormSettingsManagement } from '../components/admin/FormSettingsManagement';
import RegistrationModalSettings from '../components/admin/RegistrationModalSettings';
import { HomeBoundSettings } from '../components/admin/HomeBoundSettings';
import { RoadmapMilestonesAdmin } from '../components/admin/RoadmapMilestonesAdmin';
import { HeroMediaManagement } from '../components/admin/HeroMediaManagement';
import { AboutSettings } from '../components/admin/AboutSettings';
import { NotificationsManagement } from '../components/admin/NotificationsManagement';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { HealthBadge } from '../components/admin/HealthBadge';
import { StorageOverview } from '../components/admin/StorageOverview';
import RegistrationPhotosPanel from '../components/admin/RegistrationPhotosPanel';
import { SiteSettingsPanel } from '../components/admin/SiteSettingsPanel';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import { ConnectionOverview } from '../components/admin/ConnectionOverview';
import { AdminPresencePanel } from '../components/admin/AdminPresencePanel';
import { useAdminPresence } from '../hooks/useAdminPresence';
import { AdminMessageToastContainer } from '../components/admin/AdminMessageToast';
import { useAdminMessages } from '../hooks/useAdminMessages';
import { AdminCursorsOverlay } from '../components/admin/AdminCursorsOverlay';

type TabType = 'overview' | 'homepage' | 'hero-media' | 'homebound' | 'about' | 'events' | 'schedule' | 'gallery' | 'sponsors' | 'registrations' | 'reg-photos' | 'categories' | 'social' | 'faculty' | 'core-team' | 'sports-team' | 'band' | 'guest-artists' | 'chief-guests' | 'auditions' | 'memberships' | 'form-settings' | 'registration-modal' | 'roadmap' | 'security' | 'biometric-login' | 'site-settings' | 'admin-users' | 'notifications';

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
      notifications: 'Notifications'
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

  const handleLogout = async () => {
    // Clear any pending logout timers to prevent interference
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
    
    // Logout and navigate immediately
    startTransition(() => {
      logout(); // Don't await - let it run in background
      navigate('/'); // Navigate instantly
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
  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3 },
    { id: 'site-settings' as TabType, name: 'Site Settings', icon: Settings },
    { id: 'admin-users' as TabType, name: 'Admin Users', icon: Shield },
    ...(isOwner ? [{ id: 'notifications' as TabType, name: 'Notifications', icon: Info }] : []),
    { id: 'homepage' as TabType, name: 'Homepage', icon: Settings },
    { id: 'about' as TabType, name: 'About', icon: Info },
    { id: 'hero-media' as TabType, name: 'Hero Media', icon: Image },
    { id: 'events' as TabType, name: 'Events', icon: Calendar },
    { id: 'homebound' as TabType, name: 'Home Bound Settings', icon: Settings },
    { id: 'schedule' as TabType, name: 'Schedule', icon: Clock },
    { id: 'gallery' as TabType, name: 'Gallery', icon: Image },
    { id: 'sponsors' as TabType, name: 'Sponsors', icon: Building },
    { id: 'registrations' as TabType, name: 'Registrations', icon: UserCheck },
    { id: 'reg-photos' as TabType, name: 'Registration Photos', icon: Image },
    { id: 'categories' as TabType, name: 'Categories', icon: Palette },
    { id: 'social' as TabType, name: 'Social Media', icon: Share2 },
    { id: 'faculty' as TabType, name: 'Faculty Heads', icon: Users },
    { id: 'core-team' as TabType, name: 'Core Team', icon: Users },
    { id: 'band' as TabType, name: 'Home Bound Band', icon: Users },
    { id: 'sports-team' as TabType, name: 'Sports Team', icon: Users },
    { id: 'guest-artists' as TabType, name: 'Guest Artists', icon: Star },
    { id: 'chief-guests' as TabType, name: 'Chief Guest', icon: Star },
    { id: 'auditions' as TabType, name: 'Auditions', icon: Users },
    { id: 'memberships' as TabType, name: 'Memberships', icon: Users },
    { id: 'form-settings' as TabType, name: 'Form Settings', icon: Settings },
  { id: 'registration-modal' as TabType, name: 'Registration Modal', icon: UserCheck },
    { id: 'roadmap' as TabType, name: 'Roadmap', icon: Star },
    { id: 'security' as TabType, name: 'Security', icon: Shield },
    { id: 'biometric-login' as TabType, name: 'Biometric Login', icon: Fingerprint },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPermissions, isOwner]);

  // Show loading state while authentication is initializing to avoid flicker/redirects
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated yet and grace is not active, show a tiny loader instead of a blank screen
  if (!isAuthenticated && !authGrace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Checking authentication…</p>
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
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;
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
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6" />
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
            {/* Mobile close button */}
            <div className="lg:hidden flex justify-between items-center mb-4 pb-3 border-b">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ul className="space-y-1">
              {visibleTabs.length === 0 && !isOwner && (
                <li className="text-sm text-gray-600 p-2 rounded bg-gray-50">
                  No sections assigned yet. Ask the owner to grant you access.
                </li>
              )}
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsSidebarOpen(false); // Close sidebar on mobile when tab is selected
                      }}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${activeTab === tab.id ? 'text-yellow-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      <span className="flex-1 text-left">{tab.name}</span>
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
                          <Shield className="w-4 h-4 text-green-600" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Mobile backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {!isOwner && visibleTabs.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No admin sections available</h3>
                <p className="text-gray-600">Your account is authenticated but doesn’t have access to any admin sections yet. Please contact the owner to grant permissions.</p>
              </div>
            )}
            {isOwner && activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center">
                          <div className={`${stat.color} p-3 rounded-lg bg-opacity-10`}>
                            <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Connection Overview */}
                <ConnectionOverview />

                {/* Storage Overview */}
                <StorageOverview />

                {/* Security Status */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Status</h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Shield className="w-6 h-6 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                        <div className="text-sm text-gray-600">
                          {isTOTPEnabled 
                            ? 'Your account is secured with 2FA'
                            : 'Enhance your security by enabling 2FA'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isTOTPEnabled 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {isTOTPEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => setActiveTab('security')}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        {isTOTPEnabled ? 'Manage' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Registration Status Overview */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Status</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{pendingRegistrations}</div>
                      <div className="text-sm text-yellow-700">Pending Review</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{approvedRegistrations}</div>
                      <div className="text-sm text-green-700">Approved</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{rejectedRegistrations}</div>
                      <div className="text-sm text-red-700">Rejected</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('events')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all"
                    >
                      <Calendar className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Manage Events</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('registrations')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all"
                    >
                      <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Review Registrations</div>
                      {pendingRegistrations > 0 && (
                        <div className="text-xs text-red-600 mt-1">{pendingRegistrations} pending</div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all"
                    >
                      <Image className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Update Gallery</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('security')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all"
                    >
                      <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Security Settings</div>
                      {!isTOTPEnabled && (
                        <div className="text-xs text-yellow-600 mt-1">Enable 2FA</div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recent Registrations */}
                {registrations.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Registrations</h3>
                      <button
                        onClick={() => setActiveTab('registrations')}
                        className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {registrations.slice(0, 5).map((registration) => (
                        <div key={registration.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{registration.full_name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              {registration.email}
                              <span
                                className={
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ' +
                                  (isOwner
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200')
                                }
                                title={isOwner ? 'You are the Owner' : 'You are an Admin'}
                              >
                                {isOwner ? 'Owner' : 'Admin'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                              registration.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {registration.status}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(registration.registration_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Core Team Stats */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{coreTeamMembers?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Core Team Members</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-500 mb-1">{coreCommittees?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Total Committees</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-500 mb-1">{bandMembers?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Band Members</div>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <div className="text-2xl font-bold text-pink-500 mb-1">{guestArtists?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Guest Artists</div>
                    </div>
                  </div>
                </div>

                {/* Applications Overview */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications Overview</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{auditions?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Band Auditions</div>
                      {pendingAuditions > 0 && (
                        <div className="text-xs text-red-600 mt-1">{pendingAuditions} pending</div>
                      )}
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{memberships?.length || 0}</div>
                      <div className="text-gray-700 text-sm">Membership Applications</div>
                      {pendingMemberships > 0 && (
                        <div className="text-xs text-red-600 mt-1">{pendingMemberships} pending</div>
                      )}
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
            {activeTab === 'roadmap' && <RoadmapMilestonesAdmin />}
            {activeTab === 'hero-media' && <HeroMediaManagement />}
            {activeTab === 'about' && <AboutSettings />}
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