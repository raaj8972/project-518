import { getBucketObjects, computeBucketUsage, deleteBucketObject, listStorageBuckets, computeAllBucketsUsage } from '../services/storageService';
import React, { createContext, useContext, useMemo } from 'react';
import { DataContextType } from '../types/data';
import { useAuth } from './AuthContext';
import { useCoreData } from './CoreDataContext';
import { useEventsData } from './EventsContext';
import { useGalleryData } from './GalleryContext';
import { useSportsData } from './SportsContext';
import { usePersonnelData } from './PersonnelContext';
import { useManagementData } from './ManagementContext';
import { supabase } from '../lib/supabase';
import { sanitizeUrl } from '../utils/dataUtils';
import { useSystemStatus } from './CombinedDataProvider';

const DataContext = createContext<DataContextType | undefined>(undefined);

/** Scope unsaved studio values to the public components inside a preview. */
export function DataPreviewProvider({ overrides, children }: { overrides: Partial<DataContextType>; children: React.ReactNode }) {
  const live = useData();
  const value = useMemo(() => ({ ...live, ...overrides }), [live, overrides]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const core = useCoreData();
  const events = useEventsData();
  const gallery = useGalleryData();
  const sports = useSportsData();
  const personnel = usePersonnelData();
  const management = useManagementData();
  const { scope } = useSystemStatus();

  const value: DataContextType = useMemo(() => ({
    // Core Domain
    loading: core.loading || (scope.events && events.loading) || (scope.gallery && gallery.loading) || (scope.sports && sports.loading) || (scope.personnel && personnel.loading) || (scope.management && management.loading),
    isLoaded: core.isLoaded && (!scope.events || events.isLoaded) && (!scope.gallery || gallery.isLoaded) && (!scope.sports || sports.isLoaded) && (!scope.personnel || personnel.isLoaded) && (!scope.management || management.isLoaded),
    connectionStatus: core.connectionStatus,
    lastError: core.lastError,
    latencyMs: core.latencyMs,
    supabaseHost: core.supabaseHost,
    realtimeStatus: core.realtimeStatus,
    showConnectionBanner: core.showConnectionBanner,
    refreshTrigger: core.refreshTrigger,
    siteSettings: core.siteSettings,
    heroMedia: core.heroMedia,
    aboutSettings: core.aboutSettings,
    homeboundSettings: core.homeboundSettings,
    homepageSettings: core.homepageSettings,
    formSettings: core.formSettings,
    socialMediaSettings: core.socialMediaSettings,
    securitySettings: core.securitySettings,
    roadmapMilestones: events.roadmapMilestones,
    refreshAll: core.refreshAll,
    pingNow: core.pingNow,
    fetchHeroMedia: core.fetchHeroMedia,
    updateHeroMedia: core.updateHeroMedia,
    resubscribeRealtime: core.resubscribeRealtime,
    updateAboutSettings: core.updateAboutSettings,
    updateHomeboundSettings: core.updateHomeboundSettings,
    updateHomepageSettings: core.updateHomepageSettings,
    updateSiteSettings: core.updateSiteSettings,
    updateFormSettings: core.updateFormSettings,
    updateSocialMediaSettings: core.updateSocialMediaSettings,
    updateSecuritySettings: core.updateSecuritySettings,
    addRoadmapMilestone: core.addRoadmapMilestone,
    updateRoadmapMilestone: core.updateRoadmapMilestone,
    deleteRoadmapMilestone: core.deleteRoadmapMilestone,
    toggleRoadmapMilestoneEnabled: core.toggleRoadmapMilestoneEnabled,
    toggleSponsorshipPackageEnabled: management.toggleSponsorshipPackageEnabled,

    // Events Domain
    events: events.events,
    eventCoordinators: events.eventCoordinators,
    eventCategories: events.eventCategories,
    schedule: events.schedule,
    scheduleError: events.scheduleError,
    eventsError: events.eventsError,
    eventWinners: events.eventWinners,
    notifications: events.notifications,
    addEvent: events.addEvent,
    addEventWithCoordinators: events.addEventWithCoordinators,
    updateEvent: events.updateEvent,
    deleteEvent: events.deleteEvent,
    reorderEvents: events.reorderEvents,
    reorderEventCategories: events.reorderEventCategories,
    addEventWinner: events.addEventWinner,
    updateEventWinner: events.updateEventWinner,
    deleteEventWinner: events.deleteEventWinner,
    addNotification: events.addNotification,
    updateNotification: events.updateNotification,
    deleteNotification: events.deleteNotification,
    suppressPublicNotifications: false,
    addEventCategory: events.addEventCategory,
    updateEventCategory: events.updateEventCategory,
    deleteEventCategory: events.deleteEventCategory,
    addEventCoordinator: events.addEventCoordinator,
    updateEventCoordinator: events.updateEventCoordinator,
    deleteEventCoordinator: events.deleteEventCoordinator,
    toggleEventVisibility: events.toggleEventVisibility,
    toggleEventFeatured: events.toggleEventFeatured,
    toggleEventRegistration: events.toggleEventRegistration,
    addScheduleDay: events.addScheduleDay,
    updateScheduleDay: events.updateScheduleDay,
    deleteScheduleDay: events.deleteScheduleDay,
    addScheduleEvent: events.addScheduleEvent,
    updateScheduleEvent: events.updateScheduleEvent,
    deleteScheduleEvent: events.deleteScheduleEvent,

    // Gallery Domain
    galleryImages: gallery.galleryImages,
    galleryLoading: gallery.loading,
    galleryError: gallery.galleryError,
    gallerySettings: gallery.gallerySettings,
    addGalleryImage: gallery.addGalleryImage,
    updateGalleryImage: gallery.updateGalleryImage,
    deleteGalleryImage: gallery.deleteGalleryImage,
    bulkDeleteGalleryImages: gallery.bulkDeleteGalleryImages,
    deleteAllGalleryImages: gallery.deleteAllGalleryImages,
    toggleGalleryImageFeatured: gallery.toggleGalleryImageFeatured,
    syncGoogleDrive: gallery.syncGoogleDrive,
    fetchDriveFolders: gallery.fetchDriveFolders,
    syncGoogleDriveBatch: gallery.syncGoogleDriveBatch,
    updateGallerySettings: gallery.updateGallerySettings,
    loadGalleryImages: gallery.loadGalleryImages,
    prefetchGalleryImages: gallery.prefetchGalleryImages,

    // Sports Domain
    sportsRegistrations: sports.sportsRegistrations,
    addSportsRegistration: sports.addSportsRegistration,
    updateSportsRegistrationStatus: (id: number, status: any) => sports.updateSportsRegistration(id, { status }),
    deleteSportsRegistration: sports.deleteSportsRegistration,

    // Personnel Domain
    facultyHeads: personnel.facultyHeads,
    coreCommittees: personnel.coreCommittees,
    coreTeamMembers: personnel.coreTeamMembers,
    sportsCommittees: personnel.sportsCommittees,
    sportsTeamMembers: personnel.sportsTeamMembers,
    bandMembers: personnel.bandMembers,
    guestArtists: personnel.guestArtists,
    chiefGuests: personnel.chiefGuests,
    addChiefGuest: personnel.addChiefGuest,
    updateChiefGuest: personnel.updateChiefGuest,
    deleteChiefGuest: personnel.deleteChiefGuest,
    toggleChiefGuestEnabled: personnel.toggleChiefGuestEnabled,
    personnel: [], 
    addPersonnel: async () => {},
    updatePersonnel: async () => {},
    deletePersonnel: async () => {},
    personnelCategories: [],
    addPersonnelCategory: async () => {},
    updatePersonnelCategory: async () => {},
    deletePersonnelCategory: async () => {},
    addFacultyHead: personnel.addFacultyHead,
    updateFacultyHead: personnel.updateFacultyHead,
    deleteFacultyHead: personnel.deleteFacultyHead,
    toggleFacultyHeadEnabled: personnel.toggleFacultyHeadEnabled,
    addCoreCommittee: personnel.addCoreCommittee,
    updateCoreCommittee: personnel.updateCoreCommittee,
    deleteCoreCommittee: personnel.deleteCoreCommittee,
    toggleCoreCommitteeEnabled: personnel.toggleCoreCommitteeEnabled,
    addCoreTeamMember: personnel.addCoreTeamMember,
    updateCoreTeamMember: personnel.updateCoreTeamMember,
    deleteCoreTeamMember: personnel.deleteCoreTeamMember,
    toggleCoreTeamMemberEnabled: personnel.toggleCoreTeamMemberEnabled,
    toggleCoreTeamMemberIsHead: personnel.toggleCoreTeamMemberIsHead,
    addSportsCommittee: personnel.addSportsCommittee,
    updateSportsCommittee: personnel.updateSportsCommittee,
    deleteSportsCommittee: personnel.deleteSportsCommittee,
    toggleSportsCommitteeEnabled: personnel.toggleSportsCommitteeEnabled,
    addSportsTeamMember: personnel.addSportsTeamMember,
    updateSportsTeamMember: personnel.updateSportsTeamMember,
    deleteSportsTeamMember: personnel.deleteSportsTeamMember,
    toggleSportsTeamMemberEnabled: personnel.toggleSportsTeamMemberEnabled,
    toggleSportsTeamMemberIsHead: personnel.toggleSportsTeamMemberIsHead,
    addBandMember: personnel.addBandMember,
    updateBandMember: personnel.updateBandMember,
    deleteBandMember: personnel.deleteBandMember,
    toggleBandMemberEnabled: personnel.toggleBandMemberEnabled,
    toggleBandMemberFeatured: personnel.toggleBandMemberFeatured,
    addGuestArtist: personnel.addGuestArtist,
    updateGuestArtist: personnel.updateGuestArtist,
    deleteGuestArtist: personnel.deleteGuestArtist,
    toggleGuestArtistEnabled: personnel.toggleGuestArtistEnabled,
    toggleGuestArtistFeatured: personnel.toggleGuestArtistFeatured,

    // Management Domain
    sponsors: management.sponsors,
    sponsorshipPackages: management.sponsorshipPackages,
    sponsorshipSettings: management.sponsorshipSettings,
    sponsorshipError: management.sponsorshipError,
    refreshSponsorship: management.refreshSponsorship,
    auditionsError: management.auditionsError,
    auditionsLoading: management.auditionsLoading,
    refreshAuditions: management.refreshAuditions,
    registrations: management.registrations,
    auditions: management.auditions,
    memberships: management.memberships,
    adminUsers: management.adminUsers,
    addSponsor: management.addSponsor,
    updateSponsor: management.updateSponsor,
    deleteSponsor: management.deleteSponsor,
    toggleSponsorFeatured: management.toggleSponsorFeatured,
    addRegistration: management.addRegistration,
    updateRegistrationStatus: management.updateRegistrationStatus,
    deleteRegistration: management.deleteRegistration,
    addAudition: core.addAudition,
    updateAuditionStatus: management.updateAuditionStatus,
    deleteAudition: management.deleteAudition,
    addMembership: core.addMembership,
    updateMembershipStatus: management.updateMembershipStatus,
    deleteMembership: management.deleteMembership,
    addContactSection: management.addContactSection,
    updateContactSection: management.updateContactSection,
    deleteContactSection: management.deleteContactSection,
    updateSponsorshipSettings: management.updateSponsorshipSettings,
    bulkApproveRegistrations: management.bulkApproveRegistrations,
    bulkRejectRegistrations: management.bulkRejectRegistrations,
    bulkDeleteRegistrations: management.bulkDeleteRegistrations,
    restoreRegistration: management.restoreRegistration,
    permanentDeleteRegistration: management.permanentDeleteRegistration,
    bulkRestoreRegistrations: management.bulkRestoreRegistrations,
    bulkPermanentDeleteRegistrations: management.bulkPermanentDeleteRegistrations,
    refreshAdminUsers: management.refreshAdminUsers,
    addAdminUser: management.addAdminUser,
    removeAdminUser: management.removeAdminUser,
    addAdminByEmail: management.addAdminByEmail,
    createAdminAccount: management.createAdminAccount,
    updateAdminEmail: management.updateAdminEmail,
    listAdminPermissions: management.listAdminPermissions,
    setAdminPermission: management.setAdminPermission,
    updateAdminRole: management.updateAdminRole,
    updateAdminPassword: management.updateAdminPassword,
    resetRegistrationIdSequence: management.resetRegistrationIdSequence,
    addSponsorshipPackage: management.addSponsorshipPackage,
    updateSponsorshipPackage: management.updateSponsorshipPackage,
    deleteSponsorshipPackage: management.deleteSponsorshipPackage,

    // Storage Domain
    storageQuotaBytes: null,
    getRegistrationPhotos: (page = 1, limit = 25) => getBucketObjects('registration-photos', page, limit),
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
      const { data: urlData } = supabase.storage.from('registration-photos').getPublicUrl(name);
      const photoUrl = urlData?.publicUrl;
      let clearedRefs = 0;
      if (photoUrl) {
        const { data: updated } = await supabase.from('registrations').update({ photo_url: null }).eq('photo_url', photoUrl).select('id');
        clearedRefs = updated?.length ?? 0;
      }
      return { ok: true, clearedRefs };
    },
    getBucketObjects,
    computeBucketUsage,
    deleteBucketObject,
    listStorageBuckets,
    computeAllBucketsUsage,

    // Utils/Misc
    sanitizeUrl,
    publicUrlFor: (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
    isAdmin: () => (auth.user?.user_metadata?.role === 'admin' || auth.user?.user_metadata?.role === 'owner'),
    isOwner: () => auth.user?.user_metadata?.role === 'owner',
    hasPermission: (p: any) => auth.user?.user_metadata?.role === 'owner' || !!(auth.user?.user_metadata?.permissions?.[p]),
    myPermissions: auth.user?.user_metadata?.permissions || null
  }), [auth, core, events, gallery, sports, personnel, management, scope]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
