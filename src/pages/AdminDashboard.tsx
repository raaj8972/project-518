import React, { useEffect, useRef, useState } from 'react';
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
  Star
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
import { FacultyHeadsManagement } from '../components/admin/FacultyHeadsManagement';
import { CoreTeamManagement } from '../components/admin/CoreTeamManagement';
import { BandManagement } from '../components/admin/BandManagement';
import { GuestArtistManagement } from '../components/admin/GuestArtistManagement';
import { HomepageManagement } from '../components/admin/HomepageManagement';
import { AuditionManagement } from '../components/admin/AuditionManagement';
import { MembershipManagement } from '../components/admin/MembershipManagement';
import { FormSettingsManagement } from '../components/admin/FormSettingsManagement';
import { HomeBoundSettings } from '../components/admin/HomeBoundSettings';
import { RoadmapMilestonesAdmin } from '../components/admin/RoadmapMilestonesAdmin';
import { HeroMediaManagement } from '../components/admin/HeroMediaManagement';
import { useLocalStorage } from '../hooks/useLocalStorage';

type TabType = 'overview' | 'homepage' | 'hero-media' | 'homebound' | 'events' | 'schedule' | 'gallery' | 'sponsors' | 'registrations' | 'categories' | 'social' | 'faculty' | 'core-team' | 'band' | 'guest-artists' | 'auditions' | 'memberships' | 'form-settings' | 'roadmap' | 'security';

export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, logout, isTOTPEnabled, loading: authLoading } = useAuth();
  const { events, registrations, galleryImages, sponsors, coreCommittees, coreTeamMembers, bandMembers, guestArtists, auditions, memberships } = useData();
  const [activeTab, setActiveTab] = useLocalStorage<TabType>('admin_active_tab', 'overview');
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useLocalStorage<boolean>('admin_auto_logout', false);
  const navigate = useNavigate();
  const [authGrace, setAuthGrace] = useState(false);

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
    await logout();
    navigate('/');
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

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3 },
    { id: 'homepage' as TabType, name: 'Homepage', icon: Settings },
    { id: 'hero-media' as TabType, name: 'Hero Media', icon: Image },
  { id: 'events' as TabType, name: 'Events', icon: Calendar },
  { id: 'homebound' as TabType, name: 'Home Bound Settings', icon: Settings },
    { id: 'schedule' as TabType, name: 'Schedule', icon: Clock },
    { id: 'gallery' as TabType, name: 'Gallery', icon: Image },
    { id: 'sponsors' as TabType, name: 'Sponsors', icon: Building },
    { id: 'registrations' as TabType, name: 'Registrations', icon: UserCheck },
    { id: 'categories' as TabType, name: 'Categories', icon: Palette },
    { id: 'social' as TabType, name: 'Social Media', icon: Share2 },
    { id: 'faculty' as TabType, name: 'Faculty Heads', icon: Users },
    { id: 'core-team' as TabType, name: 'Core Team', icon: Users },
    { id: 'band' as TabType, name: 'Home Bound Band', icon: Users },
    { id: 'guest-artists' as TabType, name: 'Guest Artists', icon: Star },
    { id: 'auditions' as TabType, name: 'Auditions', icon: Users },
    { id: 'memberships' as TabType, name: 'Memberships', icon: Users },
    { id: 'form-settings' as TabType, name: 'Form Settings', icon: Settings },
  { id: 'roadmap' as TabType, name: 'Roadmap', icon: Star },
  { id: 'security' as TabType, name: 'Security', icon: Shield },
  ];

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-yellow-500 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              {isTOTPEnabled && (
                <div className="ml-4 flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  <Shield size={12} className="mr-1" />
                  2FA Enabled
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
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
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-md p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-yellow-100 text-yellow-800 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.name}
                        {tab.id === 'registrations' && pendingRegistrations > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {pendingRegistrations}
                          </span>
                        )}
                        {tab.id === 'auditions' && pendingAuditions > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {pendingAuditions}
                          </span>
                        )}
                        {tab.id === 'memberships' && pendingMemberships > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
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

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.name} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center">
                          <div className={`${stat.color} p-3 rounded-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

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
                            <div className="text-sm text-gray-600">{registration.email}</div>
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

            {activeTab === 'homepage' && <HomepageManagement />}
            {activeTab === 'events' && <EventsManagement />}
            {activeTab === 'homebound' && <HomeBoundSettings />}
            {activeTab === 'schedule' && <ScheduleManagement />}
            {activeTab === 'gallery' && <GalleryManagement />}
            {activeTab === 'sponsors' && <SponsorsManagement />}
            {activeTab === 'registrations' && <RegistrationManagement />}
            {activeTab === 'categories' && <EventCategoriesManagement />}
            {activeTab === 'social' && <SocialMediaManagement />}
            {activeTab === 'faculty' && <FacultyHeadsManagement />}
            {activeTab === 'core-team' && <CoreTeamManagement />}
            {activeTab === 'band' && <BandManagement />}
            {activeTab === 'guest-artists' && <GuestArtistManagement />}
            {activeTab === 'auditions' && <AuditionManagement />}
            {activeTab === 'memberships' && <MembershipManagement />}
            {activeTab === 'form-settings' && <FormSettingsManagement />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'roadmap' && <RoadmapMilestonesAdmin />}
            {activeTab === 'hero-media' && <HeroMediaManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};