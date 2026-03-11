import type { Database } from '../lib/supabase';

// Define types for your data based on Supabase schema
export type Event = Database['public']['Tables']['events']['Row'];
export type EventCoordinator = Database['public']['Tables']['event_coordinators']['Row'];
export type GalleryImage = Database['public']['Tables']['gallery_images']['Row'];
export type Sponsor = Database['public']['Tables']['sponsors']['Row'];
export type ScheduleDay = Database['public']['Tables']['schedule_days']['Row'] & { events: ScheduleEvent[], schedule_type?: 'prelims' | 'mains' };
export type ScheduleEvent = Database['public']['Tables']['schedule_events']['Row'];
export type Registration = Database['public']['Tables']['registrations']['Row'] & { deleted_at?: string | null };
export type SponsorshipSettings = Database['public']['Tables']['sponsorship_settings']['Row'] & { contactSections: ContactSection[] };
export type ContactSection = Database['public']['Tables']['contact_sections']['Row'];
export type EventCategory = Database['public']['Tables']['event_categories']['Row'];
export type FacultyHead = Database['public']['Tables']['faculty_heads']['Row'];
export type CoreCommittee = Database['public']['Tables']['core_committees']['Row'];
export type AdminPermission = Database['public']['Tables']['admin_permissions']['Row'];
export type CoreTeamMember = Database['public']['Tables']['core_team_members']['Row'];
export type SportsCommittee = Database['public']['Tables']['sports_committees']['Row'];
export type SportsTeamMember = Database['public']['Tables']['sports_team_members']['Row'];
export type SportsSeason = Database['public']['Tables']['sports_seasons']['Row'] & {
  group_limits?: {
    field_name: string;
    limits: Record<string, number>;
  } | null;
};
export type SportsTeam = Database['public']['Tables']['sports_teams']['Row'] & { annual_event_id?: string | null };
export type SportsPlayer = Database['public']['Tables']['sports_players']['Row'] & { annual_event_id?: string | null };
export type SportsRegistration = Database['public']['Tables']['sports_registrations']['Row'] & { metadata?: any };
export type SportsMatch = Database['public']['Tables']['sports_matches']['Row'] & { annual_event_id?: string | null, annual_team_a_id?: string | null, annual_team_b_id?: string | null };
export interface AnnualSportsEvent {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
  rules_url?: string | null;
  registration_open?: boolean;
  min_participants?: number;
  max_participants?: number;
  registration_limit?: number | null;
  custom_fields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'tel' | 'email' | 'select' | 'number' | 'textarea';
    required: boolean;
    options?: string[];
  }>;
  group_limits?: {
    field_name: string;
    limits: Record<string, number>;
  } | null;
  registration_participant_types?: string[] | null;
  registration_participant_quotas?: Record<string, number> | null;
  registration_timer_enabled?: boolean;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  registration_default_mode?: 'individual' | 'team';
  registration_mode_locked?: boolean;
  team_min_members?: number | null;
  team_max_members?: number | null;
  fee?: number;
  visible?: boolean;
  display_teams?: boolean;
  display_schedule?: boolean;
  require_leader_photo?: boolean;
  require_team_photo?: boolean;
  require_player_photo?: boolean;
  require_team_individual_photos?: boolean;
  auction_status?: 'draft' | 'live' | 'completed' | null;
  created_at: string;
  updated_at: string;
}
export interface AnnualSportsRegistration {
  id: string;
  reg_id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string;
  department?: string | null;
  year?: string | null;
  roll_no?: string | null;
  college?: string | null;
  participant_type?: string | null;
  is_team_registration?: boolean;
  team_name?: string | null;
  team_members?: Array<{ name: string; email?: string; photo_url?: string }> | null;
  total_members?: number;
  status?: 'pending' | 'approved' | 'rejected';
  photo_url?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
export type BandMember = Database['public']['Tables']['band_members']['Row'];
export type GuestArtist = Database['public']['Tables']['guest_artists']['Row'];
export type ChiefGuest = Database['public']['Tables']['chief_guests']['Row'];
export type SponsorshipPackage = Database['public']['Tables']['sponsorship_packages']['Row'];
export type Audition = Database['public']['Tables']['auditions']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type FormSettings = Database['public']['Tables']['form_settings']['Row'];
export type SocialMediaSettings = Database['public']['Tables']['social_media_settings']['Row'];
export type HomepageSettings = Database['public']['Tables']['homepage_settings']['Row'];
export type HomeboundSettings = Database['public']['Tables']['homebound_settings']['Row'];
export type SiteSettings = Database['public']['Tables']['site_settings']['Row'] & {
  sports_registration_config?: {
    registration_open: boolean;
    participant_types: string[];
    form_fields: Array<{
      name: string;
      label: string;
      required: boolean;
      type: 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'number' | 'file';
      options?: string[];
    }>;
  };
  sports_owner_registration_config?: {
    registration_open: boolean;
    participant_types?: string[];
    form_fields: Array<{
      name: string;
      label: string;
      required: boolean;
      type: 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'number' | 'file';
      options?: string[];
    }>;
  };
  sports_player_registration_config?: {
    registration_open: boolean;
    participant_types?: string[];
    form_fields: Array<{
      name: string;
      label: string;
      required: boolean;
      type: 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'number' | 'file';
      options?: string[];
    }>;
  };
  annual_sports_mode_enabled?: boolean;
};
export type AboutSettings = {
  id: number;
  enabled: boolean;
  hero_title: string | null;
  hero_heading: string | null;
  hero_paragraphs: string[]; // jsonb
  tracks: string[]; // jsonb
  zones: string[]; // jsonb
  tracksLabel?: string | null;
  zonesLabel?: string | null;
  stats: Array<{ value: string; label: string }>; // jsonb
  updated_at: string | null;
};
export interface GallerySettings {
  id: number;
  scroll_per_item: number; // base per-image scroll in px
  distance: number; // z-distance between cards
  background_blur_px: number; // background layer blur
  card_blur_max: number; // max blur for far cards
  reveal_enabled?: boolean; // enable pre-open reveal overlay
  reveal_duration_ms?: number; // duration in ms
  reveal_orientation?: 'horizontal' | 'vertical'; // direction of eye animation
  updated_at: string | null;
}
export type RoadmapMilestone = Database['public']['Tables']['roadmap_milestones']['Row'];
export type HeroMedia = Database['public']['Tables']['hero_media']['Row'];
export type PageKey = HeroMedia['page_key'];
export type SecuritySettings = Database['public']['Tables']['security_settings']['Row'] & {
  council_passcode?: string | null;
};

export interface DataContextType {
  events: Event[];
  eventCoordinators: EventCoordinator[];
  galleryImages: GalleryImage[];
  sponsors: Sponsor[];  
  schedule: ScheduleDay[];
  sponsorshipSettings: SponsorshipSettings | null;
  eventCategories: EventCategory[];
  facultyHeads: FacultyHead[];
  coreCommittees: CoreCommittee[];
  coreTeamMembers: CoreTeamMember[];
  sportsCommittees: SportsCommittee[];
  sportsTeamMembers: SportsTeamMember[];
  bandMembers: BandMember[];
  guestArtists: GuestArtist[];
  chiefGuests: ChiefGuest[];
  sponsorshipPackages: SponsorshipPackage[];
  auditions: Audition[];
  memberships: Membership[];
  formSettings: FormSettings | null;
  socialMediaSettings: SocialMediaSettings | null;
  homepageSettings: HomepageSettings | null;
  homeboundSettings: HomeboundSettings | null;
  siteSettings: SiteSettings | null;
  aboutSettings: AboutSettings | null;
  gallerySettings: GallerySettings | null;
  securitySettings: SecuritySettings | null;
  registrations: Registration[];
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  roadmapMilestones: RoadmapMilestone[];
  heroMedia: Partial<Record<PageKey, HeroMedia | null>>;
  loading: boolean;
  connectionStatus: 'ok' | 'degraded' | 'offline';
  lastError: string | null;
  latencyMs?: number | null;
  supabaseHost?: string;
  realtimeStatus?: Record<string, string>;
  showConnectionBanner?: boolean;
  refreshAll: (silent?: boolean) => Promise<void>;
  resubscribeRealtime: () => void;
  addEvent: (event: Partial<Event>) => Promise<void>;
  addEventWithCoordinators: (
    event: Partial<Event>,
    coordinators: Array<{ name: string; phone?: string | null }>
  ) => Promise<void>;
  eventWinners?: Array<any>;
  addEventWinner?: (winner: { event_id?: number | null; category?: string | null; position?: number; name: string; year?: string | null; photo_url?: string | null; registration_id?: string | null }) => Promise<void>;
  updateEventWinner?: (id: number, patch: Partial<any>) => Promise<void>;
  deleteEventWinner?: (id: number) => Promise<void>;
  notifications: Array<{ id: number; title: string | null; message: string; type: string; link_url: string | null; visible: boolean; starts_at: string; ends_at: string | null; priority: number; admin_only?: boolean; auto_dismiss_seconds?: number | null; text_color?: string | null; glow_color?: string | null; created_at: string }>;
  addNotification?: (n: { title?: string | null; message: string; type?: string; link_url?: string | null; visible?: boolean; starts_at?: string | null; ends_at?: string | null; priority?: number; auto_dismiss_seconds?: number | null; text_color?: string | null; glow_color?: string | null }) => Promise<void>;
  updateNotification?: (id: number, patch: Partial<any>) => Promise<void>;
  deleteNotification?: (id: number) => Promise<void>;
  suppressPublicNotifications: boolean;
  setSuppressPublicNotifications?: (flag: boolean) => void;
  updateEvent: (id: number, event: Partial<Event>) => Promise<void>;
  reorderEvents: (orderedIds: number[]) => Promise<boolean>;
  reorderEventCategories: (orderedIds: number[]) => Promise<boolean>;
  deleteEvent: (id: number) => Promise<void>;
  addEventCoordinator: (coordinator: Omit<EventCoordinator, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateEventCoordinator: (id: number, patch: Partial<EventCoordinator>) => Promise<void>;
  deleteEventCoordinator: (id: number) => Promise<void>;
  toggleEventFeatured: (id: number) => Promise<void>;
  toggleEventVisibility: (id: number) => Promise<void>;
  toggleEventRegistration: (id: number) => Promise<void>;
  addGalleryImage: (image: Partial<GalleryImage>) => Promise<void>;
  updateGalleryImage: (id: number, image: Partial<GalleryImage>) => Promise<void>;
  deleteGalleryImage: (id: number) => Promise<void>;
  bulkDeleteGalleryImages?: (ids: number[]) => Promise<void>;
  deleteAllGalleryImages: () => Promise<void>;
  toggleGalleryImageFeatured: (id: number) => Promise<void>;
  addSponsor: (sponsor: Partial<Sponsor>) => Promise<void>;
  updateSponsor: (id: number, sponsor: Partial<Sponsor>) => Promise<void>;
  deleteSponsor: (id: number) => Promise<void>;
  toggleSponsorFeatured: (id: number) => Promise<void>;
  addScheduleDay: (day: Partial<ScheduleDay>) => Promise<void>;
  updateScheduleDay: (id: number, day: Partial<ScheduleDay>) => Promise<void>;
  deleteScheduleDay: (id: number) => Promise<void>;
  addScheduleEvent: (dayId: number, event: Partial<ScheduleEvent>) => Promise<void>;
  updateScheduleEvent: (id: number, event: Partial<ScheduleEvent>) => Promise<void>;
  deleteScheduleEvent: (id: number) => Promise<void>;
  addRegistration: (registration: Partial<Registration>) => Promise<void>;
  updateRegistrationStatus: (id: string, status: 'approved' | 'rejected' | 'pending') => Promise<void>;
  bulkApproveRegistrations?: (ids: string[]) => Promise<void>;
  bulkRejectRegistrations?: (ids: string[]) => Promise<void>;
  bulkDeleteRegistrations?: (ids: string[]) => Promise<void>;
  deleteRegistration: (id: string) => Promise<void>;
  restoreRegistration: (id: string) => Promise<void>;
  permanentDeleteRegistration: (id: string) => Promise<void>;
  bulkRestoreRegistrations: (ids: string[]) => Promise<void>;
  bulkPermanentDeleteRegistrations: (ids: string[]) => Promise<void>;
  resetRegistrationIdSequence?: () => Promise<void>;
  updateSponsorshipSettings: (settings: Partial<SponsorshipSettings> & { contactSections?: Partial<ContactSection>[] }) => Promise<void>;
  addContactSection: (section: Partial<ContactSection>) => Promise<void>;
  updateContactSection: (id: number, section: Partial<ContactSection>) => Promise<void>;
  deleteContactSection: (id: number) => Promise<void>;
  addEventCategory: (category: Partial<EventCategory>) => Promise<void>;
  updateEventCategory: (id: number, category: Partial<EventCategory>) => Promise<void>;
  deleteEventCategory: (id: number) => Promise<void>;
  updateSocialMediaSettings: (settings: Partial<SocialMediaSettings>) => Promise<void>;
  addFacultyHead: (head: Partial<FacultyHead>) => Promise<void>;
  updateFacultyHead: (id: number, head: Partial<FacultyHead>) => Promise<void>;
  deleteFacultyHead: (id: number) => Promise<void>;
  toggleFacultyHeadEnabled: (id: number) => Promise<void>;
  addCoreCommittee: (committee: Partial<CoreCommittee>) => Promise<void>;
  updateCoreCommittee: (id: number, committee: Partial<CoreCommittee>) => Promise<void>;
  deleteCoreCommittee: (id: number) => Promise<void>;
  toggleCoreCommitteeEnabled: (id: number) => Promise<void>;
  addCoreTeamMember: (member: Partial<CoreTeamMember>) => Promise<void>;
  updateCoreTeamMember: (id: number, member: Partial<CoreTeamMember>) => Promise<void>;
  deleteCoreTeamMember: (id: number) => Promise<void>;
  toggleCoreTeamMemberEnabled: (id: number) => Promise<void>;
  toggleCoreTeamMemberIsHead: (id: number) => Promise<void>;
  addSportsCommittee: (committee: Partial<SportsCommittee>) => Promise<void>;
  updateSportsCommittee: (id: number, committee: Partial<SportsCommittee>) => Promise<void>;
  deleteSportsCommittee: (id: number) => Promise<void>;
  toggleSportsCommitteeEnabled: (id: number) => Promise<void>;
  addSportsTeamMember: (member: Partial<SportsTeamMember>) => Promise<void>;
  updateSportsTeamMember: (id: number, member: Partial<SportsTeamMember>) => Promise<void>;
  deleteSportsTeamMember: (id: number) => Promise<void>;
  toggleSportsTeamMemberEnabled: (id: number) => Promise<void>;
  toggleSportsTeamMemberIsHead: (id: number) => Promise<void>;
  addBandMember: (member: Partial<BandMember>) => Promise<void>;
  updateBandMember: (id: number, member: Partial<BandMember>) => Promise<void>;
  deleteBandMember: (id: number) => Promise<void>;
  toggleBandMemberEnabled: (id: number) => Promise<void>;
  toggleBandMemberFeatured: (id: number) => Promise<void>;
  addGuestArtist: (artist: Partial<GuestArtist>) => Promise<void>;
  updateGuestArtist: (id: number, artist: Partial<GuestArtist>) => Promise<void>;
  deleteGuestArtist: (id: number) => Promise<void>;
  toggleGuestArtistEnabled: (id: number) => Promise<void>;
  toggleGuestArtistFeatured: (id: number) => Promise<void>;
  addChiefGuest: (guest: Partial<ChiefGuest>) => Promise<void>;
  updateChiefGuest: (id: number, guest: Partial<ChiefGuest>) => Promise<void>;
  deleteChiefGuest: (id: number) => Promise<void>;
  toggleChiefGuestEnabled: (id: number) => Promise<void>;
  addSponsorshipPackage: (pkg: Partial<SponsorshipPackage>) => Promise<void>;
  updateSponsorshipPackage: (id: number, pkg: Partial<SponsorshipPackage>) => Promise<void>;
  deleteSponsorshipPackage: (id: number) => Promise<void>;
  toggleSponsorshipPackageEnabled: (id: number) => Promise<void>;
  addAudition: (audition: Partial<Audition>) => Promise<void>;
  updateAuditionStatus: (id: string, status: 'pending' | 'reviewed' | 'contacted') => Promise<void>;
  deleteAudition: (id: string) => Promise<void>;
  addMembership: (membership: Partial<Membership>) => Promise<void>;
  updateMembershipStatus: (id: string, status: 'pending' | 'reviewed' | 'accepted') => Promise<void>;
  deleteMembership: (id: string) => Promise<void>;
  updateFormSettings: (settings: Partial<FormSettings>) => Promise<void>;
  updateHomepageSettings: (settings: Partial<HomepageSettings>) => Promise<void>;
  updateHomeboundSettings: (settings: Partial<HomeboundSettings>) => Promise<void>;
  updateSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  updateAboutSettings: (settings: Partial<AboutSettings>) => Promise<void>;
  updateGallerySettings: (settings: Partial<GallerySettings>) => Promise<void>;
  prefetchEvents?: () => Promise<void>;
  prefetchGalleryImages?: () => Promise<void>;
  addRoadmapMilestone: (m: Partial<RoadmapMilestone>) => Promise<void>;
  updateRoadmapMilestone: (id: number, m: Partial<RoadmapMilestone>) => Promise<void>;
  deleteRoadmapMilestone: (id: number) => Promise<void>;
  toggleRoadmapMilestoneEnabled: (id: number) => Promise<void>;
  fetchHeroMedia: (pageKey: PageKey) => Promise<HeroMedia | null>;
  updateHeroMedia: (pageKey: PageKey, patch: Partial<HeroMedia>) => Promise<void>;
  schemaCapabilities?: {
    events_registration_photo_required: boolean;
    events_registration_photo_label: boolean;
    registrations_photo_url: boolean;
    storage_registration_photos_bucket: boolean;
  };
  getRegistrationPhotos: (page?: number, pageSize?: number) => Promise<{ items: Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>; total: number }>;
  computeRegistrationPhotosUsage: () => Promise<{ totalBytes: number; count: number }>;
  deleteRegistrationPhoto: (name: string) => Promise<{ ok: boolean; clearedRefs: number }>;
  getBucketObjects: (bucket: string, page?: number, pageSize?: number) => Promise<{ items: Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>; total: number }>;
  computeBucketUsage: (bucket: string) => Promise<{ totalBytes: number; count: number }>;
  deleteBucketObject: (bucket: string, name: string) => Promise<{ ok: boolean; clearedRefs: number }>;
  listStorageBuckets: () => Promise<string[]>;
  computeAllBucketsUsage: () => Promise<{ totalBytes: number; count: number }>;
  storageQuotaBytes: number | null;
  pingNow?: () => Promise<void>;
  syncGoogleDrive?: (folderId: string, year?: string, category?: string) => Promise<{ message: string; imagesCount: number; categoriesCount: number }>;
  fetchDriveFolders?: (folderId: string) => Promise<{ folders: Array<{ id: string; name: string; imageCount: number }>; totalFolders: number }>;
  syncGoogleDriveBatch?: (folderId: string, subfolderId: string, year?: string, category?: string) => Promise<{ message: string; imagesCount: number; categoriesCount: number }>;
  publicUrlFor: (bucket: string, path: string) => string;
  sanitizeUrl?: (url: string | null | undefined) => string;
  normalizeUrl?: (url: string | null | undefined) => string;
  urlsEqual?: (a: string | null | undefined, b: string | null | undefined) => boolean;
  deleteStorageFileByPublicUrl?: (url: string) => Promise<void>;
  isUrlReferencedSomewhere?: (target: string, options?: any) => boolean;
  indexGalleryImageFaces?: (imageId: number, url: string) => Promise<void>;
  adminUsers?: Array<{ user_id: string; email: string; created_at: string; role?: 'owner' | 'admin'; is_primary?: boolean }>;
  refreshAdminUsers?: () => Promise<void>;
  addAdminUser?: (userId: string, email: string) => Promise<void>;
  removeAdminUser?: (userId: string) => Promise<void>;
  addAdminByEmail?: (email: string) => Promise<void>;
  createAdminAccount?: (email: string, password: string) => Promise<{ user_id: string; email: string } | null>;
  updateAdminEmail?: (userId: string, newEmail: string) => Promise<void>;
  listAdminPermissions?: () => Promise<any[]>;
  setAdminPermission?: (userId: string, patch: Partial<AdminPermission>) => Promise<void>;
  myPermissions?: {
    can_events?: boolean;
    can_schedule?: boolean;
    can_gallery?: boolean;
    can_sponsors?: boolean;
    can_registrations?: boolean;
    can_registration_photos?: boolean;
    can_faculty?: boolean;
    can_core_team?: boolean;
    can_sports?: boolean;
    can_guest_artists?: boolean;
    can_chief_guests?: boolean;
    can_homebound?: boolean;
    can_security_passes?: boolean;
    can_sports_registrations?: boolean;
  } | null;
  isAdmin: () => boolean;
  isOwner: () => boolean;
  hasPermission: (permission: keyof NonNullable<DataContextType['myPermissions']>) => boolean;
  lastEventReorderError?: { phase: string; message?: string; details?: string; hint?: string } | null;
}
