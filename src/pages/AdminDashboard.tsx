import ParticipationVerification from '../components/shared/ParticipationVerification';
import { getAdminSections } from '../constants/adminSections';
import { legacyAccessSections } from '../utils/adminAccessRoutes';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout, TabType } from '../components/admin/layout/AdminLayout';
import { Shield, PartyPopper, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AnnouncementsPanel } from '../components/shared/AnnouncementsPanel';
import { useSupportUnread } from '../hooks/useSupportUnread';
import { ChatPanel } from '../components/shared/ChatPanel';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
// Lazy load admin panels to reduce initial bundle size
const EventsManagement = React.lazy(() => import('../components/admin/EventsManagement').then(m => ({ default: m.EventsManagement })));
const ScheduleManagement = React.lazy(() => import('../components/admin/ScheduleManagement').then(m => ({ default: m.ScheduleManagement })));
const GalleryManagement = React.lazy(() => import('../components/admin/GalleryManagement').then(m => ({ default: m.GalleryManagement })));
const SponsorsManagement = React.lazy(() => import('../components/admin/SponsorsManagement').then(m => ({ default: m.SponsorsManagement })));
const RegistrationManagement = React.lazy(() => import('../components/admin/RegistrationManagement').then(m => ({ default: m.RegistrationManagement })));
const StudentManagement = React.lazy(() => import('../components/admin/StudentManagement').then(m => ({ default: m.StudentManagement })));
const EventCategoriesManagement = React.lazy(() => import('../components/admin/EventCategoriesManagement').then(m => ({ default: m.EventCategoriesManagement })));
const SocialMediaManagement = React.lazy(() => import('../components/admin/SocialMediaManagement').then(m => ({ default: m.SocialMediaManagement })));
const RicoFamilyManagement = React.lazy(() => import('../components/admin/RicoFamilyManagement').then(m => ({ default: m.RicoFamilyManagement })));
const SportsTeamManagement = React.lazy(() => import('../components/admin/SportsTeamManagement').then(m => ({ default: m.SportsTeamManagement })));
const SportsSeasonAdmin = React.lazy(() => import('../components/admin/SportsSeasonAdmin').then(m => ({ default: m.SportsSeasonAdmin })));
const SportsTeamsAdmin = React.lazy(() => import('../components/admin/SportsTeamsAdmin').then(m => ({ default: m.SportsTeamsAdmin })));
const SportsAuctionAdmin = React.lazy(() => import('../components/admin/SportsAuctionAdmin').then(m => ({ default: m.SportsAuctionAdmin })));
const SportsRegistrationAdmin = React.lazy(() => import('../components/admin/SportsRegistrationAdmin').then(m => ({ default: m.SportsRegistrationAdmin })));
const SportsRegistrationModalSettings = React.lazy(() => import('../components/admin/SportsRegistrationModalSettings').then(m => ({ default: m.SportsRegistrationModalSettings })));
const SportsMatchesAdmin = React.lazy(() => import('../components/admin/SportsMatchesAdmin').then(m => ({ default: m.SportsMatchesAdmin })));
const AnnualEventsManagement = React.lazy(() => import('../components/admin/AnnualEventsManagement').then(m => ({ default: m.AnnualEventsManagement })));
const AnnualSportsScheduleManagement = React.lazy(() => import('../components/admin/AnnualSportsScheduleManagement').then(m => ({ default: m.AnnualSportsScheduleManagement })));
const AnnualRegistrationsManagement = React.lazy(() => import('../components/admin/AnnualRegistrationsManagement').then(m => ({ default: m.AnnualRegistrationsManagement })));
const AnnualRegistrationModalSettings = React.lazy(() => import('../components/admin/AnnualRegistrationModalSettings').then(m => ({ default: m.AnnualRegistrationModalSettings })));
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
const ShoutoutManagement = React.lazy(() => import('../components/admin/ShoutoutManagement'));
const StudentPassManagement = React.lazy(() => import('../components/admin/StudentPassManagement').then(m => ({ default: m.StudentPassManagement })));
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useRegistrations } from '../hooks/useRegistrations';
import { OwnerOverview } from '../components/admin/dashboard/OwnerOverview';
import { WelcomeSplash } from '../components/admin/dashboard/WelcomeSplash';
const StorageOverview = React.lazy(() => import('../components/admin/StorageOverview').then(m => ({ default: m.StorageOverview })));
const RegistrationPhotosPanel = React.lazy(() => import('../components/admin/RegistrationPhotosPanel'));
const SiteSettingsPanel = React.lazy(() => import('../components/admin/SiteSettingsPanel').then(m => ({ default: m.SiteSettingsPanel })));
const ConnectionOverview = React.lazy(() => import('../components/admin/ConnectionOverview').then(m => ({ default: m.ConnectionOverview })));
const PasswordsAccessCenter = React.lazy(() => import('../components/admin/PasswordsAccessCenter').then(module => ({ default: module.PasswordsAccessCenter })));
const SecurityManagement = React.lazy(() => import('../components/admin/SecurityManagement').then(m => ({ default: m.SecurityManagement })));
const AuditLogPanel = React.lazy(() => import('../components/admin/AuditLogPanel').then(m => ({ default: m.AuditLogPanel })));
const GalleryFaceIndexer = React.lazy(() => import('../components/admin/GalleryFaceIndexer').then(m => ({ default: m.GalleryFaceIndexer })));
const ProtectionCenter = React.lazy(() => import('../components/admin/ProtectionCenter').then(m => ({ default: m.ProtectionCenter })));





export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, logout, isTOTPEnabled, loading: authLoading, user, isLoggingOut } = useAuth();
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
    adminUsers,
    siteSettings,
    homepageSettings,
  } = useData();
  const navigate = useNavigate();
  // Derive activeTab from URL path: /admin/schedule → 'schedule', /admin → 'overview'
  const location = useLocation();
  const activeTab: TabType = useMemo(() => {
    const path = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
    return (legacyAccessSections[path] ? 'security' : path || 'overview') as TabType;
  }, [location.pathname]);

  useEffect(() => {
    const oldTab=location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
    if(legacyAccessSections[oldTab]) navigate(`/admin/security?section=${legacyAccessSections[oldTab]}`, { replace:true });
  }, [location.pathname,navigate]);

  // Navigate-based tab setter (replaces old localStorage-based setActiveTab)
  const setActiveTab = useCallback((tab: TabType) => {
    const targetPath = tab === 'overview' ? '/admin' : `/admin/${tab}`;
    navigate(targetPath);
  }, [navigate]);
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useLocalStorage<boolean>('admin_auto_logout', false);
  const [authGrace, setAuthGrace] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [stuckLoading, setStuckLoading] = useState(false);

  // Failsafe for stuck loading
  useEffect(() => {
    if (authLoading && !user) {
      const timer = setTimeout(() => {
        setStuckLoading(true);
      }, 12000); // 12s failsafe
      return () => clearTimeout(timer);
    } else {
      setStuckLoading(false);
    }
  }, [authLoading, user]);

  // Handle splash screen timeout — start timer as soon as we have auth context
  useEffect(() => {
    if (isAuthenticated || authGrace) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500); // Show splash for 2.5 seconds for premium feel
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authGrace]);

  // Determine if current user is the OWNER


  // Fetch registration stats for badges
  // Fetch registration stats for badges
  const { stats: registrationStats, registrations, isLoading: registrationsLoading, error: registrationsError, refresh: refreshRegistrations } = useRegistrations({
    page: 1,
    pageSize: 5,
    filters: {} // No filters to get global stats
  });

  // ... existing code ...





  // Determine if current user is the OWNER
  const isOwner = useMemo(() => {

    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a) => a.user_id === uid && (a.role === 'owner' || a.is_primary));
    } catch {
      return false;
    }
  }, [user, adminUsers]);


  // Debounce redirect to handle transient auth events on tab focus
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // If explicit logout is in progress, jump straight to login — skip grace delay
    if (isLoggingOut) {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      setAuthGrace(false);
      navigate('/login');
      return;
    }
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
      }, 2500);
    }
    if (isAuthenticated) {
      setAuthGrace(false);
    }
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [authLoading, isAuthenticated, isLoggingOut, navigate]);

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
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-2 border-indigo-500`}>
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center">
                          <PartyPopper className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-widest">
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
    // Prevent the auto-redirect useEffect from firing its timer/grace
    setAuthGrace(false);
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }

    // Clear state immediately to avoid re-renders with stale data
    await logout();

    // Direct window location for a clean break (clears all memory state)
    window.location.href = '/';
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

  const tabs = useMemo(() => getAdminSections(isOwner, !!siteSettings?.annual_sports_mode_enabled), [isOwner, siteSettings?.annual_sports_mode_enabled]);

  const unavailableReason = tabs.find(tab => tab.id === activeTab)?.unavailableReason;

  const integratedHomepageAlias = ['hero-media','about','social','roadmap'].includes(activeTab) && (isOwner || (!!(myPermissions as any)?.page_access_configured && ((myPermissions as any)?.allowed_pages || []).includes('homepage') && ((myPermissions as any)?.allowed_pages || []).includes(activeTab)));
  useEffect(() => {
    if (integratedHomepageAlias) { navigate(`/admin/homepage?edit=${activeTab === 'hero-media' ? 'media' : activeTab}`, { replace: true }); return; }
    if (!isOwner) return;
    if (activeTab === 'faculty' || activeTab === 'core-team') {
      navigate(`/admin/rico-family?section=${activeTab === 'faculty' ? 'faculty' : 'members'}`, { replace: true });
    }
  }, [isOwner, activeTab, navigate, integratedHomepageAlias]);

  // Determine if current user is an ADMIN (owner OR admin role)
  const isAdmin = (() => {
    try {
      const uid = user?.id;
      if (!uid || !Array.isArray(adminUsers)) return false;
      return !!adminUsers.find((a) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
    } catch {
      return false;
    }
  })();

  // Filter visible tabs based on permissions (owner sees all)
  const isCouncil = !isOwner && (
    adminUsers?.some((a: any) => a.user_id === user?.id && a.role === 'council') ||
    user?.email?.toLowerCase().includes('sports.council')
  );

  const visibleTabs = (() => {
  if (isOwner) return tabs;
  if ((myPermissions as any)?.page_access_configured) {
    const allowedPages = new Set<string>((myPermissions as any).allowed_pages || []);
    return tabs.filter(tab => tab.id === 'security' || allowedPages.has(tab.id));
  }
    // Non-owners: do NOT show Overview or Security by default
    const allowedIds = new Set<TabType>();
  // Allow the Security tab for non-owner/non-council admins so they can manage their own 2FA
  if (isAdmin && !isCouncil) {
    allowedIds.add('security');
    // Technical support is assigned explicitly through Support chat page access.
  }
    // Notifications manager is generally safe; allow for all admins by default
    allowedIds.add('notifications');
    allowedIds.add('announcements');
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
    if (myPermissions?.can_registrations) {
      allowedIds.add('registrations');
      allowedIds.add('student-system');
    }
    if (myPermissions?.can_guest_artists) allowedIds.add('guest-artists');
    if (myPermissions?.can_chief_guests) allowedIds.add('chief-guests');
    if (myPermissions?.can_homebound) allowedIds.add('homebound');
    if (myPermissions?.can_security_passes) allowedIds.add('security-passes');
    if (myPermissions?.can_registration_photos) allowedIds.add('reg-photos');
    if (myPermissions?.can_faculty || myPermissions?.can_core_team) allowedIds.add('rico-family');
    if (myPermissions?.can_sports || (isCouncil && user?.email?.toLowerCase().includes('sports'))) {
      allowedIds.add('sports-team');
      allowedIds.add('sports-seasons');
      allowedIds.add('sports-teams');
      allowedIds.add('sports-matches');
      allowedIds.add('sports-auction');
      allowedIds.add('sports-registrations');
      allowedIds.add('sports-registration-model');
      allowedIds.add('sports-announcements');
      allowedIds.add('annual-events');
      allowedIds.add('annual-schedule');
      allowedIds.add('annual-registrations');
      allowedIds.add('annual-registration-model');
    }

    if (isCouncil) {
       const forbiddenForCouncil: TabType[] = [
         'events', 'schedule', 'gallery', 'sponsors', 'registrations', 'reg-photos', 'rico-family', 'homebound', 'band', 'announcements'
       ];
       forbiddenForCouncil.forEach(id => allowedIds.delete(id));
    }

    // Only show tabs explicitly allowed (others hidden for non-owners)
    return tabs.filter((t) => allowedIds.has(t.id));
  })();

  const supportUnread = useSupportUnread('admin', isAuthenticated && visibleTabs.some(tab => tab.id === 'support-chat'));

  // Ensure activeTab is always one of the visible tabs for current user
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    const ids = new Set(visibleTabs.map((t) => t.id));
    // If non-owner has no tabs, leave activeTab as-is; main content will show a guidance panel
    if (!isOwner && visibleTabs.length === 0) return;
    if (isOwner && (activeTab === 'faculty' || activeTab === 'core-team')) return;
    if (!ids.has(activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'overview');
    }
  }, [authLoading, isAuthenticated, user, myPermissions, isOwner, visibleTabs, activeTab, setActiveTab]);



  // Instant logout overlay — hides admin content immediately on logout
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-indigo-400/60 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase">Signing out...</p>
        </div>
      </div>
    );
  }

  // Failsafe UI for hung initialization
  if (stuckLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <AlertTriangle className="w-10 h-10 text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">Security Handshake Timeout</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            The admin node is taking longer than expected to verify your security clearance. This could be due to a network interruption or heavy traffic.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-400 transition-all active:scale-95"
            >
              Reboot Terminal
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-white/5 text-white/60 font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
            >
              Emergency Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show Splash (only if we have a user to welcome and NOT logging out)
  if (!isOwner && showSplash && (isAuthenticated || authGrace) && user && !isLoggingOut) {
    return <WelcomeSplash user={user} onComplete={() => setShowSplash(false)} />;
  }

  // Fallback Loading if auth is still pending (without a user yet)
  if (authLoading && !user && !isLoggingOut) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center animate-in fade-in duration-1000">
          <div className="w-24 h-24 mb-8 mx-auto relative">
            <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 border-t-4 border-r-4 border-indigo-500 rounded-full animate-spin shadow-lg shadow-indigo-400/20"></div>
            <Shield className="absolute inset-0 m-auto w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-white/60 font-black tracking-widest uppercase text-xs mb-2">Connecting to Admin Node...</p>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Verifying Security Clearances</p>
        </div>
      </div>
    );
  }


  // If user is not authenticated yet and grace is not active
  if (!isAuthenticated && !authGrace) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center animate-in fade-in duration-1000">
          <div className="w-20 h-20 border-t-4 border-r-4 border-indigo-500 rounded-full animate-spin mx-auto mb-8 shadow-lg shadow-indigo-400/20"></div>
          <p className="text-white/60 font-black tracking-widest uppercase text-xs">Authenticating Access...</p>
        </div>
      </div>
    );
  }




  const pendingRegistrations = registrationStats.pending;
  const pendingAuditions = auditions.filter(a => a.status === 'pending').length;
  const pendingMemberships = memberships.filter(m => m.status === 'pending').length;

  // loading already handled above

  // Badge counts
  const badges = {
    'support-chat': supportUnread,
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
      onNavigateHome={() => navigate('/')}
      badges={badges}
      autoLogoutEnabled={autoLogoutEnabled}
      setAutoLogoutEnabled={setAutoLogoutEnabled}
      isTOTPEnabled={isTOTPEnabled}
      siteSettings={siteSettings}
      homepageSettings={homepageSettings}
    >

      {(!visibleTabs.some(tab => tab.id === activeTab) || integratedHomepageAlias) ? <div className="owner-panel p-6" role="status">{isOwner || integratedHomepageAlias ? <p>Opening workspace…</p> : <><h2>Page access not assigned</h2><p>Your owner has not granted access to this section. Contact the owner to update your page permissions.</p></>}</div> : <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
               <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p>Loading panel...</p>
            </div>
          }>
            {!isOwner && visibleTabs.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No admin sections available</h3>
                <p className="text-gray-600">Your account is authenticated but doesn’t have access to any admin sections yet. Please contact the owner to grant permissions.</p>
              </div>
            )}
            {isOwner && activeTab === 'overview' && <OwnerOverview
              name={user?.user_metadata?.full_name}
              eventsCount={events.length}
              registrations={registrations}
              stats={registrationStats}
              pendingAuditions={pendingAuditions}
              pendingMemberships={pendingMemberships}
              loading={registrationsLoading}
              error={registrationsError}
              refresh={refreshRegistrations}
              siteClosed={!!(siteSettings?.site_closed || (siteSettings?.coming_soon_enabled && (!siteSettings.coming_soon_until || Date.now() < new Date(siteSettings.coming_soon_until).getTime())))}
              isTOTPEnabled={isTOTPEnabled}
              directory={[
                { label: 'Core team', count: coreTeamMembers?.length || 0, tab: 'rico-family?section=members' },
                { label: 'Committees', count: coreCommittees?.length || 0, tab: 'rico-family?section=committees' },
                { label: 'Band members', count: bandMembers?.length || 0, tab: 'band' },
                { label: 'Guest artists', count: guestArtists?.length || 0, tab: 'guest-artists' },
                { label: 'Gallery photos', count: galleryImages?.length || 0, tab: 'gallery' },
                { label: 'Sponsors', count: sponsors?.length || 0, tab: 'sponsors' },
              ]}
              diagnostics={<><ConnectionOverview /><StorageOverview /></>}
            />}
            {(isOwner || myPermissions?.can_sports || (isCouncil && user?.email?.toLowerCase().includes('sports'))) && activeTab === 'sports-team' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <SportsTeamManagement />
              </div>
            )}
            {unavailableReason && <div className="owner-notice" role="status"><h2>Annual Sports mode is enabled</h2><p>{unavailableReason}</p><button className="owner-button" onClick={() => setActiveTab('annual-events')}>Manage annual events</button></div>}
            {activeTab === 'sports-seasons' && <SportsSeasonAdmin />}
            {activeTab === 'sports-teams' && !unavailableReason && <SportsTeamsAdmin />}
            {activeTab === 'sports-auction' && !unavailableReason && <SportsAuctionAdmin />}
            {activeTab === 'sports-matches' && <SportsMatchesAdmin />}
            {activeTab === 'sports-registrations' && <SportsRegistrationAdmin />}
            {activeTab === 'sports-registration-model' && <SportsRegistrationModalSettings />}

            {/* Sports-only announcements — category locked to 'sports' */}
            {activeTab === 'sports-announcements' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rico-glass-card rounded-[2rem] p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] translate-x-1/4 -translate-y-1/4" />
                  <div className="relative z-10">
                    <AnnouncementsPanel mode="admin" defaultCategory="sports" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'annual-events' && <AnnualEventsManagement />}
            {activeTab === 'annual-schedule' && <AnnualSportsScheduleManagement />}
            {activeTab === 'annual-registrations' && <AnnualRegistrationsManagement />}
            {activeTab === 'annual-registration-model' && <AnnualRegistrationModalSettings />}
            {activeTab === 'security-passes' && (
              <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Security Pass Management...</div>}>
                <SecurityManagement />
              </React.Suspense>
            )}
            {activeTab === 'site-settings' && (
              <SiteSettingsPanel />
            )}
            {activeTab === 'announcements' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rico-glass-card rounded-[2rem] p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] translate-x-1/4 -translate-y-1/4" />
                  <div className="relative z-10">
                    <AnnouncementsPanel mode="admin" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support-chat' && (
              <div className="h-[750px]">
                <ChatPanel mode="admin" themeAccent="indigo" />
              </div>
            )}

            {activeTab === 'protection-center' && (
              <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Protection Center...</div>}>
                <ProtectionCenter />
              </React.Suspense>
            )}
            {activeTab === 'homepage' && <HomepageManagement />}
            {activeTab === 'shoutouts' && <ShoutoutManagement />}
            {activeTab === 'notifications' && isOwner && <NotificationsManagement />}
            {activeTab === 'events' && (new URLSearchParams(location.search).get('edit') === 'background' ? (visibleTabs.some(tab => tab.id === 'hero-media') ? <HeroMediaManagement pageKey="events" /> : <div className="owner-notice" role="alert">Background editing requires Hero Media page access.</div>) : <EventsManagement />)}
            {activeTab === 'homebound' && <HomeBoundSettings />}
            {activeTab === 'schedule' && <ScheduleManagement />}
            {activeTab === 'gallery' && <GalleryManagement />}
            {activeTab === 'sponsors' && <SponsorsManagement />}
            { activeTab === 'registrations' && <><ParticipationVerification /><RegistrationManagement /></>}
            { activeTab === 'student-passes' && (
              <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Pass Management...</div>}>
                <StudentPassManagement />
              </React.Suspense>
            )}
            { activeTab === 'student-system' && <StudentManagement />}
            {activeTab === 'reg-photos' && <RegistrationPhotosPanel />}
            {activeTab === 'registration-modal' && <RegistrationModalSettings />}
            {activeTab === 'categories' && <EventCategoriesManagement />}
            {activeTab === 'social' && <SocialMediaManagement />}
            {activeTab === 'rico-family' && <RicoFamilyManagement />}
            {/* Legacy routes for backward compatibility */}
            {activeTab === 'faculty' && <RicoFamilyManagement />}
            {activeTab === 'core-team' && <RicoFamilyManagement />}
            {activeTab === 'band' && <BandManagement />}
            {activeTab === 'guest-artists' && <GuestArtistManagement />}
            {activeTab === 'chief-guests' && <ChiefGuestManagement />}
            {activeTab === 'auditions' && <AuditionManagement />}
            {activeTab === 'memberships' && <MembershipManagement />}
            {activeTab === 'form-settings' && <FormSettingsManagement />}
            {activeTab === 'security' && <PasswordsAccessCenter />}
            {activeTab === 'audit-logs' && isOwner && <AuditLogPanel />}
            {activeTab === 'face-indexing' && isOwner && <GalleryFaceIndexer />}
            {activeTab === 'roadmap' && <RoadmapMilestonesAdmin />}
            {activeTab === 'hero-media' && <HeroMediaManagement />}
  {activeTab === 'about' && <AboutSettings />}
            </React.Suspense>}
    </AdminLayout>
  );
};
