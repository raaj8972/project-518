import type React from 'react';
import type { SiteSettings, HomepageSettings } from '../../../types/data';
import { OwnerAdminLayout } from './OwnerAdminLayout';

export type TabType = 'overview' | 'announcements' | 'support-chat' | 'shoutouts' | 'homepage' | 'hero-media' | 'homebound' | 'about' | 'events' | 'schedule' | 'gallery' | 'sponsors' | 'registrations' | 'student-passes' | 'student-approvals' | 'student-system' | 'registration-photos' | 'reg-photos' | 'categories' | 'social' | 'faculty' | 'core-team' | 'sports' | 'sports-team' | 'sports-seasons' | 'sports-teams' | 'sports-matches' | 'sports-players' | 'sports-auction' | 'sports-registrations' | 'sports-registration-model' | 'sports-announcements' | 'annual-events' | 'annual-schedule' | 'annual-registrations' | 'annual-registration-model' | 'band' | 'artist' | 'guest-artists' | 'chief-guest' | 'chief-guests' | 'sponsorship-packages' | 'auditions' | 'memberships' | 'form-settings' | 'registration-modal' | 'roadmap' | 'security' | 'site-settings' | 'admin-users' | 'notifications' | 'coordinator-passwords' | 'security-passes' | 'council-access' | 'admin-passcodes' | 'audit-logs' | 'rico-family';

export interface AdminLayoutProps {
  user: any;
  isOwner: boolean;
  isAdmin: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  visibleTabs: any[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  badges?: Record<string, number>;
  children: React.ReactNode;
  autoLogoutEnabled: boolean;
  setAutoLogoutEnabled: (enabled: boolean) => void;
  isTOTPEnabled: boolean;
  siteSettings?: SiteSettings | null;
  homepageSettings?: HomepageSettings | null;
}


/** Every authorised staff account uses the same page-oriented workspace. */
export const AdminLayout: React.FC<AdminLayoutProps> = props => <OwnerAdminLayout {...props} />;
