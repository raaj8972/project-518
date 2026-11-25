import { WEBSITE_PAGES, WEBSITE_CHILDREN } from './websitePages';
import { SITE_FEATURES, isSportsSection } from './siteFeatures';
import { BarChart3, Calendar, Settings, Users, Image, Clock, Lock, Shield, Palette, History as HistoryIcon, Info, Share2, Star, Building, UserCheck, Trophy, Flag, Gavel, Bell, Scan, QrCode, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabType } from '../components/admin/layout/AdminLayout';

export interface AdminSection { id: TabType; name: string; icon: LucideIcon; group: string; parent?: TabType; unavailableReason?: string; }

export const sectionParents: Partial<Record<TabType, TabType>> = {
  categories: 'events', 'registration-modal': 'registrations', 'form-settings': 'registrations',
  'reg-photos': 'student-system', 'student-passes': 'student-system', 'security-passes': 'student-system',
  'hero-media': 'homepage', about: 'homepage', social: 'homepage', roadmap: 'homepage',
  'face-indexing': 'gallery', 'sports-registration-model': 'sports-registrations',
  'annual-registration-model': 'annual-registrations', 'sports-team': 'sports-seasons',
  ...WEBSITE_CHILDREN,
};

export function getAdminSections(isOwner: boolean, annualSportsMode = false): AdminSection[] {
  return [
    // DASHBOARD
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3, group: 'DASHBOARD' },
    { id: 'announcements' as TabType, name: 'Announcements', icon: Bell, group: 'DASHBOARD' },
    { id: 'support-chat' as TabType, name: 'Technical Support', icon: MessageSquare, group: 'DASHBOARD' },
    ...(isOwner ? [{ id: 'notifications' as TabType, name: 'Notifications', icon: Info, group: 'DASHBOARD' }] : []),
    { id: 'protection-center' as TabType, name: 'Protection Center', icon: Shield, group: 'DASHBOARD' },

    // CONTENT
    { id: 'homepage' as TabType, name: 'Homepage & content', icon: Settings, group: 'CONTENT' },
    { id: 'gallery' as TabType, name: 'Gallery', icon: Image, group: 'CONTENT' },
    { id: 'hero-media' as TabType, name: 'Hero Media', icon: Image, group: 'CONTENT' },
    { id: 'social' as TabType, name: 'Social Media', icon: Share2, group: 'CONTENT' },
    { id: 'roadmap' as TabType, name: 'Roadmap', icon: Star, group: 'CONTENT' },
    { id: 'shoutouts' as TabType, name: 'Community messages', icon: MessageSquare, group: 'DASHBOARD' },
    { id: 'about' as TabType, name: 'About', icon: Info, group: 'CONTENT' },

    // FESTIVAL
    { id: 'events' as TabType, name: 'Events', icon: Calendar, group: 'FESTIVAL' },
    { id: 'schedule' as TabType, name: 'Schedule', icon: Clock, group: 'FESTIVAL' },
    { id: 'categories' as TabType, name: 'Categories', icon: Palette, group: 'FESTIVAL' },
    { id: 'sponsors' as TabType, name: 'Sponsors', icon: Building, group: 'FESTIVAL' },
    { id: 'homebound' as TabType, name: 'Homebound', icon: Settings, group: 'FESTIVAL' },

    // REGISTRATIONS
    { id: 'registrations' as TabType, name: 'Event registrations', icon: UserCheck, group: 'REGISTRATIONS' },
    { id: 'student-system' as TabType, name: 'Students', icon: Shield, group: 'REGISTRATIONS' },
    { id: 'student-passes' as TabType, name: 'Entry Passes', icon: QrCode, group: 'REGISTRATIONS' },
    { id: 'reg-photos' as TabType, name: 'Reg Photos', icon: Image, group: 'REGISTRATIONS' },
    { id: 'auditions' as TabType, name: 'Auditions', icon: Users, group: 'REGISTRATIONS' },
    { id: 'memberships' as TabType, name: 'Memberships', icon: Users, group: 'REGISTRATIONS' },
    { id: 'registration-modal' as TabType, name: 'Registration form', icon: UserCheck, group: 'REGISTRATIONS' },

    { id: 'form-settings' as TabType, name: 'Application form settings', icon: Settings, group: 'REGISTRATIONS' },

    // SPORTS LEAGUE
    { id: 'sports-seasons' as TabType, name: 'Seasons', icon: Trophy, group: 'SPORTS LEAGUE' },
    { id: 'sports-teams' as TabType, name: 'Teams', icon: Flag, group: 'SPORTS LEAGUE' },
    { id: 'sports-matches' as TabType, name: 'Matches', icon: Calendar, group: 'SPORTS LEAGUE' },
    { id: 'sports-auction' as TabType, name: 'Auction', icon: Gavel, group: 'SPORTS LEAGUE' },
    { id: 'sports-registrations' as TabType, name: 'Registrations', icon: UserCheck, group: 'SPORTS LEAGUE' },
    { id: 'sports-registration-model' as TabType, name: 'Sports registration form', icon: Settings, group: 'SPORTS LEAGUE' },
    { id: 'sports-announcements' as TabType, name: 'Sports announcements', icon: Bell, group: 'SPORTS LEAGUE' },
    { id: 'annual-events' as TabType, name: 'Annual Events', icon: Trophy, group: 'SPORTS LEAGUE' },
    { id: 'annual-schedule' as TabType, name: 'Annual Schedule', icon: Calendar, group: 'SPORTS LEAGUE' },
    { id: 'annual-registrations' as TabType, name: 'Annual registrations', icon: UserCheck, group: 'SPORTS LEAGUE' },
    { id: 'annual-registration-model' as TabType, name: 'Annual registration form', icon: Settings, group: 'SPORTS LEAGUE' },

    // PEOPLE
    { id: 'rico-family' as TabType, name: 'Rico Family', icon: Users, group: 'PEOPLE' },
    { id: 'band' as TabType, name: 'Band', icon: Users, group: 'PEOPLE' },
    { id: 'sports-team' as TabType, name: 'Legacy teams', icon: Users, group: 'PEOPLE' },
    { id: 'guest-artists' as TabType, name: 'Artists', icon: Star, group: 'PEOPLE' },
    { id: 'chief-guests' as TabType, name: 'Chief Guests', icon: Star, group: 'PEOPLE' },

    // SYSTEM
    { id: 'site-settings' as TabType, name: 'Site Settings', icon: Settings, group: 'SYSTEM' },
    { id: 'security' as TabType, name: 'Passwords & Access', icon: Lock, group: 'SYSTEM' },
    ...(isOwner ? [{ id: 'security-passes' as TabType, name: 'Pass operations', icon: Shield, group: 'SYSTEM' }] : []),
    ...(isOwner ? [{ id: 'audit-logs' as TabType, name: 'Audit Logs', icon: HistoryIcon, group: 'SYSTEM' }] : []),
    ...(isOwner ? [{ id: 'face-indexing' as TabType, name: 'Face Indexer', icon: Scan, group: 'SYSTEM' }] : []),
  ].filter(section => SITE_FEATURES.sports || !isSportsSection(section.id)).map(section => ({ ...section, name: WEBSITE_PAGES.find(page => page.id === section.id)?.name || (section.id === 'site-settings' ? 'Navigation & site settings' : section.name), group: WEBSITE_PAGES.some(page => page.id === section.id) || WEBSITE_CHILDREN[section.id] ? 'WEBSITE' : section.group, parent: sectionParents[section.id], unavailableReason: annualSportsMode && ['sports-teams', 'sports-auction'].includes(section.id) ? 'Teams and auction are unavailable while Annual Sports mode is enabled. Manage annual events or switch the mode in Site Settings.' : undefined }));
}
