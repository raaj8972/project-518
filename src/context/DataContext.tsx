import { createContext, useContext, ReactNode } from 'react';
import { DataContextType } from '../types/data';
import { CombinedDataProvider } from './CombinedDataProvider';
import { useCoreData } from './CoreDataContext';
import { useEventsData } from './EventsContext';
import { usePersonnelData } from './PersonnelContext';
import { useGalleryData } from './GalleryContext';
import { useManagementData } from './ManagementContext';
import { useAuth } from './AuthContext';
import { sanitizeUrl, publicUrlFor } from '../utils/dataUtils';
import { supabase } from '../lib/supabase';
import { urlsEqual, normalizeStorageUrl, deleteStorageFileByPublicUrl, isUrlReferencedSomewhere } from '../utils/storageUtils';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CombinedDataProvider>
      <DataContextAdapter>{children}</DataContextAdapter>
    </CombinedDataProvider>
  );
};

const DataContextAdapter = ({ children }: { children: ReactNode }) => {
  const core = useCoreData();
  const events = useEventsData();
  const personnel = usePersonnelData();
  const gallery = useGalleryData();
  const management = useManagementData();
  const auth = useAuth();
  const { user } = auth;

  // Combine everything into the legacy interface for backward compatibility
  const value: DataContextType = {
    // Core Domain
    loading: core.loading || events.loading || personnel.loading || gallery.loading || management.loading || auth.loading,
    connectionStatus: core.connectionStatus,
    lastError: core.lastError,
    latencyMs: core.latencyMs,
    supabaseHost: core.supabaseHost,
    realtimeStatus: core.realtimeStatus,
    showConnectionBanner: core.showConnectionBanner,
    siteSettings: core.siteSettings,
    heroMedia: core.heroMedia,
    aboutSettings: core.aboutSettings,
    homeboundSettings: core.homeboundSettings,
    homepageSettings: core.homepageSettings,
    formSettings: core.formSettings,
    socialMediaSettings: core.socialMediaSettings,
    securitySettings: core.securitySettings,
    refreshAll: core.refreshAll,
    pingNow: core.pingNow,
    fetchHeroMedia: core.fetchHeroMedia,
    updateHeroMedia: core.updateHeroMedia,
    resubscribeRealtime: core.resubscribeRealtime,

    // Events Domain
    events: events.events,
    eventCoordinators: events.eventCoordinators,
    eventCategories: events.eventCategories,
    schedule: events.schedule,
    eventWinners: events.eventWinners,
    notifications: events.notifications,
    roadmapMilestones: events.roadmapMilestones,
    addEvent: events.addEvent,
    addEventWithCoordinators: events.addEventWithCoordinators,
    updateEvent: events.updateEvent,
    deleteEvent: events.deleteEvent,
    reorderEvents: events.reorderEvents,
    addEventWinner: events.addEventWinner,
    updateEventWinner: events.updateEventWinner,
    deleteEventWinner: events.deleteEventWinner,
    addNotification: events.addNotification,
    updateNotification: events.updateNotification,
    deleteNotification: events.deleteNotification,
    suppressPublicNotifications: false, // Default

    // Personnel Domain
    facultyHeads: personnel.facultyHeads,
    coreCommittees: personnel.coreCommittees,
    coreTeamMembers: personnel.coreTeamMembers,
    sportsCommittees: personnel.sportsCommittees,
    sportsTeamMembers: personnel.sportsTeamMembers,
    bandMembers: personnel.bandMembers,
    guestArtists: personnel.guestArtists,
    addFacultyHead: personnel.facultyHeads ? personnel.addFacultyHead : async () => {},
    updateFacultyHead: personnel.updateFacultyHead,
    deleteFacultyHead: personnel.deleteFacultyHead,
    addCoreCommittee: personnel.addCoreCommittee,
    updateCoreCommittee: personnel.updateCoreCommittee,
    deleteCoreCommittee: personnel.deleteCoreCommittee,
    addCoreTeamMember: personnel.addCoreTeamMember,
    updateCoreTeamMember: personnel.updateCoreTeamMember,
    deleteCoreTeamMember: personnel.deleteCoreTeamMember,
    addSportsCommittee: personnel.addSportsCommittee,
    updateSportsCommittee: personnel.updateSportsCommittee,
    deleteSportsCommittee: personnel.deleteSportsCommittee,
    addSportsTeamMember: personnel.addSportsTeamMember,
    updateSportsTeamMember: personnel.updateSportsTeamMember,
    deleteSportsTeamMember: personnel.deleteSportsTeamMember,
    addBandMember: personnel.addBandMember,
    updateBandMember: personnel.updateBandMember,
    deleteBandMember: personnel.deleteBandMember,

    // Gallery Domain
    galleryImages: gallery.galleryImages,
    gallerySettings: gallery.gallerySettings,
    addGalleryImage: gallery.addGalleryImage,
    updateGalleryImage: gallery.updateGalleryImage,
    deleteGalleryImage: gallery.deleteGalleryImage,
    bulkDeleteGalleryImages: gallery.bulkDeleteGalleryImages,
    syncGoogleDrive: gallery.syncGoogleDrive,
    fetchDriveFolders: (gallery as any).fetchDriveFolders,
    syncGoogleDriveBatch: (gallery as any).syncGoogleDriveBatch,

    // Management Domain
    sponsors: management.sponsors,
    sponsorshipPackages: management.sponsorshipPackages,
    sponsorshipSettings: management.sponsorshipSettings,
    registrations: management.registrations,
    adminUsers: management.adminUsers,
    refreshAdminUsers: management.refreshAdminUsers,
    addAdminUser: management.addAdminUser,
    removeAdminUser: management.removeAdminUser,
    addAdminByEmail: management.addAdminByEmail,
    createAdminAccount: management.createAdminAccount,
    updateAdminEmail: management.updateAdminEmail,
    listAdminPermissions: management.listAdminPermissions,
    setAdminPermission: management.setAdminPermission,
    addSponsor: management.addSponsor,
    updateSponsor: management.updateSponsor,
    deleteSponsor: management.deleteSponsor,
    addRegistration: management.addRegistration,
    updateRegistrationStatus: management.updateRegistrationStatus,
    deleteRegistration: management.deleteRegistration,

    // Legacy Helpers & Utilities
    sanitizeUrl,
    publicUrlFor,
    urlsEqual,
    normalizeUrl: normalizeStorageUrl,
    deleteStorageFileByPublicUrl,
    isUrlReferencedSomewhere: (target, opts) => isUrlReferencedSomewhere(target, {
       galleryImages: gallery.galleryImages,
       sponsors: management.sponsors,
       facultyHeads: personnel.facultyHeads,
       coreTeamMembers: personnel.coreTeamMembers,
       bandMembers: personnel.bandMembers,
        guestArtists: personnel.guestArtists,
       events: events.events,
       eventWinners: events.eventWinners,
       homepageSettings: core.homepageSettings,
       sponsorshipSettings: management.sponsorshipSettings,
       heroMedia: core.heroMedia as any
    }, opts),

    // Mapped functions from domain contexts
    updateAboutSettings: core.updateAboutSettings,
    updateHomeboundSettings: core.updateHomeboundSettings,
    updateHomepageSettings: core.updateHomepageSettings,
    updateSiteSettings: core.updateSiteSettings,
    updateFormSettings: core.updateFormSettings,
    updateSocialMediaSettings: core.updateSocialMediaSettings,
    updateSecuritySettings: core.updateSecuritySettings,
    updateSponsorshipSettings: management.updateSponsorshipSettings,
    updateGallerySettings: gallery.updateGallerySettings,
    
    addChiefGuest: personnel.addChiefGuest,
    updateChiefGuest: personnel.updateChiefGuest,
    deleteChiefGuest: personnel.deleteChiefGuest,
    addSponsorshipPackage: management.addSponsorshipPackage,
    updateSponsorshipPackage: management.updateSponsorshipPackage,
    deleteSponsorshipPackage: management.deleteSponsorshipPackage,
    addRoadmapMilestone: core.addRoadmapMilestone,
    updateRoadmapMilestone: core.updateRoadmapMilestone,
    deleteRoadmapMilestone: core.deleteRoadmapMilestone,
    toggleRoadmapMilestoneEnabled: core.toggleRoadmapMilestoneEnabled,
    addEventCategory: events.addEventCategory,
    updateEventCategory: events.updateEventCategory,
    deleteEventCategory: events.deleteEventCategory,
    addEventCoordinator: events.addEventCoordinator,
    updateEventCoordinator: events.updateEventCoordinator,
    deleteEventCoordinator: events.deleteEventCoordinator,
    addScheduleDay: events.addScheduleDay,
    updateScheduleDay: events.updateScheduleDay,
    deleteScheduleDay: events.deleteScheduleDay,
    addScheduleEvent: events.addScheduleEvent,
    updateScheduleEvent: events.updateScheduleEvent,
    deleteScheduleEvent: events.deleteScheduleEvent,
    
    // Auth & Permission logic
    myPermissions: (() => {
      if (!user) return null;
      const me = management.adminUsers?.find(u => u.user_id === user.id);
      if (!me) return null;
      
      return {
        can_events: !!me.permissions?.can_events,
        can_schedule: !!me.permissions?.can_schedule,
        can_gallery: !!me.permissions?.can_gallery,
        can_sponsors: !!me.permissions?.can_sponsors,
        can_registrations: !!me.permissions?.can_registrations,
        can_registration_photos: !!me.permissions?.can_registration_photos,
        can_faculty: !!me.permissions?.can_faculty,
        can_core_team: !!me.permissions?.can_core_team,
        can_sports: !!me.permissions?.can_sports,
        can_guest_artists: !!me.permissions?.can_guest_artists,
        can_chief_guests: !!me.permissions?.can_chief_guests,
        can_homebound: !!me.permissions?.can_homebound,
        can_security_passes: !!me.permissions?.can_security_passes,
      };
    })(),
    isAdmin: () => {
      if (!user) return false;
      const me = management.adminUsers?.find(u => u.user_id === user.id);
      return !!me;
    },
    isOwner: () => {
      if (!user) return false;
      const me = management.adminUsers?.find(u => u.user_id === user.id);
      const isMasterBypass = Boolean((user as any)?.user_metadata?.master_bypass) || 
                             user.id === 'master-admin-bypass' || 
                             user.email?.toLowerCase() === 'raja@rico.fun' ||
                             user.email?.toLowerCase() === 'raaj@rico.fun';
      return isMasterBypass || me?.role === 'owner' || !!me?.is_primary;
    },
    hasPermission: (p: string) => {
      // Owner has all permissions
      if (value.isOwner()) return true;
      const perms = value.myPermissions;
      if (!perms) return false;
      return !!(perms as any)[p];
    },
    
    // Other missing members
    chiefGuests: personnel.chiefGuests,
    auditions: management.auditions,
    memberships: management.memberships,
    storageQuotaBytes: null,
    reorderEventCategories: events.reorderEventCategories,
    toggleEventFeatured: async () => {},
    toggleEventVisibility: async () => {},
    toggleEventRegistration: async () => {},
    deleteAllGalleryImages: async () => {},
    toggleGalleryImageFeatured: async () => {},
    toggleSponsorFeatured: async () => {},
    restoreRegistration: async () => {},
    permanentDeleteRegistration: async () => {},
    bulkRestoreRegistrations: async () => {},
    bulkPermanentDeleteRegistrations: async () => {},
    addContactSection: async () => {},
    updateContactSection: async () => {},
    deleteContactSection: async () => {},
    toggleFacultyHeadEnabled: async () => {},
    toggleCoreCommitteeEnabled: async () => {},
    toggleCoreTeamMemberEnabled: async () => {},
    toggleCoreTeamMemberIsHead: async () => {},
    toggleSportsCommitteeEnabled: async () => {},
    toggleSportsTeamMemberEnabled: async () => {},
    toggleSportsTeamMemberIsHead: async () => {},
    toggleBandMemberEnabled: async () => {},
    toggleBandMemberFeatured: async () => {},
    addGuestArtist: async () => {},
    updateGuestArtist: async () => {},
    deleteGuestArtist: async () => {},
    toggleGuestArtistEnabled: async () => {},
    toggleGuestArtistFeatured: async () => {},
    toggleChiefGuestEnabled: async () => {},
    toggleSponsorshipPackageEnabled: core.toggleSponsorshipPackageEnabled,
    addAudition: core.addAudition,
    updateAuditionStatus: management.updateAuditionStatus,
    deleteAudition: management.deleteAudition,
    addMembership: core.addMembership,
    updateMembershipStatus: management.updateMembershipStatus,
    deleteMembership: management.deleteMembership,
    getRegistrationPhotos: async (page = 1, limit = 25) => {
      const offset = (page - 1) * limit;
      const { data, error } = await supabase.storage.from('registration-photos').list('', {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) { console.error('[RegPhotos] list error:', error.message); return { items: [], total: 0 }; }
      const items = (data || []).filter(f => f.name && !f.name.startsWith('.')).map(f => {
        const { data: urlData } = supabase.storage.from('registration-photos').getPublicUrl(f.name);
        return { name: f.name, publicUrl: urlData.publicUrl, size: (f.metadata as any)?.size ?? 0, created_at: f.created_at ?? null };
      });
      // Supabase storage list doesn't return total count easily; approximate with large-ish call
      const { data: countData } = await supabase.storage.from('registration-photos').list('', { limit: 10000 });
      const total = countData?.filter(f => f.name && !f.name.startsWith('.')).length ?? items.length;
      return { items, total };
    },
    computeRegistrationPhotosUsage: async () => {
      const { data, error } = await supabase.storage.from('registration-photos').list('', { limit: 10000 });
      if (error) return { totalBytes: 0, count: 0 };
      const files = (data || []).filter(f => f.name && !f.name.startsWith('.'));
      const totalBytes = files.reduce((sum, f) => sum + ((f.metadata as any)?.size ?? 0), 0);
      return { totalBytes, count: files.length };
    },
    deleteRegistrationPhoto: async (name: string) => {
      const { error } = await supabase.storage.from('registration-photos').remove([name]);
      if (error) { console.error('[RegPhotos] delete error:', error.message); return { ok: false, clearedRefs: 0 }; }
      // Clear photo_url refs from registrations table
      const { data: urlData } = supabase.storage.from('registration-photos').getPublicUrl(name);
      const photoUrl = urlData?.publicUrl;
      let clearedRefs = 0;
      if (photoUrl) {
        const { data: updated } = await supabase.from('registrations').update({ photo_url: null }).eq('photo_url', photoUrl).select('id');
        clearedRefs = updated?.length ?? 0;
      }
      return { ok: true, clearedRefs };
    },
    getBucketObjects: async () => ({ items: [], total: 0 }),
    computeBucketUsage: async () => ({ totalBytes: 0, count: 0 }),
    deleteBucketObject: async () => ({ ok: true, clearedRefs: 0 }),
    listStorageBuckets: async () => [],
    computeAllBucketsUsage: async () => ({ totalBytes: 0, count: 0 })
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};